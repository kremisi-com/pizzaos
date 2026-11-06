// @vitest-environment node
// Acceptance tests derived only from operational-hosts requirements and public contracts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "../apps/admin/node_modules/next/server";
import { resolveOperationalHost } from "../apps/admin/src/composition/operational-host";
import { getOperationalAccess } from "../apps/admin/src/composition/operational-access";
import { middleware } from "../apps/admin/middleware";
import * as proxy from "../apps/admin/app/api/pilot/[...path]/route";

const adminOrigin = "https://admin.pizzaos.app";
const riderOrigin = "https://rider.pizzaos.app";
const serviceOrigin = "https://ordering.internal.example";
const secret = "operational-server-secret";
const actor = { id: "member-1", email: "member@example.test", name: "Persona" };
type Method = "GET" | "POST" | "PUT" | "PATCH";
type Surface = "admin" | "rider";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("PIZZAOS_APP_ORIGIN", adminOrigin);
  vi.stubEnv("PIZZAOS_RIDER_ORIGIN", riderOrigin);
  vi.stubEnv("PIZZAOS_SERVICE_URL", serviceOrigin);
  vi.stubEnv("PIZZAOS_PROXY_SECRET", secret);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

function resolve(host?: string, url = "http://localhost:3002/", extra: Record<string, string> = {}) {
  return resolveOperationalHost({ url, headers: new Headers({ ...extra, ...(host === undefined ? {} : { host }) }) });
}
function session(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
function call(method: Method, path: string[], options: { host?: string; origin?: string; body?: string; headers?: Record<string, string>; query?: string } = {}) {
  const host = options.host ?? "rider.pizzaos.app";
  const headers = new Headers({ host, ...options.headers });
  if (options.origin !== undefined) headers.set("origin", options.origin);
  const request = new NextRequest(`http://localhost:3002/api/pilot/${path.join("/")}${options.query ?? ""}`, {
    method, headers, ...(options.body === undefined ? {} : { body: options.body })
  });
  return proxy[method](request, { params: Promise.resolve({ path }) });
}

describe("operational host resolution", () => {
  it.each([
    ["admin.pizzaos.app", adminOrigin, "admin"],
    ["rider.pizzaos.app", riderOrigin, "rider"]
  ])("resolves canonical Host %s behind an internal URL", (host, origin, surface) => {
    expect(resolve(host)).toEqual({ origin, surface, separateHosts: true });
  });

  it("uses the URL host when Host is absent", () => {
    expect(resolve(undefined, `${riderOrigin}/accesso`)).toEqual({ origin: riderOrigin, surface: "rider", separateHosts: true });
  });

  it("does not let forwarded headers change an authorized host", () => {
    expect(resolve("admin.pizzaos.app", `${riderOrigin}/`, {
      "x-forwarded-host": "rider.pizzaos.app", "x-pizzaos-origin": riderOrigin,
      "x-pizzaos-user-id": "rider", "x-pizzaos-superadmin": "true"
    })).toEqual({ origin: adminOrigin, surface: "admin", separateHosts: true });
  });

  it.each(["foreign.example", "rider.pizzaos.app.evil.example", "pizzaos.app", "preview.pizzaos.app", "rider.pizzaos.app:444", "admin.pizzaos.app,rider.pizzaos.app"])("rejects unknown or spoofed Host %s", host => {
    expect(resolve(host, `${adminOrigin}/`, { "x-forwarded-host": "admin.pizzaos.app", "x-pizzaos-origin": adminOrigin })).toBeNull();
  });

  it.each([
    "https://user:password@rider.pizzaos.app", "https://rider.pizzaos.app/private",
    "https://rider.pizzaos.app?area=rider", "https://rider.pizzaos.app#rider",
    "http://rider.pizzaos.app", adminOrigin, "not an origin"
  ])("fails closed for invalid rider origin %s", origin => {
    vi.stubEnv("PIZZAOS_RIDER_ORIGIN", origin);
    expect(resolve("admin.pizzaos.app")).toBeNull();
    expect(resolve("rider.pizzaos.app")).toBeNull();
  });

  it("supports one configured local origin without declaring separate hosts", () => {
    vi.stubEnv("PIZZAOS_APP_ORIGIN", "http://localhost:3002");
    vi.stubEnv("PIZZAOS_RIDER_ORIGIN", "");
    expect(resolve("localhost:3002")).toEqual({ origin: "http://localhost:3002", surface: "admin", separateHosts: false });
    expect(resolve("localhost:3003")).toBeNull();
  });

  it("permits only loopback fallback in development when origins are absent", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PIZZAOS_APP_ORIGIN", ""); vi.stubEnv("PIZZAOS_RIDER_ORIGIN", "");
    expect(resolve("localhost:3002")).toEqual({ origin: "http://localhost:3002", surface: "admin", separateHosts: false });
    expect(resolve("admin.pizzaos.app", `${adminOrigin}/`)).toBeNull();
  });

  it("does not enable an unconfigured loopback fallback in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PIZZAOS_APP_ORIGIN", ""); vi.stubEnv("PIZZAOS_RIDER_ORIGIN", "");
    expect(resolve("localhost:3002")).toBeNull();
  });
});

