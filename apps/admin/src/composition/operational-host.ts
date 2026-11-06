export type OperationalSurface = "admin" | "rider";
export interface OperationalHost {
  origin: string;
  surface: OperationalSurface;
  separateHosts: boolean;
}

/** Resolve only a server-configured operational host; forwarded browser headers grant nothing. */
export function resolveOperationalHost(request: { url: string; headers: Headers }): OperationalHost | null {
  try {
    const local = process.env.NODE_ENV !== "production";
    const parseOrigin = (value: string): URL | null => {
      const url = new URL(value);
      const loopback = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
      if (url.username || url.password || url.pathname !== "/" || url.search || url.hash
        || (url.protocol !== "https:" && !(local && loopback && url.protocol === "http:"))) return null;
      return url;
    };
    const requestUrl = new URL(request.url);
    const authority = request.headers.get("host") ?? requestUrl.host;
    if (!authority || /[\s,/@?#\\]/.test(authority)) return null;
    const host = new URL(`http://${authority}`).host;
    const appSetting = process.env.PIZZAOS_APP_ORIGIN?.trim();
    const riderSetting = process.env.PIZZAOS_RIDER_ORIGIN?.trim();
    const app = appSetting ? parseOrigin(appSetting) : local && !riderSetting ? parseOrigin(requestUrl.origin) : null;
    if (!app) return null;
    if (!appSetting && !(app.hostname === "localhost" || app.hostname === "127.0.0.1" || app.hostname === "[::1]" || app.hostname.endsWith(".localhost"))) return null;
    const rider = riderSetting ? parseOrigin(riderSetting) : null;
    if (riderSetting && (!rider || rider.host === app.host)) return null;
    if (host === app.host) return { origin: app.origin, surface: "admin", separateHosts: rider !== null };
    if (rider && host === rider.host) return { origin: rider.origin, surface: "rider", separateHosts: true };
    return null;
  } catch { return null; }
}
