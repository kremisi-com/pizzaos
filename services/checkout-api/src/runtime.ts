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
import { createOpenCageStoreGeocoder } from "./store-address";
import { createRuntimeDiagnostics } from "./sentry-reporter";
import type { Diagnostics } from "./diagnostics";
import { OrderingError } from "./ordering-service";

/** Construct one runtime. Entry points own listening, workers and process signals. */
export async function createOrderingRuntime(env: Record<string, string | undefined> = process.env, diagnostics?: Diagnostics) {
  const reporting = diagnostics ?? await createRuntimeDiagnostics(env);
  const config = readRuntimeConfiguration(env);
  const pool = new Pool({ connectionString: config.databaseUrl, max: 5 });
  pool.on("error", error => { reporting.report(error, { operation: "database_connection", provider: "postgresql", code: "database_connection_lost", category: "dependency" }); });
  try {
    await pool.query("SELECT snapshot_version FROM individual_ordering_state LIMIT 1");
    const stripe = new Stripe(config.stripeSecretKey);
    const email = readOperationalEmailConfiguration(env);
    const operational = createOperationalEmailServices({ repository: createPostgresOrderingRepository(pool), payments: createStripeOrderingPayments(stripe, reporting),
      superadminEmails: config.superadminEmails, reservationMs: config.reservationMs, email, diagnostics: reporting, activateOrderCalendar: true,
      storeGeocoding: config.openCageApiKey ? createOpenCageStoreGeocoder(config.openCageApiKey, config.authSecret) : undefined });
    const { service } = operational;
    const groups = createGroupOrderingService({ repository: operational.repository, ordering: service });
    const auth = createOrderingAuth({ pool, secret: config.authSecret, proxySecret: config.proxySecret, origins: config.origins,
      googleClientId: config.googleClientId, googleClientSecret: config.googleClientSecret,
      smtpUrl: config.smtpUrl, emailFrom: config.emailFrom, demoPassword: config.demoPassword, demoHandoff: config.demoHandoff, diagnostics: reporting });
    const reconcileOrders = async () => { await groups.tick(); await service.tick(); };
    const dispatchEmails = () => operational.emails.dispatch();
    const app = buildOrderingApp({ service, ...auth, diagnostics: reporting,
      async webhook(body, signature) {
        try { stripe.webhooks.constructEvent(body, signature, config.stripeWebhookSecret); }
        catch (error) {
          if (error instanceof Stripe.errors.StripeSignatureVerificationError) throw new OrderingError("invalid_input", "Firma webhook non valida.");
          throw error;
        }
        await reconcileOrders();
      }
    });
    registerPilotExtensionRoutes(app, { analytics: operational.analytics, delivery: operational.delivery, authenticate: auth.authenticate });
    registerPromotionRoutes(app, { promotions: operational.promotions, authenticate: auth.authenticate });
    registerGroupOrderingRoutes(app, { groups, authenticate: auth.authenticate });
    registerOperationalEmailRoutes(app, { emails: operational.emails, authenticate: auth.authenticate });
    app.addHook("onClose", async () => { try { await email.sender?.close?.(); } finally { await pool.end(); } });
    await app.ready();
    return { app, diagnostics: reporting, reconcile: reconcileOrders, reconcileOrders, dispatchEmails,
      async close() { try { await app.close(); } finally { await reporting.flush(); } } };
  } catch (error) { await pool.end(); throw error; }
}
