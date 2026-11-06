// @vitest-environment node
// Independent acceptance tests derived only from the demo requirements and public contract.
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import type { OrderingService } from "./ordering-contract";
import { createOrderingAuth } from "./auth-runtime";
import { buildOrderingApp } from "./http-app";

const origin = "https://app.example.it";
const otherOrigin = "https://admin.example.it";
const password = "demo-acceptance-private-password";
const proxySecret = "demo-acceptance-proxy-secret";
const trusted = (appOrigin = origin) => ({ "x-pizzaos-origin": appOrigin, "x-pizzaos-proxy-secret": proxySecret, origin: appOrigin });
const unexpected = async (): Promise<never> => { throw new Error("Demo must not invoke persistent ordering services"); };

function orderingPort(): OrderingService {
  return {
    session: vi.fn(async (actor) => ({ actor, superadmin: false, storeIds: [] })),
    stores: vi.fn(async () => []), catalog: vi.fn(unexpected), quote: vi.fn(unexpected),
    checkout: vi.fn(unexpected), additionQuote: vi.fn(unexpected), additions: vi.fn(unexpected),
    orders: vi.fn(async (actor) => { if (!actor) throw Object.assign(new Error("Accesso richiesto"), { code: "unauthorized", statusCode: 401 }); return []; }),
    reconcile: vi.fn(unexpected), action: vi.fn(unexpected), notes: vi.fn(unexpected),
    saveStore: vi.fn(unexpected), invite: vi.fn(unexpected), events: vi.fn(unexpected), tick: vi.fn(unexpected),
  };
}

const cookieLines = (header: string | string[] | number | undefined): string[] => Array.isArray(header) ? header : typeof header === "string" ? [header] : [];
const clearsCookie = (line: string, name: string): boolean => {
  if (!line.startsWith(`${name}=`)) return false;
  const maxAge = line.match(/;\s*Max-Age=(-?\d+)/i)?.[1];
  const expires = line.match(/;\s*Expires=([^;]+)/i)?.[1];
  return (maxAge !== undefined && Number(maxAge) <= 0) || (expires !== undefined && Date.parse(expires) < Date.now());
};
class CookieJar {
  private readonly values = new Map<string, string>();
  absorb(header: string | string[] | number | undefined): void {
    for (const line of cookieLines(header)) {
      const pair = line.split(";", 1)[0]!;
      const equals = pair.indexOf("=");
      const name = pair.slice(0, equals);
      const value = pair.slice(equals + 1);
      if (!value || /max-age=0(?:;|$)/i.test(line)) this.values.delete(name);
      else this.values.set(name, value);
    }
  }
  get header(): string { return [...this.values].map(([name, value]) => `${name}=${value}`).join("; "); }
}

const resources: { app: FastifyInstance; pool: Pool; query: ReturnType<typeof vi.spyOn>; connect: ReturnType<typeof vi.spyOn> }[] = [];
function fixture(demoPassword: string | undefined = password, appOrigins = [origin, otherOrigin]) {
  const pool = new Pool({ connectionString: "postgres://unused:unused@127.0.0.1:1/never_connect", connectionTimeoutMillis: 50 });
  const query = vi.spyOn(pool, "query").mockImplementation(() => { throw new Error("Demo must not query the database"); });
  const connect = vi.spyOn(pool, "connect").mockImplementation(() => { throw new Error("Demo must not connect to the database"); });
  const auth = createOrderingAuth({ pool, secret: "demo-acceptance-auth-secret-at-least-thirty-two-characters", proxySecret, origins: appOrigins, googleClientId: "acceptance-google", googleClientSecret: "acceptance-google-secret", smtpUrl: "smtp://127.0.0.1:1", emailFrom: "PizzaOS <ordini@example.it>", demoPassword });
  const service = orderingPort();
  const app = buildOrderingApp({ service, ...auth });
  resources.push({ app, pool, query, connect });
  return { app, auth, service };
}
afterEach(async () => {
  vi.useRealTimers();
  for (const { app, pool, query, connect } of resources.splice(0)) {
    await app.close(); await pool.end();
    expect(query, "Demo and anonymous session operations must remain database-free").not.toHaveBeenCalled();
    expect(connect).not.toHaveBeenCalled();
  }
});

