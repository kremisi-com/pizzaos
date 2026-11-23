import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createDemoAccess } from "./demo-access";

const landingOrigin = "https://landing.example.test";
const clientOrigin = "https://client.example.test";
const adminOrigin = "https://admin.example.test";
const handoffPath = "/api/pilot/auth/demo/handoff";
const modePath = "/api/pilot/auth/mode";
const handoffSecret = "test-only-landing-handoff-signature-secret";

const sessionOptions = {
  secret: "test-only-demo-session-secret",
  handoff: { secret: handoffSecret, origin: landingOrigin },
};

function signPass(origin: string, expires = Date.now() + 60_000) {
  const payload = Buffer.from(JSON.stringify({ purpose: "landing-demo", origin, expires })).toString("base64url");
  const signature = createHmac("sha256", handoffSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function requestHandoff(
  target: string,
  { pass, origin, method = "POST" }: { pass?: string; origin?: string; method?: string },
) {
  return new Request(`${target}${handoffPath}`, {
    method,
    headers: origin === undefined ? undefined : { Origin: origin },
    body: method === "POST" ? new URLSearchParams(pass === undefined ? {} : { pass }) : undefined,
  });
}

describe("POST /api/pilot/auth/demo/handoff", () => {
  const { handle } = createDemoAccess({ ...sessionOptions, password: "test-demo-password" });

  it.each([clientOrigin, adminOrigin])("opens /poc and creates a host-only demo session on %s", async (target) => {
    const pass = signPass(target);
    const request = () => requestHandoff(target, { origin: landingOrigin, pass });
    const response = await handle(request());

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/poc");
    const cookie = response?.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/;\s*HttpOnly(?:;|$)/i);
    expect(cookie).not.toMatch(/;\s*Domain=/i);

    const cookiePair = cookie.split(";", 1)[0];
    const modeResponse = await handle(new Request(`${target}${modePath}`, { headers: { Cookie: cookiePair } }));
    expect(modeResponse?.status).toBe(200);
    expect(await modeResponse?.json()).toMatchObject({ mode: "demo" });

    expect((await handle(request()))?.headers.get("set-cookie")).toMatch(/;\s*HttpOnly(?:;|$)/i);
  });

  it.each([
    ["admin", clientOrigin, adminOrigin],
    ["client", adminOrigin, clientOrigin],
  ])("refuses to open the %s POC with the other host's pass", async (_surface, signedOrigin, target) => {
    const response = await handle(requestHandoff(target, { origin: landingOrigin, pass: signPass(signedOrigin) }));

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/poc?errore=invito");
    expect(response?.headers.has("set-cookie")).toBe(false);
  });

  it.each([
    ["missing", () => undefined],
    ["expired", () => signPass(clientOrigin, Date.now() - 60_000)],
    ["altered", () => {
      const [payload, signature] = signPass(clientOrigin).split(".");
      const replacement = signature[0] === "A" ? "B" : "A";
      return `${payload}.${replacement}${signature.slice(1)}`;
    }],
  ])("rejects a %s pass without issuing a session cookie", async (_description, createPass) => {
    const response = await handle(requestHandoff(clientOrigin, { origin: landingOrigin, pass: createPass() }));

    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe("/poc?errore=invito");
    expect(response?.headers.has("set-cookie")).toBe(false);
  });

  it.each([undefined, "https://other.example.test", "null"])("refuses browser origin %s", async (origin) => {
    const response = await handle(requestHandoff(clientOrigin, { origin, pass: signPass(clientOrigin) }));

    expect(response?.status).toBe(403);
    expect(response?.headers.has("set-cookie")).toBe(false);
  });

  it("refuses methods other than POST", async () => {
    const response = await handle(requestHandoff(clientOrigin, { origin: landingOrigin, method: "GET" }));

    expect(response?.status).toBe(405);
    expect(response?.headers.has("set-cookie")).toBe(false);
  });

  it("cannot create a session when normal demo access is disabled", async () => {
    const disabled = createDemoAccess(sessionOptions);
    const response = await disabled.handle(requestHandoff(clientOrigin, {
      origin: landingOrigin,
      pass: signPass(clientOrigin),
    }));

    expect(response?.headers.has("set-cookie") ?? false).toBe(false);
    expect(response?.headers.get("location")).not.toBe("/poc");
  });
});
