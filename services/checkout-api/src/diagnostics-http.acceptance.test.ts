// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { createDiagnostics, type DiagnosticEvent } from "./diagnostics";
import { buildOrderingApp } from "./http-app";
import type { OrderingService } from "./ordering-contract";

const closeApps: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(closeApps.splice(0).map((close) => close()));
});

function fakeService(overrides: Partial<OrderingService> = {}): OrderingService {
  const unused = async (): Promise<never> => { throw new Error("Unexpected test service call"); };
  return {
    session: unused, stores: async () => [], catalog: unused, quote: unused,
    checkout: unused, orders: unused, reconcile: unused, action: unused, notes: unused,
    additionQuote: unused, additions: unused, searchStoreAddresses: unused,
    saveStore: unused, invite: unused, events: unused, tick: unused,
    ...overrides,
  };
}

async function fixture(options: {
  service?: OrderingService;
  webhook?: (body: Buffer, signature: string) => Promise<void>;
  authorizeProxy?: () => boolean;
} = {}) {
  const events: DiagnosticEvent[] = [];
  const lines: string[] = [];
  const diagnostics = createDiagnostics({
    stream: { write: (line) => { lines.push(line); } },
    reporter: { capture: (event) => { events.push(event); }, flush: async () => {} },
    environment: "acceptance", release: "release-http",
  });
  const app = await buildOrderingApp({
    service: options.service ?? fakeService(), authenticate: async () => null, diagnostics,
    ...(options.webhook ? { webhook: options.webhook } : {}),
    ...(options.authorizeProxy ? { authorizeProxy: options.authorizeProxy } : {}),
  });
  closeApps.push(() => app.close());
  return { app, events, lines };
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("HTTP diagnostic acceptance", () => {
  it("creates a new UUID even when the caller supplies x-request-id", async () => {
    const { app } = await fixture();
    const response = await app.inject({ method: "GET", url: "/health", headers: { "x-request-id": "caller-private-secret" } });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toMatch(uuid);
    expect(response.headers["x-request-id"]).not.toBe("caller-private-secret");
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("returns one sanitized error event and a distinct completion with duration", async () => {
    const { app, events, lines } = await fixture({ service: fakeService({ stores: async () => { throw new Error("password-private-secret"); } }) });
    const response = await app.inject({ method: "GET", url: "/v1/pilot/stores?email=customer-private-secret", headers: { authorization: "Bearer token-private-secret", cookie: "session=cookie-private-secret" } });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ code: "internal_error", requestId: response.headers["x-request-id"] });
    expect(response.headers["x-request-id"]).toMatch(uuid);
    expect(response.json<{ message: string }>().message.length).toBeGreaterThan(0);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ requestId: response.headers["x-request-id"], method: "GET", route: "/v1/pilot/stores", statusCode: 500, category: "unexpected", code: "internal_error" });
    const completions = lines.map((line): unknown => JSON.parse(line)).filter((line): line is { code: string; statusCode: number; durationMs: number; requestId: string } => typeof line === "object" && line !== null && "code" in line && line.code === "http_completed");
    expect(completions).toHaveLength(1);
    expect(completions[0]).toMatchObject({ statusCode: 500, requestId: response.headers["x-request-id"] });
    expect(completions[0]?.durationMs).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify({ events, lines, body: response.body })).not.toContain("private-secret");
  });

  it("preserves transient dependency failures as 503", async () => {
    const { app, events } = await fixture({ service: fakeService({ stores: async () => { throw Object.assign(new Error("postgres-password-secret"), { code: "ECONNREFUSED" }); } }) });
    const response = await app.inject({ method: "GET", url: "/v1/pilot/stores" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ code: "service_unavailable", requestId: response.headers["x-request-id"] });
    expect(events).toHaveLength(1);
    expect(events[0]?.category).toBe("dependency");
  });

  it("records the route template for a route with a dynamic path parameter", async () => {
    const { app, events } = await fixture({ service: fakeService({ catalog: async () => { throw new Error("catalog-private-secret"); } }) });
    const response = await app.inject({ method: "GET", url: "/v1/pilot/stores/store-opaque-123?token=query-private-secret" });
    expect(response.statusCode).toBe(500);
    expect(events).toHaveLength(1);
    expect(events[0]?.route).toMatch(/^\/v1\/pilot\/stores\/:[^/]+$/);
    expect(events[0]?.route).not.toContain("store-opaque-123");
    expect(JSON.stringify(events)).not.toContain("private-secret");
  });

  it("keeps validation, missing routes and proxy denials correlated without reporting them", async () => {
    const { app, events } = await fixture();
    const validation = await app.inject({ method: "POST", url: "/v1/pilot/quote", payload: { cart: null } });
    const missing = await app.inject({ method: "GET", url: "/not-found" });
    expect(validation.statusCode).toBe(400);
    expect(validation.json()).toMatchObject({ code: "invalid_input", requestId: validation.headers["x-request-id"] });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toHaveProperty("requestId", missing.headers["x-request-id"]);
    expect(validation.headers["x-request-id"]).toMatch(uuid);
    expect(missing.headers["x-request-id"]).toMatch(uuid);
    const denied = await fixture({ authorizeProxy: () => false });
    const forbidden = await denied.app.inject({ method: "GET", url: "/v1/pilot/stores" });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json()).toHaveProperty("requestId", forbidden.headers["x-request-id"]);
    expect(forbidden.headers["x-request-id"]).toMatch(uuid);
    expect(events).toHaveLength(0);
    expect(denied.events).toHaveLength(0);
  });

  it("preserves unsupported media type and excessive body statuses", async () => {
    const { app, events } = await fixture();
    const media = await app.inject({ method: "POST", url: "/v1/pilot/quote", headers: { "content-type": "application/x-unknown" }, payload: "private-secret" });
    const large = await app.inject({ method: "POST", url: "/v1/pilot/quote", payload: { cart: null, padding: "x".repeat(2 * 1024 * 1024) } });
    expect(media.statusCode).toBe(415);
    expect(large.statusCode).toBe(413);
    for (const response of [media, large]) {
      expect(response.json()).toHaveProperty("requestId", response.headers["x-request-id"]);
      expect(response.headers["x-request-id"]).toMatch(uuid);
    }
    expect(events).toHaveLength(0);
  });

  it("keeps concurrent failing requests distinct in responses and diagnostics", async () => {
    const { app, events } = await fixture({ service: fakeService({ stores: async () => { await Promise.resolve(); throw new Error("private-secret"); } }) });
    const responses = await Promise.all([app.inject({ method: "GET", url: "/v1/pilot/stores" }), app.inject({ method: "GET", url: "/v1/pilot/stores" })]);
    const ids = responses.map((response) => response.headers["x-request-id"]);
    expect(new Set(ids).size).toBe(2);
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.requestId).sort()).toEqual([...ids].sort());
    for (const response of responses) expect(response.json()).toHaveProperty("requestId", response.headers["x-request-id"]);
  });
});

