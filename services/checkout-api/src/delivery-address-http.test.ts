// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { IndividualCart, IndividualStore } from "@pizzaos/domain";
import { createDiagnostics } from "./diagnostics";
import { buildOrderingApp } from "./http-app";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

const store: IndividualStore = {
  id: "torino", name: "Torino", latitude: 45.07, longitude: 7.68, acceptingOrders: true,
  deliveryBands: [{ upToKm: 0.5, feeCents: 150, minimumCents: 500 }, { upToKm: 1, feeCents: 250, minimumCents: 500 }], ingredients: [],
  products: [{ id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }],
  slots: [{ id: "evening", startsAt: "2026-11-23T18:30:00.000Z", capacity: 10 }],
};
const street = { kind: "street", text: "Via Verdi, Torino" } as const;
const address = { kind: "address", text: "Via Verdi 10, Torino", latitude: 45.07, longitude: 7.69 } as const;

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

function fixture(providerConfigured = true) {
  const state: OrderingState = {
    stores: { [store.id]: store }, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  const repository: OrderingRepository = {
    async transact(work) { return work(structuredClone(state)); },
  };
  const payment = async (): Promise<never> => { throw new Error("Unexpected payment call"); };
  const service = createOrderingService({
    repository, superadminEmails: [], now: () => new Date("2026-11-23T18:00:00.000Z"),
    payments: { create: payment, read: payment, cancel: payment, refund: payment, readRefund: payment },
  });
  const search = vi.fn(async (query: string, store: Pick<IndividualStore, "id" | "latitude" | "longitude">) =>
    query === "Via Ver" && store.id === "torino" ? [street, address] : []);
  const options = {
    service,
    authenticate: async () => null,
    authorizeProxy: (request: FastifyRequest) => request.headers["x-test-proxy"] === "trusted",
    diagnostics: createDiagnostics({ level: "silent" }),
    deliveryAddressAutocomplete: providerConfigured ? { search } : undefined,
  };
  const app = buildOrderingApp(options);
  apps.push(app);

  function request(payload: Record<string, unknown>, storeId = store.id, trusted = true) {
    return app.inject({
      method: "POST", url: `/v1/pilot/stores/${storeId}/delivery-address-search`,
      headers: trusted ? { "x-test-proxy": "trusted" } : {}, payload,
    });
  }
  return { app, request, search };
}

describe("customer delivery address search over HTTP", () => {
  it("returns a street and a precise address to a guest through the authorized proxy", async () => {
    const f = fixture();
    const response = await f.request({ query: "  Via Ver  " });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual([street, address]);
    expect(f.search).toHaveBeenCalledOnce();
    expect(f.search).toHaveBeenCalledWith("Via Ver", expect.objectContaining({
      id: store.id, latitude: store.latitude, longitude: store.longitude,
    }));
  });

  it("uses the selected address coordinates to apply the existing delivery band", async () => {
    const f = fixture();
    const response = await f.request({ query: "Via Ver" });
    expect(response.statusCode).toBe(200);
    const selection = response.json<[typeof street, typeof address]>()[1];
    const cart: IndividualCart = {
      storeId: store.id, mode: "delivery", slotId: "evening", notes: "",
      lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "" }],
      address: { text: selection.text, latitude: selection.latitude, longitude: selection.longitude },
    };
    const quote = await f.app.inject({
      method: "POST", url: "/v1/pilot/quote", headers: { "x-test-proxy": "trusted" }, payload: { cart },
    });
    expect(quote.statusCode).toBe(200);
    expect(quote.json()).toMatchObject({ deliveryCents: 250 });
  });

  it("accepts queries with 3 to 200 characters after trimming and returns an empty array for no matches", async () => {
    const f = fixture();
    for (const query of ["  Via ", `  ${"a".repeat(200)}  `]) {
      const response = await f.request({ query });
      expect(response.statusCode).toBe(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json()).toEqual([]);
    }

    expect(f.search).toHaveBeenCalledTimes(2);
  });

  it("rejects missing, non-string and out-of-range queries before any lookup", async () => {
    const f = fixture();
    for (const payload of [{}, { query: 123 }, { query: "   " }, { query: "  Vi  " }, { query: "a".repeat(201) }]) {
      const response = await f.request(payload);
      expect(response.statusCode).toBe(400);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json()).toMatchObject({ code: "invalid_input", message: expect.any(String) });
    }
    expect(f.search).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing store and rejects direct requests", async () => {
    const f = fixture();
    const missing = await f.request({ query: "Via Ver" }, "missing");
    expect(missing.statusCode).toBe(404);
    expect(missing.headers["cache-control"]).toBe("no-store");
    expect(missing.json()).toMatchObject({ code: "not_found", message: expect.any(String) });

    const forbidden = await f.request({ query: "Via Ver" }, store.id, false);
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.headers["cache-control"]).toBe("no-store");
    expect(forbidden.json()).toMatchObject({ code: "forbidden", message: expect.any(String) });
    expect(f.search).not.toHaveBeenCalled();
  });

  it("returns 503 when the provider is missing or temporarily unavailable", async () => {
    const unconfigured = fixture(false);
    const configured = fixture();
    configured.search.mockRejectedValueOnce(new Error("Private provider failure"));

    for (const f of [unconfigured, configured]) {
      const response = await f.request({ query: "Via Ver" });
      expect(response.statusCode).toBe(503);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json()).toMatchObject({ code: "service_unavailable", message: expect.any(String) });
      expect(response.body).not.toContain("Private provider failure");
    }
  });
});
