import { orderingSubdomainForHost } from "@pizzaos/domain";

type OrderingSiteStatus = "ready" | "unassigned" | "unavailable";
interface ClientHost { origin: string; storefront: boolean; site?: OrderingSiteStatus }

export async function isStorefrontHost(authority: string | null): Promise<boolean> {
  return (await resolveClientHost(authority))?.storefront ?? false;
}

export async function resolveClientHost(authority: string | null, fallbackOrigin?: string): Promise<ClientHost | null> {
  const canonical = process.env.PIZZAOS_APP_ORIGIN ?? (process.env.NODE_ENV === "development" ? fallbackOrigin : undefined);
  const domain = process.env.PIZZAOS_ORDERING_DOMAIN?.trim().toLowerCase();
  if (!canonical) return null;
  if (!domain) return { origin: canonical, storefront: false };
  if (!authority || /[\s,/@?#\\%]/.test(authority)) return null;
  try {
    const url = new URL(`https://${authority}`);
    if (url.host === new URL(canonical).host) return { origin: canonical, storefront: false };
    if (url.port) return null;
    const legacy = process.env.PIZZAOS_CLIENT_LEGACY_HOSTS?.split(",").some(host => host.trim().toLowerCase() === url.hostname);
    if (!orderingSubdomainForHost(url.hostname, domain)) return legacy ? { origin: canonical, storefront: false } : null;
    if (legacy) {
      const site = await checkOrderingSite(url.origin);
      return site === "unassigned" ? { origin: canonical, storefront: false } : { origin: url.origin, storefront: true, site };
    }
    return { origin: url.origin, storefront: true };
  } catch {
    return null;
  }
}

export async function checkOrderingSite(origin: string): Promise<"ready" | "unassigned" | "unavailable"> {
  const endpoint = process.env.PIZZAOS_SERVICE_URL;
  const secret = process.env.PIZZAOS_PROXY_SECRET;
  if (!endpoint || !secret) return "unavailable";
  try {
    const response = await fetch(new URL("/v1/pilot/ordering-site", endpoint), {
      headers: { "x-pizzaos-proxy-secret": secret, "x-pizzaos-origin": origin },
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5000)
    });
    return response.ok ? "ready" : response.status === 404 ? "unassigned" : "unavailable";
  } catch {
    return "unavailable";
  }
}
