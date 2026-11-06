// @vitest-environment node
// Independent acceptance tests from the documented same-origin proxy contract.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as clientProxy from "../apps/client/app/api/pilot/[...path]/route";
import * as adminProxy from "../apps/admin/app/api/pilot/[...path]/route";

type Method = "GET" | "POST" | "PUT" | "PATCH";
const appOrigin = "https://app.example.it";
const upstreamOrigin = "https://ordering.internal.example";
const serverSecret = "server-only-test-secret";
const contexts = [{ name: "client", handlers: clientProxy }, { name: "admin", handlers: adminProxy }];

beforeEach(() => {
  vi.stubEnv("PIZZAOS_SERVICE_URL", upstreamOrigin);
  vi.stubEnv("PIZZAOS_PROXY_SECRET", serverSecret);
  vi.stubEnv("PIZZAOS_APP_ORIGIN", appOrigin);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe.each(contexts)("$name same-origin ordering proxy", ({ handlers }) => {
  const call = (method: Method, path: string[], request = new Request(`${appOrigin}/api/pilot/${path.join("/")}`, { method })) => handlers[method](request as Parameters<typeof handlers.GET>[0], { params: Promise.resolve({ path }) });

  it.each(["PIZZAOS_SERVICE_URL", "PIZZAOS_PROXY_SECRET"])("fails explicitly before fetching when %s is missing", async (name) => {
    vi.stubEnv(name, "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("GET", ["v1", "pilot", "session"]);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "service_unavailable", message: expect.any(String) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([undefined, "https://foreign.example", "null"])("rejects mutation origin %s without forwarding", async (origin) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const headers = new Headers({ "content-type": "application/json" });
    if (origin !== undefined) headers.set("origin", origin);
    const request = new Request(`${appOrigin}/api/pilot/v1/pilot/checkouts`, { method: "POST", headers, body: "{}" });
    const response = await call("POST", ["v1", "pilot", "checkouts"], request);
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "forbidden" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows guest GET, forwards query and cookie, preserves errors and Set-Cookie, disables caching", async () => {
    let forwarded: Request | undefined;
    let options: RequestInit | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init); options = init;
      return new Response('{"code":"inventory_changed","message":"Scorte cambiate"}', { status: 409, headers: { "content-type": "application/json", "set-cookie": "session=renewed; HttpOnly; Path=/; SameSite=Lax", "cache-control": "public, max-age=600" } });
    }));
    const request = new Request(`${appOrigin}/api/pilot/v1/pilot/events?cursor=42&storeId=roma`, { headers: { cookie: "session=current", "last-event-id": "41" } });
    const response = await call("GET", ["v1", "pilot", "events"], request);
    expect(forwarded?.url).toBe(`${upstreamOrigin}/v1/pilot/events?cursor=42&storeId=roma`);
    expect(forwarded?.headers.get("cookie")).toBe("session=current");
    expect(forwarded?.headers.get("last-event-id")).toBe("41");
    expect(options?.cache).toBe("no-store");
    expect(options?.redirect).toBe("manual");
    expect(response.status).toBe(409);
    expect(response.headers.get("set-cookie")).toContain("session=renewed");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({ code: "inventory_changed", message: "Scorte cambiate" });
  });

  it.each(["POST", "PUT", "PATCH"] as const)("forwards same-origin %s payload exactly and blocks browser identity headers", async (method) => {
    let forwarded: Request | undefined;
    let body: string | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init); body = await forwarded.text();
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }));
    const raw = '{ "notes": "Ben cotta", "quantity": 2 }';
    const headers = { origin: appOrigin, cookie: "session=verified", "content-type": "application/json", "x-pizzaos-user-id": "attacker", "x-pizzaos-customer-id": "victim", "x-pizzaos-superadmin": "true", "x-pizzaos-proxy-secret": "attacker-secret" };
    const request = new Request(`${appOrigin}/api/pilot/v1/pilot/orders/order-1/notes`, { method, headers, body: raw });
    expect((await call(method, ["v1", "pilot", "orders", "order-1", "notes"], request)).status).toBe(200);
    expect(forwarded?.method).toBe(method);
    expect(body).toBe(raw);
    expect(forwarded?.headers.get("cookie")).toBe("session=verified");
    expect(forwarded?.headers.get("content-type")).toBe("application/json");
    for (const name of ["x-pizzaos-user-id", "x-pizzaos-customer-id", "x-pizzaos-superadmin"]) expect(forwarded?.headers.has(name)).toBe(false);
    expect(forwarded?.headers.get("x-pizzaos-proxy-secret")).toBe(serverSecret);
  });

  it("maps Auth.js paths and preserves provider redirect responses", async () => {
    let forwarded: Request | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init);
      return new Response(null, { status: 302, headers: { location: "https://accounts.google.com/signin", "set-cookie": "auth-state=challenge; HttpOnly; Path=/" } });
    }));
    const request = new Request(`${appOrigin}/api/pilot/auth/signin/google?callbackUrl=%2Fordina`, { headers: { cookie: "csrf=valid" } });
    const response = await call("GET", ["auth", "signin", "google"], request);
    expect(forwarded?.url).toBe(`${upstreamOrigin}/api/pilot/auth/signin/google?callbackUrl=%2Fordina`);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.google.com/signin");
    expect(response.headers.get("set-cookie")).toContain("auth-state=challenge");
  });

  it("streams SSE before the upstream finishes without caching", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();
    const first = 'data: {"cursor":1,"events":[]}\n\n';
    const second = 'data: {"cursor":2,"events":[]}\n\n';
    const stream = new ReadableStream<Uint8Array>({ start(value) { controller = value; value.enqueue(encoder.encode(first)); } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { headers: { "content-type": "text/event-stream" } })));
    const response = await call("GET", ["v1", "pilot", "stream"]);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const reader = response.body!.getReader();
    try {
      expect(new TextDecoder().decode((await reader.read()).value)).toBe(first);
      controller!.enqueue(encoder.encode(second));
      expect(new TextDecoder().decode((await reader.read()).value)).toBe(second);
    } finally {
      controller!.close();
      await reader.cancel();
    }
  });

  it.each([["private"], ["v1", "admin"], ["v1", "pilot", "..", "..", "private"]])("rejects destination outside the public whitelist: %s", async (...path) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("GET", path);
    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a public unavailable error on upstream network failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("private backend address and stack"); }));
    const response = await call("GET", ["v1", "pilot", "session"]);
    expect(response.status).toBe(503);
    const body: unknown = await response.json();
    expect(body).toMatchObject({ code: "service_unavailable", message: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain("private backend address");
  });
});
