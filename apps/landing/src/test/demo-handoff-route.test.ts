// @vitest-environment node

import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const landingOrigin = "https://pizzaos.example.test";
const handoffSecret = "test-only-landing-handoff-signature-secret";
const mailEndpoint = "https://mail.example.test/send";
const demoFields = {
  name: "Richiedente Test",
  email: "richiedente@example.test",
  pizzeriaName: "Pizzeria di prova",
  city: "Roma",
  message: "Vorrei provare la demo",
  policyConsent: "accepted",
};

type DemoRouteResult = {
  success: boolean;
  demoAccess?: {
    client: { action: string; pass: string };
    admin: { action: string; pass: string };
  };
};

const sendMail = vi.fn<typeof fetch>();

async function submit(fields: Record<string, string> = demoFields) {
  const { POST } = await import("../../app/api/demo-request/route");
  const requestBody = new FormData();
  for (const [name, value] of Object.entries(fields)) requestBody.set(name, value);

  return POST(new NextRequest(`${landingOrigin}/api/demo-request`, {
    method: "POST",
    body: requestBody,
  }));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("PIZZAOS_DEMO_HANDOFF_SECRET", handoffSecret);
  vi.stubEnv("KREMISI_MAIL_ENDPOINT", mailEndpoint);
  vi.stubEnv("LINK_CLIENT", undefined);
  vi.stubEnv("LINK_ADMIN", undefined);
  sendMail.mockReset().mockImplementation(async () => Response.json({
    success: true,
    message: "Email sent successfully",
  }));
  vi.stubGlobal("fetch", sendMail);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/demo-request", () => {
  it("issues two short-lived, host-bound passes after the mail provider accepts a demo request", async () => {
    vi.stubEnv("LINK_CLIENT", "https://cliente.example.test/poc");
    vi.stubEnv("LINK_ADMIN", "https://ristorante.example.test/poc");
    const response = await submit();
    const completedAt = Date.now();
    const body = await response.json() as DemoRouteResult;

    expect(response.ok).toBe(true);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.success).toBe(true);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(String(sendMail.mock.calls[0]?.[0])).toBe(mailEndpoint);

    const recipients = [
      [body.demoAccess?.client, "https://cliente.example.test"],
      [body.demoAccess?.admin, "https://ristorante.example.test"],
    ] as const;

    for (const [access, origin] of recipients) {
      expect(access?.action).toBe(`${origin}/api/pilot/auth/demo/handoff`);
      const pass = access?.pass ?? "";
      expect(pass).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
      const [payload, signature] = pass.split(".");
      expect(signature).toBe(createHmac("sha256", handoffSecret).update(payload).digest("base64url"));

      const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      expect(claims).toEqual({ purpose: "landing-demo", origin, expires: expect.any(Number) });
      expect(claims.expires).toBeGreaterThan(completedAt);
      expect(claims.expires).toBeLessThanOrEqual(completedAt + 600_000);
    }
  });

  it("uses the public client and admin hosts after a free-trial request when links are unset", async () => {
    const response = await submit({
      ...demoFields,
      message: 'Richiesta inviata dopo il click sul pulsante "Inizia la prova gratuita".',
    });
    const body = await response.json() as DemoRouteResult;

    expect(body.demoAccess?.client.action).toBe("https://client.pizzaos.app/api/pilot/auth/demo/handoff");
    expect(body.demoAccess?.admin.action).toBe("https://admin.pizzaos.app/api/pilot/auth/demo/handoff");
  });

  it.each([undefined, "too-short"])("preserves successful submission when the handoff secret is %s", async (secret) => {
    vi.stubEnv("PIZZAOS_DEMO_HANDOFF_SECRET", secret);
    const response = await submit();
    const body = await response.json();

    expect(response.ok).toBe(true);
    expect(body).toMatchObject({ success: true });
    expect(body).not.toHaveProperty("demoAccess");
  });

  it("does not grant access after a successful contact request", async () => {
    const response = await submit({
      requestType: "contact",
      name: demoFields.name,
      emailOrPhone: demoFields.email,
      message: demoFields.message,
      policyConsent: demoFields.policyConsent,
    });
    const body = await response.json();

    expect(response.ok).toBe(true);
    expect(body).toMatchObject({ success: true });
    expect(body).not.toHaveProperty("demoAccess");
  });

  it("does not call the mail provider or grant access when a submission is invalid", async () => {
    const response = await submit({ ...demoFields, email: "" });
    const body = await response.json();

    expect(response.ok).toBe(false);
    expect(body).toMatchObject({ success: false });
    expect(body).not.toHaveProperty("demoAccess");
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("does not grant access when mail delivery fails", async () => {
    sendMail.mockResolvedValueOnce(Response.json({ success: false }, { status: 502 }));
    const response = await submit();
    const body = await response.json();

    expect(response.ok).toBe(false);
    expect(body).toMatchObject({ success: false });
    expect(body).not.toHaveProperty("demoAccess");
  });
});
