import type { OperationalSurface } from "./operational-host";
import { resolveOperationalHost } from "./operational-host";

export type OperationalAccess = "allowed" | "anonymous" | "denied" | "unavailable";

/** Ask the authoritative service for access to this area, without caching identity. */
export async function getOperationalAccess(surface: OperationalSurface, cookieHeader: string, origin: string): Promise<OperationalAccess> {
  const endpoint = process.env.PIZZAOS_SERVICE_URL;
  const secret = process.env.PIZZAOS_PROXY_SECRET;
  const host = resolveOperationalHost({ url: origin, headers: new Headers() });
  if (!endpoint || !secret || !host || host.origin !== origin || (host.separateHosts && host.surface !== surface)) return "unavailable";
  try {
    const response = await fetch(new URL(surface === "rider" ? "/v1/pilot/rider/session" : "/v1/pilot/session", endpoint), {
      headers: { cookie: cookieHeader, "x-pizzaos-proxy-secret": secret, "x-pizzaos-origin": origin },
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "unavailable";
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("actor" in data) || !("storeIds" in data)
      || !Array.isArray(data.storeIds) || !data.storeIds.every(id => typeof id === "string" && id.length > 0)) return "unavailable";
    if (data.actor === null) return "anonymous";
    if (!data.actor || typeof data.actor !== "object" || !("id" in data.actor) || typeof data.actor.id !== "string"
      || !("email" in data.actor) || typeof data.actor.email !== "string") return "unavailable";
    if (surface === "admin" && (!("superadmin" in data) || typeof data.superadmin !== "boolean")) return "unavailable";
    return data.storeIds.length > 0 || (surface === "admin" && "superadmin" in data && data.superadmin === true) ? "allowed" : "denied";
  } catch { return "unavailable"; }
}
