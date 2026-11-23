const dnsLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const reservedSubdomains = new Set(["admin", "api", "client", "landing", "rider", "www"]);

export function isOrderingSubdomain(value: unknown): value is string {
  return typeof value === "string" && dnsLabel.test(value) && !reservedSubdomains.has(value);
}

export function orderingSubdomainForHost(hostname: string, domain: string): string | undefined {
  const suffix = `.${domain}`;
  if (!hostname.endsWith(suffix)) return undefined;
  const subdomain = hostname.slice(0, -suffix.length);
  return isOrderingSubdomain(subdomain) ? subdomain : undefined;
}
