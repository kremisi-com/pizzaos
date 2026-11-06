import type { NextRequest } from "next/server";
import { resolveOperationalHost } from "../../../../src/composition/operational-host";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
async function proxy(request: NextRequest, context: Context): Promise<Response> {
  const endpoint = process.env.PIZZAOS_SERVICE_URL;
  const secret = process.env.PIZZAOS_PROXY_SECRET;
  if (!endpoint || !secret) return Response.json({ code: "service_unavailable", message: "Servizio ordini non configurato." }, { status: 503 });
  if (!process.env.PIZZAOS_APP_ORIGIN && process.env.NODE_ENV !== "development") return Response.json({ code: "service_unavailable", message: "Origine applicazione non configurata." }, { status: 503 });
  const host = resolveOperationalHost(request);
  if (!host) return Response.json({ code: "forbidden", message: "Origine richiesta non consentita." }, { status: 403 });
  const publicOrigin = host.origin;
  const suppliedOrigin = request.headers.get("origin");
  if (request.method !== "GET" && suppliedOrigin !== publicOrigin) return Response.json({ code: "forbidden", message: "Origine richiesta non consentita." }, { status: 403 });
  const { path } = await context.params;
  if (!path.length || path.some(part => !part || part === "." || part === ".." || part.includes("/") || part.includes("\\")) || !(path[0] === "auth" || (path[0] === "v1" && path[1] === "pilot"))) return Response.json({ code: "not_found", message: "Percorso non disponibile." }, { status: 404 });
  if (host.surface === "rider" && ((path[0] === "auth" && path[1] === "demo") || (path[0] !== "auth" && path[2] !== "rider"))) return Response.json({ code: "forbidden", message: "Questa funzione non è disponibile nell'area rider." }, { status: 403 });
  const targetPath = (path[0] === "auth" ? "/api/pilot/" : "/") + path.map(encodeURIComponent).join("/");
  const target = new URL(targetPath, endpoint);
  target.search = new URL(request.url).search;
  const headers = new Headers({ "x-pizzaos-proxy-secret": secret, "x-pizzaos-origin": publicOrigin });
  for (const name of ["content-type", "cookie", "last-event-id", "accept"]) { const value = request.headers.get(name); if (value) headers.set(name, value); }
  if (suppliedOrigin) headers.set("origin", suppliedOrigin);
  try {
    const response = await fetch(target, { method: request.method, headers, body: request.method === "GET" ? undefined : await request.arrayBuffer(), redirect: "manual", cache: "no-store", signal: request.signal });
    const output = new Headers();
    for (const name of ["content-type", "location", "x-accel-buffering"]) { const value = response.headers.get(name); if (value) output.set(name, value); }
    for (const cookie of response.headers.getSetCookie()) output.append("set-cookie", cookie);
    output.set("cache-control", "no-store");
    return new Response(response.body, { status: response.status, headers: output });
  } catch {
    return Response.json({ code: "service_unavailable", message: "Connessione al servizio ordini non disponibile. Riprova." }, { status: 503 });
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH };
