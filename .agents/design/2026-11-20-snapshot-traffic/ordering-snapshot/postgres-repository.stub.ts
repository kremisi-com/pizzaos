import type { Pool } from "pg";
import type { OrderingRepository, OrderingState } from "../../../../services/checkout-api/src/ordering-contract";

/** Restituisce un nuovo stato vuoto per il pilota. */
export declare function emptyOrderingState(): OrderingState;

/** Esegue transazioni isolate e serializzate sullo stato autorevole accessibile dal pool. */
export declare function createPostgresOrderingRepository(pool: Pool): OrderingRepository;
