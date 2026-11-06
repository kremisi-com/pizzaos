// @vitest-environment node
// Real Auth.js + PostgreSQL; only SMTP is a local in-process protocol fixture.
import { randomUUID } from "node:crypto";
import { createServer, type Server, type Socket } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import type { OrderingService } from "./ordering-contract";
import { createOrderingAuth } from "./auth-runtime";
import { buildOrderingApp } from "./http-app";

const databaseUrl = process.env.PIZZAOS_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname !== "/pizzaos_individual_test") throw new Error("Auth tests require the dedicated pizzaos_individual_test database.");
const origin = "https://app.example.it";
const proxySecret = "only-a-local-test-proxy-secret";
const trusted = { "x-pizzaos-origin": origin, "x-pizzaos-proxy-secret": proxySecret, origin };
const unexpected = async (): Promise<never> => { throw new Error("Unexpected ordering operation during auth acceptance test"); };
function orderingPort(): OrderingService {
  return { session: async (actor) => ({ actor, superadmin: false, storeIds: [] }), stores: unexpected, catalog: unexpected, quote: unexpected, checkout: unexpected, additionQuote: unexpected, additions: unexpected, orders: unexpected, reconcile: unexpected, action: unexpected, notes: unexpected, saveStore: unexpected, invite: unexpected, events: unexpected, tick: unexpected };
}

class CookieJar {
  private values = new Map<string, string>();
  absorb(value: string | string[] | number | undefined): void {
    const cookies = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    for (const cookie of cookies) {
      const pair = cookie.split(";", 1)[0]!;
      const equals = pair.indexOf("=");
      if (equals >= 0) this.values.set(pair.slice(0, equals), pair.slice(equals + 1));
    }
  }
  get header(): string { return [...this.values].map(([name, value]) => `${name}=${value}`).join("; "); }
}

