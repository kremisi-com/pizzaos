// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualLine, IndividualStore } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingServiceOptions, OrderingState, ProviderPayment, ProviderRefund } from "../ordering-contract";
import { createOrderingService } from "../ordering-service";
import { createGroupOrderingService } from "./group-service";

// Independent observable contract tests: fixtures and assertions derive from
// REQUIREMENTS.md and CONTRACT_DESIGN.md, never the service implementation.
const storeId = "contract-store";
const host: IndividualActor = { id: "host", name: "Andrea", email: "host@example.test" };
const guest: IndividualActor = { id: "guest", name: "Giulia", email: "guest@example.test" };
const operator: IndividualActor = { id: "operator", name: "Operatore", email: "operator@example.test" };
const hostAccess = { actor: host, capability: "host-browser" };
const guestAccess = { actor: guest, capability: "guest-browser" };
const fulfillment = { mode: "pickup" as const, slotId: "evening", notes: "" };
const line = (productId = "pizza", quantity = 1): IndividualLine => ({ productId, quantity, optionIds: [], notes: "" });

function store(): IndividualStore {
  return {
    id: storeId, name: "Pizzeria", latitude: 45, longitude: 9, acceptingOrders: true,
    deliveryBands: [{ upToKm: 10, feeCents: 200, minimumCents: 0 }],
    ingredients: [{ id: "dough", name: "Impasto", stock: 10 }],
    products: [
      { id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, options: [{ id: "choice", name: "Impasto a scelta", priceCents: 0, ingredients: {} }] },
      { id: "second", name: "Seconda pizza", description: "", priceCents: 900, available: true, allergens: [], ingredients: { dough: 1 }, options: [] },
      { id: "small", name: "Piccola aggiunta", description: "", priceCents: 40, available: true, allergens: [], ingredients: {}, options: [] },
    ],
    slots: [{ id: "evening", startsAt: "2030-11-27T20:00:00.000Z", capacity: 10 }],
  };
}

