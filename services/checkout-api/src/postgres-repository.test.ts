// @vitest-environment node
// Public adapter acceptance tests. This suite never runs against an application DB.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createPostgresOrderingRepository } from "./postgres-repository";

const databaseUrl = process.env.PIZZAOS_TEST_DATABASE_URL;
if (databaseUrl && new URL(databaseUrl).pathname !== "/pizzaos_individual_test") {
  throw new Error("Repository tests require the dedicated pizzaos_individual_test database.");
}

describe.skipIf(!databaseUrl)("real PostgreSQL ordering repository", () => {
  let firstPool: Pool;
  let secondPool: Pool;
  beforeAll(() => {
    firstPool = new Pool({ connectionString: databaseUrl, max: 4 });
    secondPool = new Pool({ connectionString: databaseUrl, max: 4 });
  });
  beforeEach(async () => {
    // The explicit database-name guard above is required before this reset.
    await firstPool.query("DELETE FROM individual_ordering_state");
  });
  afterAll(async () => { await Promise.all([firstPool?.end(), secondPool?.end()]); });

  it("starts from the documented empty snapshot and detaches returned values", async () => {
    const repository = createPostgresOrderingRepository(firstPool);
    const snapshot = await repository.transact((state) => state);
    expect(snapshot).toEqual({ stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 });
    snapshot.cursor = 100;
    snapshot.memberships.push({ storeId: "uncommitted", email: "private@example.it" });
    expect(await repository.transact((state) => state.cursor)).toBe(0);
    expect(await repository.transact((state) => state.memberships)).toEqual([]);
  });

  it("rolls back every callback mutation on exception and allows subsequent transactions", async () => {
    const first = createPostgresOrderingRepository(firstPool);
    await first.transact((state) => { state.cursor = 7; });
    await expect(first.transact(async (state) => {
      state.cursor = 99;
      state.memberships.push({ storeId: "roma", email: "staff@example.it" });
      await Promise.resolve();
      throw new Error("abort transaction");
    })).rejects.toThrow("abort transaction");
    const second = createPostgresOrderingRepository(secondPool);
    expect(await second.transact((state) => ({ cursor: state.cursor, memberships: state.memberships }))).toEqual({ cursor: 7, memberships: [] });
    await second.transact((state) => { state.cursor++; });
    expect(await first.transact((state) => state.cursor)).toBe(8);
  });

  it("serializes concurrent asynchronous updates from two independent connection pools", async () => {
    const first = createPostgresOrderingRepository(firstPool);
    const second = createPostgresOrderingRepository(secondPool);
    const returned = await Promise.all(Array.from({ length: 12 }, (_, index) => (index % 2 ? first : second).transact(async (state) => {
      const observed = state.cursor;
      await new Promise((resolve) => setTimeout(resolve, 3));
      state.cursor = observed + 1;
      state.events.push({ cursor: state.cursor, storeId: "roma", orderId: `order-${state.cursor}`, revision: 1 });
      return state.cursor;
    })));
    expect([...returned].sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
    const saved = await first.transact((state) => state);
    expect(saved.cursor).toBe(12);
    expect(saved.events.map((event) => event.cursor)).toEqual(Array.from({ length: 12 }, (_, index) => index + 1));
  });

  it("retains committed state after repository and connection recreation", async () => {
    const first = createPostgresOrderingRepository(firstPool);
    await first.transact((state) => {
      state.cursor = 2;
      state.memberships.push({ storeId: "roma", email: "staff@example.it" });
      state.idempotency["alice:checkout-1"] = { hash: "stable-input-hash", orderId: "order-1" };
    });
    const restartedPool = new Pool({ connectionString: databaseUrl, max: 1 });
    try {
      const restarted = createPostgresOrderingRepository(restartedPool);
      expect(await restarted.transact((state) => ({ cursor: state.cursor, memberships: state.memberships, idempotency: state.idempotency }))).toEqual({ cursor: 2, memberships: [{ storeId: "roma", email: "staff@example.it" }], idempotency: { "alice:checkout-1": { hash: "stable-input-hash", orderId: "order-1" } } });
    } finally { await restartedPool.end(); }
  });
});
