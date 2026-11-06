// @vitest-environment node
// Integration acceptance tests derived from public contracts, without private module assumptions.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { DeliveryRider, IndividualActor, IndividualCart, IndividualCheckout, IndividualStore, RiderDelivery } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment, ProviderRefund } from "./ordering-contract";
import { buildOrderingApp } from "./http-app";
import { createOperationalServices, registerPilotExtensionRoutes } from "./pilot-extensions";

const admin: IndividualActor = { id: "admin", email: "ADMIN@example.test", name: "Admin" };
const operator: IndividualActor = { id: "operator", email: "operator@example.test", name: "Operatore" };
const rider: IndividualActor = { id: "rider", email: "RIDER@example.test", name: "Rider" };
const otherRider: IndividualActor = { id: "other-rider", email: "other-rider@example.test", name: "Altro rider" };
const customer: IndividualActor = { id: "customer", email: "private-customer@example.test", name: "Destinatario" };
const actors: Record<string, IndividualActor> = { admin, operator, rider, other: otherRider, customer };
const headers = (identity: string) => ({ cookie: `session=${identity}` });
const authenticate = async (request: FastifyRequest): Promise<IndividualActor | null> => actors[request.headers.cookie?.replace("session=", "") ?? ""] ?? null;
const openApps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(openApps.splice(0).map(app => app.close())); });

class Repository implements OrderingRepository {
  private state: OrderingState = { stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 };
  private tail: Promise<unknown> = Promise.resolve();
  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
    const operation = this.tail.then(async () => {
      const draft = structuredClone(this.state);
      const result = await work(draft);
      this.state = structuredClone(draft);
      return structuredClone(result);
    });
    this.tail = operation.catch(() => undefined);
    return operation;
  }
  snapshot() { return this.transact(state => state); }
}

function fakePayments() {
  const intents = new Map<string, ProviderPayment>();
  const refunds = new Map<string, ProviderRefund>();
  const payments: OrderingPayments = {
    create: vi.fn(async input => { const value: ProviderPayment = { id: `pi-${input.orderId}`, status: "paid" }; intents.set(value.id, value); return { ...value }; }),
    read: vi.fn(async id => { const value = intents.get(id); if (!value) throw new Error("Unknown fake intent"); return { ...value }; }),
    cancel: vi.fn(async id => { const value: ProviderPayment = { id, status: "cancelled" }; intents.set(id, value); return { ...value }; }),
    refund: vi.fn(async input => { const value: ProviderRefund = { id: `refund-${input.intentId}`, status: "succeeded" }; refunds.set(value.id, value); return { ...value }; }),
    readRefund: vi.fn(async id => { const value = refunds.get(id); if (!value) throw new Error("Unknown fake refund"); return { ...value }; })
  };
  return payments;
}

function store(id = "roma", timeZone?: string): IndividualStore & { timeZone?: string } {
  return { id, name: `Sede ${id}`, latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    deliveryBands: [{ upToKm: 5, feeCents: 200, minimumCents: 800 }], ingredients: [{ id: "dough", name: "Impasto", stock: 20 }],
    products: [{ id: "pizza", name: "Margherita", description: "Pizza", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, options: [] }],
    slots: [{ id: "soon", startsAt: "2026-11-04T18:20:00.000Z", capacity: 20 }], ...(timeZone ? { timeZone } : {}) };
}

async function fixture(proxyAllowed = true) {
  const repository = new Repository(); const payments = fakePayments();
  let instant = "2026-11-04T18:00:00.000Z"; let sequence = 0; let checkoutSequence = 0;
  const options = { repository, payments, superadminEmails: ["admin@example.test"], now: () => new Date(instant), id: () => `entity-${++sequence}` };
  const runtime = createOperationalServices(options);
  await runtime.service.saveStore(admin, store());
  await runtime.service.saveStore(admin, store("milano"));
  await runtime.service.invite(admin, "roma", operator.email);
  const app = buildOrderingApp({ service: runtime.service, authenticate, authorizeProxy: () => proxyAllowed });
  registerPilotExtensionRoutes(app, { analytics: runtime.analytics, delivery: runtime.delivery, authenticate });
  openApps.push(app);
  const readyOrder = async (method: IndividualCheckout["method"] = "cash", storeId = "roma") => {
    const cart: IndividualCart = { storeId, mode: "delivery", slotId: "soon", notes: "Citofono 3",
      address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 }, lines: [{ productId: "pizza", quantity: 2, optionIds: [], notes: "" }] };
    const quote = await runtime.service.quote(cart);
    const { order } = await runtime.service.checkout(customer, { cart, fingerprint: quote.fingerprint, phone: "3331234567", method, idempotencyKey: `checkout-${++checkoutSequence}` });
    for (const action of ["accept", "prepare", "ready"] as const) await runtime.service.action(admin, order.id, { action });
    return order;
  };
  const enabledRider = () => runtime.delivery.inviteRider(operator, "roma", rider.email, rider.name);
  return { ...runtime, options, app, repository, payments, readyOrder, enabledRider, setTime: (value: string) => { instant = value; } };
}

