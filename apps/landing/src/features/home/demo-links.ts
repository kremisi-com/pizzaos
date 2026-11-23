export interface DemoSuccessLink {
  readonly label: string;
  readonly href: string;
}

export interface DemoSuccessLinkConfig {
  readonly clientHref?: string;
  readonly adminHref?: string;
}

export type DemoSuccessLinks = readonly [DemoSuccessLink, DemoSuccessLink];

export const DEFAULT_DEMO_SUCCESS_LINKS: DemoSuccessLinks = [
  { label: "Demo Web-App Cliente", href: "https://client.pizzaos.app/poc" },
  { label: "Demo Dashboard Admin", href: "https://admin.pizzaos.app/poc" },
];

function pocHref(configured: string | undefined, fallback: string): string {
  if (!configured) return fallback;
  try {
    const url = new URL(configured);
    const loopback = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname) || url.hostname.endsWith(".localhost");
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))) return fallback;
    return new URL("/poc", url.origin).href;
  } catch { return fallback; }
}

export function createDemoSuccessLinks({
  clientHref,
  adminHref,
}: DemoSuccessLinkConfig = {}): DemoSuccessLinks {
  return [
    { ...DEFAULT_DEMO_SUCCESS_LINKS[0], href: pocHref(clientHref, DEFAULT_DEMO_SUCCESS_LINKS[0].href) },
    { ...DEFAULT_DEMO_SUCCESS_LINKS[1], href: pocHref(adminHref, DEFAULT_DEMO_SUCCESS_LINKS[1].href) },
  ];
}
