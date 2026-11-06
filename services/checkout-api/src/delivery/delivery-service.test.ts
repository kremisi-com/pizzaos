import { describe, expect, it, vi } from "vitest";
import type { IndividualActor, IndividualOrder, IndividualStore } from "@pizzaos/domain";
import type { OrderingRepository, OrderingState } from "../ordering-contract";
import { createDeliveryService, DeliveryError, isRiderProgressAllowed } from "./delivery-service";
import type { DeliveryOrderingState } from "./delivery-service";

const operator: IndividualActor = { id: "operator", email: "OPERATOR@example.test", name: "Operatore" };
const rider: IndividualActor = { id: "rider-user", email: "RIDER@example.test", name: "Rider" };
const otherRider: IndividualActor = { id: "other-user", email: "other@example.test", name: "Altro rider" };
const admin: IndividualActor = { id: "admin", email: "ADMIN@example.test", name: "Admin" };
const stranger: IndividualActor = { id: "stranger", email: "stranger@example.test", name: "Cliente" };

function store(id: string): IndividualStore {
  return { id, name: `Sede ${id}`, latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    deliveryBands: [], ingredients: [{ id: "flour", name: "Farina privata", stock: 100 }], products: [], slots: [] };
}

function order(id = "ready", storeId = "a"): IndividualOrder {
  return { id, storeId, customerId: "customer-secret", contact: { name: "Destinatario", email: "private@example.test", phone: "3331234567" },
    cart: { storeId, lines: [], mode: "delivery", slotId: null, notes: "", address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 } },
    quote: { fingerprint: "secret-fingerprint", subtotalCents: 1000, deliveryCents: 200, totalCents: 1200, slotId: "slot", slotStartsAt: "2026-11-05T18:00:00.000Z",
      lines: [{ productId: "pizza", name: "Margherita", quantity: 2, unitCents: 500, optionIds: [], notes: "" }] },
    status: "ready", payment: "cash_due", method: "cash", notes: "Citofono 3", createdAt: "2026-11-05T12:00:00.000Z", submittedAt: null,
    acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false, unavailableProductIds: [], providerIntentId: "provider-secret", refundId: "refund-secret", refundAttempt: 0, revision: 1 };
}

function initialState(): DeliveryOrderingState {
  const travelling = order("travelling"); travelling.status = "out_for_delivery";
  const foreign = order("foreign", "b");
  const other = order("other");
  const unassigned = order("unassigned");
  const finished = order("finished"); finished.status = "completed";
  return { stores: { a: store("a"), b: store("b") }, memberships: [{ storeId: "a", email: "operator@example.test" }],
    orders: { ready: order(), travelling, other, foreign, unassigned, finished }, idempotency: {}, events: [], cursor: 0,
    delivery: { riders: {
      r1: { id: "r1", storeId: "a", email: "rider@example.test", name: "Rider Uno", active: true },
      r2: { id: "r2", storeId: "a", email: "other@example.test", name: "Rider Due", active: true },
      rb: { id: "rb", storeId: "b", email: "foreign@example.test", name: "Rider B", active: true }
    }, assignments: { ready: { orderId: "ready", riderId: "r1", assignedAt: "2026-11-05T12:00:00.000Z" },
      travelling: { orderId: "travelling", riderId: "r1", assignedAt: "2026-11-05T12:00:00.000Z" },
      other: { orderId: "other", riderId: "r2", assignedAt: "2026-11-05T12:00:00.000Z" },
      foreign: { orderId: "foreign", riderId: "rb", assignedAt: "2026-11-05T12:00:00.000Z" },
      finished: { orderId: "finished", riderId: "r1", assignedAt: "2026-11-05T12:00:00.000Z" } }, issues: {} } };
}

