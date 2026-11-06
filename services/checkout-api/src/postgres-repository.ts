import type { Pool } from "pg";
import type { OrderingRepository, OrderingState } from "./ordering-contract";

export function emptyOrderingState(): OrderingState {
  return { stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 };
}

/** Row lock coordinates every service instance; aborted callbacks never commit. */
export function createPostgresOrderingRepository(pool: Pool): OrderingRepository {
  return {
    async transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
      const connection = await pool.connect();
      try {
        await connection.query("BEGIN");
        await connection.query("INSERT INTO individual_ordering_state (id, snapshot) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(emptyOrderingState())]);
        const result = await connection.query<{ snapshot: OrderingState }>("SELECT snapshot FROM individual_ordering_state WHERE id = 1 FOR UPDATE");
        const state = result.rows[0].snapshot;
        const value = await work(state);
        await connection.query("UPDATE individual_ordering_state SET snapshot = $1, updated_at = now() WHERE id = 1", [JSON.stringify(state)]);
        await connection.query("COMMIT");
        return structuredClone(value);
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      } finally { connection.release(); }
    }
  };
}
