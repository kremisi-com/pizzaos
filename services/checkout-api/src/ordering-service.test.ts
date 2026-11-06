// @vitest-environment node
// Independent behavioral tests derived only from REQUIREMENTS.md and CONTRACT_DESIGN.md.
import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualCart, IndividualCheckout, IndividualStore } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment, ProviderRefund } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

class MemoryRepository implements OrderingRepository {
  private state: OrderingState = { stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 };
  private tail: Promise<void> = Promise.resolve();
  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
    const operation = this.tail.then(async () => {
      const candidate = structuredClone(this.state);
      const result = await work(candidate);
      this.state = candidate;
      return structuredClone(result);
    });
    this.tail = operation.then(() => undefined, () => undefined);
    return operation;
  }
  snapshot(): Promise<OrderingState> { return this.transact((state) => state); }
}

class FakePayments implements OrderingPayments {
  payments = new Map<string, ProviderPayment>();
  refunds = new Map<string, ProviderRefund>();
  createCalls: { orderId: string; totalCents: number; key: string }[] = [];
  refundCalls: { intentId: string; key: string }[] = [];
  cancelCalls: string[] = [];
  initial: ProviderPayment["status"] = "requires_action";
  cancelStatus: ProviderPayment["status"] = "cancelled";
  refundStatus: ProviderRefund["status"] = "pending";
  loseCreateResponse = false;
  definitiveCreateFailure = false;
  loseRefundResponse = false;
  definitiveRefundFailures = new Set<string>();
  private createKeys = new Map<string, string>();
  private refundKeys = new Map<string, string>();
  async create(input: { orderId: string; totalCents: number; key: string }): Promise<ProviderPayment> {
    this.createCalls.push(input);
    if (this.definitiveCreateFailure) throw Object.assign(new Error("Provider definitively rejected payment creation"), { definitive: true });
    let id = this.createKeys.get(input.key);
    if (!id) {
      id = `pi_${this.payments.size + 1}`;
      this.createKeys.set(input.key, id);
      this.payments.set(id, { id, status: this.initial, clientSecret: `secret_${id}` });
    }
    if (this.loseCreateResponse) { this.loseCreateResponse = false; throw new Error("provider response lost"); }
    return this.read(id);
  }
  async read(id: string): Promise<ProviderPayment> {
    const value = this.payments.get(id);
    if (!value) throw new Error(`Unknown provider payment ${id}`);
    return { ...value };
  }
  async cancel(id: string): Promise<ProviderPayment> {
    this.cancelCalls.push(id);
    this.setPayment(id, this.cancelStatus);
    return this.read(id);
  }
  async refund(input: { intentId: string; key: string }): Promise<ProviderRefund> {
    this.refundCalls.push(input);
    if (this.definitiveRefundFailures.has(input.intentId)) throw Object.assign(new Error("Provider definitively rejected refund"), { definitive: true });
    let id = this.refundKeys.get(input.key);
    if (!id) {
      id = `re_${this.refunds.size + 1}`;
      this.refundKeys.set(input.key, id);
      this.refunds.set(id, { id, status: this.refundStatus });
    }
    if (this.loseRefundResponse) { this.loseRefundResponse = false; throw new Error("refund response lost"); }
    return this.readRefund(id);
  }
  async readRefund(id: string): Promise<ProviderRefund> {
    const value = this.refunds.get(id);
    if (!value) throw new Error(`Unknown provider refund ${id}`);
    return { ...value };
  }
  setPayment(id: string, status: ProviderPayment["status"]): void {
    const value = this.payments.get(id);
    if (!value) throw new Error(`Unknown provider payment ${id}`);
    this.payments.set(id, { ...value, status });
  }
  setRefund(id: string, status: ProviderRefund["status"]): void { this.refunds.set(id, { id, status }); }
}

const owner: IndividualActor = { id: "owner", email: "OWNER@example.it", name: "Proprietaria" };
const operator: IndividualActor = { id: "operator", email: "staff@example.it", name: "Operatore" };
const alice: IndividualActor = { id: "alice", email: "alice@example.it", name: "Alice" };
const bob: IndividualActor = { id: "bob", email: "bob@example.it", name: "Bob" };
const origin = Date.parse("2026-11-05T18:00:00.000Z");
const iso = (minutes: number) => new Date(origin + minutes * 60_000).toISOString();

