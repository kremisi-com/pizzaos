// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualLine, IndividualStore } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment, ProviderRefund } from "../ordering-contract";
import { createOperationalEmailServices } from "../operational-emails";
import { createGroupOrderingService } from "./group-service";

// Independent requirement 13 checks exercise the public mail-enabled service facade.
const host: IndividualActor = { id: "mail-host", name: "Andrea", email: "host@example.test" };
const guest: IndividualActor = { id: "mail-guest", name: "Giulia", email: "guest@example.test" };
const operator: IndividualActor = { id: "mail-operator", name: "Operatore", email: "operator@example.test" };
const hostAccess = { actor: host, capability: "mail-host-cookie" };
const guestAccess = { actor: guest, capability: "mail-guest-cookie" };
const storeId = "mail-store";
const fulfillment = { mode: "pickup" as const, slotId: "evening", notes: "" };
const line = (productId: string, notes: string): IndividualLine => ({ productId, quantity: 1, optionIds: [], notes });

function harness() {
  const store: IndividualStore = {
    id: storeId, name: "Pizzeria", latitude: 45, longitude: 9, acceptingOrders: true,
    deliveryBands: [], ingredients: [{ id: "dough", name: "Impasto", stock: 10 }],
    products: [
      { id: "host-pizza", name: "Pizza del creatore", description: "", priceCents: 900, available: true, allergens: [], ingredients: { dough: 1 }, options: [] },
      { id: "guest-pizza", name: "Pizza di Giulia", description: "", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, options: [] },
    ],
    slots: [{ id: "evening", startsAt: "2026-11-27T20:00:00.000Z", capacity: 10 }],
  };
  let state: OrderingState = { stores: { [storeId]: store }, memberships: [{ storeId, email: operator.email }], orders: {}, idempotency: {}, events: [], cursor: 0 };
  let tail: Promise<unknown> = Promise.resolve();
  const repository: OrderingRepository = {
    transact<T>(work: (draft: OrderingState) => T | Promise<T>): Promise<T> {
      const transaction = tail.then(async () => {
        const draft = structuredClone(state);
        const result = await work(draft);
        state = structuredClone(draft);
        return structuredClone(result);
      });
      tail = transaction.catch(() => undefined);
      return transaction;
    },
  };
  const intents = new Map<string, ProviderPayment>();
  const refunds = new Map<string, ProviderRefund>();
  let refundStatus: ProviderRefund["status"] = "succeeded";
  const payments: OrderingPayments = {
    async create(input) {
      const intent = intents.get(input.key) ?? { id: `intent-${intents.size + 1}`, status: "paid" as const };
      intents.set(input.key, intent);
      return structuredClone(intent);
    },
    async read(id) {
      const intent = [...intents.values()].find(item => item.id === id);
      if (!intent) throw new Error("Unknown intent");
      return structuredClone(intent);
    },
    async cancel(id) {
      const intent = [...intents.values()].find(item => item.id === id);
      if (!intent) throw new Error("Unknown intent");
      return structuredClone(intent);
    },
    async refund(input) {
      const refund = refunds.get(input.key) ?? { id: `refund-${refunds.size + 1}`, status: refundStatus };
      refunds.set(input.key, refund);
      return structuredClone(refund);
    },
    async readRefund(id) {
      const refund = [...refunds.values()].find(item => item.id === id);
      if (!refund) throw new Error("Unknown refund");
      return structuredClone(refund);
    },
  };
  const messages: { to: string; subject: string; text: string; messageId: string }[] = [];
  const now = () => new Date("2026-11-27T18:00:00.000Z");
  const services = createOperationalEmailServices({
    repository, payments, superadminEmails: [], now,
    email: {
      mode: "test_open", environment: "test", from: "PizzaOS <notify@example.test>",
      sender: { async send(message) { messages.push({ to: message.to, subject: message.subject, text: message.text, messageId: message.messageId }); } },
    },
  });
  const groups = createGroupOrderingService({ repository: services.repository, ordering: services.service, payments, now });
  return { ...services, groups, messages, setRefundStatus: (status: ProviderRefund["status"]) => { refundStatus = status; }, settleRefunds: (status: ProviderRefund["status"]) => { for (const refund of refunds.values()) refund.status = status; } };
}