describe("Stripe webhook failure contract", () => {
  it("preserves original webhook bytes and signature", async () => {
    const received: { body: Buffer; signature: string }[] = [];
    const { app } = await fixture({ webhook: async (body, signature) => { received.push({ body, signature }); } });
    const raw = Buffer.from('{ "type" : "invoice.created", "amount": 1 }\n');
    const response = await app.inject({ method: "POST", url: "/v1/stripe/webhook", headers: { "content-type": "application/json", "stripe-signature": "signature-value" }, payload: raw });
    expect(response.statusCode).toBeGreaterThanOrEqual(200);
    expect(response.statusCode).toBeLessThan(300);
    expect(received).toHaveLength(1);
    expect(received[0]?.body.equals(raw)).toBe(true);
    expect(received[0]?.signature).toBe("signature-value");
  });

  it("returns 400 for missing and explicitly invalid signatures without reporting them", async () => {
    const { app, events } = await fixture({ webhook: async () => { throw { code: "invalid_input", statusCode: 400, message: "Firma non valida" }; } });
    const missing = await app.inject({ method: "POST", url: "/v1/stripe/webhook", payload: {} });
    const invalid = await app.inject({ method: "POST", url: "/v1/stripe/webhook", headers: { "stripe-signature": "private-secret" }, payload: {} });
    for (const response of [missing, invalid]) {
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ code: "invalid_input", requestId: response.headers["x-request-id"] });
    }
    expect(events).toHaveLength(0);
  });

  it.each([{ error: new Error("private-secret"), status: 500, code: "internal_error" }, { error: Object.assign(new Error("private-secret"), { code: "ECONNREFUSED" }), status: 503, code: "service_unavailable" }])("allows webhook retry after internal $status failure", async ({ error, status, code }) => {
    const { app, events, lines } = await fixture({ webhook: async () => { throw error; } });
    const response = await app.inject({ method: "POST", url: "/v1/stripe/webhook", headers: { "stripe-signature": "signature-private-secret" }, payload: { customer: "customer-private-secret" } });
    expect(response.statusCode).toBe(status);
    expect(response.json()).toMatchObject({ code, requestId: response.headers["x-request-id"] });
    expect(events).toHaveLength(1);
    expect(JSON.stringify({ events, lines, body: response.body })).not.toContain("private-secret");
  });
});
