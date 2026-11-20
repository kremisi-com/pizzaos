// @vitest-environment node

import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createConnection, createServer, type Socket } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Pool, type PoolConfig } from "pg";
import { describe, expect, it } from "vitest";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createPostgresOrderingRepository, emptyOrderingState } from "./postgres-repository";

const testDatabaseUrl = process.env.PIZZAOS_TEST_DATABASE_URL;
const testDatabaseName = "pizzaos_individual_test";
const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];
const testDatabase = testDatabaseUrl ? new URL(testDatabaseUrl) : undefined;
const currentSchema = readFileSync(fileURLToPath(new URL("./schema.sql", import.meta.url)), "utf8");
const legacySchema = `CREATE TABLE individual_ordering_state (
  id integer PRIMARY KEY CHECK (id = 1),
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
)`;
const insertSnapshot = "INSERT INTO individual_ordering_state (id, snapshot) VALUES (1, $1)";
const insertDatedSnapshot = "INSERT INTO individual_ordering_state (id, snapshot, updated_at) VALUES (1, $1, $2)";
const legacyUpdate = "UPDATE individual_ordering_state SET snapshot = $1, updated_at = now() WHERE id = 1";
const firstMembership = { storeId: "synthetic-store", email: "first@example.test" };
const secondMembership = { storeId: "synthetic-store", email: "second@example.test" };

function getDatabaseSettings(): PoolConfig & { host: string; port: number } {
  const url = testDatabase;
  if (!url || !["postgres:", "postgresql:"].includes(url.protocol) || url.pathname !== `/${testDatabaseName}` ||
      !loopbackHosts.includes(url.hostname)) {
    throw new Error(`PIZZAOS_TEST_DATABASE_URL must point to the dedicated local database ${testDatabaseName}`);
  }

  return {
    host: url.hostname.replace(/^\[|\]$/g, ""),
    port: Number(url.port || 5432),
    database: testDatabaseName,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    connectionTimeoutMillis: 3_000,
    ssl: false,
    max: 1,
  };
}

async function withDatabase(
  run: (database: { observer: Pool; pool: (target?: { host: string; port: number }) => Pool }) => Promise<void>,
) {
  const settings = getDatabaseSettings();
  const observer = new Pool(settings);
  const schema = `snapshot_test_${randomUUID().replaceAll("-", "")}`;
  const pools: Pool[] = [];
  try {
    await observer.query(`CREATE SCHEMA ${schema}`);
    await run({
      observer,
      pool(target) {
        const pool = new Pool({ ...settings, ...target, options: `-c search_path=${schema}` });
        pools.push(pool);
        return pool;
      },
    });
  } finally {
    try {
      await Promise.all(pools.map((pool) => pool.end()));
      await observer.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await observer.end();
    }
  }
}

const canonicalSnapshot: OrderingState = {
  stores: {},
  memberships: [],
  orders: {},
  idempotency: {},
  events: [],
  cursor: 0,
};

function historicalSnapshot() {
  return {
    ...canonicalSnapshot,
    cursor: 9,
    memberships: [firstMembership],
    idempotency: { "synthetic-key": { hash: "synthetic-hash", orderId: "synthetic-order" } },
    historicalExtension: { revision: 4, entries: [{ enabled: true, value: null }, { enabled: false }] },
  } satisfies OrderingState & { historicalExtension: unknown };
}

async function updatedAt(pool: Pool) {
  const result = await pool.query<{ updated_at: string }>(
    "SELECT updated_at::text FROM individual_ordering_state WHERE id = 1",
  );
  return result.rows[0]?.updated_at;
}

type WireBytes = { clientToDatabase: number; databaseToClient: number };

async function startRelay(database: { host: string; port: number }) {
  const sockets = new Set<Socket>();
  const totals: WireBytes = { clientToDatabase: 0, databaseToClient: 0 };
  const relay = createServer((client) => {
    const upstream = createConnection(database);
    for (const socket of [client, upstream]) {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      socket.on("error", () => socket.destroy());
    }
    client.once("close", () => upstream.destroy());
    upstream.once("close", () => client.destroy());
    client.on("data", (chunk: Buffer) => { totals.clientToDatabase += chunk.length; });
    upstream.on("data", (chunk: Buffer) => { totals.databaseToClient += chunk.length; });
    client.pipe(upstream);
    upstream.pipe(client);
  });
  const host = "127.0.0.1";
  relay.listen(0, host);
  await once(relay, "listening");
  const address = relay.address();
  if (!address || typeof address === "string") throw new Error("Expected an address for the loopback relay");

  let closing: Promise<void> | undefined;
  return {
    target: { host, port: address.port },
    read: () => ({ ...totals }),
    close() {
      closing ??= new Promise<void>((resolve, reject) => {
        for (const socket of sockets) socket.destroy();
        relay.close((error) => error ? reject(error) : resolve());
      });
      return closing;
    },
  };
}

