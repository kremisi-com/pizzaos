import { describe, expect, it, vi } from "vitest";
import type { IndividualActor, IndividualLine, IndividualStore, GroupCheckout } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment } from "../ordering-contract";
import { createOrderingService } from "../ordering-service";
import { createGroupOrderingService } from "./group-service";

const alice: IndividualActor = { id: "alice", name: "Alice", email: "alice@example.test" };
const other: IndividualActor = { id: "other", name: "Altro", email: "other@example.test" };
const host = { actor: alice };
const guest = { actor: null };
const line: IndividualLine = { productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" };
const fulfillment = { mode: "pickup" as const, slotId: "evening", notes: "Ritiro insieme" };

function fixture() {
  let time = new Date("2026-11-05T16:00:00Z");
  let serial = 0;
  const store: IndividualStore = {
    id: "store", name: "Sede centro", latitude: 45, longitude: 9, acceptingOrders: true,
    deliveryBands: [{ upToKm: 10, feeCents: 200, minimumCents: 0 }],
    ingredients: [{ id: "dough", name: "Impasto", stock: 100 }],
    products: [{ id: "pizza", name: "Pizza", description: "Pomodoro", priceCents: 800, available: true,
      allergens: ["glutine"], ingredients: { dough: 1 }, options: [{ id: "olive", name: "Olive", priceCents: 100, ingredients: {} }] }],
    slots: [{ id: "evening", startsAt: "2026-11-05T19:00:00Z", capacity: 20 }]
  };
  let state: OrderingState = { stores: { store }, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 };
  let queue = Promise.resolve();
  const repository: OrderingRepository = {
    transact<T>(work: (draft: OrderingState) => T | Promise<T>): Promise<T> {
      const result = queue.then(async () => {
        const draft = structuredClone(state);
        const value = await work(draft);
        state = draft;
        return structuredClone(value);
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    }
  };
  const intents = new Map<string, ProviderPayment>();
  let uncertain = false;
  const payments: OrderingPayments = {
    create: vi.fn(async ({ key }) => {
      let intent = intents.get(key);
      if (!intent) { intent = { id: `pi-${intents.size + 1}`, status: "requires_action", clientSecret: "transient-secret" }; intents.set(key, intent); }
      if (uncertain) throw new Error("Risposta provider persa dopo commit");
      return intent;
    }),
    read: vi.fn(async (id) => { const value = [...intents.values()].find((p) => p.id === id); if (!value) throw new Error("Intent sconosciuto"); return value; }),
    cancel: vi.fn(async (id) => ({ id, status: "cancelled" as const })),
    refund: vi.fn(async () => ({ id: "refund", status: "succeeded" as const })),
    readRefund: vi.fn(async () => ({ id: "refund", status: "succeeded" as const }))
  };
  const options = { repository, payments, superadminEmails: [], now: () => time, id: () => `id-${++serial}` };
  let ordering = createOrderingService(options);
  const makeGroups = () => createGroupOrderingService({ repository, ordering, now: () => time, id: () => `id-${++serial}`, token: () => `secret-${++serial}` });
  let groups = makeGroups();
  return {
    repository, payments, intents,
    get groups() { return groups; }, get ordering() { return ordering; },
    setTime(value: string) { time = new Date(value); }, uncertain(value: boolean) { uncertain = value; },
    restart() { ordering = createOrderingService(options); groups = makeGroups(); },
    async snapshot() { return repository.transact((draft) => structuredClone(draft)); },
    async create() { return groups.create(alice, { storeId: "store", name: "Alice", deadline: "2026-11-05T17:00:00Z" }); },
    async prepared() {
      let group = await this.create();
      group = await groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [line] });
      group = await groups.close(host, group.id, { revision: group.revision });
      const quoted = await groups.quote(host, group.id, { revision: group.revision, fulfillment });
      const checkout: GroupCheckout = { revision: group.revision, fingerprint: quoted.quote.fingerprint, fulfillment, phone: "+393331234567", method: "cash", idempotencyKey: "group-attempt" };
      return { group, checkout };
    }
  };
}

describe("group collection authorization and lifecycle", () => {
  it("returns structured missing-group errors through a cloning repository and rejects inherited IDs", async () => {
    const f = fixture();
    await expect(f.groups.read(host, "missing-group")).rejects.toMatchObject({ code: "not_found", statusCode: 404 });
    await expect(f.groups.read(host, "toString")).rejects.toHaveProperty("statusCode", expect.any(Number));
    await expect(f.groups.read(host, "__proto__")).rejects.toHaveProperty("statusCode", expect.any(Number));
  });
  it("requires an authenticated host and collects without stock, slot, order or payment reservations", async () => {
    const f = fixture();
    await expect(f.groups.create(null, { storeId: "store", name: "Alice", deadline: "2026-11-05T17:00:00Z" })).rejects.toMatchObject({ code: "unauthorized", statusCode: 401 });
    await expect(f.groups.create(alice, { storeId: "missing", name: "Alice", deadline: "2026-11-05T17:00:00Z" })).rejects.toMatchObject({ code: "not_found" });
    await expect(f.groups.create(alice, { storeId: "store", name: "Alice", deadline: "2026-11-05T16:00:00Z" })).rejects.toMatchObject({ code: "invalid_input" });
    const before = await f.snapshot();
    const group = await f.create();
    expect(group).toMatchObject({ status: "open", role: "host", storeId: "store", participants: [{ name: "Alice", host: true, lines: [] }] });
    expect(group.inviteToken).toBeTruthy();
    await f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [{ ...line, quantity: 100 }] });
    const after = await f.snapshot();
    expect(after.stores).toEqual(before.stores); expect(after.orders).toEqual({}); expect(after.idempotency).toEqual({});
    expect(f.payments.create).not.toHaveBeenCalled();
  });

  it("issues distinct guest capabilities, preserves identity after restart and minimizes visitor data", async () => {
    const f = fixture(); const group = await f.create();
    const marco = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    const giulia = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Giulia" });
    expect(marco.capability).not.toBe(giulia.capability); expect(marco.capability).not.toBe(group.inviteToken);
    const again = await f.groups.join({ actor: null, capability: marco.capability }, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    expect(again.group.participantId).toBe(marco.group.participantId); expect(again.group.participants).toHaveLength(3);
    f.restart();
    expect((await f.groups.read({ actor: null, capability: marco.capability }, group.id)).participantId).toBe(marco.group.participantId);
    const visitor = await f.groups.read(guest, group.id, group.inviteToken);
    expect(visitor).toMatchObject({ role: "visitor", participantId: null });
    expect(JSON.stringify(visitor)).not.toMatch(/secret-|alice@example|customerId|clientSecret|providerIntent|capability|address|phone/);
    expect((await f.groups.read(host, group.id)).inviteToken).toBe(group.inviteToken);
  });

  it("enforces personal ownership, invite-only access and group-scoped capabilities", async () => {
    const f = fixture(); const group = await f.create();
    const marco = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    const giulia = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Giulia" });
    const input = { participantId: marco.group.participantId!, revision: giulia.group.revision, lines: [line] };
    for (const access of [{ actor: null, capability: giulia.capability }, { actor: null, capability: group.inviteToken }, { actor: other }]) {
      await expect(f.groups.replaceLines(access, group.id, input)).rejects.toMatchObject({ code: "forbidden", statusCode: 403 });
    }
    const second = await f.create();
    await expect(f.groups.replaceLines({ actor: null, capability: marco.capability }, second.id, { ...input, revision: second.revision, participantId: second.participantId! })).rejects.toMatchObject({ code: "forbidden" });
    const updated = await f.groups.replaceLines({ actor: null, capability: marco.capability }, group.id, { ...input, lines: [{ ...line, quantity: 2 }] });
    const finished = await f.groups.replaceLines({ actor: null, capability: giulia.capability }, group.id, { participantId: giulia.group.participantId!, revision: updated.revision, lines: [line] });
    expect(finished.participants.find((p) => p.id === marco.group.participantId)?.lines[0].quantity).toBe(2);
    expect(finished.participants.find((p) => p.id === giulia.group.participantId)?.lines[0].quantity).toBe(1);
  });

  it("serializes concurrent writers from the same revision with exactly one conflict", async () => {
    const f = fixture(); const group = await f.create();
    const results = await Promise.allSettled([1, 2].map((quantity) => f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [{ ...line, quantity }] })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected?.status === "rejected" ? rejected.reason : null).toMatchObject({ code: "revision_conflict", statusCode: 409 });
    const winner = results.find((r) => r.status === "fulfilled");
    expect((await f.groups.read(host, group.id)).participants).toEqual(winner?.status === "fulfilled" ? winner.value.participants : []);
  });

  it.each([0, -1, 101, 1.5, Number.MAX_SAFE_INTEGER, Infinity, NaN])("rejects hostile quantity %s atomically", async (quantity) => {
    const f = fixture(); const group = await f.create();
    await expect(f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [{ ...line, quantity }] })).rejects.toMatchObject({ code: "invalid_input", statusCode: 400 });
    expect(await f.groups.read(host, group.id)).toEqual(group);
  });

  it("rejects excessive rows and blank or oversized names without mutation", async () => {
    const f = fixture(); const group = await f.create();
    for (const name of ["", "   ", "x".repeat(10000)]) await expect(f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: Array.from({ length: 101 }, () => ({ ...line })) })).rejects.toMatchObject({ code: "invalid_input" });
    expect((await f.groups.read(host, group.id)).participants).toHaveLength(1);
  });

  it("enforces the hundred-row limit across all people rather than separately per participant", async () => {
    const f = fixture(); let group = await f.create();
    const person = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    group = await f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: person.group.revision, lines: Array.from({ length: 60 }, () => ({ ...line })) });
    await expect(f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: group.revision, lines: Array.from({ length: 41 }, () => ({ ...line })) })).rejects.toMatchObject({ code: "invalid_input" });
    expect((await f.groups.read(host, group.id)).revision).toBe(group.revision);
    group = await f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: group.revision, lines: Array.from({ length: 40 }, () => ({ ...line })) });
    expect(group.participants.flatMap((person) => person.lines)).toHaveLength(100);
  });

  it("rejects guest writes and joins at the deadline even when competing with the closure worker", async () => {
    const f = fixture(); const group = await f.create();
    const person = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    f.setTime("2026-11-05T17:00:00.000Z");
    const results = await Promise.allSettled([
      f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: person.group.revision, lines: [line] }),
      f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Tardi" }),
      f.groups.tick()
    ]);
    for (const result of results.slice(0, 2)) expect(result.status === "rejected" ? result.reason : null).toMatchObject({ code: "group_closed", statusCode: 409 });
    const closed = await f.groups.read(host, group.id);
    expect(closed.revision).toBe(person.group.revision + 1); expect(closed.participants).toHaveLength(2);
    expect(closed.participants.flatMap((person) => person.lines)).toHaveLength(0);
  });

  it("closes exactly at deadline on read or worker tick only once without checkout", async () => {
    const f = fixture(); const group = await f.create();
    const person = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    f.setTime("2026-11-05T16:59:59.999Z"); expect((await f.groups.read(host, group.id)).status).toBe("open");
    f.setTime("2026-11-05T17:00:00.000Z");
    const closed = await f.groups.read(host, group.id);
    expect(closed).toMatchObject({ status: "closed", revision: person.group.revision + 1 });
    await f.groups.tick(); await f.groups.tick();
    expect((await f.groups.read(host, group.id)).revision).toBe(closed.revision);
    await expect(f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Tardi" })).rejects.toMatchObject({ code: "group_closed" });
    await expect(f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: closed.revision, lines: [line] })).rejects.toMatchObject({ code: "group_closed" });
    expect((await f.snapshot()).orders).toEqual({}); expect((await f.snapshot()).stores.store.ingredients[0].stock).toBe(100); expect(f.payments.create).not.toHaveBeenCalled();
    const untouched = await f.groups.create(alice, { storeId: "store", name: "Alice", deadline: "2026-11-05T18:00:00Z" });
    f.setTime("2026-11-05T18:00:00Z"); await f.groups.tick();
    expect((await f.groups.read(host, untouched.id)).status).toBe("closed");
  });

  it("allows host correction after closing and immediately revokes a removed capability", async () => {
    const f = fixture(); let group = await f.create();
    const person = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    await expect(f.groups.close({ actor: null, capability: person.capability }, group.id, { revision: person.group.revision })).rejects.toHaveProperty("statusCode", expect.any(Number));
    group = await f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: person.group.revision, lines: [line] });
    group = await f.groups.close(host, group.id, { revision: group.revision });
    group = await f.groups.replaceLines(host, group.id, { participantId: person.group.participantId!, revision: group.revision, lines: [] });
    expect(group.status).toBe("closed");
    await expect(f.groups.removeParticipant(host, group.id, { participantId: group.participantId!, revision: group.revision })).rejects.toHaveProperty("statusCode", expect.any(Number));
    group = await f.groups.removeParticipant(host, group.id, { participantId: person.group.participantId!, revision: group.revision });
    await expect(f.groups.read({ actor: null, capability: person.capability }, group.id)).rejects.toMatchObject({ code: "forbidden" });
    expect((await f.groups.read({ actor: null, capability: person.capability }, group.id, group.inviteToken)).role).toBe("visitor");
    await expect(f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: group.revision, lines: [line] })).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("group canonical quote and durable checkout", () => {
  it("isolates group checkout from a customer-chosen canonical idempotency key", async () => {
    const f = fixture(); let group = await f.create();
    const cart = { storeId: "store", ...fulfillment, lines: [{ ...line, notes: "Ordine individuale" }] };
    const individualQuote = await f.ordering.quote(cart);
    const individual = await f.ordering.checkout(alice, { cart, fingerprint: individualQuote.fingerprint, phone: "3331234567", method: "cash", idempotencyKey: `group:${group.id}` });
    const stillCollecting = await f.groups.read(host, group.id);
    expect(stillCollecting.status).toBe("open"); expect(stillCollecting.orderId).toBeUndefined();
    group = await f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: stillCollecting.revision, lines: [{ ...line, quantity: 2 }] });
    group = await f.groups.close(host, group.id, { revision: group.revision });
    const quote = await f.groups.quote(host, group.id, { revision: group.revision, fulfillment });
    const result = await f.groups.checkout(host, group.id, { revision: group.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "cash", idempotencyKey: "group-public-request" });
    expect(result.order.id).not.toBe(individual.order.id);
    expect(result.order.cart.lines).toMatchObject([{ quantity: 2, notes: "Per Alice · Ben cotta" }]);
    expect(await f.ordering.orders(alice)).toHaveLength(2);
  });

  it("requires a closed nonempty group and host for quote", async () => {
    const f = fixture(); let group = await f.create();
    await expect(f.groups.quote(host, group.id, { revision: group.revision, fulfillment })).rejects.toMatchObject({ statusCode: 409 });
    group = await f.groups.close(host, group.id, { revision: group.revision });
    await expect(f.groups.quote(host, group.id, { revision: group.revision, fulfillment })).rejects.toMatchObject({ code: "invalid_input" });
    await expect(f.groups.quote({ actor: other }, group.id, { revision: group.revision, fulfillment })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("retains attributed duplicate products and personal notes in one host cash order", async () => {
    const f = fixture(); let group = await f.create();
    const person = await f.groups.join(guest, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    group = await f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: person.group.revision, lines: [line] });
    group = await f.groups.replaceLines({ actor: null, capability: person.capability }, group.id, { participantId: person.group.participantId!, revision: group.revision, lines: [{ ...line, quantity: 2, notes: "Tagliata" }] });
    group = await f.groups.close(host, group.id, { revision: group.revision });
    const q = await f.groups.quote(host, group.id, { revision: group.revision, fulfillment });
    expect(q.quote.totalCents).toBe(2400); expect(q.quote.lines.map((row) => row.notes)).toEqual(["Per Alice · Ben cotta", "Per Marco · Tagliata"]);
    const result = await f.groups.checkout(host, group.id, { revision: group.revision, fingerprint: q.quote.fingerprint, fulfillment, phone: "+393331234567", method: "cash", idempotencyKey: "attributed" });
    expect(result.order).toMatchObject({ customerId: alice.id, status: "awaiting_acceptance", payment: "cash_due", contact: { name: "Alice", email: alice.email, phone: "+393331234567" } });
    expect(result.order.cart.lines.map((row) => row.notes)).toEqual(["Per Alice · Ben cotta", "Per Marco · Tagliata"]);
    expect(Object.keys((await f.snapshot()).orders)).toHaveLength(1); expect(f.payments.create).not.toHaveBeenCalled();
    const visitor = await f.groups.read(guest, group.id, group.inviteToken); expect(visitor.status).toBe("submitted");
    expect(JSON.stringify(visitor)).not.toMatch(/alice@example|customerId|clientSecret|phone|contact/);
    await expect(f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: (await f.groups.read(host, group.id)).revision, lines: [] })).rejects.toMatchObject({ statusCode: 409 });
  });

  it.each(["product_unavailable", "inventory_changed", "slot_unavailable"])("propagates canonical %s and allows host correction", async (code) => {
    const f = fixture(); const { group } = await f.prepared();
    await f.repository.transact((state) => {
      if (code === "product_unavailable") state.stores.store.products[0].available = false;
      if (code === "inventory_changed") state.stores.store.ingredients[0].stock = 0;
      if (code === "slot_unavailable") state.stores.store.slots[0].capacity = 0;
    });
    await expect(f.groups.quote(host, group.id, { revision: group.revision, fulfillment })).rejects.toMatchObject({ code, statusCode: 409 });
    expect((await f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [] })).status).toBe("closed");
    expect(Object.keys((await f.snapshot()).orders)).toHaveLength(0);
  });

  it("invalidates quotes after price, revision or fulfillment changes before order creation", async () => {
    const f = fixture(); const { group, checkout } = await f.prepared();
    await f.repository.transact((state) => { state.stores.store.products[0].priceCents = 900; });
    await expect(f.groups.checkout(host, group.id, checkout)).rejects.toMatchObject({ code: "price_changed" });
    const current = await f.groups.read(host, group.id);
    const refreshed = await f.groups.quote(host, group.id, { revision: current.revision, fulfillment }); expect(refreshed.quote.totalCents).toBe(900);
    const changed = await f.groups.replaceLines(host, group.id, { participantId: current.participantId!, revision: current.revision, lines: [{ ...line, quantity: 2 }] });
    await expect(f.groups.checkout(host, group.id, { ...checkout, fingerprint: refreshed.quote.fingerprint })).rejects.toMatchObject({ code: "revision_conflict" });
    const q = await f.groups.quote(host, group.id, { revision: changed.revision, fulfillment });
    await expect(f.groups.checkout(host, group.id, { ...checkout, revision: changed.revision, fingerprint: q.quote.fingerprint, fulfillment: { ...fulfillment, notes: "Diverso" } })).rejects.toMatchObject({ code: "price_changed" });
    expect(Object.keys((await f.snapshot()).orders)).toHaveLength(0);
  });

  it("returns one order and one provider intent for concurrent identical retries and restart", async () => {
    const f = fixture(); const { group, checkout } = await f.prepared(); const input = { ...checkout, method: "card" as const };
    const results = await Promise.all([f.groups.checkout(host, group.id, input), f.groups.checkout(host, group.id, input)]);
    expect(results[0].order.id).toBe(results[1].order.id); expect(f.intents.size).toBe(1); expect(Object.keys((await f.snapshot()).orders)).toHaveLength(1);
    expect((await f.ordering.quote({ storeId: "store", ...fulfillment, lines: [{ ...line, quantity: 99 }] })).totalCents).toBe(79200);
    await expect(f.ordering.quote({ storeId: "store", ...fulfillment, lines: [{ ...line, quantity: 100 }] })).rejects.toMatchObject({ code: "inventory_changed" });
    f.restart();
    expect((await f.groups.checkout(host, group.id, input)).order.id).toBe(results[0].order.id);
    expect((await f.groups.recover(host, group.id)).order.id).toBe(results[0].order.id); expect(f.intents.size).toBe(1);
    expect(await f.ordering.orders(alice)).toHaveLength(1);
  });

  it("freezes the original request after uncertain provider response and recovers after restart", async () => {
    const f = fixture(); const { group, checkout } = await f.prepared(); const input = { ...checkout, method: "card" as const };
    f.uncertain(true);
    const unresolved = await f.groups.checkout(host, group.id, input);
    expect(unresolved.order).toMatchObject({ status: "pending_payment", payment: "processing" }); expect(f.intents.size).toBe(1);
    f.restart(); const pending = await f.groups.read(host, group.id); expect(pending.checkoutPending).toBe(true);
    await expect(f.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: pending.revision, lines: [] })).rejects.toMatchObject({ code: "checkout_pending" });
    for (const changed of [{ ...input, phone: "+393339999999" }, { ...input, idempotencyKey: "different" }, { ...input, method: "cash" as const }, { ...input, fulfillment: { ...fulfillment, notes: "Cambio" } }]) {
      await expect(f.groups.checkout(host, group.id, changed)).rejects.toMatchObject({ code: "idempotency_conflict" });
    }
    await expect(f.groups.recover({ actor: other }, group.id)).rejects.toMatchObject({ code: "forbidden" });
    f.uncertain(false); const recovered = await f.groups.recover(host, group.id);
    expect(recovered.order.method).toBe("card"); expect(recovered.order.contact.phone).toBe(input.phone);
    expect((await f.groups.checkout(host, group.id, input)).order.id).toBe(recovered.order.id);
    expect(f.intents.size).toBe(1); expect(Object.keys((await f.snapshot()).orders)).toHaveLength(1);
  });

  it.each(["before", "after"])("recovers a lost handoff %s canonical commit without duplicate order", async (when) => {
    const f = fixture(); const { group, checkout } = await f.prepared(); const canonical = f.ordering.checkout.bind(f.ordering);
    vi.spyOn(f.ordering, "checkout").mockImplementationOnce(async (...args) => { if (when === "after") await canonical(...args); throw new Error("Connessione persa"); });
    await expect(f.groups.checkout(host, group.id, checkout)).rejects.toBeDefined();
    const committed = Object.values((await f.snapshot()).orders); expect(committed).toHaveLength(when === "after" ? 1 : 0);
    f.restart(); const result = await f.groups.recover(host, group.id);
    if (when === "after") expect(result.order.id).toBe(committed[0].id);
    expect(result.order.cart.lines[0].notes).toBe("Per Alice · Ben cotta"); expect(Object.keys((await f.snapshot()).orders)).toHaveLength(1);
  });
});
