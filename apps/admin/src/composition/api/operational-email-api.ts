import type { OperationalEmailApi, OperationalEmailOverview } from "@pizzaos/domain";
import { IndividualApiError } from "./individual-api";

export function createOperationalEmailApi(): OperationalEmailApi {
  return {
    async list(storeId) {
      const response = await fetch(`/api/pilot/v1/pilot/stores/${encodeURIComponent(storeId)}/emails`, { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) {
        const value: unknown = await response.json().catch(() => null);
        const payload = value && typeof value === "object" ? value as Record<string, unknown> : {};
        throw new IndividualApiError(typeof payload.code === "string" ? payload.code : "service_unavailable", "Impossibile aggiornare gli invii email.");
      }
      return response.json() as Promise<OperationalEmailOverview>;
    }
  };
}
