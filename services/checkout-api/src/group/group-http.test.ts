// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { GroupSnapshot, IndividualActor } from "@pizzaos/domain";
import type { OrderingService } from "../ordering-contract";
import { buildOrderingApp } from "../http-app";
import { registerGroupOrderingRoutes } from "./group-http";
import type { GroupOrderingService } from "./group-service";

const actor: IndividualActor = { id: "alice", name: "Alice", email: "alice@example.test" };
const snapshot: GroupSnapshot = { id: "group-one", storeId: "store", status: "open", revision: 1, participants: [{ id: "person", name: "Marco", host: false, lines: [] }], role: "participant", participantId: "person" };
const headers = { "x-trusted-proxy": "yes", origin: "https://client.example.test", "x-pizzaos-origin": "https://client.example.test" };
const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

function setup() {
  const unexpected = async (): Promise<never> => { throw new Error("Canonical service must not be called by route adapter test"); };
  const service: OrderingService = { session: unexpected, stores: unexpected, catalog: unexpected, quote: unexpected, checkout: unexpected, orders: unexpected, reconcile: unexpected, action: unexpected, notes: unexpected, additionQuote: unexpected, additions: unexpected, searchStoreAddresses: unexpected, saveStore: unexpected, invite: unexpected, events: unexpected, tick: unexpected };
  const groups: GroupOrderingService = {
    create: vi.fn(async () => ({ ...snapshot, role: "host" as const, inviteToken: "invitation-secret" })),
    read: vi.fn(async () => snapshot),
    join: vi.fn(async () => snapshot),
    context: vi.fn(async () => ({ activeId: snapshot.id, groups: [snapshot] })),
    activate: vi.fn(async () => ({ activeId: snapshot.id, groups: [snapshot] })),
    rename: vi.fn(async () => snapshot),
    replaceLines: vi.fn(async () => snapshot), removeParticipant: vi.fn(async () => snapshot), close: vi.fn(async () => ({ ...snapshot, status: "closed" as const })),
    quote: vi.fn(unexpected), checkout: vi.fn(unexpected), recover: vi.fn(unexpected),
    payShare: vi.fn(unexpected), reconcileShare: vi.fn(unexpected), refundShare: vi.fn(async () => snapshot),
    operations: vi.fn(async () => []), refund: vi.fn(unexpected), tick: vi.fn(async () => undefined)
  };
  const authenticate = vi.fn(async (request: FastifyRequest) => request.headers["x-test-account"] === "alice" ? actor : null);
  const app = buildOrderingApp({ service, authenticate, authorizeProxy: (request) => request.headers["x-trusted-proxy"] === "yes", isDemoRequest: (request) => request.headers["x-demo"] === "yes" });
  registerGroupOrderingRoutes(app, { groups, authenticate }); apps.push(app);
  return { app, groups, authenticate };
}