describe("shared-cart private notifications public contract", () => {
  it("sends only the share payer their private receipt before final order submission", async () => {
    const h = harness();
    const created = await h.groups.create(hostAccess, { storeId, lines: [line("host-pizza", "Nota privata del creatore")], idempotencyKey: "create" });
    const joined = await h.groups.join(guestAccess, created.id, { inviteToken: created.inviteToken!, lines: [line("guest-pizza", "Nota privata di Giulia")], idempotencyKey: "join" });
    await h.groups.payShare(guestAccess, created.id, { revision: joined.revision, idempotencyKey: "pay" });
    await h.emails.dispatch();
    expect(h.messages).toHaveLength(1);
    expect(h.messages[0].to).toBe(guest.email);
    expect(h.messages[0].text).toMatch(/8[,.]00/);
    expect(h.messages[0].text).toContain("Pizza di Giulia");
    expect(h.messages[0].text).not.toContain("Pizza del creatore");
    expect(h.messages[0].text).not.toContain("Nota privata del creatore");
    expect(h.messages[0].text).not.toContain(host.email);
    expect(h.messages.some(message => /ordine ricevuto/i.test(`${message.subject} ${message.text}`))).toBe(false);
    await h.emails.dispatch();
    expect(h.messages).toHaveLength(1);
  });

  it("sends the refund amount and only the funded choices privately to the original payer", async () => {
    const h = harness();
    const created = await h.groups.create(hostAccess, { storeId, lines: [line("host-pizza", "Nota privata del creatore")], idempotencyKey: "create" });
    const joined = await h.groups.join(guestAccess, created.id, { inviteToken: created.inviteToken!, lines: [line("guest-pizza", "Nota privata di Giulia")], idempotencyKey: "join" });
    const paid = await h.groups.payShare(guestAccess, created.id, { revision: joined.revision, idempotencyKey: "pay" });
    await h.emails.dispatch();
    const beforeRefund = h.messages.length;
    await h.groups.refundShare(guestAccess, created.id, { paymentId: paid.payment.id, idempotencyKey: "refund" });
    await h.emails.dispatch();
    const notifications = h.messages.slice(beforeRefund);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].to).toBe(guest.email);
    expect(notifications[0].subject).toMatch(/rimborso/i);
    expect(notifications[0].text).toMatch(/8[,.]00/);
    expect(notifications[0].text).toContain("Pizza di Giulia");
    expect(notifications[0].text).not.toContain("Pizza del creatore");
    expect(notifications[0].text).not.toContain("Nota privata del creatore");
    expect(notifications[0].text).not.toContain(host.email);
  });

  it("sends the final order-received notification once to the authenticated host", async () => {
    const h = harness();
    const created = await h.groups.create(hostAccess, { storeId, lines: [line("host-pizza", "")], idempotencyKey: "create" });
    const joined = await h.groups.join(guestAccess, created.id, { inviteToken: created.inviteToken!, lines: [line("guest-pizza", "")], idempotencyKey: "join" });
    const paid = await h.groups.payShare(guestAccess, created.id, { revision: joined.revision, idempotencyKey: "pay" });
    const quote = await h.groups.quote(hostAccess, created.id, { revision: paid.group.revision, fulfillment });
    await h.groups.checkout(hostAccess, created.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "cash", idempotencyKey: "final" });
    await h.emails.dispatch();
    await h.emails.dispatch();
    const received = h.messages.filter(message => /ordine ricevuto/i.test(message.subject));
    expect(received).toHaveLength(1);
    expect(received[0].to).toBe(host.email);
    expect(received[0].text).toContain("Pizza del creatore");
    expect(received[0].text).toContain("Pizza di Giulia");
  });

  it("reduces completed revenue only after a successful refund while retaining completion and product counts", async () => {
    const h = harness();
    const created = await h.groups.create(hostAccess, { storeId, lines: [line("host-pizza", "")], idempotencyKey: "create" });
    const joined = await h.groups.join(guestAccess, created.id, { inviteToken: created.inviteToken!, lines: [line("guest-pizza", "")], idempotencyKey: "join" });
    const paid = await h.groups.payShare(guestAccess, created.id, { revision: joined.revision, idempotencyKey: "pay" });
    const quote = await h.groups.quote(hostAccess, created.id, { revision: paid.group.revision, fulfillment });
    const submitted = await h.groups.checkout(hostAccess, created.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "card", idempotencyKey: "final" });
    for (const action of ["accept", "prepare", "ready", "complete"] as const) {
      await h.service.action(operator, submitted.order.id, { action });
    }
    const before = await h.analytics.report(operator, { storeId, period: "today" });
    expect(before).toMatchObject({ completedOrders: 1, salesCents: 1700, averageOrderCents: 1700 });
    expect(await h.promotions.wallet(host, storeId)).toMatchObject({ balancePoints: 17, availablePoints: 17 });
    expect(await h.promotions.wallet(guest, storeId)).toMatchObject({ balancePoints: 0, availablePoints: 0 });
    expect(before.topProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({ productId: "host-pizza", quantity: 1 }),
      expect.objectContaining({ productId: "guest-pizza", quantity: 1 }),
    ]));
    h.setRefundStatus("pending");
    await h.groups.refund(operator, created.id, { paymentId: paid.payment.id, idempotencyKey: "pending-refund" });
    expect((await h.analytics.report(operator, { storeId, period: "today" })).salesCents).toBe(1700);
    expect((await h.promotions.wallet(host, storeId)).balancePoints).toBe(17);
    h.settleRefunds("failed");
    await h.groups.tick();
    expect((await h.analytics.report(operator, { storeId, period: "today" })).salesCents).toBe(1700);
    expect((await h.promotions.wallet(host, storeId)).balancePoints).toBe(17);
    h.setRefundStatus("succeeded");
    await h.groups.refund(operator, created.id, { paymentId: paid.payment.id, idempotencyKey: "retry-refund" });
    await h.groups.refund(operator, created.id, { paymentId: paid.payment.id, idempotencyKey: "retry-refund" });
    const after = await h.analytics.report(operator, { storeId, period: "today" });
    expect(after).toMatchObject({ completedOrders: 1, salesCents: 900, averageOrderCents: 900 });
    expect(after.range).toEqual(before.range);
    expect(after.topProducts).toEqual(before.topProducts);
    expect(await h.promotions.wallet(host, storeId)).toMatchObject({ balancePoints: 9, availablePoints: 9 });
    expect(await h.promotions.wallet(guest, storeId)).toMatchObject({ balancePoints: 0, availablePoints: 0 });
    const order = (await h.service.orders(operator, storeId)).find(order => order.id === submitted.order.id);
    expect(order?.status).toBe("completed");
  });
});
