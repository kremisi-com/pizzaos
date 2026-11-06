/** The service, never a browser flag, decides whether this request can use the POC. */
export async function getExperienceMode(cookieHeader: string, requestOrigin?: string): Promise<"live" | "demo"> {
  if (!/(?:^|;\s*)(?:__Host-)?pizzaos\.demo-session=/.test(cookieHeader)) return "live";
  const endpoint = process.env.PIZZAOS_SERVICE_URL;
  const secret = process.env.PIZZAOS_PROXY_SECRET;
  const origin = requestOrigin ?? process.env.PIZZAOS_APP_ORIGIN;
  if (!endpoint || !secret || !origin) return "live";
  try {
    const response = await fetch(new URL("/api/pilot/auth/mode", endpoint), {
      headers: { cookie: cookieHeader, "x-pizzaos-proxy-secret": secret, "x-pizzaos-origin": origin },
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "live";
    const result: unknown = await response.json();
    return result !== null && typeof result === "object" && "mode" in result && result.mode === "demo" ? "demo" : "live";
  } catch { return "live"; }
}