async function challenge(app: FastifyInstance, appOrigin = origin, cookies = new CookieJar()) {
  const response = await app.inject({ method: "GET", url: "/api/pilot/auth/demo", headers: { ...trusted(appOrigin), cookie: cookies.header } });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toContain("no-store");
  cookies.absorb(response.headers["set-cookie"]);
  const body: { enabled: boolean; active: boolean; csrfToken: string } = response.json();
  return { cookies, body, response };
}
async function login(app: FastifyInstance, options: { email?: string; password?: string; appOrigin?: string; cookies?: CookieJar } = {}) {
  const appOrigin = options.appOrigin ?? origin;
  const csrf = await challenge(app, appOrigin, options.cookies);
  const response = await app.inject({ method: "POST", url: "/api/pilot/auth/demo", headers: { ...trusted(appOrigin), cookie: csrf.cookies.header, "content-type": "application/x-www-form-urlencoded" }, payload: new URLSearchParams({ email: options.email ?? "poc@pizzaos.app", password: options.password ?? password, csrfToken: csrf.body.csrfToken }).toString() });
  csrf.cookies.absorb(response.headers["set-cookie"]);
  return { response, cookies: csrf.cookies };
}
async function mode(app: FastifyInstance, cookie = "", appOrigin = origin) {
  const response = await app.inject({ method: "GET", url: "/api/pilot/auth/mode", headers: { ...trusted(appOrigin), cookie } });
  expect(response.statusCode).toBe(200);
  expect(response.headers["cache-control"]).toContain("no-store");
  return response.json();
}

