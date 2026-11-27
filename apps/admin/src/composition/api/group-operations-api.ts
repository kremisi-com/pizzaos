import type { GroupOperationsApi } from "@pizzaos/domain";
import { IndividualApiError } from "./individual-api";

/** Operator-only transport. Authorization and refund amounts belong to the service. */
export function createGroupOperationsApi(): GroupOperationsApi {
  async function request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`/api/pilot/v1/pilot/${path}`, {
      method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null);
      const error = value && typeof value === "object" ? value as Record<string, unknown> : {};
      throw new IndividualApiError(typeof error.code === "string" ? error.code : "service_unavailable",
        typeof error.message === "string" ? error.message : "Impossibile aggiornare l'ordine di gruppo.");
    }
    return response.json() as Promise<T>;
  }
  return {
    list: storeId => request(`stores/${encodeURIComponent(storeId)}/groups`),
    refund: (id, input) => request(`groups/${encodeURIComponent(id)}/refund`, input)
  };
}