function legacyRepository(pool: Pool): OrderingRepository {
  return {
    async transact(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`${insertSnapshot} ON CONFLICT (id) DO NOTHING`, [emptyOrderingState()]);
        const result = await client.query<{ snapshot: OrderingState }>(
          "SELECT snapshot FROM individual_ordering_state WHERE id = 1 FOR UPDATE",
        );
        const state = result.rows[0].snapshot;
        const value = await work(state);
        await client.query(legacyUpdate, [state]);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

describe.skipIf(!testDatabase || !loopbackHosts.includes(testDatabase.hostname))("ordering snapshot PostgreSQL acceptance", () => {
  it("initializes a new database to the canonical state", async () => {
    await withDatabase(async ({ pool }) => {
      const client = pool();
      await client.query(currentSchema);

      const repository = createPostgresOrderingRepository(client);
      expect(emptyOrderingState()).toEqual(canonicalSnapshot);
      expect(await repository.transact((state) => state)).toEqual(canonicalSnapshot);
    });
  });

  it("reapplies the migration to legacy state and observes legacy updates and row replacement", async () => {
    await withDatabase(async ({ pool }) => {
      const client = pool();
      const writer = pool();
      const original = historicalSnapshot();
      await client.query(legacySchema);
      await client.query(insertDatedSnapshot, [original, "2026-01-01T12:34:56.123456Z"]);
      const originalTimestamp = await updatedAt(client);
      await client.query(currentSchema);
      await client.query(currentSchema);

      const repository = createPostgresOrderingRepository(client);
      expect(await repository.transact((state) => state)).toEqual(original);
      expect(await updatedAt(client)).toBe(originalTimestamp);

      const legacy = legacyRepository(writer);
      await legacy.transact((state) => { state.memberships.push(secondMembership); });
      const afterUpdate = { ...original, memberships: [firstMembership, secondMembership] };
      expect(await repository.transact((state) => state)).toEqual(afterUpdate);

      const sameTimestamp = await updatedAt(client);
      const replacement = { ...afterUpdate, memberships: [secondMembership] };
      const transaction = await writer.connect();
      try {
        await transaction.query("BEGIN");
        await transaction.query("DELETE FROM individual_ordering_state WHERE id = 1");
        await transaction.query(insertDatedSnapshot, [replacement, sameTimestamp]);
        await transaction.query("COMMIT");
      } catch (error) {
        await transaction.query("ROLLBACK");
        throw error;
      } finally {
        transaction.release();
      }

      expect(await repository.transact((state) => state)).toEqual(replacement);
      expect(await updatedAt(client)).toBe(sameTimestamp);
    });
  });

  it("waits behind a writer and serializes concurrent increments", async () => {
    await withDatabase(async ({ observer, pool }) => {
      const reader = pool();
      const writer = pool();
      await reader.query(currentSchema);
      await reader.query(insertSnapshot, [historicalSnapshot()]);
      const repository = createPostgresOrderingRepository(reader);
      expect(await repository.transact((state) => state.cursor)).toBe(9);
      const readerPid = (await reader.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      const locker = await writer.connect();
      let pendingRead: Promise<number> | undefined;
      try {
        const writerPid = (await locker.query<{ pid: number }>("SELECT pg_backend_pid() AS pid")).rows[0].pid;
        await locker.query("BEGIN");
        await locker.query(legacyUpdate, [{ ...historicalSnapshot(), cursor: 10 }]);
        pendingRead = repository.transact((state) => state.cursor);
        void pendingRead.catch(() => {});

        const deadline = Date.now() + 4_000;
        let blocked = false;
        while (Date.now() < deadline) {
          const result = await observer.query<{ blocked: boolean }>(
            "SELECT $1::integer = ANY(pg_blocking_pids($2::integer)) AS blocked", [writerPid, readerPid],
          );
          blocked = result.rows[0].blocked;
          if (blocked) break;
          await delay(20);
        }
        expect(blocked).toBe(true);
        await locker.query("COMMIT");
      } catch (error) {
        await locker.query("ROLLBACK");
        throw error;
      } finally {
        locker.release();
        await pendingRead?.catch(() => {});
      }
      expect(await pendingRead).toBe(10);

      const secondRepository = createPostgresOrderingRepository(writer);
      const increment = (state: OrderingState) => ++state.cursor;
      const increments = await Promise.all([repository.transact(increment), secondRepository.transact(increment)]);
      expect(increments.sort((a, b) => a - b)).toEqual([11, 12]);
      expect(await repository.transact((state) => state.cursor)).toBe(12);
    });
  }, 15_000);

  it("rolls back callback failures and detaches transaction results", async () => {
    await withDatabase(async ({ pool }) => {
      const client = pool();
      const independentClient = pool();
      const original = historicalSnapshot();
      await client.query(currentSchema);
      await client.query(insertSnapshot, [original]);
      const repository = createPostgresOrderingRepository(client);
      const independentReader = createPostgresOrderingRepository(independentClient);
      const originalTimestamp = await updatedAt(client);
      const failure = new Error("synthetic transaction failure");
      let calls = 0;
      await expect(repository.transact(async (state) => {
        calls += 1;
        state.cursor += 1;
        state.memberships.push(secondMembership);
        await Promise.resolve();
        throw failure;
      })).rejects.toBe(failure);
      expect(calls).toBe(1);
      expect(await updatedAt(client)).toBe(originalTimestamp);
      expect(await repository.transact((state) => {
        state.memberships.push(secondMembership);
        state.memberships.pop();
        return state;
      })).toEqual(original);
      expect(await independentReader.transact((state) => state)).toEqual(original);
      expect(await updatedAt(client)).toBe(originalTimestamp);

      const result = await repository.transact((state) => {
        state.cursor += 1;
        return state;
      });
      result.cursor = 999;
      result.memberships[0].email = "detached@example.test";
      const expected = { ...original, cursor: 10 };
      expect(await repository.transact((state) => state)).toEqual(expected);
      expect(await independentReader.transact((state) => state)).toEqual(expected);
    });
  });

  it("propagates database unavailability after warming the repository", async () => {
    await withDatabase(async ({ pool }) => {
      const relay = await startRelay(getDatabaseSettings());
      try {
        const client = pool(relay.target);
        client.on("error", () => {});
        await client.query(currentSchema);
        const repository = createPostgresOrderingRepository(client);
        await repository.transact((state) => state.cursor);
        await Promise.all([once(client, "error"), relay.close()]);

        let callbackCalled = false;
        await expect(repository.transact((state) => {
          callbackCalled = true;
          return state.cursor;
        })).rejects.toBeInstanceOf(Error);
        expect(callbackCalled).toBe(false);
      } finally {
        await relay.close();
      }
    });
  }, 15_000);

  it("measures idle and mixed workload bytes in both PostgreSQL protocol directions", async () => {
    const relay = await startRelay(getDatabaseSettings());
    try {
      await withDatabase(async ({ pool }) => {
        const client = pool();
        await client.query(currentSchema);
        const operations = 100;
        const fixture = {
          ...historicalSnapshot(),
          benchmarkExtension: { payload: "pizzaos-snapshot-synthetic-0123456789".repeat(4_096) },
        };
        const fixtureBytes = Buffer.byteLength(JSON.stringify(fixture));
        expect(fixtureBytes).toBeGreaterThanOrEqual(128 * 1024);

        async function measure(createRepository: (pool: Pool) => OrderingRepository, mixed: boolean): Promise<WireBytes> {
          await client.query("DELETE FROM individual_ordering_state WHERE id = 1");
          await client.query(insertSnapshot, [fixture]);
          const first = createRepository(pool(relay.target));
          const second = mixed ? createRepository(pool(relay.target)) : first;
          await first.transact((state) => state.cursor);
          if (mixed) await second.transact((state) => state.cursor);

          const start = relay.read();
          for (let operation = 0; operation < operations; operation += 1) {
            const block = Math.floor(operation / 10);
            const repository = mixed && block % 2 === 1 ? second : first;
            const writes = mixed && operation % 10 === 0;
            await repository.transact((state) => {
              if (writes) state.cursor += 1;
              return state.cursor;
            });
          }
          const end = relay.read();
          const persisted = await client.query<{ cursor: string }>(
            "SELECT snapshot->>'cursor' AS cursor FROM individual_ordering_state WHERE id = 1",
          );
          expect(Number(persisted.rows[0].cursor)).toBe(fixture.cursor + (mixed ? operations / 10 : 0));
          return {
            clientToDatabase: end.clientToDatabase - start.clientToDatabase,
            databaseToClient: end.databaseToClient - start.databaseToClient,
          };
        }

        const idle = { legacy: await measure(legacyRepository, false), current: await measure(createPostgresOrderingRepository, false) };
        const mixed = { legacy: await measure(legacyRepository, true), current: await measure(createPostgresOrderingRepository, true) };
        console.info("Ordering snapshot loopback PostgreSQL protocol bytes (no TLS)", {
          fixtureBytes,
          operationsPerRun: operations,
          writesPerMixedRun: operations / 10,
          idle,
          mixed,
          excluded: "TCP framing, connection setup and teardown, fixture setup, initial snapshot reads and verification queries",
        });
        for (const direction of ["clientToDatabase", "databaseToClient"] as const) {
          expect(idle.current[direction]).toBeLessThanOrEqual(idle.legacy[direction] * 0.05);
          expect(mixed.current[direction]).toBeLessThan(mixed.legacy[direction]);
        }
      });
    } finally {
      await relay.close();
    }
  }, 45_000);
});