function harness() {
  let state = initialState();
  let commitFailure: Error | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  const repository: OrderingRepository = { transact<T>(work: (draft: OrderingState) => T | Promise<T>): Promise<T> {
    const transaction = queue.then(async () => {
      const draft = structuredClone(state);
      const result = await work(draft);
      if (commitFailure) { const error = commitFailure; commitFailure = undefined; throw error; }
      state = structuredClone(draft);
      return result;
    });
    queue = transaction.catch(() => undefined);
    return transaction;
  } };
  let beforeProgress: (() => Promise<void>) | undefined;
  const progress = vi.fn(async (actor: IndividualActor, orderId: string, action: "dispatch" | "complete") => {
    await beforeProgress?.();
    return repository.transact(draft => {
      const current = draft.orders[orderId];
      if (!current || !isRiderProgressAllowed(draft, actor, current, action)) throw new Error("gateway guard denied");
      current.status = action === "dispatch" ? "out_for_delivery" : "completed";
      if (action === "complete" && current.payment === "cash_due") current.payment = "cash_paid";
      return structuredClone(current);
    });
  });
  let id = 0;
  const service = createDeliveryService({ repository, superadminEmails: ["admin@example.test"], progress,
    now: () => new Date("2026-11-05T13:00:00.000Z"), id: () => `new-rider-${++id}` });
  return { service, repository, progress, snapshot: () => structuredClone(state),
    failNextCommit: (error: Error) => { commitFailure = error; },
    beforeProgress: (callback: () => Promise<void>) => { beforeProgress = callback; } };
}

