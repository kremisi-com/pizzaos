import type { PromotionsApi } from "@pizzaos/domain";
import { IndividualApiError } from "./individual-api";

/** Same-origin promotion configuration and own-wallet transport. */
export function createPromotionsApi(): PromotionsApi {
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`/api/pilot/v1/pilot/stores/${path}`, {
      method, cache: "no-store", credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null);
      const error = value && typeof value === "object" ? value as Record<string, unknown> : {};
      throw new IndividualApiError(typeof error.code === "string" ? error.code : "service_unavailable",
        typeof error.message === "string" ? error.message : "Promozioni non disponibili. Riprova.");
    }
    return response.json() as Promise<T>;
  }
  const id = encodeURIComponent;
  return {
    configuration: storeId => request(`${id(storeId)}/promotions`),
    saveProgram: (storeId, input) => request(`${id(storeId)}/promotions/program`, "PUT", input),
    saveCoupon: (storeId, input) => request(`${id(storeId)}/promotions/coupons`, "POST", input),
    wallet: storeId => request(`${id(storeId)}/loyalty`)
  };
}