/** Commits serialized snapshots only after successful work, as the repository contract requires. */
function repository() {
  let state: OrderingState = { stores: { [storeId]: store() }, memberships: [{ storeId, email: operator.email }], orders: {}, idempotency: {}, events: [], cursor: 0 };
  let tail: Promise<unknown> = Promise.resolve();
  const port: OrderingRepository = {
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
  return { port, snapshot: () => structuredClone(state) };
}

function provider() {
  const intents = new Map<string, ProviderPayment>();
  const creates = new Map<string, ProviderPayment>();
  const refunds = new Map<string, ProviderRefund>();
  const createCalls: { orderId: string; totalCents: number; key: string }[] = [];
  const refundCalls: { intentId: string; key: string; amountCents?: number }[] = [];
  let nextStatus: ProviderPayment["status"] = "paid";
  let nextRefundStatus: ProviderRefund["status"] = "succeeded";
  let failCreateResponse = false;
  let failRefundResponse = false;
  let observeCreate: (() => void | Promise<void>) | undefined;
  const port: OrderingPayments = {
    async create(input) {
      await observeCreate?.();
      createCalls.push(input);
      let intent = creates.get(input.key);
      if (!intent) {
        intent = { id: `intent-${creates.size + 1}`, status: nextStatus, clientSecret: "provider-secret" };
        creates.set(input.key, intent);
        intents.set(intent.id, intent);
      }
      if (failCreateResponse) { failCreateResponse = false; throw new Error("Provider response lost"); }
      return structuredClone(intent);
    },
    async read(id) {
      const intent = intents.get(id);
      if (!intent) throw new Error("Intent not found");
      return structuredClone(intent);
    },
    async cancel(id) {
      const intent = intents.get(id);
      if (!intent) throw new Error("Intent not found");
      if (intent.status !== "paid") intent.status = "cancelled";
      return structuredClone(intent);
    },
    async refund(input) {
      refundCalls.push(input);
      let refund = refunds.get(input.key);
      if (!refund) { refund = { id: `refund-${refunds.size + 1}`, status: nextRefundStatus }; refunds.set(input.key, refund); }
      if (failRefundResponse) { failRefundResponse = false; throw new Error("Refund response lost"); }
      return structuredClone(refund);
    },
    async readRefund(id) {
      const refund = [...refunds.values()].find(item => item.id === id);
      if (!refund) throw new Error("Refund not found");
      return structuredClone(refund);
    },
  };
  return { port, createCalls, refundCalls, intents, refunds, observeCreate: (observer: () => void | Promise<void>) => { observeCreate = observer; }, status: (status: ProviderPayment["status"]) => { nextStatus = status; }, refundStatus: (status: ProviderRefund["status"]) => { nextRefundStatus = status; }, loseCreateResponse: () => { failCreateResponse = true; }, loseRefundResponse: () => { failRefundResponse = true; } };
}

function harness(priceQuote?: OrderingServiceOptions["priceQuote"]) {
  const repo = repository();
  const payments = provider();
  let current = new Date("2026-11-27T18:00:00.000Z");
  let sequence = 0;
  const now = () => current;
  const id = () => `contract-${++sequence}`;
  const ordering = createOrderingService({ repository: repo.port, payments: payments.port, superadminEmails: [], now, id, priceQuote });
  const restart = () => createGroupOrderingService({ repository: repo.port, ordering, payments: payments.port, now, id, token: () => `invite-${++sequence}` });
  return { repo, payments, ordering, service: restart(), restart, advance: (milliseconds: number) => { current = new Date(current.getTime() + milliseconds); } };
}

async function expectCapacity(h: ReturnType<typeof harness>, quantity: number) {
  const cart = { storeId, ...fulfillment, lines: [line("pizza", quantity)] };
  if (quantity > 0) await expect(h.ordering.quote(cart)).resolves.toMatchObject({ lines: [{ quantity }] });
  await expect(h.ordering.quote({ ...cart, lines: [line("pizza", quantity + 1)] })).rejects.toMatchObject({ code: "inventory_changed" });
}

describe("shared-cart public contract", () => {
  it("keeps host fulfillment preferences private from invited visitors and participants", async () => {
    const h = harness();
    const privateFulfillment = {
      mode: "delivery" as const, slotId: "evening", notes: "Istruzioni private del creatore",
      address: { text: "Via Privata del Creatore 42", latitude: 45.001, longitude: 9.001 },
      benefits: { couponCodes: ["COUPON-PRIVATO-CREATORE"], redeemReward: true },
    };
    const created = await h.service.create(hostAccess, { storeId, lines: [line()], fulfillment: privateFulfillment, idempotencyKey: "private-create" });
    const hostView = await h.service.read(hostAccess, created.id);
    expect(hostView.fulfillment).toEqual(privateFulfillment);
    const visitor = await h.service.read({ actor: null, capability: "private-visitor" }, created.id, created.inviteToken);
    const joined = await h.service.join(guestAccess, created.id, { inviteToken: created.inviteToken!, lines: [line("second")], idempotencyKey: "private-join" });
    const participant = await h.service.read(guestAccess, created.id);
    for (const shared of [visitor, joined, participant]) {
      expect(shared.fulfillment).toBeUndefined();
      const serialized = JSON.stringify(shared);
      for (const secret of [privateFulfillment.address.text, privateFulfillment.notes, privateFulfillment.benefits.couponCodes[0], "redeemReward"]) {
        expect(serialized).not.toContain(secret);
      }
    }
    expect(participant.participants.map(person => person.name)).toEqual([host.name, guest.name]);
    expect(participant.participants.flatMap(person => person.lines)).toEqual([line(), line("second")]);
    expect((await h.restart().read({ actor: host }, created.id)).fulfillment).toEqual(privateFulfillment);
  });

  it("creates without name, deadline or fulfillment and preserves cart quantity, notes and customization", async () => {
    const h = harness();
    const lines = [{ ...line("pizza", 2), notes: "Ben cotte", optionIds: ["choice"] }];
    const group = await h.service.create({ actor: null, capability: "anonymous-host" }, { storeId, lines, idempotencyKey: "create" });
    expect(group.status).toBe("open");
    expect(group.role).toBe("host");
    expect(group.participants).toHaveLength(1);
    expect(group.participants[0].lines).toEqual(lines);
    expect(group.participants[0].name.trim()).not.toBe("");
    expect(group).not.toHaveProperty("deadline");
    expect(group.fulfillment).toBeUndefined();
    expect(h.repo.snapshot().orders).toEqual({});
  });

  it("deduplicates create and join retries, uses account identity and recovers binding without cookie", async () => {
    const h = harness();
    const input = { storeId, lines: [line()], idempotencyKey: "create" };
    const [first, duplicate] = await Promise.all([h.service.create(hostAccess, input), h.service.create(hostAccess, input)]);
    expect(duplicate.id).toBe(first.id);
    expect(first.participants[0].name).toBe(host.name);
    const inviteToken = first.inviteToken!;
    const join = { inviteToken, lines: [line("second")], idempotencyKey: "join" };
    await h.service.join(guestAccess, first.id, join);
    const joined = await h.service.join(guestAccess, first.id, join);
    expect(joined.participants).toHaveLength(2);
    expect(joined.participants.find(person => person.id === joined.participantId)?.lines).toEqual(join.lines);
    const recovered = await h.restart().read({ actor: guest }, first.id);
    expect(recovered.participantId).toBe(joined.participantId);
    expect(recovered.role).toBe("participant");
    expect((await h.service.read({ actor: null, capability: "visitor" }, first.id, inviteToken)).role).toBe("visitor");
  });

  it("never expires an open group and permits the host to replace another unpaid participant's choices", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line("second")], idempotencyKey: "join" });
    const changed = await h.service.replaceLines(hostAccess, group.id, { participantId: joined.participantId!, revision: joined.revision, lines: [line("pizza", 2)] });
    expect(changed.participants.find(person => person.id === joined.participantId)?.lines).toEqual([line("pizza", 2)]);
    h.advance(365 * 24 * 60 * 60 * 1000);
    await h.service.tick();
    const recovered = await h.restart().read(hostAccess, group.id);
    expect(recovered.status).toBe("open");
    expect(recovered.participants).toHaveLength(2);
    await expect(h.service.replaceLines(guestAccess, group.id, { participantId: group.participantId!, revision: recovered.revision, lines: [] })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("binds an anonymous participation to the account on access while its name never grants host permission", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const anonymous = { actor: null, capability: "unbound-guest" };
    const joined = await h.service.join(anonymous, group.id, { inviteToken: group.inviteToken!, lines: [line("second")], idempotencyKey: "join" });
    const renamed = await h.service.rename(anonymous, group.id, { revision: joined.revision, name: host.name });
    expect(renamed.participants.find(person => person.id === joined.participantId)?.name).toBe(host.name);
    expect(renamed.role).toBe("participant");
    const bound = await h.service.read({ actor: guest, capability: anonymous.capability }, group.id);
    expect(bound.participantId).toBe(joined.participantId);
    expect((await h.restart().read({ actor: guest }, group.id)).participantId).toBe(joined.participantId);
    expect((await h.service.read({ actor: null, capability: "lost-cookie" }, group.id, group.inviteToken)).participantId).toBeNull();
    await expect(h.service.close({ actor: guest }, group.id, { revision: bound.revision })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("retains suspended groups and switches only the active group for the selected store", async () => {
    const h = harness();
    const first = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "first" });
    const second = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "second" });
    const suspended = await h.service.activate(hostAccess, storeId, null);
    expect(suspended.activeId).toBeNull();
    expect(suspended.groups.map(group => group.id).sort()).toEqual([first.id, second.id].sort());
    expect((await h.service.activate(hostAccess, storeId, first.id)).activeId).toBe(first.id);
    expect((await h.restart().context({ actor: host }, storeId)).groups).toHaveLength(2);
  });

  it("requires account payment and refuses a below-minimum share with a typed error before provider calls", async () => {
    const h = harness();
    const access = { actor: null, capability: "anonymous-host" };
    const anonymous = await h.service.create(access, { storeId, lines: [line()], idempotencyKey: "anonymous" });
    await expect(h.service.payShare(access, anonymous.id, { revision: anonymous.revision, idempotencyKey: "pay" })).rejects.toMatchObject({ code: "unauthorized" });
    const small = await h.service.create(hostAccess, { storeId, lines: [line("small")], idempotencyKey: "small" });
    await expect(h.service.payShare(hostAccess, small.id, { revision: small.revision, idempotencyKey: "pay-small" })).rejects.toMatchObject({ code: expect.any(String) });
    expect(h.payments.createCalls).toHaveLength(0);
    await expectCapacity(h, 10);
  });

  it("serializes repeated share payments, reserves stock once and locks paid composition without a deadline", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line("pizza", 2)], idempotencyKey: "create" });
    const input = { revision: group.revision, idempotencyKey: "pay" };
    const results = await Promise.all([h.service.payShare(hostAccess, group.id, input), h.service.payShare(hostAccess, group.id, input)]);
    expect(results[0].payment.id).toBe(results[1].payment.id);
    const paid = await h.service.read(hostAccess, group.id);
    expect(paid.participants[0].payment).toMatchObject({ amountCents: 1600, status: "paid" });
    expect(h.payments.intents.size).toBe(1);
    await expectCapacity(h, 8);
    await expect(h.service.replaceLines(hostAccess, group.id, { participantId: paid.participantId!, revision: paid.revision, lines: [] })).rejects.toMatchObject({ code: expect.any(String) });
    h.advance(30 * 24 * 60 * 60 * 1000);
    await h.restart().tick();
    expect((await h.service.read(hostAccess, group.id)).participants[0].payment?.status).toBe("paid");
    await expectCapacity(h, 8);
  });

  it("reserves ingredients before provider creation and prevents two groups paying the last stock", async () => {
    const h = harness();
    await h.repo.port.transact(state => { state.stores[storeId].ingredients[0].stock = 1; });
    const unavailableWhenCreating: boolean[] = [];
    h.payments.observeCreate(async () => {
      const unavailable = await h.ordering.quote({ storeId, ...fulfillment, lines: [line()] }).then(() => false, (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "inventory_changed");
      unavailableWhenCreating.push(unavailable);
    });
    const first = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "first" });
    const second = await h.service.create(guestAccess, { storeId, lines: [line()], idempotencyKey: "second" });
    const results = await Promise.allSettled([
      h.service.payShare(hostAccess, first.id, { revision: first.revision, idempotencyKey: "first-pay" }),
      h.service.payShare(guestAccess, second.id, { revision: second.revision, idempotencyKey: "second-pay" }),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(h.payments.createCalls).toHaveLength(1);
    expect(unavailableWhenCreating).toEqual([true]);
    await expectCapacity(h, 0);
  });

  it("exposes the ongoing operational group after its first payment without submitting a customer order", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    expect(await h.service.operations(operator, storeId)).toEqual([]);
    const paid = await h.service.payShare(hostAccess, group.id, { revision: group.revision, idempotencyKey: "pay" });
    const operations = await h.service.operations(operator, storeId);
    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({ id: group.id, status: "open", payments: [expect.objectContaining({ id: paid.payment.id, amountCents: 800, status: "paid" })] });
    expect(operations[0].orderId).toBeUndefined();
    expect(h.repo.snapshot().orders).toEqual({});
    expect(await h.ordering.orders(operator, storeId)).toEqual([]);
    await expect(h.service.operations(guest, storeId)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("locks paid prices while pricing unpaid choices and delivery into only the host residual", async () => {
    const h = harness();
    const created = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, created.id, { inviteToken: created.inviteToken!, lines: [line()], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, created.id, { revision: joined.revision, idempotencyKey: "pay" });
    await h.repo.port.transact(state => { state.stores[storeId].products[0].priceCents = 1200; });
    const delivery = { mode: "delivery" as const, slotId: "evening", notes: "", address: { text: "Via di prova 1", latitude: 45, longitude: 9 } };
    const quote = await h.service.quote(hostAccess, created.id, { revision: paid.group.revision, fulfillment: delivery });
    expect(quote.prepaidCents).toBe(800);
    expect(quote.remainingCents).toBe(1100);
    expect(quote.quote.totalCents).toBe(1900);
    const result = await h.service.checkout(hostAccess, created.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment: delivery, phone: "3331234567", method: "card", idempotencyKey: "final" });
    expect(h.payments.createCalls.map(call => call.totalCents)).toEqual([800, 1100]);
    expect(result.order.quote.totalCents).toBe(1900);
    expect(result.order.status).toBe("awaiting_acceptance");
    await expectCapacity(h, 8);
    const operation = (await h.service.operations(operator, storeId))[0];
    expect(operation.id).toBe(created.id);
    expect(operation.orderId).toBe(result.order.id);
    expect(Object.keys(h.repo.snapshot().orders)).toEqual([result.order.id]);
    expect((await h.service.recover(hostAccess, created.id)).order.id).toBe(result.order.id);
  });

  it("allows a cash final residual below the card minimum and preserves prepaid shares if final payment fails", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line("small")], idempotencyKey: "create" });
    const quote = await h.service.quote(hostAccess, group.id, { revision: group.revision, fulfillment });
    const result = await h.service.checkout(hostAccess, group.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "cash", idempotencyKey: "cash" });
    expect(result.order.quote.totalCents).toBe(40);
    expect(result.order.payment).toBe("cash_due");
    expect(h.payments.createCalls).toEqual([]);

    const second = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "second" });
    const joined = await h.service.join(guestAccess, second.id, { inviteToken: second.inviteToken!, lines: [line()], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, second.id, { revision: joined.revision, idempotencyKey: "pay" });
    h.payments.status("failed");
    const finalQuote = await h.service.quote(hostAccess, second.id, { revision: paid.group.revision, fulfillment });
    await h.service.checkout(hostAccess, second.id, { revision: finalQuote.revision, fingerprint: finalQuote.quote.fingerprint, fulfillment, phone: "3331234567", method: "card", idempotencyKey: "failed-final" });
    const retained = await h.service.read(guestAccess, second.id);
    expect(retained.status).not.toBe("submitted");
    expect(retained.participants.find(person => person.id === joined.participantId)?.payment?.status).toBe("paid");
    await expectCapacity(h, 9);
  });

  it("enforces refund ownership, removes the refunded invitee durably and creates a fresh participation on rejoin", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line("second")], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, group.id, { revision: joined.revision, idempotencyKey: "pay" });
    await expect(h.service.refundShare(hostAccess, group.id, { paymentId: paid.payment.id, idempotencyKey: "host-refund" })).rejects.toMatchObject({ code: "forbidden" });
    expect(h.payments.refundCalls).toHaveLength(0);
    h.payments.refundStatus("pending");
    const refunded = await h.service.refundShare(guestAccess, group.id, { paymentId: paid.payment.id, idempotencyKey: "refund" });
    expect(refunded.participants.some(person => person.id === joined.participantId)).toBe(false);
    await expectCapacity(h, 10);
    const access = await h.restart().read(guestAccess, group.id, group.inviteToken);
    expect(access.participantId).toBeNull();
    expect(access.role).toBe("visitor");
    await expect(h.service.replaceLines({ actor: null, capability: guestAccess.capability }, group.id, { participantId: joined.participantId!, revision: access.revision, lines: [line()] })).rejects.toMatchObject({ code: "forbidden" });
    const rejoined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [], idempotencyKey: "rejoin" });
    expect(rejoined.participantId).not.toBe(joined.participantId);
    expect(rejoined.participants.find(person => person.id === rejoined.participantId)?.lines).toEqual([]);
    await h.service.refundShare(guestAccess, group.id, { paymentId: paid.payment.id, idempotencyKey: "refund" });
    expect(h.payments.refunds.size).toBe(1);
    expect((await h.ordering.session(guest)).actor?.id).toBe(guest.id);
  });

  it("permits the store operator refund and preserves a host's role when refunding their own share", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const paid = await h.service.payShare(hostAccess, group.id, { revision: group.revision, idempotencyKey: "pay" });
    const refunded = await h.service.refund(operator, group.id, { paymentId: paid.payment.id, idempotencyKey: "operator-refund" });
    expect(refunded.payments.find(payment => payment.id === paid.payment.id)?.status).toBe("refunded");
    const recovered = await h.restart().read(hostAccess, group.id);
    expect(recovered.role).toBe("host");
    expect(recovered.participantId).toBe(group.participantId);
    expect(recovered.participants.find(person => person.host)?.lines).toEqual([]);
    await expectCapacity(h, 10);
  });

  it("recovers a lost provider response after restart without a second charge or persisted client secret", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    h.payments.loseCreateResponse();
    const input = { revision: group.revision, idempotencyKey: "pay" };
    await h.service.payShare(hostAccess, group.id, input).catch(() => undefined);
    const recovered = await h.restart().payShare(hostAccess, group.id, input);
    expect(recovered.payment.status).toBe("paid");
    expect(h.payments.intents.size).toBe(1);
    await expectCapacity(h, 9);
    expect(JSON.stringify(h.repo.snapshot())).not.toContain("provider-secret");
    const visitor = await h.service.read({ actor: null, capability: "visitor" }, group.id, group.inviteToken);
    expect(JSON.stringify(visitor)).not.toContain("provider-secret");
    expect(JSON.stringify(visitor)).not.toContain(host.email);
    expect(JSON.stringify(await h.service.operations(operator, storeId))).not.toContain("provider-secret");
  });

  it("keeps a processing share immutable and reserves until provider cancellation is authoritative", async () => {
    const h = harness();
    h.payments.status("requires_action");
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const processing = await h.service.payShare(hostAccess, group.id, { revision: group.revision, idempotencyKey: "pay" });
    expect(processing.clientSecret).toBe("provider-secret");
    await expectCapacity(h, 9);
    await expect(h.service.replaceLines(hostAccess, group.id, { participantId: group.participantId!, revision: processing.group.revision, lines: [] })).rejects.toMatchObject({ code: expect.any(String) });
    await expect(h.service.reconcileShare(guestAccess, group.id, processing.payment.id)).rejects.toMatchObject({ code: "forbidden" });
    h.advance(24 * 60 * 60 * 1000);
    await h.restart().tick();
    expect([...h.payments.intents.values()][0].status).toBe("cancelled");
    await expectCapacity(h, 10);
    expect((await h.service.read(hostAccess, group.id)).status).toBe("open");
  });

  it("reconciles provider success at technical timeout before deciding whether to release ingredients", async () => {
    const h = harness();
    h.payments.status("processing");
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const pending = await h.service.payShare(hostAccess, group.id, { revision: group.revision, idempotencyKey: "pay" });
    const intent = [...h.payments.intents.values()][0];
    intent.status = "paid";
    h.advance(24 * 60 * 60 * 1000);
    await h.restart().tick();
    const recovered = await h.service.read(hostAccess, group.id);
    expect(recovered.participants[0].payment).toMatchObject({ id: pending.payment.id, status: "paid" });
    await expectCapacity(h, 9);
    expect(intent.status).toBe("paid");
  });

  it("recovers a lost refund response and failed refund without restoring removed choices or duplicating the refund", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line("second")], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, group.id, { revision: joined.revision, idempotencyKey: "pay" });
    h.payments.refundStatus("failed");
    h.payments.loseRefundResponse();
    const input = { paymentId: paid.payment.id, idempotencyKey: "refund" };
    await h.service.refundShare(guestAccess, group.id, input).catch(() => undefined);
    const afterUncertain = await h.restart().read(hostAccess, group.id);
    expect(afterUncertain.participants.some(person => person.id === joined.participantId)).toBe(false);
    const recovered = await h.restart().refundShare(guestAccess, group.id, input);
    expect(recovered.participants.some(person => person.id === joined.participantId)).toBe(false);
    expect(h.payments.refunds.size).toBe(1);
    await expectCapacity(h, 10);
  });

  it("refunds a submitted share to its original payer while retaining the complete kitchen order", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line()], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, group.id, { revision: joined.revision, idempotencyKey: "pay" });
    const originalPayerIntent = [...h.payments.intents.keys()][0];
    const quote = await h.service.quote(hostAccess, group.id, { revision: paid.group.revision, fulfillment });
    const submitted = await h.service.checkout(hostAccess, group.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "card", idempotencyKey: "final" });
    await expect(h.service.refundShare(guestAccess, group.id, { paymentId: paid.payment.id, idempotencyKey: "payer-submitted-refund" })).rejects.toMatchObject({ code: "forbidden" });
    const refunded = await h.service.refund(operator, group.id, { paymentId: paid.payment.id, idempotencyKey: "submitted-refund" });
    expect(refunded.status).toBe("submitted");
    expect(refunded.participants.find(person => person.id === joined.participantId)?.lines).toEqual([line()]);
    expect(h.payments.refundCalls.map(call => call.intentId)).toEqual([originalPayerIntent]);
    const order = (await h.ordering.orders(operator, storeId)).find(order => order.id === submitted.order.id);
    expect(order?.cart.lines.reduce((total, item) => total + item.quantity, 0)).toBe(2);
    expect(order?.status).toBe("awaiting_acceptance");
    await expectCapacity(h, 8);
  });

  it("refunds a host-financed participant's share partially to the original host intent", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line()], idempotencyKey: "join" });
    const quote = await h.service.quote(hostAccess, group.id, { revision: joined.revision, fulfillment });
    const submitted = await h.service.checkout(hostAccess, group.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "card", idempotencyKey: "host-all" });
    expect(h.payments.createCalls.map(call => call.totalCents)).toEqual([1700]);
    const participant = (await h.service.read(hostAccess, group.id)).participants.find(person => person.id === joined.participantId);
    expect(participant?.payment).toMatchObject({ participantId: joined.participantId, amountCents: 800, status: "paid" });
    const paymentId = participant!.payment!.id;
    await expect(h.service.refundShare(guestAccess, group.id, { paymentId, idempotencyKey: "wrong-payer" })).rejects.toMatchObject({ code: "forbidden" });
    await h.service.refund(operator, group.id, { paymentId, idempotencyKey: "host-refund" });
    expect(h.payments.refundCalls).toEqual([expect.objectContaining({ intentId: [...h.payments.intents.keys()][0], amountCents: 800 })]);
    const order = (await h.ordering.orders(operator, storeId)).find(order => order.id === submitted.order.id);
    expect(order?.cart.lines.reduce((total, item) => total + item.quantity, 0)).toBe(2);
    expect(order?.status).toBe("awaiting_acceptance");
    await expectCapacity(h, 8);
  });

  it("keeps cash due equal to only the unpaid residual after a prepaid share", async () => {
    const h = harness();
    const group = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line()], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, group.id, { revision: joined.revision, idempotencyKey: "pay" });
    const delivery = { mode: "delivery" as const, slotId: "evening", notes: "", address: { text: "Via di prova 1", latitude: 45, longitude: 9 } };
    const quote = await h.service.quote(hostAccess, group.id, { revision: paid.group.revision, fulfillment: delivery });
    const submitted = await h.service.checkout(hostAccess, group.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment: delivery, phone: "3331234567", method: "cash", idempotencyKey: "cash-final" });
    expect(submitted.order.quote.totalCents).toBe(1900);
    expect(submitted.order.payment).toBe("cash_due");
    expect(submitted.order.settlement).toMatchObject({ prepaidCents: 800, remainingCents: 1100, paidCents: 800, cashDueCents: 1100 });
    expect(h.payments.createCalls.map(call => call.totalCents)).toEqual([800]);
  });

  it("evaluates benefits with only unpaid choices and the host's identity", async () => {
    const priced: { productIds: string[]; actorId: string | null }[] = [];
    const h = harness((_state, cart, quote, actor) => {
      if (!cart.benefits) return quote;
      priced.push({ productIds: cart.lines.map(item => item.productId), actorId: actor?.id ?? null });
      const discount = Math.floor(quote.subtotalCents / 2);
      return { ...quote, subtotalCents: quote.subtotalCents - discount, totalCents: quote.totalCents - discount };
    });
    const group = await h.service.create(hostAccess, { storeId, lines: [line("second")], idempotencyKey: "create" });
    const joined = await h.service.join(guestAccess, group.id, { inviteToken: group.inviteToken!, lines: [line()], idempotencyKey: "join" });
    const paid = await h.service.payShare(guestAccess, group.id, { revision: joined.revision, idempotencyKey: "pay" });
    const quote = await h.service.quote(hostAccess, group.id, { revision: paid.group.revision, fulfillment: { ...fulfillment, benefits: { couponCodes: ["META"], redeemReward: false } } });
    expect(priced.length).toBeGreaterThan(0);
    expect(priced.every(item => item.actorId === host.id && item.productIds.length === 1 && item.productIds[0] === "second")).toBe(true);
    expect(quote.prepaidCents).toBe(800);
    expect(quote.remainingCents).toBe(450);
    expect(quote.quote.totalCents).toBe(1250);
  });

  it("denies refund operations to an operator from another store", async () => {
    const h = harness();
    const otherOperator = { id: "other-operator", email: "other@example.test", name: "Altro operatore" };
    await h.repo.port.transact(state => { state.memberships.push({ storeId: "other-store", email: otherOperator.email }); });
    const group = await h.service.create(hostAccess, { storeId, lines: [line()], idempotencyKey: "create" });
    const paid = await h.service.payShare(hostAccess, group.id, { revision: group.revision, idempotencyKey: "pay" });
    await expect(h.service.refund(otherOperator, group.id, { paymentId: paid.payment.id, idempotencyKey: "wrong-store" })).rejects.toMatchObject({ code: "forbidden" });
    expect(h.payments.refundCalls).toEqual([]);
    await expectCapacity(h, 9);
  });
});