describe("operational pilot integration", () => {
  it("uses one canonical order for rider dispatch/completion, stock, cash and completion-day analytics", async () => {
    const f = await fixture();
    const order = await f.readyOrder(); const enabled = await f.enabledRider();
    const assignment = await f.app.inject({ method: "PUT", url: `/v1/pilot/orders/${order.id}/assignment`, headers: headers("operator"), payload: { riderId: enabled.id } });
    expect(assignment.statusCode).toBe(204); expect(assignment.body).toBe("");
    expect((await f.service.catalog("roma", operator)).ingredients[0]?.stock).toBe(20);
    const before = await f.analytics.report(operator, { storeId: "roma", period: "today" });
    expect(before.completedOrders).toBe(0);
    expect((await f.service.session(rider)).storeIds).toEqual([]);
    expect((await f.app.inject({ method: "POST", url: `/v1/pilot/orders/${order.id}/actions`, headers: headers("rider"), payload: { action: "dispatch" } })).statusCode).toBe(403);
    const dispatch = await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/dispatch`, headers: headers("rider"), payload: {} });
    expect(dispatch.statusCode).toBe(204); expect(dispatch.body).toBe("");
    f.setTime("2026-11-05T12:00:00.000Z");
    const complete = await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/complete`, headers: headers("rider"), payload: {} });
    expect(complete.statusCode).toBe(204); expect(complete.body).toBe("");
    expect((await f.service.orders(customer)).find(value => value.id === order.id)).toMatchObject({ status: "completed", payment: "cash_paid" });
    expect((await f.service.catalog("roma", operator)).ingredients[0]?.stock).toBe(18);
    expect(await f.delivery.deliveries(rider)).toEqual([]);
    await f.service.action(operator, order.id, { action: "complete" });
    const restarted = createOperationalServices(f.options);
    await expect(restarted.analytics.report(operator, { storeId: "roma", period: "today" })).resolves.toMatchObject({ completedOrders: 1, salesCents: 1800, averageOrderCents: 1800 });
    await expect(restarted.analytics.report(operator, { storeId: "roma", period: "custom", fromDate: "2026-11-04", throughDate: "2026-11-04" })).resolves.toMatchObject({ completedOrders: 0 });
    expect((await restarted.service.catalog("roma", operator)).ingredients[0]?.stock).toBe(18);
  });

  it("exposes rider membership administration and minimized deliveries through authenticated HTTP", async () => {
    const f = await fixture(); const order = await f.readyOrder();
    const invitation = await f.app.inject({ method: "POST", url: "/v1/pilot/stores/roma/riders", headers: headers("operator"), payload: { email: "  RIDER@example.test  ", name: "Rider" } });
    expect(invitation.statusCode).toBeGreaterThanOrEqual(200); expect(invitation.statusCode).toBeLessThan(300);
    const enabled = invitation.json<DeliveryRider>();
    expect(enabled).toMatchObject({ email: "rider@example.test", storeId: "roma", active: true });
    expect((await f.app.inject({ method: "GET", url: "/v1/pilot/stores/roma/riders", headers: headers("operator") })).json()).toEqual([enabled]);
    expect((await f.app.inject({ method: "PUT", url: `/v1/pilot/orders/${order.id}/assignment`, headers: headers("operator"), payload: { riderId: enabled.id } })).statusCode).toBe(204);
    const response = await f.app.inject({ method: "GET", url: "/v1/pilot/rider/deliveries", headers: headers("rider") });
    expect(response.statusCode).toBe(200);
    const deliveries = response.json<RiderDelivery[]>();
    expect(deliveries).toEqual([{ orderId: order.id, storeId: "roma", storeName: "Sede roma", status: "ready", address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 },
      contact: { name: "Destinatario", phone: "3331234567" }, notes: "Citofono 3", items: [{ name: "Margherita", quantity: 2 }], cashDueCents: 1800, issue: null }]);
    expect(response.body).not.toMatch(/private-customer|providerIntentId|customerId|refundId|refund_pending|fingerprint|"stock"/);
    const deactivation = await f.app.inject({ method: "PATCH", url: `/v1/pilot/stores/roma/riders/${enabled.id}`, headers: headers("operator"), payload: { active: false } });
    expect(deactivation.statusCode).toBe(200);
    const revoked = await f.app.inject({ method: "GET", url: "/v1/pilot/rider/deliveries", headers: headers("rider") });
    expect(revoked.statusCode).toBe(403); expect(revoked.json()).toMatchObject({ code: "forbidden" });
    expect((await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/dispatch`, headers: headers("rider"), payload: {} })).statusCode).toBe(403);
  });

  it("keeps anonymous and rider identities outside generic operational and tenant APIs", async () => {
    const f = await fixture(); const order = await f.readyOrder(); const enabled = await f.enabledRider();
    await f.delivery.assign(operator, order.id, enabled.id);
    const anonymous = await f.app.inject({ method: "GET", url: "/v1/pilot/rider/session" });
    expect(anonymous.statusCode).toBe(200); expect(anonymous.json()).toEqual({ actor: null, storeIds: [] });
    const spoof = await f.app.inject({ method: "GET", url: "/v1/pilot/rider/deliveries", headers: { "x-user-id": rider.id, "x-user-email": rider.email, "x-superadmin": "true" } });
    expect(spoof.statusCode).toBe(401); expect(spoof.json()).toMatchObject({ code: "unauthorized", message: expect.any(String) });
    expect((await f.app.inject({ method: "GET", url: "/v1/pilot/rider/session", headers: headers("rider") })).json()).toMatchObject({ actor: rider, storeIds: ["roma"] });
    for (const url of ["/v1/pilot/orders?storeId=roma", "/v1/pilot/events?cursor=0&storeId=roma", "/v1/pilot/stores/roma/riders", "/v1/pilot/stores/roma/deliveries", "/v1/pilot/stores/roma/analytics?period=today"]) {
      const response = await f.app.inject({ method: "GET", url, headers: headers("rider") });
      expect(response.statusCode, url).toBe(403);
      expect(response.body).not.toContain("private-customer@example.test");
    }
    for (const action of ["dispatch", "complete", "cancel", "retry_refund"]) {
      const response = await f.app.inject({ method: "POST", url: `/v1/pilot/orders/${order.id}/actions`, headers: headers("rider"), payload: { action } });
      expect(response.statusCode, action).toBe(403);
      expect(response.body).not.toContain("providerIntentId");
    }
    expect((await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/dispatch`, headers: headers("customer"), payload: {} })).statusCode).toBe(403);
    expect((await f.app.inject({ method: "GET", url: "/v1/pilot/stores/milano/analytics?period=today", headers: headers("operator") })).statusCode).toBe(403);
  });

  it("persists issues across reconstruction and permits a new rider only after explicit reassignment", async () => {
    const f = await fixture(); const order = await f.readyOrder(); const enabled = await f.enabledRider();
    const second = await f.delivery.inviteRider(operator, "roma", otherRider.email, otherRider.name);
    await f.delivery.assign(operator, order.id, enabled.id); await f.delivery.dispatch(rider, order.id);
    const problem = await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/failure`, headers: headers("rider"), payload: { note: "Cliente assente" } });
    expect(problem.statusCode).toBe(204); expect(problem.body).toBe("");
    const restarted = createOperationalServices(f.options);
    expect((await restarted.delivery.assignments(operator, "roma")).find(item => item.orderId === order.id)?.issue?.note).toBe("Cliente assente");
    const conflict = await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/complete`, headers: headers("rider"), payload: {} });
    expect(conflict.statusCode).toBe(409); expect(conflict.json()).toMatchObject({ code: "invalid_transition" });
    await restarted.delivery.assign(operator, order.id, second.id);
    expect(await f.delivery.deliveries(rider)).toEqual([]);
    const oldRider = await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/complete`, headers: headers("rider"), payload: {} });
    expect(oldRider.statusCode).toBe(403);
    expect((await restarted.delivery.deliveries(otherRider))[0]?.issue).toBeNull();
    expect((await f.app.inject({ method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/complete`, headers: headers("other"), payload: {} })).statusCode).toBe(204);
    expect((await restarted.service.orders(customer))[0]?.status).toBe("completed");
  });

  it("keeps operator cancellation in canonical card refund flow and removes cancelled deliveries", async () => {
    const f = await fixture(); const order = await f.readyOrder("card"); const enabled = await f.enabledRider();
    await f.delivery.assign(operator, order.id, enabled.id);
    const response = await f.app.inject({ method: "POST", url: `/v1/pilot/orders/${order.id}/actions`, headers: headers("operator"), payload: { action: "cancel" } });
    expect(response.statusCode).toBe(200);
    await f.service.tick();
    expect(f.payments.refund).toHaveBeenCalledTimes(1);
    expect((await f.service.orders(customer))[0]).toMatchObject({ status: "cancelled", payment: "refunded" });
    expect(await f.delivery.deliveries(rider)).toEqual([]);
    expect(await f.analytics.report(operator, { storeId: "roma", period: "today" })).toMatchObject({ completedOrders: 0, salesCents: 0, cancelledOrders: 1 });
  });

  it("maps invalid extension inputs and missing resources without exposing unexpected errors", async () => {
    const f = await fixture(); const order = await f.readyOrder(); const enabled = await f.enabledRider();
    await f.delivery.assign(operator, order.id, enabled.id);
    const invalid = [
      { identity: "operator", method: "POST", url: "/v1/pilot/stores/roma/riders", payload: { email: "bad", name: "Rider" } },
      { identity: "operator", method: "PATCH", url: `/v1/pilot/stores/roma/riders/${enabled.id}`, payload: { active: "false" } },
      { identity: "operator", method: "PUT", url: `/v1/pilot/orders/${order.id}/assignment`, payload: {} },
      { identity: "rider", method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/failure`, payload: { note: 12 } },
      { identity: "rider", method: "POST", url: `/v1/pilot/rider/deliveries/${order.id}/dispatch`, payload: [] }
    ] as const;
    for (const request of invalid) {
      const { identity, ...input } = request;
      const response = await f.app.inject({ ...input, headers: headers(identity) });
      expect(response.statusCode, request.url).toBe(400);
      expect(response.json()).toMatchObject({ code: "invalid_input", message: expect.any(String) });
    }
    for (const query of ["period=unknown", "period=custom&fromDate=2026-02-30&throughDate=2026-03-01", "period=custom&fromDate=2026-11-05"]) {
      const response = await f.app.inject({ method: "GET", url: `/v1/pilot/stores/roma/analytics?${query}`, headers: headers("operator") });
      expect(response.statusCode).toBe(400); expect(response.json()).toMatchObject({ code: "invalid_input" });
    }
    const missing = await f.app.inject({ method: "GET", url: "/v1/pilot/stores/missing/analytics?period=today", headers: headers("admin") });
    expect(missing.statusCode).toBe(404); expect(missing.json()).toMatchObject({ code: "not_found" });
    vi.spyOn(f.analytics, "report").mockRejectedValueOnce(new Error("postgres password INTERNAL-SECRET stacktrace"));
    const unexpected = await f.app.inject({ method: "GET", url: "/v1/pilot/stores/roma/analytics?period=today", headers: headers("operator") });
    expect(unexpected.statusCode).toBe(503);
    expect(unexpected.body).not.toMatch(/postgres|password|INTERNAL-SECRET|stacktrace/);
    expect(unexpected.json()).toMatchObject({ code: expect.any(String), message: expect.any(String) });
  });

  it("inherits proxy authorization on extension mutations", async () => {
    const f = await fixture(false);
    const response = await f.app.inject({ method: "POST", url: "/v1/pilot/stores/roma/riders", headers: { ...headers("operator"), origin: "https://foreign.example" }, payload: { email: rider.email, name: rider.name } });
    expect(response.statusCode).toBe(403); expect(response.json()).toMatchObject({ code: "forbidden" });
    expect(await f.delivery.riders(operator, "roma")).toEqual([]);
  });

  it("validates configurable IANA store timezones while retaining the legacy Rome default", async () => {
    const f = await fixture();
    expect((await f.analytics.report(operator, { storeId: "roma", period: "today" })).range.timeZone).toBe("Europe/Rome");
    const before = await f.repository.snapshot();
    await expect(f.service.saveStore(operator, store("roma", "Invalid/Timezone"))).rejects.toMatchObject({ code: "invalid_input" });
    expect((await f.repository.snapshot()).stores).toEqual(before.stores);
    await f.service.saveStore(operator, store("roma", "America/New_York"));
    expect((await f.service.catalog("roma", operator)).timeZone).toBe("America/New_York");
    expect((await f.analytics.report(operator, { storeId: "roma", period: "today" })).range.timeZone).toBe("America/New_York");
    expect(Object.keys(f.options).sort()).toEqual(["repository", "payments", "superadminEmails", "now", "id"].sort());
  });
});
