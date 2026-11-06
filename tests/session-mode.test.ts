// @vitest-environment node
// App acceptance tests against the server-verified experience-mode public contract.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExperienceMode as clientMode } from "../apps/client/src/composition/session-mode";
import { getExperienceMode as adminMode } from "../apps/admin/src/composition/session-mode";

const appOrigin = "https://app.example.it";
const serviceOrigin = "https://ordering.internal.example";
const proxySecret = "server-only-mode-test-secret";
const demoCookie = "__Host-pizzaos.demo-session=opaque-session";

beforeEach(() => {
  vi.stubEnv("PIZZAOS_SERVICE_URL", serviceOrigin);
  vi.stubEnv("PIZZAOS_PROXY_SECRET", proxySecret);
  vi.stubEnv("PIZZAOS_APP_ORIGIN", appOrigin);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe.each([{ name: "client", getExperienceMode: clientMode }, { name: "admin", getExperienceMode: adminMode }])("$name experience mode", ({ getExperienceMode }) => {
  it.each(["", "authjs.session-token=real-session", "unrelated=1", "pizzaos.demo-session-spoof=fake"])("returns live without a demo cookie: %s", async (cookie) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    vi.stubEnv("PIZZAOS_MODE", "demo");
    expect(await getExperienceMode(cookie)).toBe("live");
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([demoCookie, "pizzaos.demo-session=opaque-http-session"])("requires a verified service response and forwards server credentials: %s", async (cookie) => {
    let forwarded: Request | undefined;
    let options: RequestInit | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init); options = init;
      return new Response(JSON.stringify({ mode: "demo" }), { status: 200, headers: { "content-type": "application/json" } });
    }));
    expect(await getExperienceMode(cookie)).toBe("demo");
    expect(forwarded?.url).toBe(`${serviceOrigin}/api/pilot/auth/mode`);
    expect(forwarded?.headers.get("cookie")).toBe(cookie);
    expect(forwarded?.headers.get("x-pizzaos-origin")).toBe(appOrigin);
    expect(forwarded?.headers.get("x-pizzaos-proxy-secret")).toBe(proxySecret);
    expect(options?.cache).toBe("no-store");
    expect(options?.redirect).toBe("manual");
  });

  it.each([{ mode: "live" }, {}, { mode: "DEMO" }, { mode: true }, { active: true }, null])("fails closed for unverified mode payload %j", async (body) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } })));
    expect(await getExperienceMode(demoCookie)).toBe("live");
  });

  it.each([401, 403, 500, 503])("fails closed on upstream status %s even with a demo body", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"mode":"demo"}', { status })));
    expect(await getExperienceMode(demoCookie)).toBe("live");
  });

  it("fails closed on upstream redirect, malformed JSON and network error", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://attacker.example" } }))
      .mockResolvedValueOnce(new Response("not JSON", { status: 200 }))
      .mockRejectedValueOnce(new Error("Service unavailable"));
    vi.stubGlobal("fetch", fetch);
    for (let attempt = 0; attempt < 3; attempt++) expect(await getExperienceMode(demoCookie)).toBe("live");
  });

  it.each(["PIZZAOS_SERVICE_URL", "PIZZAOS_PROXY_SECRET", "PIZZAOS_APP_ORIGIN"])("fails closed before fetching when %s is absent", async (name) => {
    vi.stubEnv(name, "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await getExperienceMode(demoCookie)).toBe("live");
    expect(fetch).not.toHaveBeenCalled();
  });
});
