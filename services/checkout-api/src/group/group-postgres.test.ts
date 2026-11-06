import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterEach, describe, expect, it } from "vitest";
import type { IndividualActor, IndividualLine, IndividualStore } from "@pizzaos/domain";
import type { OrderingPayments, ProviderPayment } from "../ordering-contract";
import { createPostgresOrderingRepository } from "../postgres-repository";
import { createOrderingService } from "../ordering-service";
import { createGroupOrderingService } from "./group-service";

const databaseUrl = process.env.PIZZAOS_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname !== "/pizzaos_individual_test") throw new Error("Group PostgreSQL tests require the dedicated pizzaos_individual_test database");
const pools: Pool[] = [];
afterEach(async () => { await Promise.all(pools.splice(0).map((pool) => pool.end())); });

async function fixture() {
  const suffix = randomUUID();
  let now = new Date();
  const actor: IndividualActor = { id: `group-pg-${suffix}`, name: "Alice", email: `group-${suffix}@example.test` };
  const store: IndividualStore = { id: `group-store-${suffix}`, name: "Sede test gruppo", latitude: 45, longitude: 9, acceptingOrders: true, deliveryBands: [], ingredients: [{ id: "dough", name: "Impasto", stock: 100 }], products: [{ id: "pizza", name: "Pizza", description: "Pomodoro", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, options: [] }], slots: [{ id: "slot", startsAt: new Date(now.getTime() + 4 * 3600000).toISOString(), capacity: 20 }] };
  const intents = new Map<string, ProviderPayment>();
  const payments: OrderingPayments = {
    async create({ key }) { let value = intents.get(key); if (!value) { value = { id: `pi-${suffix}-${intents.size}`, status: "requires_action", clientSecret: "transient-test-secret" }; intents.set(key, value); } return value; },
    async read(id) { const value = [...intents.values()].find((intent) => intent.id === id); if (!value) throw new Error("Missing test intent"); return value; },
    async cancel(id) { return { id, status: "cancelled" }; },
    async refund() { return { id: "refund-test", status: "succeeded" }; },
    async readRefund(id) { return { id, status: "succeeded" }; }
  };
  function connect() {
    const pool = new Pool({ connectionString: databaseUrl, max: 1 }); pools.push(pool);
    const repository = createPostgresOrderingRepository(pool);
    const ordering = createOrderingService({ repository, payments, superadminEmails: [], now: () => now });
    const groups = createGroupOrderingService({ repository, ordering, now: () => now });
    return { groups, ordering, repository };
  }
  const a = connect(); const b = connect();
  await a.repository.transact((state) => { state.stores[store.id] = store; });
  return { a, b, connect, actor, store, intents, advance(ms: number) { now = new Date(now.getTime() + ms); }, deadline(ms = 3600000) { return new Date(now.getTime() + ms).toISOString(); } };
}

describe.skipIf(!databaseUrl)("group durability on real PostgreSQL connections", () => {
  it("persists capabilities and participant lines across independent pools and serializes concurrent revisions", async () => {
    const f = await fixture(); const host = { actor: f.actor };
    let group = await f.a.groups.create(f.actor, { storeId: f.store.id, name: "Alice", deadline: f.deadline() });
    const joined = await f.b.groups.join({ actor: null }, group.id, { inviteToken: group.inviteToken!, name: "Marco" });
    const guest = { actor: null, capability: joined.capability };
    const line: IndividualLine = { productId: "pizza", quantity: 2, optionIds: [], notes: "Ben cotta" };
    group = await f.a.groups.replaceLines(guest, group.id, { participantId: joined.group.participantId!, revision: joined.group.revision, lines: [line] });
    const restored = await f.b.groups.read(guest, group.id);
    expect(restored.participantId).toBe(joined.group.participantId);
    expect(restored.participants.find((p) => p.id === restored.participantId)?.lines).toEqual([line]);
    const outcomes = await Promise.allSettled([f.a, f.b].map((instance, index) => instance.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [{ ...line, quantity: index + 1 }] })));
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const conflict = outcomes.find((result) => result.status === "rejected");
    expect(conflict?.status === "rejected" ? conflict.reason : null).toMatchObject({ code: "revision_conflict", statusCode: 409 });
    expect((await f.b.groups.read(host, group.id)).revision).toBe(group.revision + 1);
    expect(await f.a.ordering.orders(f.actor)).toHaveLength(0); expect(f.intents.size).toBe(0);
    expect((await f.a.repository.transact((state) => state.stores[f.store.id].ingredients[0].stock))).toBe(100);
  }, 20000);

  it("commits one canonical checkout across two service instances and recovers it after a new connection", async () => {
    const f = await fixture(); const host = { actor: f.actor };
    let group = await f.a.groups.create(f.actor, { storeId: f.store.id, name: "Alice", deadline: f.deadline() });
    const line: IndividualLine = { productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" };
    group = await f.b.groups.replaceLines(host, group.id, { participantId: group.participantId!, revision: group.revision, lines: [line] });
    group = await f.a.groups.close(host, group.id, { revision: group.revision });
    const fulfillment = { mode: "pickup" as const, slotId: "slot", notes: "" };
    const quote = await f.b.groups.quote(host, group.id, { revision: group.revision, fulfillment });
    const input = { revision: group.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: "3331234567", method: "card" as const, idempotencyKey: `group-pg-${group.id}` };
    const results = await Promise.all([f.a.groups.checkout(host, group.id, input), f.b.groups.checkout(host, group.id, input)]);
    expect(results[0].order.id).toBe(results[1].order.id); expect(f.intents.size).toBe(1);
    const restarted = f.connect();
    expect((await restarted.groups.recover(host, group.id)).order.id).toBe(results[0].order.id);
    expect((await restarted.groups.checkout(host, group.id, input)).order.id).toBe(results[0].order.id);
    const orders = await restarted.ordering.orders(f.actor); expect(orders).toHaveLength(1);
    expect(orders[0].cart.lines[0].notes).toBe("Per Alice · Ben cotta");
    expect((await restarted.ordering.quote({ storeId: f.store.id, ...fulfillment, lines: [{ ...line, quantity: 99 }] })).totalCents).toBe(79200);
    await expect(restarted.ordering.quote({ storeId: f.store.id, ...fulfillment, lines: [{ ...line, quantity: 100 }] })).rejects.toMatchObject({ code: "inventory_changed" });
  }, 20000);

  it("persists worker closure at the exact deadline across pools without automatic order creation", async () => {
    const f = await fixture(); const host = { actor: f.actor };
    const group = await f.a.groups.create(f.actor, { storeId: f.store.id, name: "Alice", deadline: f.deadline(1000) });
    f.advance(1000); await f.b.groups.tick();
    const closed = await f.a.groups.read(host, group.id); expect(closed).toMatchObject({ status: "closed", revision: group.revision + 1 });
    await f.a.groups.tick(); expect((await f.connect().groups.read(host, group.id)).revision).toBe(closed.revision);
    expect(await f.a.ordering.orders(f.actor)).toHaveLength(0); expect(f.intents.size).toBe(0);
  }, 20000);
});
