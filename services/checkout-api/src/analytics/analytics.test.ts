import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualOrder, IndividualStore, PilotAnalyticsQuery } from "@pizzaos/domain";
import type { OrderingRepository, OrderingState } from "../ordering-contract";
import { createPilotAnalyticsService, PilotAnalyticsError, withPilotAnalytics } from "./index";

const operator: IndividualActor = { id: "operator", email: "OPERATOR@example.test", name: "Operatore" };
const admin: IndividualActor = { id: "admin", email: "ADMIN@example.test", name: "Admin" };
const today: PilotAnalyticsQuery = { storeId: "roma", period: "today" };

function store(id: string, timeZone?: string): IndividualStore & { timeZone?: string } {
  return { id, name: id, latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    deliveryBands: [], ingredients: [], products: [], slots: [], ...(timeZone ? { timeZone } : {}) };
}

function order(id: string, totalCents = 1200, storeId = "roma"): IndividualOrder {
  return {
    id, storeId, customerId: "customer-private", contact: { name: "Cliente", email: "private@example.test", phone: "3331234567" },
    cart: { storeId, lines: [], mode: "delivery", slotId: null, notes: "" },
    quote: { fingerprint: id, subtotalCents: totalCents - 200, deliveryCents: 200, totalCents,
      slotId: "slot", slotStartsAt: "2026-11-04T18:00:00.000Z",
      lines: [{ productId: "pizza", name: "Margherita storica", quantity: 1, unitCents: totalCents - 200, optionIds: [], notes: "" }] },
    status: "ready", payment: "paid", method: "card", notes: "", createdAt: "2026-11-04T12:00:00.000Z",
    submittedAt: null, acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false,
    unavailableProductIds: [], providerIntentId: "provider-private", refundId: null, refundAttempt: 0, revision: 1
  };
}

/** Clone the entire state, including extension fields, and commit only successful callbacks. */
function memoryRepository(orders: IndividualOrder[] = [], stores = [store("roma"), store("milano")]): OrderingRepository {
  let committed: OrderingState = { stores: Object.fromEntries(stores.map(value => [value.id, value])),
    orders: Object.fromEntries(orders.map(value => [value.id, value])),
    memberships: [{ storeId: "roma", email: "operator@example.test" }], idempotency: {}, events: [], cursor: 0 };
  let queue: Promise<unknown> = Promise.resolve();
  return { transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
    const transaction = queue.then(async () => {
      const draft = structuredClone(committed);
      const result = await work(draft);
      committed = structuredClone(draft);
      return result;
    });
    queue = transaction.catch(() => undefined);
    return transaction;
  } };
}

function fixture(orders: IndividualOrder[] = [], stores?: (IndividualStore & { timeZone?: string })[]) {
  let instant = "2026-11-05T12:00:00.000Z";
  const now = () => new Date(instant);
  const raw = memoryRepository(orders, stores);
  const repository = withPilotAnalytics(raw, now);
  const service = createPilotAnalyticsService({ repository, superadminEmails: ["admin@example.test"], now });
  const setTime = (value: string) => { instant = value; };
  const finish = (id: string, status: "completed" | "cancelled" = "completed") => repository.transact(state => {
    const current = state.orders[id];
    if (!current) throw new Error("Fixture ordine mancante");
    current.status = status;
  });
  return { raw, repository, service, now, setTime, finish };
}

