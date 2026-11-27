import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { GroupOrderingApi, IndividualActor } from "@pizzaos/domain";
import { GroupOrderingError, validateGroupInput, type GroupAccess, type GroupOrderingService } from "./group-service";

/** One private browser identity across memberships; never a token in JSON or localStorage. */
export function registerGroupOrderingRoutes(app: FastifyInstance, options: { groups: GroupOrderingService; authenticate: (request: FastifyRequest) => Promise<IndividualActor | null> }): void {
  const base = "/v1/pilot/groups";
  async function access(request: FastifyRequest, reply: FastifyReply): Promise<GroupAccess> {
    const raw = request.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith("pizzaos-group-access="))?.slice("pizzaos-group-access=".length);
    let capability: string | undefined;
    if (raw) { try { const value = decodeURIComponent(raw); if (/^[A-Za-z0-9_-]{32,100}$/.test(value)) capability = value; } catch { /* Invalid cookies grant no access. */ } }
    if (!capability) { capability = randomBytes(32).toString("base64url"); reply.header("set-cookie", `pizzaos-group-access=${capability}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${String(request.headers["x-pizzaos-origin"]).startsWith("https:") ? "; Secure" : ""}`); }
    const trustedNetwork = request.headers["x-pizzaos-client-network"];
    const networkKey = typeof trustedNetwork === "string" && /^[a-f0-9]{64}$/.test(trustedNetwork) ? trustedNetwork : createHash("sha256").update(`group-peer:${request.ip}`).digest("hex");
    return { actor: await options.authenticate(request), capability, networkKey };
  }
  app.register(async routes => {
    routes.addHook("onRequest", async (request, reply) => {
      reply.header("cache-control", "no-store");
      if (request.method !== "GET") {
        const canonical = request.headers["x-pizzaos-origin"];
        if (typeof canonical !== "string" || request.headers.origin !== canonical) throw new GroupOrderingError("forbidden", 403, "Origine non consentita.");
        try { if (new URL(canonical).origin !== canonical) throw new Error("origin"); } catch { throw new GroupOrderingError("forbidden", 403, "Origine non consentita."); }
      }
    });
    routes.addHook("preValidation", async request => {
      if (request.method === "GET") return;
      const route = request.routeOptions.url;
      const operations: Record<string, keyof GroupOrderingApi | "refund"> = {
        [base]: "create", [`${base}/context`]: "activate", [`${base}/:id/join`]: "join", [`${base}/:id/name`]: "rename",
        [`${base}/:id/lines`]: "replaceLines", [`${base}/:id/remove-participant`]: "removeParticipant", [`${base}/:id/close`]: "close",
        [`${base}/:id/quote`]: "quote", [`${base}/:id/checkout`]: "checkout", [`${base}/:id/recover`]: "recover",
        [`${base}/:id/pay-share`]: "payShare", [`${base}/:id/payments/:paymentId/reconcile`]: "reconcileShare",
        [`${base}/:id/refund-share`]: "refundShare", [`${base}/:id/refund`]: "refund"
      };
      if (route && Object.hasOwn(operations, route)) validateGroupInput(operations[route], request.body);
    });
    routes.get<{ Querystring: { storeId: string } }>(`${base}/context`, async (request, reply) => {
      if (typeof request.query.storeId !== "string" || Object.keys(request.query).some(key => key !== "storeId")) throw new GroupOrderingError("invalid_input", 400, "Sede non valida.");
      return options.groups.context(await access(request, reply), request.query.storeId);
    });
    routes.post<{ Body: { storeId: string; groupId: string | null } }>(`${base}/context`, async (request, reply) => options.groups.activate(await access(request, reply), request.body.storeId, request.body.groupId));
    routes.post<{ Body: Parameters<GroupOrderingApi["create"]>[0] }>(base, async (request, reply) => options.groups.create(await access(request, reply), request.body));
    routes.get<{ Params: { id: string }; Querystring: { inviteToken?: string } }>(`${base}/:id`, async (request, reply) => {
      if (Object.keys(request.query).some(key => key !== "inviteToken") || (request.query.inviteToken !== undefined && typeof request.query.inviteToken !== "string")) throw new GroupOrderingError("invalid_input", 400, "Invito non valido.");
      return options.groups.read(await access(request, reply), request.params.id, request.query.inviteToken);
    });
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["join"]>[1] }>(`${base}/:id/join`, async (request, reply) => options.groups.join(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["rename"]>[1] }>(`${base}/:id/name`, async (request, reply) => options.groups.rename(await access(request, reply), request.params.id, request.body));
    routes.put<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["replaceLines"]>[1] }>(`${base}/:id/lines`, async (request, reply) => options.groups.replaceLines(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["removeParticipant"]>[1] }>(`${base}/:id/remove-participant`, async (request, reply) => options.groups.removeParticipant(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["close"]>[1] }>(`${base}/:id/close`, async (request, reply) => options.groups.close(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["quote"]>[1] }>(`${base}/:id/quote`, async (request, reply) => options.groups.quote(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["checkout"]>[1] }>(`${base}/:id/checkout`, async (request, reply) => options.groups.checkout(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string } }>(`${base}/:id/recover`, async (request, reply) => options.groups.recover(await access(request, reply), request.params.id));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["payShare"]>[1] }>(`${base}/:id/pay-share`, async (request, reply) => options.groups.payShare(await access(request, reply), request.params.id, request.body));
    routes.post<{ Params: { id: string; paymentId: string } }>(`${base}/:id/payments/:paymentId/reconcile`, async (request, reply) => options.groups.reconcileShare(await access(request, reply), request.params.id, request.params.paymentId));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["refundShare"]>[1] }>(`${base}/:id/refund-share`, async (request, reply) => options.groups.refundShare(await access(request, reply), request.params.id, request.body));
    routes.get<{ Params: { id: string } }>("/v1/pilot/stores/:id/groups", async request => options.groups.operations(await options.authenticate(request), request.params.id));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingService["refund"]>[2] }>(`${base}/:id/refund`, async request => options.groups.refund(await options.authenticate(request), request.params.id, request.body));
  });
}
