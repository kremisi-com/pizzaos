// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualCart, IndividualOrder, IndividualStore } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment, ProviderRefund } from "../ordering-contract";
import { createOrderingService } from "../ordering-service";
import { createGroupOrderingService } from "./group-service";

const host: IndividualActor = { id: "host", name: "Andrea", email: "host@example.test" };
const guest: IndividualActor = { id: "guest", name: "Giulia", email: "guest@example.test" };
const operator: IndividualActor = { id: "operator", name: "Operatore", email: "operator@example.test" };
const own = { actor: host, capability: "browser-host" };
const invitee = { actor: guest, capability: "browser-guest" };
const line = { productId: "pizza", quantity: 1, optionIds: [], notes: "" };
const fulfillment = { mode: "pickup" as const, slotId: "slot", notes: "" };
function fixture() {
  let serial = 0;
  const store: IndividualStore = { id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, deliveryBands: [], ingredients: [{ id: "dough", name: "Impasto", stock: 20 }], products: [{ id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true, ingredients: { dough: 1 }, options: [], allergens: [] }, { id: "drink", name: "Bibita", description: "", priceCents: 200, available: true, ingredients: {}, options: [], allergens: [] }], slots: [{ id: "slot", startsAt: "2030-11-05T19:00:00Z", capacity: 20 }] };
  let state: OrderingState = { stores: { store }, memberships: [{ storeId: "store", email: operator.email }], orders: {}, idempotency: {}, events: [], cursor: 0 };
  let queue: Promise<unknown> = Promise.resolve();
  const repository: OrderingRepository = { transact<T>(work: (draft: OrderingState) => T | Promise<T>): Promise<T> { const task = queue.then(async () => { const draft = structuredClone(state); const result = await work(draft); state = draft; return structuredClone(result); }); queue = task.catch(() => undefined); return task; } };
  const intents = new Map<string, ProviderPayment>(); const refundCalls: { intentId: string; amountCents?: number; key: string }[] = []; const refunds = new Map<string, ProviderRefund>();
  let nextStatus: ProviderPayment["status"] = "paid"; let nextRefund: ProviderRefund["status"] = "succeeded";
  const payments: OrderingPayments = { async create(input) { let remote = intents.get(input.key); if (!remote) { remote = { id: `pi-${++serial}`, status: nextStatus }; intents.set(input.key, remote); } return structuredClone(remote); }, async read(id) { return structuredClone([...intents.values()].find(value => value.id === id)!); }, async cancel(id) { const remote = [...intents.values()].find(value => value.id === id)!; if (remote.status !== "paid") remote.status = "cancelled"; return structuredClone(remote); }, async refund(input) { refundCalls.push(input); let value = refunds.get(input.key); if (!value) { value = { id: `re-${++serial}`, status: nextRefund }; refunds.set(input.key, value); } return value; }, async readRefund(id) { return [...refunds.values()].find(value => value.id === id)!; } };
  const ordering = createOrderingService({ repository, payments, superadminEmails: [], now: () => new Date("2030-11-05T17:00:00Z"), id: () => `id-${++serial}` });
  const groups = createGroupOrderingService({ repository, ordering, payments, now: () => new Date("2030-11-05T17:00:00Z"), id: () => `id-${++serial}` });
  async function create() { const group = await groups.create(own, { storeId: "store", lines: [line], idempotencyKey: "create" }); return groups.join(invitee, group.id, { inviteToken: group.inviteToken!, lines: [line], idempotencyKey: "join" }); }
  async function submit(groupId: string, method: "cash" | "card") { const group = await groups.read(own, groupId); const quote = await groups.quote(own, groupId, { revision: group.revision, fulfillment }); return groups.checkout(own, groupId, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method, idempotencyKey: "final" }); }
  async function add(order: IndividualOrder) { const lines = [{ ...line, productId: "drink" }]; const quote = await ordering.additionQuote(host, order.id, lines); return ordering.additions(host, order.id, { lines, fingerprint: quote.fingerprint, idempotencyKey: "add" }); }
  return { ordering, groups, repository, refundCalls, intents, create, submit, add, status(value: ProviderPayment["status"]) { nextStatus = value; }, refundStatus(value: ProviderRefund["status"]) { nextRefund = value; }, state: () => structuredClone(state) };
}

