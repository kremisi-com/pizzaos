import type { IndividualApi } from "@pizzaos/domain";

export class IndividualApiError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "IndividualApiError"; }
}

export function createIndividualApi(): IndividualApi {
  const base = "/api/pilot/v1/pilot";
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method, cache: "no-store", credentials: "same-origin",
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
  const id = encodeURIComponent;
  return {
    session: () => request("/session"),
    stores: () => request("/stores"),
    catalog: storeId => request(`/stores/${id(storeId)}`),
    quote: cart => request("/quote", "POST", { cart }),
    checkout: input => request("/checkouts", "POST", input),
    orders: storeId => request(`/orders${storeId ? `?storeId=${id(storeId)}` : ""}`),
    reconcile: orderId => request(`/orders/${id(orderId)}/reconcile`, "POST", {}),
    action: (orderId, input) => request(`/orders/${id(orderId)}/actions`, "POST", input),
    notes: (orderId, notes) => request(`/orders/${id(orderId)}/notes`, "PATCH", { notes }),
    additionQuote: (orderId, lines) => request(`/orders/${id(orderId)}/additions/quote`, "POST", { lines }),
    additions: (orderId, input) => request(`/orders/${id(orderId)}/additions`, "POST", input),
    saveStore: store => request(`/stores/${id(store.id)}`, "PUT", store),
    invite: (storeId, email) => request(`/stores/${id(storeId)}/invitations`, "POST", { email }),
    events: (cursor, storeId) => request(`/events?cursor=${cursor}${storeId ? `&storeId=${id(storeId)}` : ""}`)
  };
}