describe("pilot analytics public service", () => {
  it("authorizes case-insensitive operator membership and configured superadmin, denying other identities", async () => {
    const { service } = fixture();
    await expect(service.report(null, today)).rejects.toMatchObject({ code: "unauthorized" });
    await expect(service.report({ id: "rider", name: "Rider", email: "rider@example.test" }, today)).rejects.toMatchObject({ code: "forbidden" });
    await expect(service.report(operator, { ...today, storeId: "milano" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(service.report(admin, { ...today, storeId: "missing" })).rejects.toBeInstanceOf(PilotAnalyticsError);
    await expect(service.report(admin, { ...today, storeId: "missing" })).rejects.toMatchObject({ code: "not_found" });
    await expect(service.report(operator, today)).resolves.toMatchObject({ completedOrders: 0, salesCents: 0, averageOrderCents: 0, cancelledOrders: 0, topProducts: [] });
    await expect(service.report(admin, { ...today, storeId: "milano" })).resolves.toMatchObject({ storeId: "milano" });
  });

  it("counts final transitions, integer EUR including delivery, cash, and completed product snapshots only", async () => {
    const cash = order("cash", 1801);
    cash.method = "cash"; cash.payment = "cash_paid";
    cash.quote.lines = [{ productId: "pizza", name: "Margherita nuova", quantity: 2, unitCents: 800, optionIds: [], notes: "" },
      { productId: "acqua", name: "Acqua", quantity: 3, unitCents: 100, optionIds: [], notes: "" }];
    const f = fixture([order("card"), cash, order("cancel", 5000), order("pending"), order("foreign", 9999, "milano")]);
    await f.finish("card");
    f.setTime("2026-11-05T13:00:00.000Z");
    await f.finish("cash"); await f.finish("cancel", "cancelled"); await f.finish("foreign");
    const report = await f.service.report(operator, today);
    expect(report).toMatchObject({ completedOrders: 2, salesCents: 3001, averageOrderCents: 1501, cancelledOrders: 1,
      topProducts: [{ productId: "acqua", name: "Acqua", quantity: 3 }, { productId: "pizza", name: "Margherita nuova", quantity: 3 }] });
    expect(JSON.stringify(report)).not.toMatch(/private|provider|3331234567/);
  });

  it("retains the immutable snapshot, excludes legacy terminal orders, and survives reconstruction and retries", async () => {
    const legacy = order("legacy"); legacy.status = "completed";
    const f = fixture([order("new"), legacy]);
    expect(await f.repository.transact(() => "result")).toBe("result");
    await f.finish("new");
    f.setTime("2026-11-06T12:00:00.000Z");
    await f.finish("new");
    await f.repository.transact(state => {
      const current = state.orders.new;
      if (!current) throw new Error("Fixture ordine mancante");
      current.payment = "refunded";
      current.quote.totalCents = 99999;
      current.quote.lines = [];
      current.contact.name = "Modificato";
    });
    const reconstructed = createPilotAnalyticsService({ repository: withPilotAnalytics(f.raw, f.now), superadminEmails: [], now: f.now });
    const previous = { ...today, period: "custom" as const, fromDate: "2026-11-05", throughDate: "2026-11-05" };
    const before = await f.raw.transact(state => structuredClone(state.orders));
    await expect(reconstructed.report(operator, previous)).resolves.toMatchObject({ completedOrders: 1, salesCents: 1200,
      topProducts: [{ productId: "pizza", name: "Margherita storica", quantity: 1 }] });
    await expect(reconstructed.report(operator, today)).resolves.toMatchObject({ completedOrders: 0 });
    expect(await f.raw.transact(state => state.orders)).toEqual(before);
  });

  it("keeps all products and uses ascending orderId to break equal snapshot timestamps", async () => {
    const laterId = order("z-order");
    laterId.quote.lines = [{ productId: "same", name: "Nome Z", quantity: 1, unitCents: 100, optionIds: [], notes: "" }];
    const firstId = order("a-order");
    firstId.quote.lines = [{ productId: "same", name: "Nome A", quantity: 1, unitCents: 100, optionIds: [], notes: "" },
      ...Array.from({ length: 14 }, (_, index) => ({ productId: `p${String(index).padStart(2, "0")}`, name: `Prodotto ${index}`, quantity: 1, unitCents: 100, optionIds: [], notes: "" }))];
    const f = fixture([laterId, firstId]);
    await f.finish("z-order"); await f.finish("a-order");
    const result = await f.service.report(operator, today);
    expect(result.topProducts).toHaveLength(15);
    expect(result.topProducts[0]).toEqual({ productId: "same", name: "Nome A", quantity: 2 });
    expect(result.topProducts.slice(1).map(product => product.productId)).toEqual(Array.from({ length: 14 }, (_, index) => `p${String(index).padStart(2, "0")}`));
  });

  it("rolls back a failed final transition and propagates the original transaction error", async () => {
    const f = fixture([order("rollback")]);
    const failure = new Error("errore transazionale");
    await expect(f.repository.transact(state => {
      const current = state.orders.rollback;
      if (!current) throw new Error("Fixture ordine mancante");
      current.status = "completed";
      throw failure;
    })).rejects.toBe(failure);
    await expect(f.service.report(operator, today)).resolves.toMatchObject({ completedOrders: 0 });
    await f.finish("rollback");
    await expect(f.service.report(operator, today)).resolves.toMatchObject({ completedOrders: 1 });
  });

  it("assigns completion and cancellation to final server date rather than creation date", async () => {
    const f = fixture([order("complete"), order("cancel")]);
    await f.finish("complete");
    f.setTime("2026-11-06T12:00:00.000Z"); await f.finish("cancel", "cancelled");
    await expect(f.service.report(operator, { ...today, period: "custom", fromDate: "2026-11-04", throughDate: "2026-11-04" })).resolves.toMatchObject({ completedOrders: 0, cancelledOrders: 0 });
    await expect(f.service.report(operator, today)).resolves.toMatchObject({ completedOrders: 0, cancelledOrders: 1 });
  });

  it("includes the full 25-hour Rome DST day and excludes the first instant of the next day", async () => {
    const f = fixture([order("before"), order("start"), order("first-hour"), order("second-hour"), order("end")]);
    for (const [id, instant] of [["before", "2026-10-24T21:59:59.999Z"], ["start", "2026-10-24T22:00:00.000Z"],
      ["first-hour", "2026-10-25T00:30:00.000Z"], ["second-hour", "2026-10-25T01:30:00.000Z"], ["end", "2026-10-25T23:00:00.000Z"]]) {
      if (!id || !instant) throw new Error("Fixture istante mancante");
      f.setTime(instant); await f.finish(id);
    }
    await expect(f.service.report(operator, { ...today, period: "custom", fromDate: "2026-10-25", throughDate: "2026-10-25" })).resolves.toMatchObject({
      completedOrders: 3, range: { timeZone: "Europe/Rome", fromDate: "2026-10-25", throughDate: "2026-10-25", startsAt: "2026-10-24T22:00:00.000Z", endsAt: "2026-10-25T23:00:00.000Z" }
    });
  });

  it.each([["today", "2026-11-05", "2026-11-04T23:00:00.000Z"], ["last_7_days", "2026-10-30", "2026-10-29T23:00:00.000Z"], ["last_30_days", "2026-10-07", "2026-10-06T22:00:00.000Z"]] as const)("resolves %s using local calendar days and ignores custom fields", async (period, fromDate, startsAt) => {
    const f = fixture();
    await expect(f.service.report(operator, { ...today, period, fromDate: "2000-01-01", throughDate: "2000-01-02" })).resolves.toMatchObject({
      range: { fromDate, throughDate: "2026-11-05", startsAt, endsAt: "2026-11-05T23:00:00.000Z" }
    });
  });

  it("uses a store timezone rather than the machine timezone", async () => {
    const f = fixture([], [store("roma", "America/New_York")]);
    f.setTime("2026-11-05T01:00:00.000Z");
    await expect(f.service.report(operator, today)).resolves.toMatchObject({ range: { timeZone: "America/New_York", fromDate: "2026-11-04", throughDate: "2026-11-04", startsAt: "2026-11-04T05:00:00.000Z", endsAt: "2026-11-05T05:00:00.000Z" } });
  });

  it.each([
    { period: "custom", fromDate: "2026-02-30", throughDate: "2026-03-01" },
    { period: "custom", fromDate: "2026-11-06", throughDate: "2026-11-05" },
    { period: "custom", fromDate: "2026-11-05" }, { period: "custom", throughDate: "2026-11-05" },
    { period: "custom", fromDate: "05/11/2026", throughDate: "2026-11-05" }, { period: "unknown" }
  ])("rejects invalid input %j", async query => {
    const f = fixture();
    await expect(f.service.report(operator, { storeId: "roma", ...query } as PilotAnalyticsQuery)).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("rejects invalid store timezone and invalid injected clocks", async () => {
    const f = fixture([], [store("roma", "Not/A_Timezone")]);
    await expect(f.service.report(operator, today)).rejects.toMatchObject({ code: "invalid_input" });
    const badClock = fixture(); badClock.setTime("invalid");
    await expect(badClock.service.report(operator, today)).rejects.toMatchObject({ code: "invalid_input" });
  });
});
