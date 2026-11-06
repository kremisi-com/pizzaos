import type { IndividualActor, IndividualStore, PilotAnalyticsProduct, PilotAnalyticsQuery, PilotAnalyticsReport } from "@pizzaos/domain";
import type { OrderingRepository } from "../ordering-contract";
import { PilotAnalyticsError } from "./error";
import type { AnalyticsState } from "./journal";
import { analyticsRange } from "./period";

export { PilotAnalyticsError } from "./error";
export { withPilotAnalytics } from "./repository";

export interface PilotAnalyticsService {
  report(actor: IndividualActor | null, query: PilotAnalyticsQuery): Promise<PilotAnalyticsReport>;
}
export interface PilotAnalyticsOptions {
  repository: OrderingRepository;
  superadminEmails: string[];
  now?: () => Date;
}
/** Return an authorized report reader; terminal orders without journal timestamps are excluded. */
export function createPilotAnalyticsService(options: PilotAnalyticsOptions): PilotAnalyticsService {
  const superadmins = new Set(options.superadminEmails.map((email) => email.trim().toLowerCase()));
  const now = options.now ?? (() => new Date());
  return {
    async report(actor, query) {
      if (!actor) throw new PilotAnalyticsError("unauthorized", "Accedi per consultare le statistiche.");
      if (!query || typeof query.storeId !== "string" || !query.storeId.trim()) {
        throw new PilotAnalyticsError("invalid_input", "Seleziona una sede valida.");
      }
      return options.repository.transact((state: AnalyticsState) => {
        const email = actor.email.trim().toLowerCase();
        const authorized = superadmins.has(email) || state.memberships.some((membership) =>
          membership.storeId === query.storeId && membership.email.trim().toLowerCase() === email
        );
        if (!authorized) throw new PilotAnalyticsError("forbidden", "Non puoi consultare le statistiche di questa sede.");
        if (!Object.hasOwn(state.stores, query.storeId)) throw new PilotAnalyticsError("not_found", "Sede non trovata.");
        const store: IndividualStore & { timeZone?: string } = state.stores[query.storeId];
        const range = analyticsRange(query, store.timeZone ?? "Europe/Rome", now());
        const entries = Object.values(state.analytics?.entries ?? {}).filter((entry) =>
          entry.storeId === query.storeId && entry.occurredAt >= range.startsAt && entry.occurredAt < range.endsAt
        );
        const completed = entries.filter((entry) => entry.status === "completed").sort((left, right) =>
          right.occurredAt.localeCompare(left.occurredAt) || left.orderId.localeCompare(right.orderId)
        );
        const salesCents = completed.reduce((total, entry) => total + entry.totalCents, 0);
        const products = new Map<string, PilotAnalyticsProduct>();
        for (const entry of completed) {
          for (const line of entry.lines) {
            const product = products.get(line.productId);
            if (product) product.quantity += line.quantity;
            else products.set(line.productId, { ...line });
          }
        }
        return {
          storeId: query.storeId,
          range,
          completedOrders: completed.length,
          salesCents,
          averageOrderCents: completed.length === 0 ? 0 : Math.round(salesCents / completed.length),
          cancelledOrders: entries.filter((entry) => entry.status === "cancelled").length,
          topProducts: [...products.values()].sort((left, right) => right.quantity - left.quantity || left.productId.localeCompare(right.productId))
        };
      });
    }
  };
}
