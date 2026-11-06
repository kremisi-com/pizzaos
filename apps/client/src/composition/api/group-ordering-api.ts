import type { GroupOrderingApi } from "@pizzaos/domain";
import { IndividualApiError } from "./individual-api";

/** Same-origin transport; personal capabilities remain exclusively in HttpOnly cookies. */
export function createGroupOrderingApi(): GroupOrderingApi {
  const base = "/api/pilot/v1/pilot/groups";
  async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const response = await fetch(`${base}${path}`, {
      method, credentials: "same-origin", cache: "no-store",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null);
      const error = value && typeof value === "object" ? value as Record<string, unknown> : {};
      throw new IndividualApiError(typeof error.code === "string" ? error.code : "service_unavailable",
        typeof error.message === "string" ? error.message : "Il servizio non è disponibile. Riprova tra poco.");
    }
    return response.json() as Promise<T>;
  }
  const id = encodeURIComponent;
  return {
    create: input => request("", "POST", input),
    read: (groupId, inviteToken) => request(`/${id(groupId)}${inviteToken ? `?inviteToken=${id(inviteToken)}` : ""}`),
    join: (groupId, input) => request(`/${id(groupId)}/join`, "POST", input),
    replaceLines: (groupId, input) => request(`/${id(groupId)}/lines`, "PUT", input),
    removeParticipant: (groupId, input) => request(`/${id(groupId)}/remove-participant`, "POST", input),
    close: (groupId, input) => request(`/${id(groupId)}/close`, "POST", input),
    quote: (groupId, input) => request(`/${id(groupId)}/quote`, "POST", input),
    checkout: (groupId, input) => request(`/${id(groupId)}/checkout`, "POST", input),
    recover: groupId => request(`/${id(groupId)}/recover`, "POST", {})
  };
}
