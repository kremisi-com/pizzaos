import type { DeliveryAdminApi, RiderDeliveryApi } from "@pizzaos/domain";
import { IndividualApiError } from "./individual-api";

const base = "/api/pilot/v1/pilot";
const id = encodeURIComponent;

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!response.ok) {
    const error: unknown = await response.json().catch(() => null);
    const payload = error && typeof error === "object" ? error as Record<string, unknown> : {};
    throw new IndividualApiError(typeof payload.code === "string" ? payload.code : "service_unavailable",
      typeof payload.message === "string" ? payload.message : "Il servizio non è disponibile. Riprova tra poco.");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function createRiderDeliveryApi(): RiderDeliveryApi {
  return {
    session: () => request("/rider/session"),
    deliveries: () => request("/rider/deliveries"),
    dispatch: orderId => request(`/rider/deliveries/${id(orderId)}/dispatch`, "POST", {}),
    complete: orderId => request(`/rider/deliveries/${id(orderId)}/complete`, "POST", {}),
    reportFailure: (orderId, note) => request(`/rider/deliveries/${id(orderId)}/failure`, "POST", { note })
  };
}

export function createDeliveryAdminApi(): DeliveryAdminApi {
  return {
    riders: storeId => request(`/stores/${id(storeId)}/riders`),
    inviteRider: (storeId, email, name) => request(`/stores/${id(storeId)}/riders`, "POST", { email, name }),
    setRiderActive: (storeId, riderId, active) => request(`/stores/${id(storeId)}/riders/${id(riderId)}`, "PATCH", { active }),
    assignments: storeId => request(`/stores/${id(storeId)}/deliveries`),
    assign: (orderId, riderId) => request(`/orders/${id(orderId)}/assignment`, "PUT", { riderId })
  };
}
