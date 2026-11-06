import type { OrderingRepository } from "../ordering-contract";
import { PilotAnalyticsError } from "./error";
import type { AnalyticsState } from "./journal";

/** Capture terminal transitions inside the same transaction as the authoritative order. */
export function withPilotAnalytics(repository: OrderingRepository, now: () => Date = () => new Date()): OrderingRepository {
  return {
    transact(work) {
      return repository.transact(async (state: AnalyticsState) => {
        const previous = new Map(Object.values(state.orders).map((order) => [order.id, order.status]));
        const value = await work(state);
        const changed = Object.values(state.orders).filter((order) =>
          (order.status === "completed" || order.status === "cancelled") && previous.get(order.id) !== order.status
        );
        if (changed.length === 0) return value;
        const instant = now();
        if (!Number.isFinite(instant.getTime())) throw new PilotAnalyticsError("invalid_input", "Data del servizio non valida.");
        const occurredAt = instant.toISOString();
        const journal = state.analytics ??= { entries: {} };
        for (const order of changed) {
          if (order.status !== "completed" && order.status !== "cancelled") continue;
          journal.entries[order.id] = {
            orderId: order.id,
            storeId: order.storeId,
            status: order.status,
            occurredAt,
            totalCents: order.quote.totalCents,
            lines: order.quote.lines.map(({ productId, name, quantity }) => ({ productId, name, quantity }))
          };
        }
        return value;
      });
    }
  };
}
