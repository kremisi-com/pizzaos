export interface RuntimeConfiguration {
  databaseUrl: string;
  authSecret: string;
  proxySecret: string;
  origins: string[];
  orderingDomain?: string;
  orderingAuthOrigin?: string;
  superadminEmails: string[];
  googleClientId: string;
  googleClientSecret: string;
  smtpUrl: string;
  emailFrom: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  environment: "test" | "production";
  reservationMs: number;
  demoPassword?: string;
  demoHandoff?: { secret: string; origin: string };
  openCageApiKey?: string;
  geoapifyApiKey?: string;
}

/** Validate server configuration without opening resources or revealing values. */
export function readRuntimeConfiguration(env: Record<string, string | undefined>): RuntimeConfiguration {
  const required = (name: string): string => {
    const value = env[name]?.trim();
    if (!value) throw new Error(`Configurazione obbligatoria: ${name}`);
    return value;
  };
  const databaseUrl = required("DATABASE_URL");
  const authSecret = required("AUTH_SECRET");
  const proxySecret = required("PIZZAOS_PROXY_SECRET");
  if (authSecret.length < 32) throw new Error("AUTH_SECRET richiede almeno 32 caratteri.");
  if (proxySecret.length < 32) throw new Error("PIZZAOS_PROXY_SECRET richiede almeno 32 caratteri.");
  if (authSecret === proxySecret) throw new Error("AUTH_SECRET e PIZZAOS_PROXY_SECRET devono essere distinti.");
  const origins = required("PIZZAOS_ALLOWED_ORIGINS").split(",").map(value => {
    try {
      const url = new URL(value.trim());
      const loopback = url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
      if (url.username || url.password || url.pathname !== "/" || url.search || url.hash || url.hostname.includes("*")
        || (url.protocol !== "https:" && !(env.NODE_ENV !== "production" && loopback && url.protocol === "http:"))) throw new Error();
      return url.origin;
    } catch { throw new Error("PIZZAOS_ALLOWED_ORIGINS contiene un'origine non valida."); }
  });
  const orderingDomain = env.PIZZAOS_ORDERING_DOMAIN?.trim().toLowerCase() || undefined;
  const orderingAuthOrigin = env.PIZZAOS_ORDERING_AUTH_ORIGIN?.trim() || undefined;
  if (orderingDomain && (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(orderingDomain)
    || !orderingAuthOrigin?.startsWith("https://") || !origins.includes(orderingAuthOrigin))) {
    throw new Error("Configura un dominio ordini e un’origine client HTTPS già consentita per Google.");
  }
  const superadminEmails = required("PIZZAOS_SUPERADMIN_EMAILS").split(",").map(value => value.trim().toLowerCase());
  if (superadminEmails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email === "poc@pizzaos.app")) throw new Error("PIZZAOS_SUPERADMIN_EMAILS non valida.");
  const environment = env.PIZZAOS_ENVIRONMENT?.trim() ?? "production";
  if (environment !== "test" && environment !== "production") throw new Error("PIZZAOS_ENVIRONMENT non valido.");
  const stripeSecretKey = required("STRIPE_SECRET_KEY");
  if (environment === "test" && !stripeSecretKey.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY deve essere una chiave test.");
  const reservationMs = Number(env.PAYMENT_RESERVATION_MINUTES ?? 10) * 60_000;
  if (!Number.isFinite(reservationMs) || reservationMs <= 0) throw new Error("PAYMENT_RESERVATION_MINUTES non valido.");
  const openCageApiKey = env.OPENCAGE_API_KEY?.trim();
  const geoapifyApiKey = env.GEOAPIFY_API_KEY?.trim();
  const handoffSecret = env.PIZZAOS_DEMO_HANDOFF_SECRET?.trim();
  const landingOrigin = env.PIZZAOS_DEMO_LANDING_ORIGIN?.trim();
  const demoHandoff = handoffSecret && handoffSecret.length >= 32 && landingOrigin
    ? { secret: handoffSecret, origin: landingOrigin } : undefined;
  return {
    databaseUrl, authSecret, proxySecret, origins, orderingDomain, orderingAuthOrigin, superadminEmails, environment, reservationMs,
    googleClientId: required("AUTH_GOOGLE_ID"), googleClientSecret: required("AUTH_GOOGLE_SECRET"),
    smtpUrl: required("SMTP_URL"), emailFrom: required("AUTH_EMAIL_FROM"), stripeSecretKey,
    stripeWebhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    ...(openCageApiKey ? { openCageApiKey } : {}),
    ...(geoapifyApiKey ? { geoapifyApiKey } : {}),
    ...(env.PIZZAOS_DEMO_PASSWORD ? { demoPassword: env.PIZZAOS_DEMO_PASSWORD } : {}),
    ...(demoHandoff ? { demoHandoff } : {})
  };
}
