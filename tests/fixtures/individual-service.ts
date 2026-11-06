/** Isolated browser-test server. Never imported by the production entry point. */
import { randomUUID } from "node:crypto";
import type { IndividualActor, IndividualStore } from "@pizzaos/domain";
import { buildOrderingApp, type OrderingHttpOptions } from "../../services/checkout-api/src/http-app";
import { registerPilotExtensionRoutes } from "../../services/checkout-api/src/pilot-extensions";
import { registerPromotionRoutes } from "../../services/checkout-api/src/promotions";
import { createOperationalEmailServices, registerOperationalEmailRoutes } from "../../services/checkout-api/src/operational-emails";
import { createOperationalWorkers } from "../../services/checkout-api/src/reconciliation-worker";
import { createDemoAccess } from "../../services/checkout-api/src/demo-access";
import type { OrderingRepository, OrderingState, ProviderPayment } from "../../services/checkout-api/src/ordering-contract";
import { createGroupOrderingService } from "../../services/checkout-api/src/group/group-service";
import { registerGroupOrderingRoutes } from "../../services/checkout-api/src/group/group-http";

const store: IndividualStore = {
  id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true,
  contactEmail: "ristorante@example.test", contactPhone: "+390612345678",
  ingredients: [{ id: "dough", name: "Impasto", stock: 1000 }],
  products: [{ id: "pizza", name: "Pizza", description: "Pizza del pilota", priceCents: 800, available: true, allergens: ["Glutine"], ingredients: { dough: 1 }, options: [] }],
  slots: [{ id: "evening", startsAt: new Date(Date.now() + 20 * 60_000).toISOString(), capacity: 100 }], deliveryBands: [{ upToKm: 5, feeCents: 200, minimumCents: 500 }]
};
let state: OrderingState = { stores: { roma: store }, memberships: [{ storeId: "roma", email: "operator@example.test" }], orders: {}, idempotency: {}, events: [], cursor: 0 };
let tail = Promise.resolve();
const repository: OrderingRepository = {
  transact<T>(work: (value: OrderingState) => T | Promise<T>): Promise<T> {
    const task = tail.then(async () => { const next = structuredClone(state); const result = await work(next); state = next; return structuredClone(result); });
    tail = task.then(() => {}, () => {});
    return task;
  }
};
const intents = new Map<string, ProviderPayment>();
const emailFailures = new Set<string>();
const operational = createOperationalEmailServices({ repository, superadminEmails: ["superadmin@example.test"], storeGeocoding: {
  signingSecret: "browser-test-only-store-address-signing-secret",
  async search(query) {
    const first = { address: "Via Verdi 10, Torino", latitude: 45.068, longitude: 7.689 };
    const second = { address: "Via Verdi 20, Torino", latitude: 45.067, longitude: 7.691 };
    if (query === "Via Verdi, Torino") return [first, second];
    if (query === "Via Verdi 20, Torino") return [second];
    return [];
  },
}, email: {
  from: "ordini@example.test", testRecipients: ["alice@example.test"], retryBaseMs: 5000, maxRetryMs: 5000,
  sender: { async send(message) {
    if (message.text.includes("email-e2e-failure") && !emailFailures.has(message.messageId)) { emailFailures.add(message.messageId); throw new Error("Errore email del test"); }
  } }
}, payments: {
  async create(input) { const value: ProviderPayment = { id: `pi_${input.key}`, status: "requires_action", clientSecret: "browser_test_secret" }; intents.set(value.id, value); return value; },
  async read(id) { const value = intents.get(id); if (!value) throw new Error("Not found"); return value; },
  async cancel(id) { const value: ProviderPayment = { id, status: "cancelled" }; intents.set(id, value); return value; },
  async refund() { return { id: randomUUID(), status: "succeeded" }; },
  async readRefund(id) { return { id, status: "succeeded" }; }
} });
const { service } = operational;
const groups = createGroupOrderingService({ repository: operational.repository, ordering: service });
const actors: Record<string, IndividualActor> = {
  alice: { id: "alice", name: "Alice", email: "alice@example.test" },
  operator: { id: "operator", name: "Operatore", email: "operator@example.test" },
  rider: { id: "rider", name: "Rider", email: "rider@example.test" },
  superadmin: { id: "superadmin", name: "Superadmin", email: "superadmin@example.test" }
};
const demo = createDemoAccess({ secret: "browser-test-only-demo-signing-secret", password: process.env.PIZZAOS_E2E_DEMO_PASSWORD });
const authenticate: OrderingHttpOptions["authenticate"] = async request => {
  const match = request.headers.cookie?.match(/(?:^|;\s*)pizzaos-e2e-actor=([^;]+)/);
  return match ? actors[match[1]] ?? null : null;
};
const app = buildOrderingApp({ service,
  isDemoRequest(request) { return demo.isActive(request.headers.cookie ?? "", String(request.headers["x-pizzaos-origin"])); },
  async authHandler(request) {
    const origin = String(request.headers["x-pizzaos-origin"]);
    const headers = new Headers();
    for (const name of ["cookie", "origin", "content-type"]) { const value = request.headers[name]; if (typeof value === "string") headers.set(name, value); }
    const body = request.method === "GET" ? undefined : typeof request.body === "string" ? request.body : JSON.stringify(request.body);
    const response = await demo.handle(new Request(new URL(request.url, origin), { method: request.method, headers, body }));
    if (response) return response;
    // Only the isolated browser harness supplies a fake CSRF for its fake live identity.
    return request.url === "/api/pilot/auth/csrf" ? Response.json({ csrfToken: "browser-test-only-live-csrf" }) : new Response(null, { status: 404 });
  },
  authorizeProxy(request) { return request.headers["x-pizzaos-proxy-secret"] === "individual-e2e-proxy-secret-32-characters"; },
  authenticate
});
registerPilotExtensionRoutes(app, { analytics: operational.analytics, delivery: operational.delivery, authenticate });
registerPromotionRoutes(app, { promotions: operational.promotions, authenticate });
registerGroupOrderingRoutes(app, { groups, authenticate });
registerOperationalEmailRoutes(app, { emails: operational.emails, authenticate });
const workers = createOperationalWorkers({ reconcileOrders: async () => { await groups.tick(); await service.tick(); }, dispatchEmails: () => operational.emails.dispatch(), intervalMs: 1000 });
void workers.start();
app.addHook("onClose", async () => { await workers.stop(); });
for (const signal of ["SIGTERM", "SIGINT"] as const) process.once(signal, () => { void app.close(); });
void app.listen({ host: "127.0.0.1", port: Number(process.env.PIZZAOS_E2E_SERVICE_PORT ?? 3104) }).catch((error: unknown) => { process.stderr.write(`Avvio harness fallito: ${error instanceof Error ? error.message : "errore sconosciuto"}\n`); process.exitCode = 1; });