describe("authoritative operational access", () => {
  it.each(["admin", "rider"] as const)("fetches the %s session with host origin, cookie and server secret, without caching", async surface => {
    let forwarded: Request | undefined;
    let options: RequestInit | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init); options = init;
      return session({ actor, superadmin: false, storeIds: ["roma"] });
    }));
    const origin = surface === "rider" ? riderOrigin : adminOrigin;
    expect(await getOperationalAccess(surface, "authjs.session-token=opaque", origin)).toBe("allowed");
    expect(forwarded?.url).toBe(`${serviceOrigin}/v1/pilot/${surface === "rider" ? "rider/" : ""}session`);
    expect(forwarded?.headers.get("cookie")).toBe("authjs.session-token=opaque");
    expect(forwarded?.headers.get("x-pizzaos-origin")).toBe(origin);
    expect(forwarded?.headers.get("x-pizzaos-proxy-secret")).toBe(secret);
    expect(options?.cache).toBe("no-store");
  });

  it.each([
    { surface: "admin", body: { actor: null, superadmin: false, storeIds: [] }, expected: "anonymous" },
    { surface: "rider", body: { actor: null, storeIds: [] }, expected: "anonymous" },
    { surface: "admin", body: { actor, superadmin: true, storeIds: [] }, expected: "allowed" },
    { surface: "admin", body: { actor, superadmin: false, storeIds: [] }, expected: "denied" },
    { surface: "rider", body: { actor, superadmin: true, storeIds: [] }, expected: "denied" },
    { surface: "rider", body: { actor, storeIds: ["roma"] }, expected: "allowed" }
  ])("classifies $surface access as $expected from the service", async ({ surface, body, expected }) => {
    vi.stubGlobal("fetch", vi.fn(async () => session(body)));
    expect(await getOperationalAccess(surface as Surface, "superadmin=true; storeIds=roma", surface === "rider" ? riderOrigin : adminOrigin)).toBe(expected);
  });

  it("does not elevate the same rider identity on the admin surface", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => new URL(String(input)).pathname.includes("/rider/")
      ? session({ actor, storeIds: ["roma"] }) : session({ actor, superadmin: false, storeIds: [] })));
    expect(await getOperationalAccess("rider", "session=same-person", riderOrigin)).toBe("allowed");
    expect(await getOperationalAccess("admin", "session=same-person", adminOrigin)).toBe("denied");
  });

  it.each([{}, null, { actor, storeIds: "roma", superadmin: false }, { actor, storeIds: [null], superadmin: false }, { actor: "forged", storeIds: ["roma"], superadmin: true }])("fails closed for malformed session %j", async body => {
    vi.stubGlobal("fetch", vi.fn(async () => session(body)));
    expect(await getOperationalAccess("admin", "session=opaque", adminOrigin)).toBe("unavailable");
  });

  it.each([302, 401, 403, 500, 503])("does not authorize on upstream HTTP %s", async status => {
    vi.stubGlobal("fetch", vi.fn(async () => session({ actor, storeIds: ["roma"], superadmin: true }, status)));
    expect(await getOperationalAccess("admin", "session=opaque", adminOrigin)).toBe("unavailable");
  });

  it("fails closed for invalid JSON and connection failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("invalid JSON")).mockRejectedValueOnce(new Error("network")));
    expect(await getOperationalAccess("rider", "session=opaque", riderOrigin)).toBe("unavailable");
    expect(await getOperationalAccess("rider", "session=opaque", riderOrigin)).toBe("unavailable");
  });

  it.each(["PIZZAOS_SERVICE_URL", "PIZZAOS_PROXY_SECRET", "PIZZAOS_APP_ORIGIN"])("does not fetch when %s is missing", async name => {
    vi.stubEnv(name, "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await getOperationalAccess("admin", "session=opaque", adminOrigin)).toBe("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects origins outside the configured set before session lookup", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await getOperationalAccess("admin", "session=opaque", "https://foreign.example")).toBe("unavailable");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("operational page middleware with NextRequest", () => {
  it.each([
    ["rider.pizzaos.app", "/operazioni", riderOrigin],
    ["admin.pizzaos.app", "/rider", adminOrigin]
  ])("returns the incompatible page on %s to its own home", async (host, path, origin) => {
    const response = await middleware(new NextRequest(`http://localhost:3002${path}`, { headers: { host, cookie: "session=opaque" } }));
    expect(response?.status).toBeGreaterThanOrEqual(300);
    expect(response?.status).toBeLessThan(400);
    expect(response?.headers.get("location")).toBe(`${origin}/`);
    expect(response?.headers.get("set-cookie")).toBeNull();
  });

  it.each(["/operazioni", "/rider"])("keeps %s available on a single configured local host", async path => {
    vi.stubEnv("PIZZAOS_APP_ORIGIN", "http://localhost:3002"); vi.stubEnv("PIZZAOS_RIDER_ORIGIN", "");
    const response = await middleware(new NextRequest(`http://localhost:3002${path}`));
    expect(response?.headers.get("location")).toBeNull();
  });
});

describe("host-aware operational API proxy", () => {
  it.each([
    { method: "GET", path: ["auth", "demo"] },
    { method: "POST", path: ["auth", "demo"] },
    { method: "POST", path: ["auth", "demo", "signout"] }
  ] as const)("blocks rider demo endpoint $method $path before any upstream fetch", async ({ method, path }) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call(method, [...path], { origin: riderOrigin,
      ...(method === "GET" ? {} : { body: "csrfToken=opaque" }) });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: expect.any(String), message: expect.any(String) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["GET", "POST", "PUT", "PATCH"] as const)("forwards allowed rider %s with the canonical origin and strips browser authority", async method => {
    let forwarded: Request | undefined;
    let options: RequestInit | undefined;
    let body: string | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init); options = init; body = await forwarded.text();
      return session({ ok: true });
    }));
    const response = await call(method, ["v1", "pilot", "rider", "deliveries"], {
      origin: riderOrigin, ...(method === "GET" ? {} : { body: '{"note":"Cliente assente"}' }),
      headers: { cookie: "session=rider", "content-type": "application/json", "x-pizzaos-origin": adminOrigin,
        "x-pizzaos-proxy-secret": "forged", "x-pizzaos-user-id": "other", "x-pizzaos-superadmin": "true", "x-forwarded-host": "admin.pizzaos.app" },
      query: "?storeId=roma"
    });
    expect(response.status).toBe(200);
    expect(forwarded?.url).toBe(`${serviceOrigin}/v1/pilot/rider/deliveries?storeId=roma`);
    expect(forwarded?.method).toBe(method);
    expect(forwarded?.headers.get("x-pizzaos-origin")).toBe(riderOrigin);
    expect(forwarded?.headers.get("x-pizzaos-proxy-secret")).toBe(secret);
    expect(forwarded?.headers.get("cookie")).toBe("session=rider");
    expect(forwarded?.headers.has("x-pizzaos-user-id")).toBe(false);
    expect(forwarded?.headers.has("x-pizzaos-superadmin")).toBe(false);
    expect(options?.cache).toBe("no-store");
    expect(options?.redirect).toBe("manual");
    if (method !== "GET") expect(body).toBe('{"note":"Cliente assente"}');
  });

  it.each([undefined, adminOrigin, "https://foreign.example", "null"])("rejects rider POST from Origin %s before forwarding", async origin => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("POST", ["v1", "pilot", "rider", "deliveries", "order-1", "dispatch"], { origin, body: "{}" });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: expect.any(String), message: expect.any(String) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["v1/pilot/session", "v1/pilot/orders", "v1/pilot/stores", "v1/pilot/analytics", "v1/pilot/rider-other/deliveries"])("blocks full restaurant API %s on rider host before fetch", async path => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("GET", path.split("/"));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: expect.any(String), message: expect.any(String) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows the admin endpoint and lets the service enforce its role response", async () => {
    let forwarded: Request | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init);
      return session({ code: "forbidden", message: "Accesso non abilitato" }, 403);
    }));
    const response = await call("GET", ["v1", "pilot", "orders"], { host: "admin.pizzaos.app", headers: { cookie: "session=rider" } });
    expect(forwarded?.headers.get("x-pizzaos-origin")).toBe(adminOrigin);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "forbidden", message: "Accesso non abilitato" });
  });

  it.each(["foreign.example", "rider.pizzaos.app.evil.example"])("blocks unconfigured host %s even with trusted-looking forwarded headers", async host => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("GET", ["v1", "pilot", "rider", "session"], { host, headers: { "x-forwarded-host": "rider.pizzaos.app", "x-pizzaos-origin": riderOrigin } });
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["PIZZAOS_SERVICE_URL", "PIZZAOS_PROXY_SECRET"])("returns public 503 for missing %s", async name => {
    vi.stubEnv(name, "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("GET", ["v1", "pilot", "rider", "session"]);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: expect.any(String), message: expect.any(String) });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not forward with invalid origin configuration", async () => {
    vi.stubEnv("PIZZAOS_RIDER_ORIGIN", "https://rider.pizzaos.app/private");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const response = await call("GET", ["v1", "pilot", "rider", "session"]);
    expect([403, 503]).toContain(response.status);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves host-only Auth.js cookies, callback query and provider redirects on rider host", async () => {
    let forwarded: Request | undefined;
    const cookie = "__Host-authjs.csrf-token=opaque; Path=/; Secure; HttpOnly; SameSite=Lax";
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      forwarded = new Request(input, init);
      return new Response(null, { status: 302, headers: { location: "https://accounts.google.com/signin", "set-cookie": cookie } });
    }));
    const response = await call("GET", ["auth", "signin", "google"], { query: "?callbackUrl=%2Frider", headers: { cookie: "csrf=opaque" } });
    expect(forwarded?.url).toBe(`${serviceOrigin}/api/pilot/auth/signin/google?callbackUrl=%2Frider`);
    expect(forwarded?.headers.get("x-pizzaos-origin")).toBe(riderOrigin);
    expect(forwarded?.headers.get("cookie")).toBe("csrf=opaque");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://accounts.google.com/signin");
    expect(response.headers.get("set-cookie")).toBe(cookie);
    expect(response.headers.get("set-cookie")).not.toMatch(/domain=/i);
    expect(response.headers.has("x-pizzaos-proxy-secret")).toBe(false);
  });

  it("preserves streamed rider responses without waiting for stream completion", async () => {
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({ start(value) { controller = value; value.enqueue(encoder.encode("data: {}\n\n")); } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(stream, { headers: { "content-type": "text/event-stream" } })));
    const response = await call("GET", ["v1", "pilot", "rider", "events"]);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const reader = response.body!.getReader();
    try { expect(new TextDecoder().decode((await reader.read()).value)).toBe("data: {}\n\n"); }
    finally { controller!.close(); await reader.cancel(); }
  });
});