describe("delivery public service", () => {
  it("keeps rider sessions separate from operator membership and lists only own actionable assignments", async () => {
    const h = harness();
    await expect(h.service.session(null)).resolves.toEqual({ actor: null, storeIds: [] });
    await expect(h.service.session(stranger)).resolves.toEqual({ actor: stranger, storeIds: [] });
    await expect(h.service.session(operator)).resolves.toEqual({ actor: operator, storeIds: [] });
    await expect(h.service.session(rider)).resolves.toEqual({ actor: rider, storeIds: ["a"] });
    expect((await h.service.deliveries(rider)).map(item => item.orderId).sort()).toEqual(["ready", "travelling"]);
    await expect(h.service.deliveries(stranger)).resolves.toEqual([]);
    await expect(h.service.deliveries(null)).rejects.toMatchObject({ code: "unauthorized" });
    await expect(h.service.riders(rider, "a")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.assignments(rider, "b")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.inviteRider(rider, "a", "invite@example.test", "Nome")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.setRiderActive(rider, "a", "r2", false)).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.assign(rider, "ready", "r2")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.riders(operator, "b")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.riders(null, "a")).rejects.toMatchObject({ code: "unauthorized" });
    await expect(h.service.riders(null, "a")).rejects.toBeInstanceOf(DeliveryError);
    expect(await h.service.riders(admin, "b")).toHaveLength(1);
  });

  it("returns copied, sanitized delivery details and authoritative cash due", async () => {
    const h = harness();
    const deliveries = await h.service.deliveries(rider);
    const ready = deliveries.find(item => item.orderId === "ready");
    expect(ready).toEqual({ orderId: "ready", storeId: "a", storeName: "Sede a", status: "ready",
      address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 }, contact: { name: "Destinatario", phone: "3331234567" },
      notes: "Citofono 3", items: [{ name: "Margherita", quantity: 2 }], cashDueCents: 1200, issue: null });
    expect(JSON.stringify(deliveries)).not.toMatch(/private@example|customer-secret|provider-secret|refund-secret|fingerprint|Farina|refund_pending/);
    if (!ready) throw new Error("Fixture consegna mancante");
    ready.contact.name = "Mutato"; ready.address.text = "Altro indirizzo"; ready.items.length = 0;
    expect((await h.service.deliveries(rider)).find(item => item.orderId === "ready")).toMatchObject({ contact: { name: "Destinatario" }, items: [{ name: "Margherita", quantity: 2 }] });
    await h.repository.transact(state => { const current = state.orders.ready; if (current) current.payment = "cash_paid"; });
    expect((await h.service.deliveries(rider)).find(item => item.orderId === "ready")?.cashDueCents).toBe(0);
    await h.repository.transact(state => { const current = state.orders.ready; if (current) { current.method = "card"; current.payment = "paid"; } });
    expect((await h.service.deliveries(rider)).find(item => item.orderId === "ready")?.cashDueCents).toBe(0);
  });

  it("normalizes invitations, deduplicates without implicit reactivation, and isolates memberships per store", async () => {
    const h = harness();
    const first = await h.service.inviteRider(operator, "a", "  NEW@EXAMPLE.TEST  ", "Nuovo");
    expect(first).toMatchObject({ storeId: "a", email: "new@example.test", name: "Nuovo", active: true });
    await h.service.setRiderActive(operator, "a", first.id, false);
    const duplicate = await h.service.inviteRider(operator, "a", "new@example.test", "Nome diverso");
    expect(duplicate).toMatchObject({ id: first.id, active: false });
    const secondStore = await h.service.inviteRider(admin, "b", "new@example.test", "Nuovo");
    expect(secondStore.id).not.toBe(first.id);
    const updated = await h.service.setRiderActive(operator, "a", first.id, true);
    updated.name = "Mutazione esterna";
    expect((await h.service.riders(operator, "a")).find(item => item.id === first.id)?.name).not.toBe("Mutazione esterna");
  });

  it("validates invitations and denies cross-store referenced riders", async () => {
    const h = harness();
    for (const [email, name] of [["bad-address", "Nome"], ["valid@example.test", "   "]]) {
      if (!email || !name) throw new Error("Fixture invito mancante");
      await expect(h.service.inviteRider(operator, "a", email, name)).rejects.toMatchObject({ code: "invalid_input" });
    }
    await expect(h.service.inviteRider(admin, "missing", "valid@example.test", "Nome")).rejects.toMatchObject({ code: "not_found" });
    await expect(h.service.setRiderActive(operator, "a", "rb", false)).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.assign(operator, "ready", "rb")).rejects.toMatchObject({ code: "forbidden" });
  });

  it("revokes deliveries and progress immediately on deactivation and restores only explicit activation", async () => {
    const h = harness();
    await h.service.setRiderActive(operator, "a", "r1", false);
    await expect(h.service.deliveries(rider)).resolves.toEqual([]);
    await expect(h.service.session(rider)).resolves.toEqual({ actor: rider, storeIds: [] });
    await expect(h.service.dispatch(rider, "ready")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.reportFailure(rider, "travelling", "Cliente assente")).rejects.toMatchObject({ code: "forbidden" });
    expect(h.progress).not.toHaveBeenCalled();
    await h.service.setRiderActive(operator, "a", "r1", true);
    expect(await h.service.deliveries(rider)).toHaveLength(2);
  });

  it("makes assignment idempotent and records canonical order revisions and events for changes", async () => {
    const h = harness();
    await h.service.assign(operator, "ready", "r2");
    const after = h.snapshot();
    expect(after.orders.ready?.revision).toBe(2);
    expect(after.events).toContainEqual(expect.objectContaining({ orderId: "ready", storeId: "a", revision: 2 }));
    await h.service.assign(operator, "ready", "r2");
    expect(h.snapshot()).toEqual(after);
    expect((await h.service.deliveries(rider)).map(item => item.orderId)).not.toContain("ready");
    expect((await h.service.deliveries(otherRider)).map(item => item.orderId)).toContain("ready");
  });

  it.each(["pickup", "completed", "cancelled", "accepted"])("rejects assignment of incompatible order %s without writes", async variant => {
    const h = harness();
    await h.repository.transact(state => {
      const current = state.orders.ready;
      if (!current) throw new Error("Fixture ordine mancante");
      if (variant === "pickup") current.cart.mode = "pickup";
      else if (variant === "completed" || variant === "cancelled" || variant === "accepted") current.status = variant;
    });
    const before = h.snapshot();
    await expect(h.service.assign(operator, "ready", "r2")).rejects.toMatchObject({ code: "invalid_transition" });
    expect(h.snapshot()).toEqual(before);
  });

  it("delegates dispatch and completion to the canonical gateway with authenticated actor", async () => {
    const h = harness();
    await expect(h.service.dispatch(rider, "ready")).resolves.toBeUndefined();
    expect(h.progress).toHaveBeenLastCalledWith(rider, "ready", "dispatch");
    expect(h.snapshot().orders.ready?.status).toBe("out_for_delivery");
    await expect(h.service.complete(rider, "ready")).resolves.toBeUndefined();
    expect(h.progress).toHaveBeenLastCalledWith(rider, "ready", "complete");
    expect(h.snapshot().orders.ready).toMatchObject({ status: "completed", payment: "cash_paid" });
    expect(h.progress).toHaveBeenCalledTimes(2);
    await expect(h.service.dispatch(otherRider, "travelling")).rejects.toMatchObject({ code: "forbidden" });
    await expect(h.service.complete(null, "travelling")).rejects.toMatchObject({ code: "unauthorized" });
  });

  it("propagates gateway failures unchanged and the transactional guard closes reassignment races", async () => {
    const h = harness();
    const gatewayFailure = new Error("canonical gateway unavailable");
    h.progress.mockRejectedValueOnce(gatewayFailure);
    await expect(h.service.dispatch(rider, "ready")).rejects.toBe(gatewayFailure);
    expect(h.snapshot().orders.ready?.status).toBe("ready");
    h.beforeProgress(async () => { await h.service.assign(operator, "ready", "r2"); });
    await expect(h.service.dispatch(rider, "ready")).rejects.toThrow("gateway guard denied");
    expect(h.snapshot().orders.ready?.status).toBe("ready");
  });

  it("records a deduplicated open issue, blocks progress and requires explicit reassignment to resolve it", async () => {
    const h = harness();
    await h.service.reportFailure(rider, "travelling", "Cliente assente");
    const after = h.snapshot();
    expect(after.orders.travelling?.status).toBe("out_for_delivery");
    expect(after.orders.travelling?.revision).toBe(2);
    expect((await h.service.assignments(operator, "a")).find(item => item.orderId === "travelling")?.issue).toEqual({ note: "Cliente assente", reportedAt: "2026-11-05T13:00:00.000Z" });
    await h.service.reportFailure(rider, "travelling", "Cliente assente");
    expect(h.snapshot()).toEqual(after);
    await expect(h.service.complete(rider, "travelling")).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(h.service.dispatch(rider, "travelling")).rejects.toMatchObject({ code: "invalid_transition" });
    await h.service.assign(operator, "travelling", "r1");
    expect((await h.service.deliveries(rider)).find(item => item.orderId === "travelling")?.issue).toBeNull();
    expect(h.snapshot().orders.travelling?.status).toBe("out_for_delivery");
    await h.service.complete(rider, "travelling");
    expect(h.snapshot().orders.travelling?.status).toBe("completed");
  });

  it("rejects invalid problem notes and unauthorized or non-travelling reports without partial writes", async () => {
    const h = harness();
    const before = h.snapshot();
    for (const note of ["", "   ", "x".repeat(2001)]) await expect(h.service.reportFailure(rider, "travelling", note)).rejects.toMatchObject({ code: "invalid_input" });
    await expect(h.service.reportFailure(rider, "ready", "Problema")).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(h.service.reportFailure(otherRider, "travelling", "Problema")).rejects.toMatchObject({ code: "forbidden" });
    expect(h.snapshot()).toEqual(before);
    const failure = new Error("commit failed");
    h.failNextCommit(failure);
    await expect(h.service.reportFailure(rider, "travelling", "Cliente assente")).rejects.toBe(failure);
    expect(h.snapshot()).toEqual(before);
    await h.service.reportFailure(rider, "travelling", "Cliente assente");
    expect((await h.service.assignments(operator, "a")).find(item => item.orderId === "travelling")?.issue?.note).toBe("Cliente assente");
  });

  it("exposes a pure narrow guard for compatible delivery progress only", () => {
    const state = initialState();
    const ready = state.orders.ready; const travelling = state.orders.travelling;
    if (!ready || !travelling || !state.delivery) throw new Error("Fixture guard mancante");
    const before = structuredClone(state);
    expect(isRiderProgressAllowed(state, rider, ready, "dispatch")).toBe(true);
    expect(isRiderProgressAllowed(state, rider, travelling, "complete")).toBe(true);
    for (const action of ["cancel", "accept", "retry_refund", "notes"]) expect(isRiderProgressAllowed(state, rider, ready, action)).toBe(false);
    expect(isRiderProgressAllowed(state, otherRider, ready, "dispatch")).toBe(false);
    expect(isRiderProgressAllowed(state, null, ready, "dispatch")).toBe(false);
    expect(isRiderProgressAllowed(state, rider, ready, "complete")).toBe(false);
    expect(state).toEqual(before);
    ready.cart.mode = "pickup";
    expect(isRiderProgressAllowed(state, rider, ready, "dispatch")).toBe(false);
    ready.cart.mode = "delivery";
    state.delivery.issues.ready = { note: "Problema", reportedAt: "2026-11-05T13:00:00.000Z" };
    expect(isRiderProgressAllowed(state, rider, ready, "dispatch")).toBe(false);
    delete state.delivery.issues.ready;
    const active = state.delivery.riders.r1;
    if (!active) throw new Error("Fixture rider mancante");
    active.active = false;
    expect(isRiderProgressAllowed(state, rider, ready, "dispatch")).toBe(false);
  });
});
