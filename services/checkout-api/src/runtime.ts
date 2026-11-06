import { Pool } from "pg";
import Stripe from "stripe";
import { createOrderingAuth } from "./auth-runtime";
import { buildOrderingApp } from "./http-app";
import { registerPilotExtensionRoutes } from "./pilot-extensions";
import { createPostgresOrderingRepository } from "./postgres-repository";
import { createStripeOrderingPayments } from "./stripe-payments";
import { createGroupOrderingService } from "./group/group-service";
import { registerGroupOrderingRoutes } from "./group/group-http";
import { registerPromotionRoutes } from "./promotions";
import { createOperationalEmailServices, readOperationalEmailConfiguration, registerOperationalEmailRoutes } from "./operational-emails";
import { readRuntimeConfiguration } from "./runtime-config";

/** Construct one runtime. Entry points own listening, workers and process signals. */
export async function createOrderingRuntime(env: Record<string, string | undefined> = process.env) {
  const config = readRuntimeConfiguration(env);
  const pool = new Pool({ connectionString: config.databaseUrl, max: 5 });
  pool.on("error", () => { process.stderr.write("Connessione PostgreSQL inattiva interrotta; verrà ricreata.\n"); });
  try {
    await pool.query("SELECT id FROM individual_ordering_state LIMIT 1");
    const stripe = new Stripe(config.stripeSecretKey);
    const email = readOperationalEmailConfiguration(env);
    const operational = createOperationalEmailServices({ repository: createPostgresOrderingRepository(pool), payments: createStripeOrderingPayments(stripe),
      superadminEmails: config.superadminEmails, reservationMs: config.reservationMs, email });
    const { service } = operational;
    const groups = createGroupOrderingService({ repository: operational.repository, ordering: service });
    const auth = createOrderingAuth({ pool, secret: config.authSecret, proxySecret: config.proxySecret, origins: config.origins,
      googleClientId: config.googleClientId, googleClientSecret: config.googleClientSecret,
      smtpUrl: config.smtpUrl, emailFrom: config.emailFrom, demoPassword: config.demoPassword });
    const reconcileOrders = async () => { await groups.tick(); await service.tick(); };
    const dispatchEmails = () => operational.emails.dispatch();
    const app = buildOrderingApp({ service, ...auth,
      async webhook(body, signature) { stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret); await reconcileOrders(); }
    });
    registerPilotExtensionRoutes(app, { analytics: operational.analytics, delivery: operational.delivery, authenticate: auth.authenticate });
    registerPromotionRoutes(app, { promotions: operational.promotions, authenticate: auth.authenticate });
    registerGroupOrderingRoutes(app, { groups, authenticate: auth.authenticate });
    registerOperationalEmailRoutes(app, { emails: operational.emails, authenticate: auth.authenticate });
    app.addHook("onClose", async () => { try { await email.sender?.close?.(); } finally { await pool.end(); } });
    await app.ready();
    return { app, reconcile: reconcileOrders, reconcileOrders, dispatchEmails, close: () => app.close() };
  } catch (error) { await pool.end(); throw error; }
}
