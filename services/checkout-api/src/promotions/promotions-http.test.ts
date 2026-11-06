import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildOrderingApp } from "../http-app";
import { registerPromotionRoutes } from "./index";
import { cart, coupon, customer, fixture, operator, otherCustomer, outsider, root } from "./promotions.test-fixture";

const applications: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(applications.splice(0).map(app => app.close())); });
const actors = [operator, customer, otherCustomer, outsider, root];
async function setup() {
  const f = await fixture();
  const authenticate = async (request: { headers: Record<string, unknown> }) => actors.find(actor => actor.id === request.headers["x-test-actor"]) ?? null;
  const app = buildOrderingApp({ service: f.service, authenticate, authorizeProxy: request => request.headers["x-test-proxy"] === "authorized", isDemoRequest: request => request.headers["x-test-demo"] === "true" });
  registerPromotionRoutes(app, { promotions: f.promotions, authenticate });
  applications.push(app);
  await app.ready();
  const headers = { "x-test-actor": operator.id, "x-test-proxy": "authorized", origin: "http://localhost:3602", "x-pizzaos-origin": "http://localhost:3602" };
  return { ...f, app, headers };
}

describe("HTTP coupon e wallet", () => {
  it("legge configurazione e wallet no-store con identità server", async () => {
    const f = await setup();
    const configuration = await f.app.inject({ method: "GET", url: "/v1/pilot/stores/store-a/promotions", headers: f.headers });
    expect(configuration.statusCode).toBe(200);
    expect(configuration.headers["cache-control"]).toContain("no-store");
    expect(configuration.json()).toMatchObject({ program: { rewardPoints: 100, rewardCents: 500 }, coupons: [] });
    const wallet = await f.app.inject({ method: "GET", url: "/v1/pilot/stores/store-a/loyalty", headers: { ...f.headers, "x-test-actor": customer.id } });
    expect(wallet.statusCode).toBe(200);
    expect(wallet.headers["cache-control"]).toContain("no-store");
    expect(wallet.json()).toMatchObject({ balancePoints: 0, availablePoints: 0 });
  });

  it.each([undefined, customer.id, outsider.id])("configurazione rifiuta identità non autorizzata %s", async id => {
    const f = await setup();
    const result = await f.app.inject({ method: "GET", url: "/v1/pilot/stores/store-a/promotions", headers: { ...f.headers, "x-test-actor": id ?? "guest" } });
    expect(result.statusCode).toBe(id ? 403 : 401);
  });

  it("non concede un wallet diverso con customerId e non espone movimenti altrui", async () => {
    const f = await setup();
    await f.earn();
    const result = await f.app.inject({ method: "GET", url: `/v1/pilot/stores/store-a/loyalty?customerId=${customer.id}`, headers: { ...f.headers, "x-test-actor": otherCustomer.id } });
    expect([200, 400]).toContain(result.statusCode);
    if (result.statusCode === 200) expect(result.json()).toMatchObject({ balancePoints: 0, movements: [] });
  });

  it.each([
    { value: "500" }, { active: "true" }, { globalLimit: "2" }, { value: 1.2 }, { discountCents: 100 }, { customerId: "other" }, { id: "arbitrary" }, { revision: 0 },
  ])("non coercisce né scarta proprietà extra coupon: %j", async tampering => {
    const f = await setup();
    const result = await f.app.inject({ method: "POST", url: "/v1/pilot/stores/store-a/promotions/coupons", headers: f.headers, payload: { ...coupon(), ...tampering } });
    expect(result.statusCode).toBe(400);
    expect(result.json()).toMatchObject({ code: "invalid_input" });
    expect((await f.promotions.configuration(operator, "store-a")).coupons).toEqual([]);
  });

  it.each([{ enabled: "false" }, { pointsPerEuro: "2" }, { rewardCents: 5.5 }, { balancePoints: 99999 }, { customerId: "other" }])("rifiuta programma non esatto: %j", async tampering => {
    const f = await setup();
    const program = (await f.promotions.configuration(operator, "store-a")).program;
    const result = await f.app.inject({ method: "PUT", url: "/v1/pilot/stores/store-a/promotions/program", headers: f.headers, payload: { ...program, ...tampering } });
    expect(result.statusCode).toBe(400);
    expect(result.json()).toMatchObject({ code: "invalid_input" });
  });

  it("rifiuta selezione checkout con importi, identità o tipi coercibili", async () => {
    const f = await setup();
    for (const benefits of [{ couponCodes: [], redeemReward: "true" }, { couponCodes: [], redeemReward: false, customerId: "other" }, { couponCodes: [], redeemReward: false, redeemedPoints: 1 }, { couponCodes: [1], redeemReward: false }]) {
      const response = await f.app.inject({ method: "POST", url: "/v1/pilot/quote", headers: { ...f.headers, "x-test-actor": customer.id }, payload: { cart: { ...cart(), benefits } } });
      expect(response.statusCode).toBe(400);
    }
  });

  it("nega proxy non autorizzato e sessione demo anche alle nuove route", async () => {
    const f = await setup();
    for (const url of ["/v1/pilot/stores/store-a/promotions", "/v1/pilot/stores/store-a/loyalty"]) {
      const proxy = await f.app.inject({ method: "GET", url, headers: { ...f.headers, "x-test-proxy": "wrong" } });
      expect([401, 403]).toContain(proxy.statusCode);
      const demo = await f.app.inject({ method: "GET", url, headers: { ...f.headers, "x-test-demo": "true" } });
      expect(demo.statusCode).toBe(403);
      expect(demo.json()).toMatchObject({ code: "demo_session" });
    }
  });

  it("mantiene accesso guest al preventivo privo di selezione", async () => {
    const f = await setup();
    const response = await f.app.inject({ method: "POST", url: "/v1/pilot/quote", headers: { "x-test-proxy": "authorized", origin: "http://localhost:3601" }, payload: { cart: cart() } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ totalCents: 2000 });
  });
});


  it("mutazioni richiedono Origin uguale all'origine canonica del proxy", async () => {
    const f = await setup();
    for (const origin of ["http://attacker.invalid", "null"]) {
      const response = await f.app.inject({ method: "POST", url: "/v1/pilot/stores/store-a/promotions/coupons", headers: { ...f.headers, origin }, payload: coupon() });
      expect(response.statusCode).toBe(403);
    }
    const valid = await f.app.inject({ method: "POST", url: "/v1/pilot/stores/store-a/promotions/coupons", headers: f.headers, payload: coupon() });
    expect([200, 201]).toContain(valid.statusCode);
  });