describe("demo session public authentication boundary", () => {
  it("defaults to live, advertises enabled demo and never returns private credentials", async () => {
    const { app } = fixture();
    expect(await mode(app)).toEqual({ mode: "live" });
    const { body, response } = await challenge(app);
    expect(body).toEqual({ enabled: true, active: false, csrfToken: expect.any(String) });
    expect(body.csrfToken.length).toBeGreaterThan(0);
    expect(response.body).not.toContain(password);
    expect(response.body).not.toContain(proxySecret);
    const csrfCookie = cookieLines(response.headers["set-cookie"]).find((line) => line.startsWith("__Host-pizzaos.demo-csrf="));
    expect(csrfCookie).toMatch(/HttpOnly/i);
    expect(csrfCookie).toMatch(/SameSite=Lax/i);
    expect(csrfCookie).toMatch(/; Secure(?:;|$)/i);
    expect(csrfCookie).not.toMatch(/; Domain=/i);
  });

  it("disables the demo without a server password", async () => {
    const { app } = fixture("");
    expect((await challenge(app)).body).toMatchObject({ enabled: false, active: false });
    const result = await login(app);
    expect(result.response.statusCode).toBe(303);
    expect(result.response.headers.location).toBe("/accesso?errore=demo");
    expect(await mode(app, result.cookies.header)).toEqual({ mode: "live" });
  });

  it.each([{ email: "other@example.it" }, { password: "incorrect" }])("rejects incorrect credentials with a local redirect: %j", async (credentials) => {
    const { app } = fixture();
    const { response, cookies } = await login(app, credentials);
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe("/accesso?errore=demo");
    expect(await mode(app, cookies.header)).toEqual({ mode: "live" });
  });

  it("normalizes the demo email, establishes a host-only eight-hour session and clears real sessions", async () => {
    const { app } = fixture();
    const cookies = new CookieJar();
    cookies.absorb(["authjs.session-token=old-real-session", "__Secure-authjs.session-token=old-secure-session"]);
    const result = await login(app, { email: "  POC@PizzaOS.App  ", cookies });
    expect(result.response.statusCode).toBe(303);
    expect(result.response.headers.location).toBe("/");
    expect(result.response.headers["cache-control"]).toContain("no-store");
    const lines = cookieLines(result.response.headers["set-cookie"]);
    const session = lines.find((line) => line.startsWith("__Host-pizzaos.demo-session="));
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).toMatch(/; Secure(?:;|$)/i);
    expect(session).toMatch(/; Path=\/(?:;|$)/i);
    expect(session).not.toMatch(/; Domain=/i);
    expect(session).not.toContain(password);
    for (const name of ["authjs.session-token", "__Secure-authjs.session-token"]) {
      expect(lines.some((line) => clearsCookie(line, name)), `Login must clear ${name}`).toBe(true);
    }
    expect(await mode(app, cookies.header)).toEqual({ mode: "demo" });
    expect((await challenge(app, origin, cookies)).body).toMatchObject({ enabled: true, active: true });
    vi.useFakeTimers({ toFake: ["Date"] });
    const issuedAt = Date.now();
    vi.setSystemTime(issuedAt + 8 * 60 * 60 * 1000 - 1000);
    expect(await mode(app, cookies.header)).toEqual({ mode: "demo" });
    vi.setSystemTime(issuedAt + 8 * 60 * 60 * 1000 + 1000);
    expect(await mode(app, cookies.header)).toEqual({ mode: "live" });
  });

  it("uses unprefixed host-only cookies on an HTTP origin", async () => {
    const httpOrigin = "http://localhost:3000";
    const { app } = fixture(password, [httpOrigin]);
    const { response, cookies } = await login(app, { appOrigin: httpOrigin });
    expect(response.statusCode).toBe(303);
    const session = cookieLines(response.headers["set-cookie"]).find((line) => line.startsWith("pizzaos.demo-session="));
    expect(session).toMatch(/HttpOnly/i);
    expect(session).not.toMatch(/; (?:Secure|Domain=)/i);
    expect(await mode(app, cookies.header, httpOrigin)).toEqual({ mode: "demo" });
  });

  it.each(["missing-token", "missing-cookie", "wrong-token", "missing-origin", "foreign-origin"])("refuses login with %s", async (invalid) => {
    const { app } = fixture();
    const { cookies, body } = await challenge(app);
    const headers: Record<string, string> = { ...trusted(), cookie: cookies.header, "content-type": "application/x-www-form-urlencoded" };
    if (invalid === "missing-cookie") delete headers.cookie;
    if (invalid === "missing-origin") delete headers.origin;
    if (invalid === "foreign-origin") headers.origin = "https://attacker.example";
    const response = await app.inject({ method: "POST", url: "/api/pilot/auth/demo", headers, payload: new URLSearchParams({ email: "poc@pizzaos.app", password, csrfToken: invalid === "missing-token" ? "" : invalid === "wrong-token" ? "forged" : body.csrfToken }).toString() });
    expect(response.statusCode).toBe(403);
    cookies.absorb(response.headers["set-cookie"]);
    expect(await mode(app, cookies.header)).toEqual({ mode: "live" });
  });

  it("rejects expired or cross-origin CSRF challenges", async () => {
    const { app } = fixture();
    const { body, cookies } = await challenge(app);
    const submit = (appOrigin: string) => app.inject({ method: "POST", url: "/api/pilot/auth/demo", headers: { ...trusted(appOrigin), cookie: cookies.header, "content-type": "application/x-www-form-urlencoded" }, payload: new URLSearchParams({ email: "poc@pizzaos.app", password, csrfToken: body.csrfToken }).toString() });
    expect((await submit(otherOrigin)).statusCode).toBe(403);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 8 * 60 * 60 * 1000 + 1000);
    expect((await submit(origin)).statusCode).toBe(403);
  });

  it("rejects forged cookies, modified sessions, another origin and sessions signed before password rotation", async () => {
    const { app } = fixture();
    expect(await mode(app, "__Host-pizzaos.demo-session=forged; pizzaos.demo-session=forged")).toEqual({ mode: "live" });
    const { cookies } = await login(app);
    const modified = cookies.header.replace(/(__Host-pizzaos\.demo-session=)([^;]+)/, (_, name: string, value: string) => `${name}${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`);
    expect(modified).not.toBe(cookies.header);
    expect(await mode(app, modified)).toEqual({ mode: "live" });
    expect(await mode(app, cookies.header, otherOrigin)).toEqual({ mode: "live" });
    const rotated = fixture("rotated-private-password");
    expect(await mode(rotated.app, cookies.header)).toEqual({ mode: "live" });
    const disabled = fixture("");
    expect(await mode(disabled.app, cookies.header)).toEqual({ mode: "live" });
  });

  it("requires the trusted proxy on all demo authentication endpoints", async () => {
    const { app } = fixture();
    for (const url of ["/api/pilot/auth/mode", "/api/pilot/auth/demo", "/api/pilot/auth/demo/signout"]) {
      const response = await app.inject({ method: url.endsWith("signout") ? "POST" : "GET", url, headers: { origin } });
      expect(response.statusCode).toBe(403);
    }
    expect((await app.inject({ method: "POST", url: "/api/pilot/auth/demo", headers: { ...trusted(), "x-pizzaos-proxy-secret": "forged", "content-type": "application/x-www-form-urlencoded" }, payload: "email=poc%40pizzaos.app" })).statusCode).toBe(403);
  });

  it("signs out only with valid CSRF and clears demo and real session cookies", async () => {
    const { app } = fixture();
    const { cookies } = await login(app);
    cookies.absorb(["authjs.session-token=residual-real-session", "__Secure-authjs.session-token=residual-secure-session"]);
    const csrf = await challenge(app, origin, cookies);
    const submit = (csrfToken: string, browserOrigin = origin) => app.inject({ method: "POST", url: "/api/pilot/auth/demo/signout", headers: { ...trusted(), origin: browserOrigin, cookie: cookies.header, "content-type": "application/x-www-form-urlencoded" }, payload: new URLSearchParams({ csrfToken }).toString() });
    expect((await submit("forged")).statusCode).toBe(403);
    expect((await submit(csrf.body.csrfToken, "https://attacker.example")).statusCode).toBe(403);
    expect(await mode(app, cookies.header)).toEqual({ mode: "demo" });
    const response = await submit(csrf.body.csrfToken);
    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe("/accesso");
    const lines = cookieLines(response.headers["set-cookie"]);
    for (const name of ["__Host-pizzaos.demo-session", "authjs.session-token", "__Secure-authjs.session-token"]) {
      expect(lines.some((line) => clearsCookie(line, name)), `Logout must clear ${name}`).toBe(true);
    }
    cookies.absorb(response.headers["set-cookie"]);
    expect(await mode(app, cookies.header)).toEqual({ mode: "live" });
  });

  it("never resolves a demo session as a real actor", async () => {
    const { app, auth } = fixture();
    app.get("/acceptance/actor", async (request) => auth.authenticate(request));
    const { cookies } = await login(app);
    const response = await app.inject({ method: "GET", url: "/acceptance/actor", headers: { ...trusted(), cookie: cookies.header } });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "demo_session" });
  });

  it("rejects every persistent pilot operation before invoking any service", async () => {
    const { app, service } = fixture();
    const { cookies } = await login(app);
    const operations = [
      ["GET", "/v1/pilot/session"], ["GET", "/v1/pilot/stores"], ["GET", "/v1/pilot/stores/roma"],
      ["GET", "/v1/pilot/orders"], ["GET", "/v1/pilot/events?cursor=0"], ["GET", "/v1/pilot/stream"],
      ["GET", "/v1/pilot/analytics"], ["GET", "/v1/pilot/rider"], ["GET", "/v1/pilot/future-capability"],
      ["POST", "/v1/pilot/quote"], ["POST", "/v1/pilot/checkouts"], ["PUT", "/v1/pilot/stores/roma"],
      ["POST", "/v1/pilot/stores/roma/invitations"], ["POST", "/v1/pilot/orders/order-1/reconcile"],
      ["POST", "/v1/pilot/orders/order-1/actions"], ["POST", "/v1/pilot/orders/order-1/addition-quote"],
      ["POST", "/v1/pilot/orders/order-1/additions"], ["PATCH", "/v1/pilot/orders/order-1/notes"],
      ["POST", "/v1/pilot/orders/order-1/rider"],
    ] as const;
    for (const [method, url] of operations) {
      const response = await app.inject({ method, url, headers: { ...trusted(), cookie: cookies.header, "content-type": "application/json" }, ...(method === "GET" ? {} : { payload: "{}" }) });
      expect(response.statusCode, `${method} ${url}`).toBe(403);
      expect(response.json()).toMatchObject({ code: "demo_session" });
    }
    for (const operation of Object.values(service)) expect(operation).not.toHaveBeenCalled();
  });

  it.each([
    ["POST", "/v1/%70ilot/quote"],
    ["POST", "/v1/pilot/%71uote"],
    ["GET", "/v1/pilot/%73tream"],
    ["GET", "/v1/pilot/%73ession"],
    ["GET", "/v1/%70ilot/session"],
    ["GET", "/%76%31/pilot/session"],
    ["GET", "/v1/%70ilot/%73ession?source=acceptance"],
  ] as const)("isolates demo operations regardless of URL spelling: %s %s", async (method, url) => {
    const { app, service } = fixture();
    const { cookies } = await login(app);
    const response = await app.inject({ method, url, headers: { ...trusted(), cookie: cookies.header, "content-type": "application/json" }, ...(method === "GET" ? {} : { payload: "{}" }) });
    for (const operation of Object.values(service)) expect(operation, `${method} ${url} must not invoke an ordering service`).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "demo_session" });
  });

  it.each([
    ["GET", "/v2/operations/future-report"],
    ["POST", "/v2/operations/future-command"],
  ] as const)("isolates future persistent endpoints outside the pilot namespace: %s %s", async (method, url) => {
    const { app, service } = fixture();
    const handler = vi.fn(async () => service.stores(null));
    app.route({ method, url, handler });
    const guest = await app.inject({ method, url, headers: trusted() });
    expect(guest.statusCode, "The regression fixture must expose a reachable operational endpoint").toBe(200);
    expect(handler).toHaveBeenCalledOnce();
    handler.mockClear();
    for (const operation of Object.values(service)) vi.mocked(operation).mockClear();
    const { cookies } = await login(app);
    const response = await app.inject({ method, url, headers: { ...trusted(), cookie: cookies.header } });
    expect(handler, "Demo must be rejected before a future endpoint handler can run").not.toHaveBeenCalled();
    for (const operation of Object.values(service)) expect(operation).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "demo_session" });
  });

  it("preserves guest session and discovery and continues rejecting guest order reads", async () => {
    const { app, service } = fixture();
    const session = await app.inject({ method: "GET", url: "/v1/pilot/session", headers: trusted() });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toEqual({ actor: null, superadmin: false, storeIds: [] });
    expect((await app.inject({ method: "GET", url: "/v1/pilot/stores", headers: trusted() })).statusCode).toBe(200);
    const orders = await app.inject({ method: "GET", url: "/v1/pilot/orders", headers: trusted() });
    expect(orders.statusCode).toBe(401);
    expect(orders.json()).toMatchObject({ code: "unauthorized" });
    expect(service.session).toHaveBeenCalledWith(null);
  });
});