describe("shared cart canonical settlement integration", () => {
  it("rejects full early cancellation until an uncertain share is reconciled", async () => {
    const h = fixture(); const group = await h.create(); h.status("requires_action");
    await h.groups.payShare(invitee, group.id, { revision: group.revision, idempotencyKey: "guest" });
    await expect(h.groups.refund(operator, group.id, { idempotencyKey: "cancel" })).rejects.toMatchObject({ code: "checkout_pending" });
    expect(h.refundCalls).toEqual([]); expect((await h.groups.read(own, group.id)).status).toBe("open");
  });
  it("includes post-order cash additions in real cash due and records a complete manual refund", async () => {
    const h = fixture(); const group = await h.create(); await h.groups.payShare(invitee, group.id, { revision: group.revision, idempotencyKey: "guest" });
    const result = await h.submit(group.id, "cash"); expect(result.order.settlement?.cashDueCents).toBe(800);
    const added = await h.add(result.order); expect(added.order.settlement?.cashDueCents).toBe(1000);
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await h.ordering.action(operator, result.order.id, { action });
    await h.groups.operations(operator, "store");
    await h.groups.refund(operator, group.id, { idempotencyKey: "whole", cashReturned: true });
    const order = h.state().orders[result.order.id]; expect(order.status).toBe("completed"); expect(order.settlement).toMatchObject({ cashDueCents: 0, refundedCents: 1800 }); expect(h.refundCalls.map(call => call.amountCents)).toEqual([800]);
  });
  it("cancels a submitted group by refunding original payers and the canonical card addition", async () => {
    const h = fixture(); const group = await h.create(); await h.groups.payShare(invitee, group.id, { revision: group.revision, idempotencyKey: "guest" });
    const result = await h.submit(group.id, "card"); await h.add(result.order);
    await h.ordering.action(host, result.order.id, { action: "cancel" }); await h.groups.operations(operator, "store");
    const order = h.state().orders[result.order.id]; expect(order.status).toBe("cancelled"); expect(order.settlement?.refundedCents).toBe(1800); expect(h.refundCalls).toHaveLength(3);
    const probe: IndividualCart = { storeId: "store", ...fulfillment, lines: [{ ...line, quantity: 20 }] }; await expect(h.ordering.quote(probe)).resolves.toBeTruthy();
  });
  it("binds refund operation keys to their quota and retries a failed refund only with a new key", async () => {
    const h = fixture(); const group = await h.create(); const paid = await h.groups.payShare(invitee, group.id, { revision: group.revision, idempotencyKey: "guest" });
    h.refundStatus("failed"); await h.groups.refundShare(invitee, group.id, { paymentId: paid.payment.id, idempotencyKey: "refund" });
    h.refundStatus("succeeded"); await h.groups.refundShare(invitee, group.id, { paymentId: paid.payment.id, idempotencyKey: "refund" }); expect(h.refundCalls).toHaveLength(1);
    await h.groups.refundShare(invitee, group.id, { paymentId: paid.payment.id, idempotencyKey: "refund-new" }); expect(h.refundCalls).toHaveLength(2); expect(h.refundCalls[0].key).not.toBe(h.refundCalls[1].key);
    const current = await h.groups.read(own, group.id); const hostPaid = await h.groups.payShare(own, group.id, { revision: current.revision, idempotencyKey: "host" });
    await h.groups.refund(operator, group.id, { paymentId: hostPaid.payment.id, idempotencyKey: "operator-key" });
    await expect(h.groups.refund(operator, group.id, { paymentId: paid.payment.id, idempotencyKey: "operator-key" })).rejects.toMatchObject({ code: "idempotency_conflict" });
  });
});
