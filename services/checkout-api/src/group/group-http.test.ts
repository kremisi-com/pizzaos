import { afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { GroupSnapshot, IndividualActor } from "@pizzaos/domain";
import type { OrderingService } from "../ordering-contract";
import { buildOrderingApp } from "../http-app";
import { registerGroupOrderingRoutes } from "./group-http";
import type { GroupOrderingService } from "./group-service";

const actor: IndividualActor = { id: "alice", name: "Alice", email: "alice@example.test" };
const snapshot: GroupSnapshot = { id: "group-one", storeId: "store", deadline: "2026-11-05T19:00:00Z", status: "open", revision: 1, participants: [{ id: "person", name: "Marco", host: false, lines: [] }], role: "participant", participantId: "person" };
const headers = { "x-trusted-proxy": "yes", origin: "https://client.example.test", "x-pizzaos-origin": "https://client.example.test" };
const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())); });

function setup() {
  const unexpected = async (): Promise<never> => { throw new Error("Canonical service must not be called by route adapter test"); };
  const service: OrderingService = { session: unexpected, stores: unexpected, catalog: unexpected, quote: unexpected, checkout: unexpected, orders: unexpected, reconcile: unexpected, action: unexpected, notes: unexpected, additionQuote: unexpected, additions: unexpected, searchStoreAddresses: unexpected, saveStore: unexpected, invite: unexpected, events: unexpected, tick: unexpected };
  const groups: GroupOrderingService = {
    create: vi.fn(async () => ({ ...snapshot, role: "host" as const, inviteToken: "invitation-secret" })),
    read: vi.fn(async () => snapshot),
    join: vi.fn(async () => ({ group: snapshot, capability: "personal-capability-secret" })),
    replaceLines: vi.fn(async () => snapshot), removeParticipant: vi.fn(async () => snapshot), close: vi.fn(async () => ({ ...snapshot, status: "closed" as const })),
    quote: vi.fn(unexpected), checkout: vi.fn(unexpected), recover: vi.fn(unexpected), tick: vi.fn(async () => undefined)
  };
  const authenticate = vi.fn(async (request: FastifyRequest) => request.headers["x-test-account"] === "alice" ? actor : null);
  const app = buildOrderingApp({ service, authenticate, authorizeProxy: (request) => request.headers["x-trusted-proxy"] === "yes", isDemoRequest: (request) => request.headers["x-demo"] === "yes" });
  registerGroupOrderingRoutes(app, { groups, authenticate }); apps.push(app);
  return { app, groups, authenticate };
}

describe("group HTTP strict boundary", () => {
  it("keeps personal capability exclusively in a secure HttpOnly per-group cookie and returns only snapshot", async () => {
    const { app, groups } = setup();
    const response = await app.inject({ method: "POST", url: "/v1/pilot/groups/group-one/join", headers, payload: { inviteToken: "invitation-secret", name: "Marco" } });
    expect(response.statusCode).toBe(200); expect(response.json()).toEqual(snapshot);
    expect(response.body).not.toContain("personal-capability-secret");
    const cookie = String(response.headers["set-cookie"]);
    expect(cookie).toContain("pizzaos-group-group-one=personal-capability-secret");
    for (const flag of ["HttpOnly", "Secure", "Path=/", "SameSite=Lax", "Max-Age=604800"]) expect(cookie).toContain(flag);
    expect(cookie).not.toMatch(/Domain=/i); expect(response.headers["cache-control"]).toContain("no-store");
    expect(groups.join).toHaveBeenCalledWith({ actor: null }, "group-one", { inviteToken: "invitation-secret", name: "Marco" });
  });

  it("reads personal identity from only this group's cookie and never from a body identity", async () => {
    const { app, groups } = setup();
    const response = await app.inject({ method: "GET", url: "/v1/pilot/groups/group-one", headers: { ...headers, cookie: "pizzaos-group-other=wrong; pizzaos-group-group-one=personal-capability-secret" } });
    expect(response.statusCode).toBe(200);
    expect(groups.read).toHaveBeenCalledWith({ actor: null, capability: "personal-capability-secret" }, "group-one", undefined);
    expect(response.headers["cache-control"]).toContain("no-store");
    await app.inject({ method: "GET", url: "/v1/pilot/groups/group-two", headers: { ...headers, cookie: "pizzaos-group-group-one=personal-capability-secret" } });
    expect(groups.read).toHaveBeenLastCalledWith({ actor: null }, "group-two", undefined);
  });

  it.each([
    { name: "Marco", inviteToken: "invite", actor: { id: "alice" } },
    { name: "Marco", inviteToken: "invite", capability: "chosen" },
    { name: "Marco", inviteToken: "invite", participantId: "other-person" },
    { name: 123, inviteToken: "invite" }, { name: ["Marco"], inviteToken: "invite" },
    { name: "Marco", inviteToken: 123 }, { name: "", inviteToken: "invite" },
    { name: "Marco", inviteToken: "invite", __proto__: null, customerId: "alice" }
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
    ["POST", "/v1/pilot/groups", { storeId: "store", name: "Alice", deadline: "2026-11-05T19:00:00Z", customerId: "fake" }],
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
    const payload = { inviteToken: "invite", name: "Marco" };
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
    expect(response.statusCode).toBe(409); expect(response.json()).toEqual({ code: "revision_conflict", message: "Ricarica il gruppo" });
    expect(groups.close).toHaveBeenCalledWith({ actor }, "group-one", { revision: 1 });
  });
});
