import type { PilotAnalyticsApi, PilotAnalyticsReport } from "@pizzaos/domain";
import { IndividualApiError } from "./individual-api";

/** Same-origin browser port; the proxy and service remain responsible for identity. */
export function createPilotAnalyticsApi(): PilotAnalyticsApi {
  return {
    async report(query) {
      const parameters = new URLSearchParams({ period: query.period });
      if (query.period === "custom") {
        if (query.fromDate !== undefined) parameters.set("fromDate", query.fromDate);
        if (query.throughDate !== undefined) parameters.set("throughDate", query.throughDate);
      }
      const storeId = encodeURIComponent(query.storeId);
      const response = await fetch(`/api/pilot/v1/pilot/stores/${storeId}/analytics?${parameters}`, {
        method: "GET", credentials: "same-origin", cache: "no-store"
      });
      if (!response.ok) {
        const value: unknown = await response.json().catch(() => null);
        const payload = value && typeof value === "object" ? value as Record<string, unknown> : {};
        throw new IndividualApiError(
          typeof payload.code === "string" ? payload.code : "service_unavailable",
          typeof payload.message === "string" ? payload.message : "Impossibile caricare le statistiche."
        );
      }
      return response.json() as Promise<PilotAnalyticsReport>;
    }
  };
}