function store(overrides: Partial<IndividualStore> = {}): IndividualStore {
  return {
    id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    deliveryBands: [{ upToKm: 1, feeCents: 100, minimumCents: 800 }, { upToKm: 5, feeCents: 300, minimumCents: 1600 }],
    ingredients: [{ id: "dough", name: "Impasto", stock: 20 }, { id: "cheese", name: "Mozzarella", stock: 20 }],
    products: [{ id: "pizza", name: "Pizza", description: "Pizza classica", priceCents: 800, available: true, allergens: ["glutine"], ingredients: { dough: 1 }, options: [{ id: "extra", name: "Mozzarella", priceCents: 100, ingredients: { cheese: 1 } }] }],
    slots: [{ id: "soon", startsAt: iso(20), capacity: 20 }, { id: "later", startsAt: iso(60), capacity: 20 }],
    ...overrides,
  };
}
function cart(overrides: Partial<IndividualCart> = {}): IndividualCart {
  return { storeId: "roma", lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" }], mode: "pickup", slotId: "soon", notes: "Citofono", ...overrides };
}
async function fixture(configuration = store()) {
  const repository = new MemoryRepository();
  const payments = new FakePayments();
  let time = origin;
  let sequence = 0;
  const options = { repository, payments, superadminEmails: ["owner@example.it"], now: () => new Date(time), id: () => `order_${++sequence}` };
  const service = createOrderingService(options);
  await service.saveStore(owner, configuration);
  await service.invite(owner, "roma", operator.email.toUpperCase());
  const input = async (value = cart(), key = "checkout-1", method: IndividualCheckout["method"] = "cash"): Promise<IndividualCheckout> => ({ cart: value, fingerprint: (await service.quote(value)).fingerprint, phone: "+39 3331234567", method, idempotencyKey: key });
  const submit = async (actor = alice, value = cart(), key = "checkout-1", method: IndividualCheckout["method"] = "cash") => service.checkout(actor, await input(value, key, method));
  return { service, repository, payments, options, input, submit, setTime: (minutes: number) => { time = origin + minutes * 60_000; } };
}

describe("authoritative catalog and quotation", () => {
  it("prices every selected option per item and chooses the first available future ASAP slot", async () => {
    const f = await fixture();
    const quote = await f.service.quote(cart({ slotId: null, lines: [{ productId: "pizza", quantity: 2, optionIds: ["extra"], notes: "" }] }));
    expect(quote).toMatchObject({ subtotalCents: 1800, deliveryCents: 0, totalCents: 1800, slotId: "soon", slotStartsAt: iso(20) });
    expect(quote.lines[0]?.unitCents).toBe(900);
    f.setTime(20);
    expect((await f.service.quote(cart({ slotId: null }))).slotId).toBe("later");
  });

  it("does not trust browser price fields", async () => {
    const f = await fixture();
    const untrusted = { ...cart(), totalCents: 1, lines: [{ ...cart().lines[0]!, unitCents: 1 }] };
    try { expect((await f.service.quote(untrusted)).totalCents).toBe(800); }
    catch (error) { expect(error).toMatchObject({ code: "invalid_input" }); }
  });

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER])("rejects invalid quantity %s", async (quantity) => {
    const f = await fixture();
    await expect(f.service.quote(cart({ lines: [{ productId: "pizza", quantity, optionIds: [], notes: "" }] }))).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("rejects duplicate or unknown options, unavailable products and summed recipe shortages", async () => {
    const f = await fixture(store({ ingredients: [{ id: "dough", name: "Impasto", stock: 1 }, { id: "cheese", name: "Mozzarella", stock: 1 }] }));
    for (const optionIds of [["extra", "extra"], ["missing"]]) {
      await expect(f.service.quote(cart({ lines: [{ productId: "pizza", quantity: 1, optionIds, notes: "" }] }))).rejects.toMatchObject({ code: "invalid_input" });
    }
    await expect(f.service.quote(cart({ lines: [...cart().lines, ...cart().lines] }))).rejects.toMatchObject({ code: "inventory_changed" });
    const updated = store(); updated.products[0]!.available = false;
    await f.service.saveStore(operator, updated);
    await expect(f.service.quote(cart())).rejects.toMatchObject({ code: "product_unavailable" });
  });

  it("uses the first inclusive delivery band and applies its minimum to products", async () => {
    const f = await fixture(store({ deliveryBands: [{ upToKm: 0, feeCents: 100, minimumCents: 800 }, { upToKm: 5, feeCents: 300, minimumCents: 1600 }] }));
    const delivery = cart({ mode: "delivery", address: { text: "Sede", latitude: 41.9, longitude: 12.5 } });
    expect(await f.service.quote(delivery)).toMatchObject({ subtotalCents: 800, deliveryCents: 100, totalCents: 900 });
    await expect(f.service.quote({ ...delivery, address: { text: "Vicino", latitude: 41.91, longitude: 12.5 } })).rejects.toMatchObject({ code: "minimum_not_met" });
    await expect(f.service.quote({ ...delivery, address: { text: "Lontano", latitude: 45, longitude: 12.5 } })).rejects.toMatchObject({ code: "outside_delivery_area" });
  });

  it("rejects stale price and slot fingerprints before contacting the provider", async () => {
    const f = await fixture();
    const input = await f.input(cart(), "stale", "card");
    const updated = store(); updated.products[0]!.priceCents = 900;
    await f.service.saveStore(operator, updated);
    await expect(f.service.checkout(alice, input)).rejects.toMatchObject({ code: "price_changed" });
    expect(f.payments.createCalls).toHaveLength(0);
    expect(await f.service.orders(alice)).toHaveLength(0);
  });

  it.each(["option", "slot", "delivery"] as const)("requires fresh confirmation when the selected %s changes", async (changed) => {
    const f = await fixture();
    const value = cart({ mode: "delivery", address: { text: "Casa", latitude: 41.9, longitude: 12.5 }, lines: [{ productId: "pizza", quantity: 1, optionIds: ["extra"], notes: "" }] });
    const input = await f.input(value, "stale-details", "card");
    const updated = store();
    if (changed === "option") updated.products[0]!.options[0]!.priceCents = 200;
    if (changed === "slot") updated.slots[0]!.startsAt = iso(25);
    if (changed === "delivery") updated.deliveryBands[0]!.feeCents = 200;
    await f.service.saveStore(operator, updated);
    await expect(f.service.checkout(alice, input)).rejects.toMatchObject({ code: "price_changed" });
    expect(f.payments.createCalls).toHaveLength(0);
  });
});

describe("authorization and durable events", () => {
  it("derives identity from the actor, isolates customers and enforces current store membership", async () => {
    const f = await fixture();
    await expect(f.service.checkout(null, await f.input())).rejects.toMatchObject({ code: "unauthorized", statusCode: 401 });
    await expect(f.service.saveStore(alice, store({ id: "other" }))).rejects.toMatchObject({ code: "forbidden" });
    await expect(f.service.invite(operator, "roma", bob.email)).rejects.toMatchObject({ code: "forbidden" });
    const input = { ...await f.input(), customerId: bob.id };
    const { order } = await f.service.checkout(alice, input);
    expect(order.customerId).toBe(alice.id);
    expect(order.contact).toMatchObject({ name: alice.name, email: alice.email });
    expect(await f.service.orders(bob)).toEqual([]);
    await expect(f.service.orders(bob, "roma")).rejects.toMatchObject({ code: "forbidden" });
    await expect(f.service.action(bob, order.id, { action: "cancel" })).rejects.toMatchObject({ code: "forbidden" });
    expect((await f.service.session(operator)).storeIds).toContain("roma");
    expect(await f.service.orders(operator, "roma")).toHaveLength(1);
  });

  it("does not reveal detailed stock to visitors", async () => {
    const f = await fixture();
    const publicCatalog = await f.service.catalog("roma");
    expect(publicCatalog.products[0]?.available).toBe(true);
    expect(JSON.stringify(publicCatalog)).not.toMatch(/"stock"\s*:\s*20/);
    expect((await f.service.catalog("roma", operator)).ingredients[0]?.stock).toBe(20);
  });

  it("survives recreation, monotonically revises events and filters every replay", async () => {
    const f = await fixture();
    const a = (await f.submit()).order;
    await f.submit(bob, cart(), "bob");
    await f.service.notes(alice, a.id, "Nuova nota");
    const restarted = createOrderingService(f.options);
    expect((await restarted.orders(alice))[0]?.notes).toBe("Nuova nota");
    const initial = await restarted.events(alice, 0);
    expect(initial.events.length).toBeGreaterThanOrEqual(2);
    expect(initial.events.every((event) => event.orderId === a.id && event.storeId === "roma")).toBe(true);
    expect(initial.events.map((event) => event.cursor)).toEqual([...initial.events.map((event) => event.cursor)].sort((x, y) => x - y));
    expect(new Set(initial.events.map((event) => event.revision)).size).toBe(initial.events.length);
    expect((await restarted.events(alice, initial.cursor)).events).toEqual([]);
    expect((await restarted.events(alice, 0)).events).toEqual(initial.events);
    await expect(restarted.events(bob, 0, "roma")).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("atomic reservations and idempotency", () => {
  it("requires phone and idempotency key and rejects discounted checkout extensions", async () => {
    const f = await fixture();
    const input = await f.input(cart(), "valid", "card");
    for (const invalid of [{ ...input, phone: "  " }, { ...input, idempotencyKey: "" }, { ...input, couponCode: "FREE" }, { ...input, rewards: 100 }]) {
      await expect(f.service.checkout(alice, invalid)).rejects.toMatchObject({ code: "invalid_input" });
    }
    expect(f.payments.createCalls).toHaveLength(0);
  });

  it("admits only one concurrent customer against the last slot and ingredient", async () => {
    const f = await fixture(store({ ingredients: [{ id: "dough", name: "Impasto", stock: 1 }, { id: "cheese", name: "Mozzarella", stock: 20 }], slots: [{ id: "soon", startsAt: iso(20), capacity: 1 }] }));
    const one = await f.input(cart(), "one"); const two = await f.input(cart(), "two");
    const results = await Promise.allSettled([f.service.checkout(alice, one), f.service.checkout(bob, two)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toMatchObject({ statusCode: 409 });
    const active = Object.values((await f.repository.snapshot()).orders).filter((order) => !order.reservationReleased);
    expect(active).toHaveLength(1);
  });

  it("returns the same order for identical retries but rejects changed payload with the same key", async () => {
    const f = await fixture();
    const input = await f.input();
    const first = await f.service.checkout(alice, input);
    expect((await f.service.checkout(alice, input)).order.id).toBe(first.order.id);
    for (const changed of [{ ...input, phone: "999" }, { ...input, method: "card" as const }, { ...input, cart: { ...input.cart, notes: "Diversa" } }]) {
      await expect(f.service.checkout(alice, changed)).rejects.toMatchObject({ code: "idempotency_conflict" });
    }
    expect(await f.service.orders(alice)).toHaveLength(1);
  });

  it("blocks a new key and cash while card processing, including after recreation", async () => {
    const f = await fixture(); f.payments.initial = "processing";
    const first = (await f.submit(alice, cart(), "card", "card")).order;
    expect(first).toMatchObject({ status: "pending_payment", payment: "processing" });
    const restarted = createOrderingService(f.options);
    await expect(restarted.checkout(alice, await f.input(cart(), "cash-reload"))).rejects.toMatchObject({ code: "payment_unresolved" });
    expect((await restarted.reconcile(alice, first.id)).order.id).toBe(first.id);
    expect(f.payments.payments.size).toBe(1);
  });

  it("recovers a lost create response using the same remote operation, never a second charge", async () => {
    const f = await fixture(); f.payments.loseCreateResponse = true;
    const input = await f.input(cart(), "lost", "card");
    await f.service.checkout(alice, input).catch(() => undefined);
    const restarted = createOrderingService(f.options);
    await expect(restarted.checkout(alice, { ...input, method: "cash", idempotencyKey: "new" })).rejects.toMatchObject({ code: "payment_unresolved" });
    const recovered = await restarted.checkout(alice, input);
    expect(recovered.order.customerId).toBe(alice.id);
    expect(f.payments.payments.size).toBe(1);
    expect(new Set(f.payments.createCalls.map((call) => call.key)).size).toBe(1);
  });

  it("releases exactly once on cancellation and protects committed configuration", async () => {
    const configuration = store({ ingredients: [{ id: "dough", name: "Impasto", stock: 1 }, { id: "cheese", name: "Mozzarella", stock: 20 }], slots: [{ id: "soon", startsAt: iso(20), capacity: 1 }] });
    const f = await fixture(configuration);
    const first = (await f.submit()).order;
    await expect(f.service.saveStore(operator, { ...configuration, ingredients: [], products: [] })).rejects.toMatchObject({ statusCode: 409 });
    await expect(f.service.saveStore(operator, { ...configuration, slots: [] })).rejects.toMatchObject({ statusCode: 409 });
    const cancelled = await f.service.action(alice, first.id, { action: "cancel" });
    expect(cancelled).toMatchObject({ status: "cancelled", reservationReleased: true });
    await f.service.action(alice, first.id, { action: "cancel" });
    await f.service.tick();
    await f.submit(bob, cart(), "replacement");
    await expect(f.submit(alice, cart(), "third")).rejects.toMatchObject({ statusCode: 409 });
    expect(f.payments.refundCalls).toHaveLength(0);
  });
});

describe("payment reconciliation and deadlines", () => {
  it("does not persist or list provider secrets; only provider confirmation marks paid", async () => {
    const f = await fixture();
    const result = await f.submit(alice, cart(), "card", "card");
    expect(result.order).toMatchObject({ status: "pending_payment", payment: "requires_action" });
    expect(result.clientSecret).toBeTruthy();
    expect(JSON.stringify(await f.repository.snapshot())).not.toContain("secret_");
    expect(JSON.stringify(await f.service.orders(alice))).not.toContain("secret_");
    f.payments.setPayment(result.order.providerIntentId!, "paid");
    expect((await f.service.reconcile(alice, result.order.id)).order).toMatchObject({ status: "awaiting_acceptance", payment: "paid", submittedAt: iso(0), acceptanceDeadline: iso(5) });
  });

  it("does not regress a definitive paid result on out-of-order provider updates", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const order = (await f.submit(alice, cart(), "paid", "card")).order;
    f.payments.setPayment(order.providerIntentId!, "processing");
    expect((await f.service.reconcile(alice, order.id)).order).toMatchObject({ payment: "paid", status: "awaiting_acceptance", reservationReleased: false });
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, order.id, { action });
    f.payments.setPayment(order.providerIntentId!, "failed");
    expect((await f.service.reconcile(alice, order.id)).order).toMatchObject({ payment: "paid", status: "completed" });
    expect(f.payments.refunds.size).toBe(0);
  });

  it("honors a configured technical reservation duration at its exact boundary", async () => {
    const f = await fixture();
    const configured = createOrderingService({ ...f.options, reservationMs: 60_000 });
    const order = (await configured.checkout(alice, await f.input(cart(), "short", "card"))).order;
    expect(order.reservationExpiresAt).toBe(iso(1));
    f.setTime(0.999); await configured.tick();
    expect((await configured.orders(alice))[0]?.reservationReleased).toBe(false);
    f.setTime(1); await configured.tick();
    expect((await configured.orders(alice))[0]).toMatchObject({ status: "cancelled", reservationReleased: true });
  });

  it.each([[30, 5], [30.001, 10], [90, 10], [90.001, 15]])("uses a %s minute slot acceptance deadline of %s minutes", async (slotMinutes, deadlineMinutes) => {
    const f = await fixture(store({ slots: [{ id: "soon", startsAt: iso(slotMinutes), capacity: 2 }] }));
    const order = (await f.submit()).order;
    expect(order.acceptanceDeadline).toBe(iso(deadlineMinutes));
    f.setTime(deadlineMinutes);
    await f.service.action(operator, order.id, { action: "accept" }).catch((error: unknown) => expect(error).toMatchObject({ code: "invalid_transition" }));
    expect((await f.service.orders(alice))[0]?.status).toBe("cancelled");
  });

  it("uses five minutes for ASAP even when its first available slot is two hours away", async () => {
    const f = await fixture(store({ slots: [{ id: "soon", startsAt: iso(120), capacity: 2 }] }));
    const asap = (await f.submit(alice, cart({ slotId: null }), "asap-distant")).order;
    expect(asap.quote.slotStartsAt).toBe(iso(120));
    expect(asap.acceptanceDeadline).toBe(iso(5));
    const scheduled = (await f.submit(bob, cart({ slotId: "soon" }), "scheduled-distant")).order;
    expect(scheduled.quote.slotStartsAt).toBe(iso(120));
    expect(scheduled.acceptanceDeadline).toBe(iso(15));
  });

  it("accepts immediately before deadline but times out at the boundary", async () => {
    const f = await fixture();
    const first = (await f.submit()).order;
    f.setTime(4.999);
    expect((await f.service.action(operator, first.id, { action: "accept" })).status).toBe("accepted");
    const second = (await f.submit(bob, cart(), "second")).order;
    f.setTime(9.999);
    await f.service.tick();
    expect((await f.service.orders(bob))[0]).toMatchObject({ id: second.id, status: "cancelled", reservationReleased: true });
  });

  it("releases a definitively failed payment and permits a fresh cash checkout", async () => {
    const f = await fixture();
    const result = await f.submit(alice, cart(), "card", "card");
    f.payments.setPayment(result.order.providerIntentId!, "failed");
    const failed = (await f.service.reconcile(alice, result.order.id)).order;
    expect(failed).toMatchObject({ payment: "failed", reservationReleased: true });
    expect((await f.submit(alice, cart(), "cash")).order).toMatchObject({ status: "awaiting_acceptance", payment: "cash_due" });
  });

  it("releases a payment reservation when the provider proves no intent was created", async () => {
    const f = await fixture(store({ slots: [{ id: "soon", startsAt: iso(20), capacity: 1 }] }));
    f.payments.definitiveCreateFailure = true;
    await f.submit(alice, cart(), "definitive-create", "card").catch(() => undefined);
    expect((await f.service.orders(alice))[0]).toMatchObject({ payment: "failed", reservationReleased: true, providerIntentId: null });
    expect(f.payments.payments.size).toBe(0);
    f.payments.definitiveCreateFailure = false;
    expect((await f.submit(alice, cart(), "cash-after-create-failure")).order.payment).toBe("cash_due");
  });

  it("keeps an uncertain payment reservation until provider cancellation is definitive", async () => {
    const f = await fixture(store({ slots: [{ id: "soon", startsAt: iso(20), capacity: 1 }] }));
    f.payments.initial = "processing"; f.payments.cancelStatus = "processing";
    const pending = (await f.submit(alice, cart(), "card", "card")).order;
    expect(pending.reservationExpiresAt).toBe(iso(10));
    f.setTime(10); await f.service.tick();
    expect((await f.service.orders(alice))[0]?.reservationReleased).toBe(false);
    expect(f.payments.cancelCalls).toContain(pending.providerIntentId);
    await expect(f.submit(bob, cart(), "blocked")).rejects.toMatchObject({ statusCode: 409 });
    f.payments.cancelStatus = "cancelled";
    await createOrderingService(f.options).tick();
    expect((await f.service.orders(alice))[0]).toMatchObject({ status: "cancelled", reservationReleased: true });
  });

  it("refunds a late success after cancellation without reopening the order", async () => {
    const f = await fixture();
    const pending = (await f.submit(alice, cart(), "card", "card")).order;
    f.setTime(10); await f.service.tick();
    expect((await f.service.orders(alice))[0]?.status).toBe("cancelled");
    f.payments.setPayment(pending.providerIntentId!, "paid");
    await f.service.reconcile(alice, pending.id);
    await f.service.reconcile(alice, pending.id);
    const order = (await f.service.orders(alice))[0];
    expect(order).toMatchObject({ status: "cancelled", payment: "refund_pending", reservationReleased: true });
    expect(f.payments.refunds.size).toBe(1);
  });
});

describe("operational transitions, waiting and refunds", () => {
  it("suspends acceptance indefinitely while waiting and restricts unavailable product ids", async () => {
    const f = await fixture();
    const order = (await f.submit()).order;
    await expect(f.service.action(operator, order.id, { action: "wait_for_customer", unavailableProductIds: ["foreign"] })).rejects.toMatchObject({ code: "invalid_input" });
    expect(await f.service.action(operator, order.id, { action: "wait_for_customer", unavailableProductIds: ["pizza"] })).toMatchObject({ status: "awaiting_customer", acceptanceDeadline: null, unavailableProductIds: ["pizza"] });
    f.setTime(1_440); await createOrderingService(f.options).tick();
    expect((await f.service.orders(alice))[0]).toMatchObject({ status: "awaiting_customer", reservationReleased: false });
    expect((await f.service.action(alice, order.id, { action: "cancel" })).reservationReleased).toBe(true);
  });

  it("enforces pickup progression, note ownership and cash settlement", async () => {
    const f = await fixture();
    const order = (await f.submit()).order;
    await expect(f.service.action(alice, order.id, { action: "accept" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(f.service.action(operator, order.id, { action: "complete" })).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(f.service.notes(operator, order.id, "Operatore")).rejects.toMatchObject({ code: "forbidden" });
    await f.service.action(operator, order.id, { action: "accept" });
    expect((await f.service.notes(alice, order.id, "Aggiornate")).notes).toBe("Aggiornate");
    await expect(f.service.action(alice, order.id, { action: "cancel" })).rejects.toMatchObject({ code: "invalid_transition" });
    await f.service.action(operator, order.id, { action: "prepare" });
    await expect(f.service.notes(alice, order.id, "Troppo tardi")).rejects.toMatchObject({ code: "invalid_transition" });
    await f.service.action(operator, order.id, { action: "ready" });
    await expect(f.service.action(operator, order.id, { action: "dispatch" })).rejects.toMatchObject({ code: "invalid_transition" });
    expect(await f.service.action(operator, order.id, { action: "complete" })).toMatchObject({ status: "completed", payment: "cash_paid" });
    await f.service.action(operator, order.id, { action: "complete" });
    await expect(f.service.action(operator, order.id, { action: "prepare" })).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("requires dispatch for delivery and preserves completed slot occupancy and ingredient consumption", async () => {
    const f = await fixture(store({ ingredients: [{ id: "dough", name: "Impasto", stock: 2 }, { id: "cheese", name: "Mozzarella", stock: 20 }], slots: [{ id: "soon", startsAt: iso(20), capacity: 1 }, { id: "later", startsAt: iso(60), capacity: 2 }] }));
    const order = (await f.submit(alice, cart({ mode: "delivery", address: { text: "Casa", latitude: 41.9, longitude: 12.5 } }))).order;
    for (const action of ["accept", "prepare", "ready"] as const) await f.service.action(operator, order.id, { action });
    await expect(f.service.action(operator, order.id, { action: "complete" })).rejects.toMatchObject({ code: "invalid_transition" });
    await f.service.action(operator, order.id, { action: "dispatch" });
    await f.service.action(operator, order.id, { action: "complete" });
    await expect(f.submit(bob, cart(), "same-slot")).rejects.toMatchObject({ code: "slot_unavailable" });
    await f.submit(bob, cart({ slotId: "later" }), "last-dough");
    await expect(f.submit(alice, cart({ slotId: "later" }), "no-dough")).rejects.toMatchObject({ code: "inventory_changed" });
  });

  it("keeps a cancelled order closed on refund failure, authorizes retry and settles once", async () => {
    const f = await fixture(); f.payments.initial = "paid"; f.payments.refundStatus = "failed";
    const order = (await f.submit(alice, cart(), "card", "card")).order;
    await f.service.action(alice, order.id, { action: "cancel" });
    await f.service.tick();
    expect((await f.service.orders(alice))[0]).toMatchObject({ status: "cancelled", payment: "refund_failed", reservationReleased: true });
    await expect(f.service.action(alice, order.id, { action: "retry_refund" })).rejects.toMatchObject({ code: "forbidden" });
    f.payments.refundStatus = "pending";
    const retried = await f.service.action(operator, order.id, { action: "retry_refund" });
    expect(retried).toMatchObject({ status: "cancelled", payment: "refund_pending" });
    expect(f.payments.refunds.size).toBe(2);
    f.payments.setRefund(retried.refundId!, "succeeded");
    const restarted = createOrderingService(f.options); await restarted.tick(); await restarted.tick();
    expect((await restarted.orders(alice))[0]).toMatchObject({ status: "cancelled", payment: "refunded" });
    expect(f.payments.refunds.size).toBe(2);
    f.payments.setRefund(retried.refundId!, "pending"); await restarted.tick();
    expect((await restarted.orders(alice))[0]?.payment).toBe("refunded");
  });

  it("reuses the refund operation after a lost response and restart", async () => {
    const f = await fixture(); f.payments.initial = "paid"; f.payments.loseRefundResponse = true;
    const order = (await f.submit(alice, cart(), "card", "card")).order;
    await f.service.action(alice, order.id, { action: "cancel" }).catch(() => undefined);
    const restarted = createOrderingService(f.options);
    await restarted.tick(); await restarted.tick();
    expect((await restarted.orders(alice))[0]).toMatchObject({ status: "cancelled", payment: "refund_pending" });
    expect(f.payments.refunds.size).toBe(1);
    expect(new Set(f.payments.refundCalls.map((call) => call.key)).size).toBe(1);
  });

  it("marks a definitively rejected original refund failed and creates a new operation only on operator retry", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const order = (await f.submit(alice, cart(), "definitive-original", "card")).order;
    f.payments.definitiveRefundFailures.add(order.providerIntentId!);
    await f.service.action(alice, order.id, { action: "cancel" });
    expect((await f.service.orders(alice))[0]).toMatchObject({ status: "cancelled", payment: "refund_failed" });
    await createOrderingService(f.options).tick(); await f.service.tick();
    expect(f.payments.refundCalls).toHaveLength(1);
    const rejectedKey = f.payments.refundCalls[0]!.key;
    f.payments.definitiveRefundFailures.clear(); f.payments.refundStatus = "succeeded";
    await f.service.action(operator, order.id, { action: "retry_refund" }); await f.service.tick();
    expect((await f.service.orders(alice))[0]).toMatchObject({ status: "cancelled", payment: "refunded" });
    expect(f.payments.refundCalls).toHaveLength(2);
    expect(f.payments.refundCalls[1]!.key).not.toBe(rejectedKey);
  });
});

describe("D36 owner-confirmed order additions", () => {
  const lines = () => [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Aggiunta" }];

  it("snapshots original prices, quotes only the current delta and keeps the original slot occupancy", async () => {
    const configuration = store({ slots: [{ id: "soon", startsAt: iso(20), capacity: 1 }] });
    const f = await fixture(configuration);
    const original = (await f.submit()).order;
    const changed = structuredClone(configuration); changed.products[0]!.priceCents = 900;
    await f.service.saveStore(operator, changed);
    const delta = await f.service.additionQuote(alice, original.id, lines());
    expect(delta).toMatchObject({ deltaCents: 900, quote: { subtotalCents: 1700, totalCents: 1700, slotId: "soon", slotStartsAt: iso(20) } });
    expect(delta.quote.lines).toEqual(expect.arrayContaining([expect.objectContaining({ unitCents: 800, quantity: 1 }), expect.objectContaining({ unitCents: 900, quantity: 1 })]));
    const result = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: delta.fingerprint, idempotencyKey: "addition-1" });
    expect(result.order).toMatchObject({ id: original.id, status: "awaiting_acceptance", payment: "cash_due", acceptanceDeadline: original.acceptanceDeadline, quote: { totalCents: 1700 } });
    expect(result.order.additions).toHaveLength(1);
    expect(result.order.additions?.[0]).toMatchObject({ deltaCents: 900, method: "cash", payment: "cash_due", applied: true });
    expect(f.payments.createCalls).toHaveLength(0);
    expect(await f.service.orders(alice)).toHaveLength(1);
  });

  it("allows only the owning customer before acceptance, including while awaiting customer", async () => {
    const f = await fixture(); const original = (await f.submit()).order;
    for (const actor of [bob, operator]) await expect(f.service.additionQuote(actor, original.id, lines())).rejects.toMatchObject({ code: "forbidden" });
    await expect(f.service.additionQuote(null, original.id, lines())).rejects.toMatchObject({ code: "unauthorized" });
    await f.service.action(operator, original.id, { action: "wait_for_customer", unavailableProductIds: ["pizza"] });
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const input = { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "after-wait" };
    await f.service.additions(alice, original.id, input);
    await f.service.action(operator, original.id, { action: "accept" });
    await expect(f.service.additionQuote(alice, original.id, lines())).rejects.toMatchObject({ code: "invalid_transition" });
    await expect(f.service.additions(alice, original.id, { ...input, idempotencyKey: "after-accept" })).rejects.toMatchObject({ code: "invalid_transition" });
  });

  it("rejects changed prices and client-supplied payment method before any delta charge", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const changed = store(); changed.products[0]!.priceCents = 900;
    await f.service.saveStore(operator, changed);
    await expect(f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "stale-delta" })).rejects.toMatchObject({ code: "price_changed" });
    const current = await f.service.additionQuote(alice, original.id, lines());
    const forged = { lines: lines(), fingerprint: current.fingerprint, idempotencyKey: "forged-delta", method: "cash" };
    await expect(f.service.additions(alice, original.id, forged)).rejects.toMatchObject({ code: "invalid_input" });
    expect(f.payments.createCalls).toHaveLength(1);
  });

  it("applies a card delta only after provider confirmation, without leaking its secret", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    f.payments.initial = "requires_action";
    const delta = await f.service.additionQuote(alice, original.id, lines());
    const pending = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: delta.fingerprint, idempotencyKey: "delta-card" });
    expect(pending.clientSecret).toBeTruthy();
    expect(pending.order.quote.totalCents).toBe(800);
    expect(pending.order.additions?.[0]).toMatchObject({ applied: false, payment: "requires_action", deltaCents: 800 });
    expect(JSON.stringify(await f.repository.snapshot())).not.toContain("secret_");
    expect(JSON.stringify(await f.service.orders(alice))).not.toContain("secret_");
    await expect(f.service.action(operator, original.id, { action: "accept" })).rejects.toMatchObject({ code: "payment_unresolved" });
    const deltaIntent = pending.order.additions?.[0]?.providerIntentId;
    expect(deltaIntent).toBeTruthy();
    expect(f.payments.createCalls.map((call) => call.totalCents)).toEqual([800, 800]);
    f.payments.setPayment(deltaIntent!, "paid");
    await f.service.reconcile(alice, original.id);
    const applied = (await f.service.reconcile(alice, original.id)).order;
    expect(applied).toMatchObject({ status: "awaiting_acceptance", payment: "paid", quote: { totalCents: 1600 }, acceptanceDeadline: original.acceptanceDeadline });
    expect(applied.additions?.[0]).toMatchObject({ applied: true, payment: "paid", reservationReleased: true });
    expect(applied.cart.lines.reduce((total, line) => total + line.quantity, 0)).toBe(2);
  });

  it("recovers one uncertain delta across restart, rejects changed input and blocks replacement keys", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    f.payments.initial = "processing";
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const input = { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "uncertain-delta" };
    const pending = await f.service.additions(alice, original.id, input);
    const restarted = createOrderingService(f.options);
    const retry = await restarted.additions(alice, original.id, input);
    expect(retry.order.additions).toHaveLength(1);
    expect(retry.order.additions?.[0]?.id).toBe(pending.order.additions?.[0]?.id);
    await expect(restarted.additions(alice, original.id, { ...input, idempotencyKey: "new-key" })).rejects.toMatchObject({ code: "payment_unresolved" });
    await expect(restarted.additions(alice, original.id, { ...input, lines: [{ ...lines()[0]!, quantity: 2 }] })).rejects.toMatchObject({ code: "idempotency_conflict" });
    expect(f.payments.payments.size).toBe(2);
    expect(retry.order.quote.totalCents).toBe(800);
  });

  it("recovers a lost delta create response using the same provider operation", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    f.payments.initial = "processing"; f.payments.loseCreateResponse = true;
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const input = { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "lost-delta" };
    await f.service.additions(alice, original.id, input).catch(() => undefined);
    const restarted = createOrderingService(f.options);
    await expect(restarted.additions(alice, original.id, { ...input, idempotencyKey: "other-delta" })).rejects.toMatchObject({ code: "payment_unresolved" });
    const recovered = await restarted.additions(alice, original.id, input);
    expect(recovered.order.additions).toHaveLength(1);
    expect(f.payments.payments.size).toBe(2);
    expect(new Set(f.payments.createCalls.slice(1).map((call) => call.key)).size).toBe(1);
  });

  it("releases only failed delta ingredients and allows another attempt without changing the original", async () => {
    const f = await fixture(store({ ingredients: [{ id: "dough", name: "Impasto", stock: 2 }, { id: "cheese", name: "Mozzarella", stock: 20 }] }));
    f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    f.payments.initial = "failed";
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const failed = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "failed-delta" });
    expect(failed.order).toMatchObject({ status: "awaiting_acceptance", payment: "paid", quote: { totalCents: 800 }, reservationReleased: false });
    expect(failed.order.additions?.[0]).toMatchObject({ applied: false, payment: "failed", reservationReleased: true });
    f.payments.initial = "paid";
    const retryQuote = await f.service.additionQuote(alice, original.id, lines());
    const success = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: retryQuote.fingerprint, idempotencyKey: "retry-delta" });
    expect(success.order.quote.totalCents).toBe(1600);
    expect(success.order.additions).toHaveLength(2);
    await expect(f.service.additionQuote(alice, original.id, lines())).rejects.toMatchObject({ code: "inventory_changed" });
  });

  it("records a definitive delta creation rejection without changing the original paid order", async () => {
    const f = await fixture(store({ ingredients: [{ id: "dough", name: "Impasto", stock: 2 }, { id: "cheese", name: "Mozzarella", stock: 20 }] }));
    f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-create-failure", "card")).order;
    f.payments.definitiveCreateFailure = true;
    const quote = await f.service.additionQuote(alice, original.id, lines());
    await f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "delta-create-failure" }).catch(() => undefined);
    const failed = (await f.service.orders(alice))[0];
    expect(failed).toMatchObject({ status: "awaiting_acceptance", payment: "paid", quote: { totalCents: 800 }, reservationReleased: false });
    expect(failed?.additions?.[0]).toMatchObject({ payment: "failed", applied: false, reservationReleased: true, providerIntentId: null });
    f.payments.definitiveCreateFailure = false;
    const retryQuote = await f.service.additionQuote(alice, original.id, lines());
    const retried = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: retryQuote.fingerprint, idempotencyKey: "retry-definitive-create" });
    expect(retried.order.quote.totalCents).toBe(1600);
    expect(f.payments.payments.size).toBe(2);
  });

  it("does not extend the original deadline while a delta is pending and refunds a late success", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    f.setTime(4); f.payments.initial = "processing";
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const pending = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "late-delta" });
    expect(pending.order.acceptanceDeadline).toBe(iso(5));
    const deltaIntent = pending.order.additions?.[0]?.providerIntentId;
    f.setTime(5); await createOrderingService(f.options).tick();
    expect((await f.service.orders(alice))[0]).toMatchObject({ status: "cancelled", quote: { totalCents: 800 } });
    f.payments.setPayment(deltaIntent!, "paid");
    const cancelled = (await f.service.reconcile(alice, original.id)).order;
    expect(cancelled).toMatchObject({ status: "cancelled", quote: { totalCents: 800 } });
    expect(cancelled.additions?.[0]).toMatchObject({ applied: false, payment: "refund_pending" });
    expect(new Set(f.payments.refundCalls.map((call) => call.intentId))).toEqual(new Set([original.providerIntentId, deltaIntent]));
  });

  it("preserves the customer's right to cancel while a delta is uncertain", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    f.payments.initial = "processing"; f.payments.cancelStatus = "processing";
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const pending = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "cancel-delta" });
    expect((await f.service.action(alice, original.id, { action: "cancel" })).status).toBe("cancelled");
    const deltaIntent = pending.order.additions?.[0]?.providerIntentId;
    expect(f.payments.cancelCalls).toContain(deltaIntent);
    f.payments.setPayment(deltaIntent!, "paid");
    await createOrderingService(f.options).tick();
    const cancelled = (await f.service.orders(alice))[0];
    expect(cancelled).toMatchObject({ status: "cancelled", quote: { totalCents: 800 } });
    expect(cancelled?.additions?.[0]).toMatchObject({ applied: false, payment: "refund_pending" });
  });

  it("refunds every applied delta and allows operators to retry failed delta refunds", async () => {
    const f = await fixture(); f.payments.initial = "paid";
    const original = (await f.submit(alice, cart(), "original-card", "card")).order;
    for (const key of ["first-delta", "second-delta"]) {
      const quote = await f.service.additionQuote(alice, original.id, lines());
      await f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: key });
    }
    expect((await f.service.orders(alice))[0]?.quote.totalCents).toBe(2400);
    f.payments.refundStatus = "failed";
    await f.service.action(alice, original.id, { action: "cancel" }); await f.service.tick();
    const failed = (await f.service.orders(alice))[0];
    expect(failed?.status).toBe("cancelled");
    expect(failed?.additions?.map((entry) => entry.payment)).toEqual(["refund_failed", "refund_failed"]);
    expect(new Set(f.payments.refundCalls.map((call) => call.intentId)).size).toBe(3);
    f.payments.refundStatus = "succeeded";
    await f.service.action(operator, original.id, { action: "retry_refund" });
    const restarted = createOrderingService(f.options); await restarted.tick(); await restarted.tick();
    const refunded = (await restarted.orders(alice))[0];
    expect(refunded).toMatchObject({ status: "cancelled", payment: "refunded", quote: { totalCents: 2400 } });
    expect(refunded?.additions?.map((entry) => entry.payment)).toEqual(["refunded", "refunded"]);
    expect(f.payments.refunds.size).toBe(6);
  });

  it("serializes competing additions so delta reservations cannot overdraw the last ingredient", async () => {
    const f = await fixture(store({ ingredients: [{ id: "dough", name: "Impasto", stock: 2 }, { id: "cheese", name: "Mozzarella", stock: 20 }] }));
    const original = (await f.submit()).order;
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const results = await Promise.allSettled(["a", "b"].map((key) => f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: key })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const order = (await f.service.orders(alice))[0];
    expect(order?.quote.totalCents).toBe(1600);
    expect(order?.additions?.filter((addition) => addition.applied)).toHaveLength(1);
  });

  it("records a definitive delta refund rejection in its ledger and retries only the failed delta", async () => {
    const f = await fixture(); f.payments.initial = "paid"; f.payments.refundStatus = "succeeded";
    const original = (await f.submit(alice, cart(), "original-definitive-delta", "card")).order;
    const quote = await f.service.additionQuote(alice, original.id, lines());
    const added = await f.service.additions(alice, original.id, { lines: lines(), fingerprint: quote.fingerprint, idempotencyKey: "definitive-delta" });
    const deltaIntent = added.order.additions![0]!.providerIntentId!;
    f.payments.definitiveRefundFailures.add(deltaIntent);
    await f.service.action(alice, original.id, { action: "cancel" }); await f.service.tick();
    const cancelled = (await f.service.orders(alice))[0];
    expect(cancelled).toMatchObject({ status: "cancelled", payment: "refunded" });
    expect(cancelled?.additions?.[0]?.payment).toBe("refund_failed");
    await createOrderingService(f.options).tick();
    expect(f.payments.refundCalls.filter((call) => call.intentId === deltaIntent)).toHaveLength(1);
    const firstKey = f.payments.refundCalls.find((call) => call.intentId === deltaIntent)!.key;
    f.payments.definitiveRefundFailures.clear();
    await f.service.action(operator, original.id, { action: "retry_refund" }); await f.service.tick();
    const refunded = (await f.service.orders(alice))[0];
    expect(refunded?.additions?.[0]?.payment).toBe("refunded");
    const deltaCalls = f.payments.refundCalls.filter((call) => call.intentId === deltaIntent);
    expect(deltaCalls).toHaveLength(2); expect(deltaCalls[1]!.key).not.toBe(firstKey);
    expect(f.payments.refundCalls.filter((call) => call.intentId === original.providerIntentId)).toHaveLength(1);
  });
});
