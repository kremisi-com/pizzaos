import type { FastifyInstance, FastifyRequest } from "fastify";
import type { GroupOrderingApi, IndividualActor } from "@pizzaos/domain";
import { GroupOrderingError, validateGroupInput, type GroupAccess, type GroupOrderingService } from "./group-service";

export function registerGroupOrderingRoutes(app: FastifyInstance, options: { groups: GroupOrderingService; authenticate: (request: FastifyRequest) => Promise<IndividualActor | null> }): void {
  const base = "/v1/pilot/groups";
  const cookieName = (id: string) => `pizzaos-group-${encodeURIComponent(id)}`;
  const access = async (request: FastifyRequest, id: string): Promise<GroupAccess> => {
    const name = cookieName(id); let capability: string | undefined;
    const raw = request.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1);
    if (raw) { try { capability = decodeURIComponent(raw); } catch { /* A malformed cookie grants no capability. */ } }
    return { actor: await options.authenticate(request), ...(capability ? { capability } : {}) };
  };
  app.register(async routes => {
    routes.addHook("onRequest", async (request, reply) => {
      reply.header("cache-control", "no-store");
      if (request.method !== "GET") {
        const canonical = request.headers["x-pizzaos-origin"];
        if (typeof canonical !== "string" || request.headers.origin !== canonical) throw new GroupOrderingError("forbidden", 403, "Origine non consentita.");
        try { if (new URL(canonical).origin !== canonical) throw new Error("origin"); }
        catch { throw new GroupOrderingError("forbidden", 403, "Origine non consentita."); }
      }
    });
    routes.addHook("preValidation", async request => {
      if (request.method === "GET") return;
      const route = request.routeOptions.url;
      const operations: Record<string, keyof GroupOrderingApi> = {
        [base]: "create", [`${base}/:id/join`]: "join", [`${base}/:id/lines`]: "replaceLines",
        [`${base}/:id/remove-participant`]: "removeParticipant", [`${base}/:id/close`]: "close",
        [`${base}/:id/quote`]: "quote", [`${base}/:id/checkout`]: "checkout", [`${base}/:id/recover`]: "recover"
      };
      if (route && Object.hasOwn(operations, route)) validateGroupInput(operations[route], request.body);
    });
    routes.post<{ Body: Parameters<GroupOrderingApi["create"]>[0] }>(base, async request => options.groups.create(await options.authenticate(request), request.body));
    routes.get<{ Params: { id: string }; Querystring: { inviteToken?: string } }>(`${base}/:id`, async request => {
      if (Object.keys(request.query).some(key => key !== "inviteToken") || (request.query.inviteToken !== undefined && typeof request.query.inviteToken !== "string")) throw new GroupOrderingError("invalid_input", 400, "Invito non valido.");
      return options.groups.read(await access(request, request.params.id), request.params.id, request.query.inviteToken);
    });
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["join"]>[1] }>(`${base}/:id/join`, async (request, reply) => {
      const result = await options.groups.join(await access(request, request.params.id), request.params.id, request.body);
      reply.header("set-cookie", `${cookieName(request.params.id)}=${encodeURIComponent(result.capability)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${String(request.headers["x-pizzaos-origin"]).startsWith("https:") ? "; Secure" : ""}`);
      return result.group;
    });
    routes.put<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["replaceLines"]>[1] }>(`${base}/:id/lines`, async request => options.groups.replaceLines(await access(request, request.params.id), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["removeParticipant"]>[1] }>(`${base}/:id/remove-participant`, async request => options.groups.removeParticipant(await access(request, request.params.id), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["close"]>[1] }>(`${base}/:id/close`, async request => options.groups.close(await access(request, request.params.id), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["quote"]>[1] }>(`${base}/:id/quote`, async request => options.groups.quote(await access(request, request.params.id), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Parameters<GroupOrderingApi["checkout"]>[1] }>(`${base}/:id/checkout`, async request => options.groups.checkout(await access(request, request.params.id), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: Record<string, never> }>(`${base}/:id/recover`, async request => {
      if (!request.body || typeof request.body !== "object" || Array.isArray(request.body) || Object.keys(request.body).length) throw new GroupOrderingError("invalid_input", 400, "Controlla i dati inseriti.");
      return options.groups.recover(await access(request, request.params.id), request.params.id);
    });
  });
}
