import { Auth, type AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import Nodemailer from "@auth/core/providers/nodemailer";
import PostgresAdapter from "@auth/pg-adapter";
import { createTransport } from "nodemailer";
import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { Pool } from "pg";
import type { IndividualActor } from "@pizzaos/domain";
import { createDemoAccess, DEMO_EMAIL } from "./demo-access";
import type { Diagnostics } from "./diagnostics";
import { orderingSubdomainForOrigin } from "./ordering-sites";

export interface OrderingAuthOptions {
  pool: Pool; secret: string; proxySecret: string; origins: string[];
  orderingDomain?: string;
  orderingAuthOrigin?: string;
  googleClientId: string; googleClientSecret: string; smtpUrl: string; emailFrom: string;
  demoPassword?: string;
  demoHandoff?: { secret: string; origin: string };
  diagnostics?: Diagnostics;
}
function equalSecret(actual: unknown, expected: string): boolean {
  if (typeof actual !== "string") return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Auth.js owns identity in this service, independently of the application UIs. */
export function createOrderingAuth(options: OrderingAuthOptions) {
  const adapter = PostgresAdapter(options.pool);
  const demo = createDemoAccess({ secret: options.secret, password: options.demoPassword, handoff: options.demoHandoff });
  const tenantOrigin = (origin: string) => !!options.orderingDomain && !options.origins.includes(origin) && !!orderingSubdomainForOrigin(origin, options.orderingDomain);
  const knownOrigin = (value: unknown): value is string => typeof value === "string" && (options.origins.includes(value) || tenantOrigin(value));
  function originOf(request: FastifyRequest): string {
    const origin = request.headers["x-pizzaos-origin"];
    if (!knownOrigin(origin)) throw new Error("Origine non consentita.");
    return origin;
  }
  function config(origin: string): AuthConfig {
    const proxyOrigin = options.orderingDomain && options.orderingAuthOrigin;
    const googleRedirectProxy = proxyOrigin && (origin === proxyOrigin || tenantOrigin(origin)) ? `${proxyOrigin}/api/pilot/auth` : undefined;
    return {
      secret: options.secret, adapter, basePath: "/api/pilot/auth", trustHost: true,
      useSecureCookies: origin.startsWith("https:"),
      session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
      pages: { signIn: "/accesso", verifyRequest: "/accesso?verifica=1", error: "/accesso" },
      providers: [
        // Linking is limited to Google's cryptographically authenticated profile
        // and the verified-email guard below; magic-link identity uses that email.
        Google({ clientId: options.googleClientId, clientSecret: options.googleClientSecret, allowDangerousEmailAccountLinking: true,
          ...(googleRedirectProxy ? { redirectProxyUrl: googleRedirectProxy } : {}) }),
        Nodemailer({ server: options.smtpUrl, from: options.emailFrom, maxAge: 15 * 60,
          async sendVerificationRequest({ identifier, url }) {
            const result = await createTransport(options.smtpUrl).sendMail({ to: identifier, from: options.emailFrom, subject: "Accedi a PizzaOS", text: `Apri questo link per accedere a PizzaOS:\n${url}\n\nIl link scade tra 15 minuti. Se non hai richiesto l'accesso, ignora questa email.` });
            if (result.rejected.length || (result.pending?.length ?? 0)) throw new Error("Email non consegnata.");
          }
        })
      ],
      callbacks: {
        async signIn({ account, profile, user }) { return user.email?.trim().toLowerCase() !== DEMO_EMAIL && (account?.provider !== "google" || profile?.email_verified === true); },
        async redirect({ url }) { const target = new URL(url, origin); return target.origin === origin ? target.href : origin; },
        async session({ session, user }) { return { ...session, user: { ...session.user, id: String(user.id) } }; }
      },
      logger: {
        error(error) { options.diagnostics?.report(error, { operation: "authentication", provider: "authjs" }); },
        warn() { options.diagnostics?.record("authentication_warning", { operation: "authentication", provider: "authjs" }); }
      }
    };
  }
  return {
    isDemoRequest(request: FastifyRequest) {
      const origin = originOf(request);
      return !tenantOrigin(origin) && demo.isActive(typeof request.headers.cookie === "string" ? request.headers.cookie : "", origin);
    },
    authorizeProxy(request: FastifyRequest) {
      return equalSecret(request.headers["x-pizzaos-proxy-secret"], options.proxySecret) && knownOrigin(request.headers["x-pizzaos-origin"]);
    },
    async authHandler(request: FastifyRequest): Promise<Response> {
      const origin = originOf(request);
      const headers = new Headers();
      for (const name of ["cookie", "content-type", "origin"]) { const value = request.headers[name]; if (typeof value === "string") headers.set(name, value); }
      headers.set("host", new URL(origin).host);
      const body = request.method === "GET" ? undefined : typeof request.body === "string" ? request.body : JSON.stringify(request.body);
      const webRequest = new Request(new URL(request.url, origin), { method: request.method, headers, body });
      const path = new URL(webRequest.url).pathname;
      const tenant = tenantOrigin(origin);
      if (tenant && path.startsWith("/api/pilot/auth/demo")) {
        if (request.method === "GET" && path === "/api/pilot/auth/demo") {
          return Response.json({ enabled: false, active: false }, { headers: { "cache-control": "no-store" } });
        }
        return Response.json({ code: "not_found", message: "Accesso demo non disponibile." }, { status: 404 });
      }
      const demoResponse = tenant ? undefined : await demo.handle(webRequest.clone());
      if (demoResponse) return demoResponse;
      if (new URL(webRequest.url).pathname === "/api/pilot/auth/session" && demo.isActive(headers.get("cookie") ?? "", origin)) return Response.json(null, { headers: { "cache-control": "no-store" } });
      const response = await Auth(webRequest, config(origin));
      const output = new Headers(response.headers);
      output.set("cache-control", "no-store");
      if (response.headers.getSetCookie().some(value => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?=[^;]/.test(value) && !/Max-Age=0(?:;|$)/i.test(value))) output.append("set-cookie", demo.clearSession(origin));
      return new Response(response.body, { status: response.status, headers: output });
    },
    async authenticate(request: FastifyRequest): Promise<IndividualActor | null> {
      const origin = originOf(request);
      if (!tenantOrigin(origin) && demo.isActive(typeof request.headers.cookie === "string" ? request.headers.cookie : "", origin)) throw Object.assign(new Error("La demo non può accedere alle operazioni reali."), { statusCode: 403, code: "demo_session" });
      const response = await Auth(new Request(`${origin}/api/pilot/auth/session`, { headers: { cookie: typeof request.headers.cookie === "string" ? request.headers.cookie : "" } }), config(origin));
      const session: unknown = await response.json();
      if (!session || typeof session !== "object" || !("user" in session)) return null;
      const user = session.user;
      if (!user || typeof user !== "object" || !("id" in user) || !("email" in user) || typeof user.email !== "string" || !user.email) return null;
      if (user.email.trim().toLowerCase() === DEMO_EMAIL) return null;
      const name = "name" in user && typeof user.name === "string" && user.name.trim() ? user.name : user.email.split("@")[0];
      return { id: String(user.id), email: user.email.toLowerCase(), name };
    }
  };
}
