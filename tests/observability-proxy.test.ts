// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as clientProxy from "../apps/client/app/api/pilot/[...path]/route";
import * as adminProxy from "../apps/admin/app/api/pilot/[...path]/route";

const appOrigin = "https://app.example.it";
const upstreamOrigin = "https://ordering.internal.example";
const requestId = "b80e12f1-690e-4dfa-809d-a1cc5ce36073";
const contexts = [{ name: "client", handlers: clientProxy }, { name: "admin", handlers: adminProxy }];

beforeEach(() => {
  vi.stubEnv("PIZZAOS_SERVICE_URL", upstreamOrigin);
  vi.stubEnv("PIZZAOS_PROXY_SECRET", "server-only-test-secret");
  vi.stubEnv("PIZZAOS_APP_ORIGIN", appOrigin);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe.each(contexts)("$name observability proxy acceptance", ({ handlers }) => {
  it.each([
    { status: 500, code: "internal_error" },
    { status: 503, code: "service_unavailable" },
  ])("preserves upstream $status and correlation while dropping caller-supplied identity", async ({ status, code }) => {
    let forwarded: Request | undefined;
    const raw = JSON.stringify({ code, message: "Servizio temporaneamente non disponibile", requestId });
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init);
      return new Response(raw, { status, headers: { "content-type": "application/json", "x-request-id": requestId } });
    }));
    const path = ["v1", "pilot", "stores"];
    const request = new Request(`${appOrigin}/api/pilot/${path.join("/")}`, { headers: { "x-request-id": "caller-spoofed-request-id" } });
    const response = await handlers.GET(request as Parameters<typeof handlers.GET>[0], { params: Promise.resolve({ path }) });
    expect(forwarded?.url).toBe(`${upstreamOrigin}/v1/pilot/stores`);
    expect(forwarded?.headers.has("x-request-id")).toBe(false);
    expect(response.status).toBe(status);
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(await response.text()).toBe(raw);
  });
});
