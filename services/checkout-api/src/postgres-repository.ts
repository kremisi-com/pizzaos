import type { Pool } from "pg";
import type { OrderingRepository, OrderingState } from "./ordering-contract";

export function emptyOrderingState(): OrderingState {
  return { stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 };
}

interface SnapshotRow {
  version: string;
  snapshot: OrderingState | null;
}

const lockedSnapshot = `
  SELECT snapshot_version AS version,
    CASE WHEN snapshot_version = $1::uuid THEN NULL ELSE snapshot END AS snapshot
  FROM individual_ordering_state WHERE id = 1 FOR UPDATE
`;

/** Row lock coordinates every service instance; aborted callbacks never commit. */
export function createPostgresOrderingRepository(pool: Pool): OrderingRepository {
  let lastRead: { version: string; json: string } | undefined;

  return {
    async transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
      const connection = await pool.connect();
      let discardConnection = false;
      try {
        await connection.query("BEGIN ISOLATION LEVEL READ COMMITTED");
        const cached = lastRead;
        const read = async () => (await connection.query<SnapshotRow>(lockedSnapshot, [cached?.version ?? null])).rows[0];
        let row = await read();
        if (!row) {
          await connection.query("INSERT INTO individual_ordering_state (id, snapshot) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(emptyOrderingState())]);
          row = await read();
        }
        if (!row) throw new Error("Snapshot ordini mancante dopo l'inizializzazione.");

        // Keep the cached document immutable while the callback works on its own draft.
        const original = row.snapshot === null && cached?.version === row.version ? cached.json : JSON.stringify(row.snapshot);
        const state: OrderingState = row.snapshot ?? JSON.parse(original);
        const value = structuredClone(await work(state));
        const updated = JSON.stringify(state);
        if (updated !== original) {
          await connection.query("UPDATE individual_ordering_state SET snapshot = $1, updated_at = now() WHERE id = 1", [updated]);
        }
        await connection.query("COMMIT");
        // After a write, the next read loads PostgreSQL's normalized JSONB representation.
        if (updated === original) lastRead = { version: row.version, json: original };
        return value;
      } catch (error) {
        try { await connection.query("ROLLBACK"); }
        catch { discardConnection = true; }
        throw error;
      } finally { connection.release(discardConnection); }
    }
  };
}
