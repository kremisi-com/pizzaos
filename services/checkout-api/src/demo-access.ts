import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SESSION_SECONDS = 8 * 60 * 60;
const HANDOFF_MILLISECONDS = 10 * 60 * 1000;
export const DEMO_EMAIL = "poc@pizzaos.app";
type Purpose = "session" | "csrf";
interface Token { purpose: Purpose; origin: string; expires: number; nonce: string; }

function equal(actual: string, expected: string): boolean {
  return timingSafeEqual(createHash("sha256").update(actual).digest(), createHash("sha256").update(expected).digest());
}
function cookieValues(header: string): Map<string, string> {
  return new Map(header.split(";").map(part => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), part.slice(index + 1)] as const;
  }));
}

function validHandoff(pass: string, origin: string, secret: string): boolean {
  if (pass.length > 2048) return false;
  const [payload, signature, extra] = pass.split(".");
  if (!payload || !signature || extra !== undefined) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!equal(signature, expected)) return false;
  try {
    const grant = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<{
      purpose: string;
      origin: string;
      expires: number;
    }>;
    const now = Date.now();
    return grant.purpose === "landing-demo" && grant.origin === origin && typeof grant.expires === "number"
      && grant.expires > now && grant.expires <= now + HANDOFF_MILLISECONDS;
  } catch { return false; }
}

/** Separate, origin-bound demo identity. It never creates a production actor or queries persistence. */
export function createDemoAccess(options: { secret: string; password?: string; handoff?: { secret: string; origin: string } }) {
  const key = createHash("sha256").update(`${options.secret}\0demo\0${options.password ?? ""}`).digest();
  const enabled = Boolean(options.password);
  const name = (purpose: Purpose, origin: string) => `${origin.startsWith("https:") ? "__Host-" : ""}pizzaos.demo-${purpose}`;
  const signature = (payload: string) => createHmac("sha256", key).update(payload).digest("base64url");
  function token(purpose: Purpose, origin: string): string {
    const payload = Buffer.from(JSON.stringify({ purpose, origin, expires: Date.now() + SESSION_SECONDS * 1000, nonce: randomBytes(24).toString("base64url") } satisfies Token)).toString("base64url");
    return `${payload}.${signature(payload)}`;
  }
  function valid(value: string, purpose: Purpose, origin: string): boolean {
    if (!enabled || value.length > 2048) return false;
    const [payload, signed, extra] = value.split(".");
    if (!payload || !signed || extra !== undefined || !equal(signed, signature(payload))) return false;
    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<Token>;
      return parsed.purpose === purpose && parsed.origin === origin && typeof parsed.expires === "number" && parsed.expires > Date.now();
    } catch { return false; }
  }
  function cookie(purpose: Purpose, value: string, origin: string, maxAge = SESSION_SECONDS): string {
    return `${name(purpose, origin)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${origin.startsWith("https:") ? "; Secure" : ""}`;
  }
  function isActive(header: string, origin: string): boolean {
    return valid(cookieValues(header).get(name("session", origin)) ?? "", "session", origin);
  }
  function clearRealSessions(header: string, origin: string): string[] {
    return [...cookieValues(header).keys()].filter(value => /^(?:__Secure-)?authjs\.session-token(?:\.\d+)?$/.test(value))
      .map(value => `${value}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${origin.startsWith("https:") ? "; Secure" : ""}`);
  }
  const clearSession = (origin: string) => cookie("session", "", origin, 0);
  async function handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const origin = url.origin;
    const header = request.headers.get("cookie") ?? "";
    const headers = new Headers({ "cache-control": "no-store" });
    const redirect = (location: string) => { headers.set("location", location); return new Response(null, { status: 303, headers }); };
    function startSession(location: string): Response {
      headers.append("set-cookie", cookie("session", token("session", origin), origin));
      for (const value of clearRealSessions(header, origin)) headers.append("set-cookie", value);
      return redirect(location);
    }
    if (url.pathname === "/api/pilot/auth/demo/handoff") {
      if (request.method !== "POST") return Response.json({ code: "invalid_input", message: "Metodo non consentito." }, { status: 405, headers });
      const handoff = options.handoff;
      if (!handoff || request.headers.get("origin") !== handoff.origin) {
        return Response.json({ code: "forbidden", message: "Origine richiesta non consentita." }, { status: 403, headers });
      }
      const form = new URLSearchParams(await request.text());
      return enabled && validHandoff(form.get("pass") ?? "", origin, handoff.secret)
        ? startSession("/poc") : redirect("/poc?errore=invito");
    }
    if (url.pathname === "/api/pilot/auth/mode" && request.method === "GET") {
      return Response.json({ mode: isActive(header, origin) ? "demo" : "live" }, { headers });
    }
    if (url.pathname === "/api/pilot/auth/demo" && request.method === "GET") {
      const csrfToken = enabled ? token("csrf", origin) : "";
      if (enabled) headers.append("set-cookie", cookie("csrf", csrfToken, origin));
      return Response.json({ enabled, active: isActive(header, origin), csrfToken }, { headers });
    }
    if (!["/api/pilot/auth/demo", "/api/pilot/auth/demo/signout"].includes(url.pathname)) return null;
    if (request.method !== "POST") return Response.json({ code: "invalid_input", message: "Metodo non consentito." }, { status: 405, headers });
    const form = new URLSearchParams(await request.text());
    const pocEntry = form.get("callbackUrl") === "/poc";
    const signInError = pocEntry ? "/poc?errore=demo" : "/accesso?errore=demo";
    if (!enabled && url.pathname === "/api/pilot/auth/demo" && request.headers.get("origin") === origin) {
      return redirect(signInError);
    }
    const csrf = form.get("csrfToken") ?? "";
    if (request.headers.get("origin") !== origin || !valid(csrf, "csrf", origin) || !equal(csrf, cookieValues(header).get(name("csrf", origin)) ?? "")) {
      return Response.json({ code: "forbidden", message: "Accesso non consentito. Ricarica la pagina e riprova." }, { status: 403, headers });
    }
    if (url.pathname.endsWith("/signout")) {
      headers.append("set-cookie", clearSession(origin));
      headers.append("set-cookie", cookie("csrf", "", origin, 0));
      for (const value of clearRealSessions(header, origin)) headers.append("set-cookie", value);
      return redirect("/accesso");
    }
    if (!enabled || (form.get("email") ?? "").trim().toLowerCase() !== DEMO_EMAIL || !equal(form.get("password") ?? "", options.password ?? "")) {
      return redirect(signInError);
    }
    return startSession(pocEntry ? "/poc" : "/");
  }
  return { handle, isActive, clearSession };
}