describe.skipIf(!databaseUrl)("real magic-link identity runtime", () => {
  let pool: Pool;
  let smtp: Server;
  let app: FastifyInstance;
  let auth: ReturnType<typeof createOrderingAuth>;
  const sockets = new Set<Socket>();
  const delivered: string[] = [];

  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl, max: 3 });
    smtp = createServer((socket) => {
      sockets.add(socket); socket.on("close", () => sockets.delete(socket));
      socket.setEncoding("utf8"); socket.write("220 localhost ESMTP test fixture\r\n");
      let buffer = "";
      let message: string[] | null = null;
      socket.on("data", (chunk: string) => {
        buffer += chunk;
        while (buffer.includes("\r\n")) {
          const boundary = buffer.indexOf("\r\n");
          const line = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          if (message !== null) {
            if (line === ".") { delivered.push(message.join("\r\n")); message = null; socket.write("250 Message accepted\r\n"); }
            else message.push(line.startsWith("..") ? line.slice(1) : line);
          } else if (/^EHLO|^HELO/i.test(line)) socket.write("250-localhost\r\n250 8BITMIME\r\n");
          else if (/^DATA$/i.test(line)) { message = []; socket.write("354 End with a dot\r\n"); }
          else if (/^QUIT$/i.test(line)) socket.end("221 Bye\r\n");
          else socket.write("250 OK\r\n");
        }
      });
    });
    await new Promise<void>((resolve) => smtp.listen(0, "127.0.0.1", resolve));
    const address = smtp.address();
    if (!address || typeof address === "string") throw new Error("Missing local SMTP address");
    auth = createOrderingAuth({ pool, secret: "local-test-auth-secret-at-least-thirty-two-characters", proxySecret, origins: [origin], googleClientId: "local-test-google-client", googleClientSecret: "local-test-google-secret", smtpUrl: `smtp://127.0.0.1:${address.port}`, emailFrom: "PizzaOS <ordini@example.it>" });
    app = buildOrderingApp({ service: orderingPort(), ...auth });
  });
  afterEach(() => { vi.useRealTimers(); });
  afterAll(async () => {
    await app?.close();
    for (const socket of sockets) socket.destroy();
    if (smtp) await new Promise<void>((resolve, reject) => smtp.close((error) => error ? reject(error) : resolve()));
    await pool?.end();
  });

  async function magicLink(email: string): Promise<string> {
    const cookies = new CookieJar();
    const csrf = await app.inject({ method: "GET", url: "/api/pilot/auth/csrf", headers: trusted });
    expect(csrf.statusCode).toBe(200); cookies.absorb(csrf.headers["set-cookie"]);
    const csrfBody: { csrfToken: string } = csrf.json();
    const before = delivered.length;
    const signin = await app.inject({ method: "POST", url: "/api/pilot/auth/signin/nodemailer", headers: { ...trusted, cookie: cookies.header, "content-type": "application/x-www-form-urlencoded" }, payload: new URLSearchParams({ csrfToken: csrfBody.csrfToken, email, callbackUrl: `${origin}/ordina` }).toString() });
    expect(signin.statusCode).toBeGreaterThanOrEqual(200); expect(signin.statusCode).toBeLessThan(400);
    expect(delivered.length).toBe(before + 1);
    const decoded = delivered.at(-1)!.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
    const link = decoded.match(/https?:\/\/[^\s<>"']+\/api\/pilot\/auth\/callback\/nodemailer\?[^\s<>"']+/)?.[0];
    expect(link, "SMTP email should contain an actual Auth.js magic callback URL").toBeTruthy();
    return link!.replace(/&amp;/g, "&");
  }
  const callbackPath = (link: string) => { const parsed = new URL(link); return `${parsed.pathname}${parsed.search}`; };

  it("trusts only the configured proxy secret and canonical app origin", () => {
    const request = (headers: Record<string, string>) => ({ headers }) as Parameters<typeof auth.authorizeProxy>[0];
    expect(auth.authorizeProxy(request(trusted))).toBe(true);
    expect(auth.authorizeProxy(request({ ...trusted, "x-pizzaos-proxy-secret": "forged" }))).toBe(false);
    expect(auth.authorizeProxy(request({ ...trusted, "x-pizzaos-origin": "https://foreign.example" }))).toBe(false);
    expect(auth.authorizeProxy(request({}))).toBe(false);
  });

  it("delivers a real one-time magic link, creates HttpOnly session and resolves authenticated identity", async () => {
    const email = `magic-${randomUUID()}@example.it`;
    const link = await magicLink(email);
    const callback = await app.inject({ method: "GET", url: callbackPath(link), headers: trusted });
    expect(callback.statusCode).toBeGreaterThanOrEqual(300); expect(callback.statusCode).toBeLessThan(400);
    const setCookies = callback.headers["set-cookie"];
    expect(JSON.stringify(setCookies)).toMatch(/session-token=.*HttpOnly/i);
    const cookies = new CookieJar(); cookies.absorb(setCookies);
    const session = await app.inject({ method: "GET", url: "/v1/pilot/session", headers: { ...trusted, cookie: cookies.header } });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({ actor: { id: expect.any(String), email }, superadmin: false });
    const replay = await app.inject({ method: "GET", url: callbackPath(link), headers: trusted });
    const replayCookies = new CookieJar(); replayCookies.absorb(replay.headers["set-cookie"]);
    const replaySession = await app.inject({ method: "GET", url: "/v1/pilot/session", headers: { ...trusted, cookie: replayCookies.header } });
    expect(replaySession.json()).toMatchObject({ actor: null });
  });

  it("does not turn an expired verification link into an authenticated session", async () => {
    const link = await magicLink(`expired-${randomUUID()}@example.it`);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 366 * 24 * 60 * 60 * 1000);
    const callback = await app.inject({ method: "GET", url: callbackPath(link), headers: trusted });
    const cookies = new CookieJar(); cookies.absorb(callback.headers["set-cookie"]);
    const session = await app.inject({ method: "GET", url: "/v1/pilot/session", headers: { ...trusted, cookie: cookies.header } });
    expect(session.json()).toMatchObject({ actor: null });
  });

  it("rejects forged session cookies and identity headers", async () => {
    const session = await app.inject({ method: "GET", url: "/v1/pilot/session", headers: { ...trusted, cookie: "authjs.session-token=forged; __Secure-authjs.session-token=forged", "x-user-id": "owner", "x-superadmin": "true" } });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toMatchObject({ actor: null, superadmin: false });
  });
});