describe("group HTTP strict boundary", () => {
  it("keeps server-issued personal capability exclusively in a secure HttpOnly cookie and returns only snapshot", async () => {
    const { app, groups } = setup();
    const context = await app.inject({ method: "GET", url: "/v1/pilot/groups/context?storeId=store", headers });
    expect(context.statusCode).toBe(200);
    const cookie = String(context.headers["set-cookie"]);
    const response = await app.inject({ method: "POST", url: "/v1/pilot/groups/group-one/join", headers: { ...headers, cookie: cookie.split(";")[0] }, payload: { inviteToken: "invitation-secret", idempotencyKey: "join" } });
    expect(response.statusCode).toBe(200); expect(response.json()).toEqual(snapshot);
    const capability = cookie.split(";")[0].split("=").slice(1).join("=");
    expect(capability.length).toBeGreaterThan(0);
    expect(response.body).not.toContain(capability);
    for (const flag of ["HttpOnly", "Secure", "Path=/", "SameSite=Lax"]) expect(cookie).toContain(flag);
    expect(cookie).not.toMatch(/Domain=/i); expect(response.headers["cache-control"]).toContain("no-store");
    expect(groups.join).toHaveBeenCalledWith(expect.objectContaining({ actor: null, capability }), "group-one", { inviteToken: "invitation-secret", idempotencyKey: "join" });
  });

  it("reads browser identity from its private server cookie and never from unrelated cookies", async () => {
    const { app, groups } = setup();
    const context = await app.inject({ method: "GET", url: "/v1/pilot/groups/context?storeId=store", headers });
    expect(context.statusCode).toBe(200);
    const identityCookie = String(context.headers["set-cookie"]).split(";")[0];
    const capability = identityCookie.split("=").slice(1).join("=");
    const response = await app.inject({ method: "GET", url: "/v1/pilot/groups/group-one", headers: { ...headers, cookie: `unrelated=wrong; ${identityCookie}` } });
    expect(response.statusCode).toBe(200);
    expect(groups.read).toHaveBeenCalledWith(expect.objectContaining({ actor: null, capability }), "group-one", undefined);
    expect(response.headers["cache-control"]).toContain("no-store");
    await app.inject({ method: "GET", url: "/v1/pilot/groups/group-two", headers: { ...headers, cookie: identityCookie } });
    expect(groups.read).toHaveBeenLastCalledWith(expect.objectContaining({ actor: null, capability }), "group-two", undefined);
  });

  it.each([
    { inviteToken: "invite", actor: { id: "alice" } },
    { inviteToken: "invite", capability: "chosen" },
    { inviteToken: "invite", participantId: "other-person" },
    { name: "Marco", inviteToken: "invite" }, { inviteToken: "invite", lines: "pizza" },
    { inviteToken: 123 }, { inviteToken: "invite", idempotencyKey: 123 },
    { inviteToken: "invite", __proto__: null, customerId: "alice" }
  ])("rejects hostile join payload without invoking domain: %j", async (payload) => {
    const { app, groups } = setup();
    const response = await app.inject({ method: "POST", url: "/v1/pilot/groups/group-one/join", headers, payload });
    expect(response.statusCode).toBe(400); expect(response.json()).toMatchObject({ code: "invalid_input" }); expect(groups.join).not.toHaveBeenCalled();
  });

  it.each([
    { participantId: "person", revision: "1", lines: [] }, { participantId: "person", revision: true, lines: [] },
    { participantId: "person", revision: 1.1, lines: [] }, { participantId: "person", revision: -1, lines: [] },
    { participantId: "person", revision: 1, lines: [], customerId: "alice" },
    { participantId: "person", revision: 1, lines: [{ productId: "pizza", quantity: "2", optionIds: [], notes: "" }] },
    { participantId: "person", revision: 1, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "", priceCents: 1 }] },
    { participantId: "person", revision: 1, lines: [{ productId: "pizza", quantity: 1, optionIds: [123], notes: "" }] },
    { participantId: "person", revision: 1, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: {} }] }
  ])("rejects non-strict line replacement without coercion: %j", async (payload) => {
    const { app, groups } = setup();
    const response = await app.inject({ method: "PUT", url: "/v1/pilot/groups/group-one/lines", headers, payload });
    expect(response.statusCode).toBe(400); expect(groups.replaceLines).not.toHaveBeenCalled();
  });

  it.each([
    ["POST", "/v1/pilot/groups", { storeId: "store", lines: [], idempotencyKey: "create", customerId: "fake" }],
    ["POST", "/v1/pilot/groups/group-one/close", { revision: 1, host: true }],
    ["POST", "/v1/pilot/groups/group-one/remove-participant", { participantId: "person", revision: 1, actor: "alice" }],
    ["POST", "/v1/pilot/groups/group-one/quote", { revision: 1, fulfillment: { mode: "pickup", slotId: null, notes: "", totalCents: 1 } }],
    ["POST", "/v1/pilot/groups/group-one/checkout", { revision: 1, fingerprint: "quote", fulfillment: { mode: "pickup", slotId: null, notes: "" }, phone: "3331234567", method: "cash", idempotencyKey: "key", customerId: "fake" }],
    ["POST", "/v1/pilot/groups/group-one/recover", { idempotencyKey: "replacement" }]
  ] as const)("rejects authoritative extra fields at %s %s", async (method, url, payload) => {
    const { app } = setup();
    const response = await app.inject({ method, url, headers, payload }); expect(response.statusCode).toBe(400);
  });

  it("inherits proxy, canonical Origin and demo protection before group service", async () => {
    const { app, groups } = setup();
    const payload = { inviteToken: "invite" };
    for (const invalidHeaders of [{ ...headers, "x-trusted-proxy": "no" }, { ...headers, origin: "https://attacker.example.test" }, { ...headers, "x-demo": "yes" }]) {
      const response = await app.inject({ method: "POST", url: "/v1/pilot/groups/group-one/join", headers: invalidHeaders, payload });
      expect(response.statusCode).toBe(403);
    }
    expect(groups.join).not.toHaveBeenCalled();
    const response = await app.inject({ method: "DELETE", url: "/v1/pilot/groups/group-one", headers }); expect(response.statusCode).toBe(404);
  });

  it("passes server-authenticated identity and preserves structured conflict errors", async () => {
    const { app, groups } = setup();
    vi.mocked(groups.close).mockRejectedValueOnce(Object.assign(new Error("Ricarica il gruppo"), { code: "revision_conflict", statusCode: 409 }));
    const response = await app.inject({ method: "POST", url: "/v1/pilot/groups/group-one/close", headers: { ...headers, "x-test-account": "alice" }, payload: { revision: 1 } });
    expect(response.statusCode).toBe(409); expect(response.json()).toEqual({ code: "revision_conflict", message: "Ricarica il gruppo", requestId: response.headers["x-request-id"] });
    expect(groups.close).toHaveBeenCalledWith(expect.objectContaining({ actor, capability: expect.any(String) }), "group-one", { revision: 1 });
  });
  it("passes only validated opaque network keys to the service for shared antiabuse limits", async () => {
    const { app, groups } = setup();
    const networkKey = "a".repeat(64);
    await app.inject({ method: "GET", url: "/v1/pilot/groups/context?storeId=store", headers: { ...headers, "x-pizzaos-client-network": networkKey } });
    expect(groups.context).toHaveBeenLastCalledWith(expect.objectContaining({ networkKey }), "store");
    await app.inject({ method: "GET", url: "/v1/pilot/groups/context?storeId=store", headers: { ...headers, "x-pizzaos-client-network": "raw-address-or-malformed" } });
    expect(groups.context).toHaveBeenLastCalledWith(expect.objectContaining({ networkKey: expect.stringMatching(/^[a-f0-9]{64}$/) }), "store");
    expect(vi.mocked(groups.context).mock.calls.at(-1)?.[0].networkKey).not.toBe("raw-address-or-malformed");
  });

});
