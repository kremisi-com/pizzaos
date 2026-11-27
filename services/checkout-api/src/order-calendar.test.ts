// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { IndividualActor, IndividualCart, IndividualCheckout, IndividualStore, WeeklyOrderSchedule } from "@pizzaos/domain";
import { createGroupOrderingService } from "./group/group-service";
import { buildOrderingApp } from "./http-app";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

const owner: IndividualActor = { id: "owner", name: "Titolare", email: "owner@example.test" };
const operator: IndividualActor = { id: "operator", name: "Operatore", email: "operator@example.test" };
const alice: IndividualActor = { id: "alice", name: "Alice", email: "alice@example.test" };
const bob: IndividualActor = { id: "bob", name: "Bob", email: "bob@example.test" };
const storeId = "roma";
const storePath = `/v1/pilot/stores/${storeId}`;
const timeZone = "Europe/Rome";
const monday = "2026-11-23";
const tuesday = "2026-11-24";
const evening = { startMinute: 19 * 60, endMinute: 20 * 60, capacity: 5 };
const later = { startMinute: 20 * 60, endMinute: 21 * 60, capacity: 5 };
const days = [1, 2, 3, 4, 5, 6, 7];
const expectedDefaults = [11, 12, 13, 14, 18, 19, 20, 21].map((hour) => ({ startMinute: hour * 60, endMinute: (hour + 1) * 60, capacity: 5 }));
const pizza = { productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" };
const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

function storeFixture(overrides: Partial<IndividualStore> = {}): IndividualStore {
  return {
    id: storeId, name: "Sede Roma", timeZone, latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    ingredients: [{ id: "dough", name: "Impasto", stock: 50 }],
    products: [{ id: "pizza", name: "Pizza", description: "Pomodoro", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, options: [] }],
    deliveryBands: [{ upToKm: 5, feeCents: 200, minimumCents: 0 }],
    slots: [], ...overrides,
  };
}

function schedule(windows: WeeklyOrderSchedule["days"][number]["windows"], revision = 0): WeeklyOrderSchedule {
  return { revision, days: days.map((weekday) => ({ weekday, windows })) };
}

function cart(slotId: string | null, overrides: Partial<IndividualCart> = {}): IndividualCart {
  return { storeId, mode: "pickup", slotId, notes: "", lines: [pizza], ...overrides };
}

function fixture(initialStore = storeFixture(), initialTime = `${monday}T18:15:00.000Z`) {
  let state: OrderingState = {
    stores: { [storeId]: initialStore }, memberships: [{ storeId, email: operator.email }], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  let pending = Promise.resolve();
  let now = new Date(initialTime);
  let sequence = 0;
  const repository: OrderingRepository = {
    transact(work) {
      const transaction = pending.then(async () => {
        const draft = structuredClone(state);
        const result = await work(draft);
        state = draft;
        return structuredClone(result);
      });
      pending = transaction.then(() => undefined, () => undefined);
      return transaction;
    },
  };
  const unavailable = async (): Promise<never> => { throw new Error("Unexpected payment provider call"); };
  const id = () => `calendar-test-${++sequence}`;
  const options = {
    repository, superadminEmails: [owner.email], now: () => now, id,
    payments: {
      create: async () => ({ id: "pi-calendar-test", status: "requires_action" as const, clientSecret: "test-secret" }),
      read: unavailable, cancel: unavailable, refund: unavailable, readRefund: unavailable,
    },
  };
  const open = (activateOrderCalendar: boolean) => createOrderingService({ ...options, activateOrderCalendar });
  const service = open(true);
  const app = buildOrderingApp({ service, authenticate: async (request) => [owner, operator, alice, bob].find((actor) => actor.id === request.headers["x-test-actor"]) ?? null });
  apps.push(app);
  function read(actor?: IndividualActor) {
    return app.inject({ method: "GET", url: storePath, headers: actor ? { "x-test-actor": actor.id } : {} });
  }
  function save(payload: IndividualStore, actor = operator) {
    return app.inject({ method: "PUT", url: `/v1/pilot/stores/${payload.id}`, headers: { "x-test-actor": actor.id }, payload });
  }
  async function config() {
    const response = await read(operator);
    expect(response.statusCode).toBe(200);
    const saved = response.json<IndividualStore>();
    expect(saved.orderSchedule).toBeDefined();
    return { ...saved, orderSchedule: saved.orderSchedule! };
  }
  async function checkoutInput(value: IndividualCart, idempotencyKey: string, method: IndividualCheckout["method"] = "cash", ordering = service): Promise<IndividualCheckout> {
    return { cart: value, fingerprint: (await ordering.quote(value)).fingerprint, method, idempotencyKey, phone: "3331234567" };
  }
  return {
    read, save, config, open, service, checkoutInput,
    setTime: (value: string) => { now = new Date(value); },
    groups: () => createGroupOrderingService({ repository, ordering: service, now: () => now, id, token: id }),
  };
}

describe("order calendar", () => {
  it("activates the same default week for an existing store and projects fourteen local dates", async () => {
    const f = fixture(storeFixture(), "2026-11-22T23:30:00.000Z");
    const settings = await f.config();
    expect(settings.orderSchedule.days).toEqual(days.map((weekday) => ({ weekday, windows: expectedDefaults })));

    const publicResponse = await f.read();
    expect(publicResponse.statusCode).toBe(200);
    const publicStore = publicResponse.json<IndividualStore>();
    expect(publicStore).not.toHaveProperty("orderSchedule");
    expect((await f.read(alice)).json()).not.toHaveProperty("orderSchedule");
    expect(publicStore.slots).toHaveLength(14 * 8);
    expect(publicStore.slots[0]).toMatchObject({ startsAt: `${monday}T10:00:00.000Z`, endsAt: `${monday}T11:00:00.000Z`, timeZone, capacity: 5 });
    expect(publicStore.slots.at(-1)).toMatchObject({ startsAt: "2026-12-06T20:00:00.000Z", endsAt: "2026-12-06T21:00:00.000Z", timeZone, capacity: 5 });
    const starts = publicStore.slots.map((slot) => slot.startsAt);
    expect(starts).toEqual([...starts].sort());

    expect((await f.save({ ...settings, acceptingOrders: false })).statusCode).toBe(200);
    await expect(f.service.quote(cart(null))).rejects.toThrow();
  });

  it("skips windows with a boundary during the missing spring hour", async () => {
    const windows = [60, 90, 120, 150, 180].map((startMinute) => ({ startMinute, endMinute: startMinute + 30, capacity: 5 }));
    const f = fixture(storeFixture({ orderSchedule: schedule(windows, 1) }), "2026-03-28T23:30:00.000Z");
    const slots = (await f.service.catalog(storeId)).slots.filter((slot) => slot.startsAt < "2026-03-29T22:00:00.000Z");

    expect(slots).toMatchObject([
      { startsAt: "2026-03-29T00:00:00.000Z", endsAt: "2026-03-29T00:30:00.000Z", timeZone },
      { startsAt: "2026-03-29T01:00:00.000Z", endsAt: "2026-03-29T01:30:00.000Z", timeZone },
    ]);
  });

  it("uses the first occurrence of ambiguous boundaries during the repeated autumn hour", async () => {
    const windows = [90, 120, 150].map((startMinute) => ({ startMinute, endMinute: startMinute + 30, capacity: 5 }));
    const f = fixture(storeFixture({ orderSchedule: schedule(windows, 1) }), "2026-10-24T23:10:00.000Z");
    const slots = (await f.service.catalog(storeId)).slots.filter((slot) => slot.startsAt < "2026-10-25T23:00:00.000Z");

    expect(slots).toMatchObject([
      { startsAt: "2026-10-24T23:30:00.000Z", endsAt: "2026-10-25T00:00:00.000Z", timeZone },
      { startsAt: "2026-10-25T00:00:00.000Z", endsAt: "2026-10-25T00:30:00.000Z", timeZone },
      { startsAt: "2026-10-25T00:30:00.000Z", endsAt: "2026-10-25T02:00:00.000Z", timeZone },
    ]);
    f.setTime("2026-10-25T01:15:00.000Z");
    await expect(f.service.quote(cart(slots[1]!.id))).rejects.toMatchObject({ code: "slot_unavailable" });
    expect((await f.service.quote(cart(null))).slotId).toBe(slots[2]!.id);
  });

  it("accepts revision zero for a new store, preserves an omitted schedule and rejects stale writes", async () => {
    const f = fixture();
    const created = await f.save(storeFixture({ id: "nuova", orderSchedule: schedule([evening]) }), owner);
    expect(created.statusCode).toBe(200);
    expect(created.json<IndividualStore>().orderSchedule?.days).toEqual(schedule([evening]).days);

    const before = await f.config();
    const originalSlot = (await f.service.catalog(storeId)).slots.find((slot) => slot.startsAt === `${monday}T18:00:00.000Z`)!;
    const first = await f.save({ ...before, orderSchedule: schedule([{ ...evening, capacity: 6 }, later], before.orderSchedule.revision) });
    expect(first.statusCode).toBe(200);
    const updated = await f.config();
    expect(updated.orderSchedule.revision).toBeGreaterThan(before.orderSchedule.revision);
    expect((await f.service.catalog(storeId)).slots.find((slot) => slot.id === originalSlot.id)).toMatchObject({ capacity: 6, startsAt: originalSlot.startsAt, endsAt: originalSlot.endsAt });

    const stale = await f.save({ ...before, orderSchedule: schedule([later], before.orderSchedule.revision) });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: "revision_conflict" });
    const otherSettings: IndividualStore = { ...updated };
    delete otherSettings.orderSchedule;
    const rename = await f.save({ ...otherSettings, name: "Roma Centro" });
    expect(rename.statusCode).toBe(200);
    expect(await f.config()).toMatchObject({ name: "Roma Centro", orderSchedule: updated.orderSchedule });
  });

  it.each([
    { label: "duplicate weekdays", days: [{ weekday: 1, windows: [evening] }, { weekday: 1, windows: [later] }] },
    { label: "weekday outside 1–7", days: [{ weekday: 0, windows: [evening] }] },
    { label: "overlapping windows", days: [{ weekday: 1, windows: [evening, { ...later, startMinute: 19 * 60 + 30 }] }] },
    { label: "end beyond midnight", days: [{ weekday: 1, windows: [{ ...evening, endMinute: 1441 }] }] },
    { label: "fractional capacity", days: [{ weekday: 1, windows: [{ ...evening, capacity: 1.5 }] }] },
    { label: "capacity above 10000", days: [{ weekday: 1, windows: [{ ...evening, capacity: 10001 }] }] },
  ])("rejects $label without changing the schedule", async ({ days: invalidDays }) => {
    const f = fixture();
    const previous = await f.config();
    const response = await f.save({ ...previous, orderSchedule: { ...previous.orderSchedule, days: invalidDays } });
    expect(response.statusCode).toBe(400);
    expect((await f.config()).orderSchedule).toEqual(previous.orderSchedule);
  });

  it("shows an in-progress full window until its end and quotes the next free window for ASAP", async () => {
    const f = fixture(storeFixture({ orderSchedule: schedule([{ ...evening, capacity: 1 }, later], 1) }));
    const [current, next] = (await f.service.catalog(storeId)).slots;
    expect(current).toMatchObject({ startsAt: `${monday}T18:00:00.000Z`, endsAt: `${monday}T19:00:00.000Z`, capacity: 1 });
    const input = await f.checkoutInput(cart(current!.id), "in-progress");
    const { order } = await f.service.checkout(alice, input);
    expect(order.quote).toMatchObject({ slotId: current!.id, slotStartsAt: current!.startsAt, slotEndsAt: current!.endsAt, slotTimeZone: timeZone });
    expect((await f.service.orders(alice))[0]?.quote).toEqual(order.quote);
    expect((await f.service.catalog(storeId)).slots[0]).toMatchObject({ id: current!.id, capacity: 0 });
    await expect(f.service.quote(cart(current!.id))).rejects.toMatchObject({ code: "slot_unavailable" });
    expect((await f.service.quote(cart(null))).slotId).toBe(next!.id);

    f.setTime(`${monday}T19:00:00.000Z`);
    expect((await f.service.catalog(storeId)).slots.some((slot) => slot.id === current!.id)).toBe(false);
    await expect(f.service.quote(cart(current!.id))).rejects.toMatchObject({ code: "slot_unavailable" });
  });

  it.each(["cash", "card"] as const)("protects a date with a %s order and applies the new schedule on other dates", async (method) => {
    const f = fixture(storeFixture({ orderSchedule: schedule([evening, later], 1) }));
    const before = await f.config();
    const [occupied, sameDate, otherDate] = (await f.service.catalog(storeId)).slots;
    await f.service.checkout(alice, await f.checkoutInput(cart(occupied!.id), `protected-${method}`, method));
    const saved = await f.save({ ...before, orderSchedule: schedule([{ ...later, capacity: 8 }], before.orderSchedule.revision), protectedOrderDates: [tuesday] });
    expect(saved.statusCode).toBe(200);
    expect((await f.config()).protectedOrderDates).toEqual([monday]);
    expect((await f.read()).json()).not.toHaveProperty("protectedOrderDates");

    const updated = (await f.service.catalog(storeId)).slots;
    expect(updated.find((slot) => slot.id === occupied!.id)).toMatchObject({ capacity: 4, endsAt: occupied!.endsAt });
    expect(updated.find((slot) => slot.id === sameDate!.id)).toMatchObject({ capacity: 5, endsAt: sameDate!.endsAt });
    await expect(f.service.quote(cart(otherDate!.id))).rejects.toMatchObject({ code: "slot_unavailable" });
    expect(updated.find((slot) => slot.startsAt === `${tuesday}T19:00:00.000Z`)).toMatchObject({ capacity: 8 });

    f.setTime(`${monday}T22:59:59.999Z`);
    expect((await f.config()).protectedOrderDates).toEqual([monday]);
    f.setTime(`${monday}T23:00:00.000Z`);
    expect((await f.config()).protectedOrderDates ?? []).toEqual([]);
  });

  it("preserves an occupied manual date during activation and retains its historical order time", async () => {
    const manual = { id: "manual-late", startsAt: `${monday}T19:30:00.000Z`, capacity: 3 };
    const after = { id: "manual-extra", startsAt: `${monday}T20:30:00.000Z`, capacity: 9 };
    const f = fixture(storeFixture({ slots: [manual, after] }));
    const legacy = f.open(false);
    const { order } = await legacy.checkout(alice, await f.checkoutInput(cart(manual.id), "old-checkout", "cash", legacy));

    expect((await f.config()).protectedOrderDates).toEqual([monday]);
    const active = (await f.service.catalog(storeId)).slots;
    expect(active.filter((slot) => slot.startsAt.startsWith(monday))).toEqual([{ ...manual, capacity: 2 }, after]);
    expect(active.find((slot) => slot.startsAt === `${tuesday}T10:00:00.000Z`)).toMatchObject({ capacity: 5 });
    const historical = (await f.service.orders(alice)).find((entry) => entry.id === order.id);
    expect(historical?.quote).toMatchObject({ slotId: manual.id, slotStartsAt: manual.startsAt });
    expect(historical?.quote.slotEndsAt).toBeUndefined();
    expect(historical?.quote.slotTimeZone).toBeUndefined();
  });

  it("shares the last place atomically between individual delivery and group pickup", async () => {
    const f = fixture(storeFixture({ orderSchedule: schedule([{ ...evening, capacity: 1 }, later], 1) }));
    const [current, next] = (await f.service.catalog(storeId)).slots;
    const individualCart = cart(current!.id, { mode: "delivery", address: { text: "Via Roma 1", latitude: 41.9, longitude: 12.5 } });
    const input = await f.checkoutInput(individualCart, "delivery-last");
    const groups = f.groups();
    const host = { actor: bob };
    let group = await groups.create(host, { storeId, lines: [], idempotencyKey: "calendar-group" });
    group = await groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [pizza] });
    group = await groups.close(host, group.id, { revision: group.revision });
    const fulfillment = { mode: "pickup" as const, slotId: current!.id, notes: "" };
    const groupQuote = await groups.quote(host, group.id, { revision: group.revision, fulfillment });
    const results = await Promise.allSettled([
      f.service.checkout(alice, input),
      groups.checkout(host, group.id, { revision: group.revision, fingerprint: groupQuote.quote.fingerprint, fulfillment, phone: "3331234567", method: "cash", idempotencyKey: "group-last" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "slot_unavailable" } });
    expect(await f.service.orders(operator, storeId)).toHaveLength(1);
    expect((await f.service.catalog(storeId)).slots[0]).toMatchObject({ id: current!.id, capacity: 0 });
    expect((await f.service.quote(cart(null))).slotId).toBe(next!.id);
  });
});
