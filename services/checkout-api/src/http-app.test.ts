// @vitest-environment node
// Independent HTTP acceptance tests: public factory/options and wire contract only.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { IndividualActor } from "@pizzaos/domain";
import type { OrderingService } from "./ordering-contract";
import { buildOrderingApp } from "./http-app";

const customer: IndividualActor = { id: "alice", email: "alice@example.it", name: "Alice" };
const unauthorized = () => Object.assign(new Error("Accesso richiesto"), { code: "unauthorized", statusCode: 401 });
const unavailable = async (): Promise<never> => { throw new Error("Unexpected test service call"); };
function fakeService(): OrderingService {
  return {
    session: vi.fn(async (actor) => ({ actor, superadmin: false, storeIds: [] })),
    stores: vi.fn(async () => []),
    catalog: unavailable,
    quote: unavailable,
    checkout: unavailable,
    additionQuote: unavailable,
    additions: unavailable,
    orders: vi.fn(async (actor) => { if (!actor) throw unauthorized(); return []; }),
    reconcile: unavailable,
    action: unavailable,
    notes: unavailable,
    searchStoreAddresses: unavailable,
    saveStore: unavailable,
    invite: unavailable,
    events: vi.fn(async (actor) => { if (!actor) throw unauthorized(); return { cursor: 0, events: [] }; }),
    tick: vi.fn(async () => undefined),
  };
}
const openApps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(openApps.splice(0).map((app) => app.close())); });

describe("individual ordering HTTP boundary", () => {
  it("allows anonymous session and catalog discovery, denies anonymous order reads", async () => {
    const service = fakeService();
    const app = buildOrderingApp({ service, authenticate: async () => null }); openApps.push(app);
    const session = await app.inject({ method: "GET", url: "/v1/pilot/session" });
    expect(session.statusCode).toBe(200);
    expect(session.json()).toEqual({ actor: null, superadmin: false, storeIds: [] });
    expect((await app.inject({ method: "GET", url: "/v1/pilot/stores" })).statusCode).toBe(200);
    const orders = await app.inject({ method: "GET", url: "/v1/pilot/orders" });
    expect(orders.statusCode).toBe(401);
    expect(orders.json()).toMatchObject({ code: "unauthorized", message: expect.any(String) });
  });

  it("uses authenticated identity without trusting impersonation headers", async () => {
    const service = fakeService();
    const app = buildOrderingApp({ service, authenticate: async (request) => request.headers.cookie === "session=valid" ? customer : null }); openApps.push(app);
    const spoofed = await app.inject({ method: "GET", url: "/v1/pilot/orders", headers: { "x-user-id": customer.id, "x-user-email": customer.email, "x-superadmin": "true" } });
    expect(spoofed.statusCode).toBe(401);
    const authenticated = await app.inject({ method: "GET", url: "/v1/pilot/orders", headers: { cookie: "session=valid", "x-user-id": "someone-else" } });
    expect(authenticated.statusCode).toBe(200);
    expect(service.orders).toHaveBeenLastCalledWith(customer, undefined);
  });

  it("rejects invalid JSON and malformed cart before invoking the service", async () => {
    const service = fakeService();
    const quote = vi.fn(unavailable); service.quote = quote;
    const app = buildOrderingApp({ service, authenticate: async () => customer }); openApps.push(app);
    for (const payload of ["{", JSON.stringify({ cart: null }), JSON.stringify({ cart: { storeId: "roma", lines: "not-an-array" } })]) {
      const response = await app.inject({ method: "POST", url: "/v1/pilot/quote", headers: { "content-type": "application/json" }, payload });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "invalid_input", message: expect.any(String) });
    }
    expect(quote).not.toHaveBeenCalled();
  });

  it("rejects invalid cursor and JSON mutations without the required content type", async () => {
    const service = fakeService();
    const app = buildOrderingApp({ service, authenticate: async () => customer }); openApps.push(app);
    for (const cursor of ["-1", "NaN", "1.5"]) {
      const response = await app.inject({ method: "GET", url: `/v1/pilot/events?cursor=${cursor}` });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "invalid_input" });
    }
    const response = await app.inject({ method: "POST", url: "/v1/pilot/quote", headers: { "content-type": "text/plain" }, payload: "{}" });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
    expect(response.statusCode).toBeLessThan(500);
    expect(response.json()).toMatchObject({ code: "invalid_input" });
  });

  it("blocks mutations rejected by origin authorization", async () => {
    const service = fakeService();
    const app = buildOrderingApp({ service, authenticate: async () => customer, authorizeProxy: () => false }); openApps.push(app);
    const response = await app.inject({ method: "PATCH", url: "/v1/pilot/orders/order-1/notes", headers: { origin: "https://foreign.example", "content-type": "application/json" }, payload: { notes: "Spoof" } });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "forbidden", message: expect.any(String) });
  });

  it("passes original webhook bytes and signature to verification", async () => {
    const service = fakeService();
    const webhook = vi.fn(async (body: Buffer, signature: string) => { void body; void signature; });
    const app = buildOrderingApp({ service, authenticate: async () => null, webhook }); openApps.push(app);
    const raw = '{ "id" : "evt_1", "data": {"value":1} }\n';
    const response = await app.inject({ method: "POST", url: "/v1/stripe/webhook", headers: { "content-type": "application/json", "stripe-signature": "t=123,v1=signed" }, payload: raw });
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
    expect(response.statusCode).toBeLessThan(300);
    expect(webhook).toHaveBeenCalledOnce();
    const args = webhook.mock.calls[0];
    expect(Buffer.isBuffer(args?.[0])).toBe(true);
    expect(args?.[0].toString("utf8")).toBe(raw);
    expect(args?.[1]).toBe("t=123,v1=signed");
  });

  it("maps signature verification failures to a public client error", async () => {
    const service = fakeService();
    const app = buildOrderingApp({ service, authenticate: async () => null, webhook: async () => { throw new Error("Invalid signature"); } }); openApps.push(app);
    const response = await app.inject({ method: "POST", url: "/v1/stripe/webhook", headers: { "content-type": "application/json", "stripe-signature": "bad" }, payload: "{}" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "invalid_input", message: expect.any(String) });
  });
});
