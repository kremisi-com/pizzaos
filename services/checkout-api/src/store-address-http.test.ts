// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { IndividualActor, IndividualCart, IndividualStore } from "@pizzaos/domain";
import { buildOrderingApp } from "./http-app";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

const owner: IndividualActor = { id: "owner", name: "Titolare", email: "owner@example.test" };
const operator: IndividualActor = { id: "operator", name: "Operatore", email: "operator@example.test" };
const customer: IndividualActor = { id: "customer", name: "Cliente", email: "customer@example.test" };
const first = { address: "Via Roma 10, Roma", latitude: 41.9, longitude: 12.6 };
const second = { address: "Via Roma 20, Roma", latitude: 41.91, longitude: 12.61 };
type Candidate = { address: string; confirmation: string };
const store: IndividualStore = {
  id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true,
  deliveryBands: [{ upToKm: 1, feeCents: 200, minimumCents: 500 }], ingredients: [],
  products: [{ id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }],
  slots: [{ id: "evening", startsAt: "2026-11-06T18:30:00.000Z", capacity: 10 }],
};

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

function fixture() {
  let state: OrderingState = {
    stores: { roma: store, napoli: { ...store, id: "napoli", name: "Napoli" } },
    memberships: [{ storeId: "roma", email: operator.email }], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  let pending = Promise.resolve();
  let now = new Date("2026-11-06T18:00:00.000Z");
  const repository: OrderingRepository = {
    transact(work) {
      const transaction = pending.then(async () => {
        const candidate = structuredClone(state);
        const result = await work(candidate);
        state = candidate;
        return structuredClone(result);
      });
      pending = transaction.then(() => undefined, () => undefined);
      return transaction;
    },
  };
  const search = vi.fn(async (query: string) => query === "Via Roma" ? [first, second] : []);
  const unavailable = async () => { throw new Error("Unexpected payment call"); };
  const options = {
    repository,
    superadminEmails: [owner.email],
    now: () => now,
    payments: { create: unavailable, read: unavailable, cancel: unavailable, refund: unavailable, readRefund: unavailable },
    storeGeocoding: { search, signingSecret: "store-address-integration-test-only-secret" },
  };
  function openApp() {
    const app = buildOrderingApp({
      service: createOrderingService(options),
      authenticate: async request => [owner, operator, customer].find(actor => actor.id === request.headers["x-test-actor"]) ?? null,
    });
    apps.push(app);
    return app;
  }
  const app = openApp();
  const storePath = (id: string) => `/v1/pilot/stores/${id}`;
  const headers = (actor: IndividualActor | null) => actor ? { "x-test-actor": actor.id } : {};
  const searchAddress = (actor: IndividualActor | null, id: string, query = "Via Roma") =>
    app.inject({ method: "POST", url: `${storePath(id)}/address-search`, headers: headers(actor), payload: { query } });
  const save = (actor: IndividualActor | null, id: string, payload: IndividualStore & { addressConfirmation?: string; address?: string }) =>
    app.inject({ method: "PUT", url: storePath(id), headers: headers(actor), payload });
  const read = (actor: IndividualActor | null, id: string, target = app) =>
    target.inject({ method: "GET", url: storePath(id), headers: headers(actor) });
  async function candidates(actor: IndividualActor, id = store.id) {
    const response = await searchAddress(actor, id);
    expect(response.statusCode).toBe(200);
    const matches = response.json<[Candidate, Candidate]>();
    matches.sort((left, right) => left.address.localeCompare(right.address));
    return matches;
  }
  return { app, openApp, search, searchAddress, save, read, candidates, expire: () => { now = new Date("2026-11-07T18:00:00.000Z"); } };
}

describe("store address confirmation over HTTP", () => {
  it("uses the explicitly selected result for persistence and delivery coverage", async () => {
    const f = fixture();
    const candidates = await f.candidates(operator);
    expect(candidates).toEqual([
      { address: first.address, confirmation: expect.any(String) },
      { address: second.address, confirmation: expect.any(String) },
    ]);
    const updated = await f.save(operator, store.id, { ...store, latitude: -12, longitude: -34, addressConfirmation: candidates[1].confirmation });
    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject(second);

    const restarted = f.openApp();
    const privateCatalog = await f.read(operator, store.id, restarted);
    expect(privateCatalog.statusCode).toBe(200);
    expect(privateCatalog.json()).toMatchObject(second);
    const publicCatalog = await f.read(null, store.id, restarted);
    expect(publicCatalog.statusCode).toBe(200);
    expect(publicCatalog.json()).not.toHaveProperty("address");
    expect((await f.read(customer, store.id, restarted)).json()).not.toHaveProperty("address");

    const cart: IndividualCart = {
      storeId: store.id, mode: "delivery", slotId: "evening", notes: "",
      lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "" }],
      address: { text: second.address, latitude: second.latitude, longitude: second.longitude },
    };
    const quote = await restarted.inject({ method: "POST", url: "/v1/pilot/quote", payload: { cart } });
    expect(quote.statusCode).toBe(200);
    expect(quote.json()).toMatchObject({ deliveryCents: 200 });
    cart.address = { text: "Posizione precedente", latitude: store.latitude, longitude: store.longitude };
    const outside = await restarted.inject({ method: "POST", url: "/v1/pilot/quote", payload: { cart } });
    expect(outside.statusCode).toBe(409);
    expect(outside.json()).toMatchObject({ code: "outside_delivery_area" });
  });

  it("authorizes search and writes against the session and store", async () => {
    const f = fixture();
    const newStore = { ...store, id: "torino", name: "Torino" };
    expect((await f.searchAddress(null, store.id)).statusCode).toBe(401);
    expect((await f.searchAddress(customer, store.id)).statusCode).toBe(403);
    expect((await f.searchAddress(operator, "napoli")).statusCode).toBe(403);
    expect((await f.searchAddress(operator, newStore.id)).statusCode).toBe(403);
    expect(f.search).not.toHaveBeenCalled();

    const [result] = await f.candidates(owner, newStore.id);
    const request = { ...newStore, addressConfirmation: result.confirmation };
    expect((await f.save(null, newStore.id, request)).statusCode).toBe(401);
    expect((await f.save(operator, newStore.id, request)).statusCode).toBe(403);
    expect((await f.save(owner, newStore.id, request)).statusCode).toBe(200);
    expect((await f.read(owner, newStore.id)).json()).toMatchObject(first);
  });

  it("rejects tampered, misbound and expired confirmations without modifying the position", async () => {
    const f = fixture();
    const [result] = await f.candidates(owner);
    const confirmation = result.confirmation;
    const tampered = `${confirmation.startsWith("a") ? "b" : "a"}${confirmation.slice(1)}`;
    expect((await f.save(owner, store.id, { ...store, addressConfirmation: tampered })).statusCode).toBe(400);
    expect((await f.save(operator, store.id, { ...store, addressConfirmation: confirmation })).statusCode).toBe(400);
    expect((await f.save(owner, "napoli", { ...store, id: "napoli", addressConfirmation: confirmation })).statusCode).toBe(400);
    f.expire();
    expect((await f.save(owner, store.id, { ...store, addressConfirmation: confirmation })).statusCode).toBe(400);
    const current = (await f.read(owner, store.id)).json();
    expect(current).toMatchObject({ latitude: store.latitude, longitude: store.longitude });
    expect(current).not.toHaveProperty("address");
    expect((await f.read(owner, "napoli")).json()).not.toHaveProperty("address");
  });

  it("keeps a saved position when another confirmation has superseded it or when given a raw address", async () => {
    const f = fixture();
    const [winner, stale] = await f.candidates(operator);
    expect((await f.save(operator, store.id, { ...store, addressConfirmation: winner.confirmation })).statusCode).toBe(200);
    expect((await f.save(operator, store.id, { ...store, addressConfirmation: stale.confirmation })).statusCode).toBe(409);
    expect((await f.save(operator, store.id, { ...store, ...second })).statusCode).toBe(400);
    await f.save(operator, store.id, { ...store, latitude: second.latitude, longitude: second.longitude });
    expect((await f.read(operator, store.id)).json()).toMatchObject(first);

    const [, replacement] = await f.candidates(operator);
    expect((await f.save(operator, store.id, { ...store, addressConfirmation: replacement.confirmation })).statusCode).toBe(200);
    expect((await f.read(operator, store.id)).json()).toMatchObject(second);
  });

  it("preserves coordinates on legacy configuration updates without geocoding", async () => {
    const f = fixture();
    const updated = await f.save(operator, store.id, { ...store, name: "Roma aggiornata" });
    expect(updated.statusCode).toBe(200);
    const current = (await f.read(operator, store.id)).json();
    expect(current).toMatchObject({ name: "Roma aggiornata", latitude: store.latitude, longitude: store.longitude });
    expect(current).not.toHaveProperty("address");
    expect(f.search).not.toHaveBeenCalled();
  });

  it("returns no candidates for an unmatched query and reports an unavailable provider", async () => {
    const f = fixture();
    const empty = await f.searchAddress(operator, store.id, "Località inesistente");
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual([]);
    f.search.mockRejectedValueOnce(new Error("Provider unavailable"));
    expect((await f.searchAddress(operator, store.id)).statusCode).toBe(503);
    expect((await f.read(operator, store.id)).json()).not.toHaveProperty("address");
  });
});
