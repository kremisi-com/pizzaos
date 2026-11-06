import type { FastifyInstance, FastifyRequest } from "fastify";
import type { IndividualActor, IndividualOrder, PilotAnalyticsPeriod } from "@pizzaos/domain";
import type { OrderingRepository, OrderingService, OrderingServiceOptions } from "./ordering-contract";
import { createPilotAnalyticsService, withPilotAnalytics, type PilotAnalyticsService } from "./analytics";
import { createDeliveryService, DeliveryError, isRiderProgressAllowed, type DeliveryService } from "./delivery/delivery-service";
import { createOrderingService } from "./ordering-service";

export interface OperationalOrderingService extends OrderingService {
  /** Server-only entry; assignment is checked in the canonical transition transaction. */
  riderProgress(actor: IndividualActor | null, orderId: string, action: "dispatch" | "complete"): Promise<IndividualOrder>;
}

export interface OperationalServices {
  repository: OrderingRepository;
  service: OperationalOrderingService;
  analytics: PilotAnalyticsService;
  delivery: DeliveryService;
}

/** All modules share the same transactional repository, server clock and canonical order. */
export function createOperationalServices(options: OrderingServiceOptions): OperationalServices {
  const repository = withPilotAnalytics(options.repository, options.now);
  const service = createOrderingService({ ...options, repository, authorizeRiderProgress: isRiderProgressAllowed });
  const analytics = createPilotAnalyticsService({ repository, superadminEmails: options.superadminEmails, now: options.now });
  const delivery = createDeliveryService({
    repository,
    superadminEmails: options.superadminEmails,
    now: options.now,
    id: options.id,
    progress: (actor, orderId, action) => service.riderProgress(actor, orderId, action)
  });
  return { repository, service, analytics, delivery };
}

const identifier = { type: "string", minLength: 1, maxLength: 200 };
const orderParams = { type: "object", required: ["id"], additionalProperties: false, properties: { id: identifier } };
const emptyBody = { type: "object", additionalProperties: false, properties: {} };

/** Validate JSON field types before Fastify's default Ajv coercion can change them. */
function rawBody(fields: Record<string, "string" | "boolean">) {
  return async (request: FastifyRequest): Promise<void> => {
    const value: unknown = request.body;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new DeliveryError("invalid_input", "Controlla i dati inseriti.");
    const body = value as Record<string, unknown>;
    if (Object.keys(body).some(key => !Object.hasOwn(fields, key))
      || Object.entries(fields).some(([key, kind]) => typeof body[key] !== kind)) {
      throw new DeliveryError("invalid_input", "Controlla i dati inseriti.");
    }
  };
}

/** Call on buildOrderingApp's result before ready/listen; inherits its proxy/auth protections. */
export function registerPilotExtensionRoutes(app: FastifyInstance, options: {
  analytics: PilotAnalyticsService;
  delivery: DeliveryService;
  authenticate(request: FastifyRequest): Promise<IndividualActor | null>;
}): void {
  async function rider(request: FastifyRequest): Promise<IndividualActor> {
    const actor = await options.authenticate(request);
    if (!actor) throw new DeliveryError("unauthorized", "Accedi per continuare.");
    const session = await options.delivery.session(actor);
    if (session.storeIds.length === 0) throw new DeliveryError("forbidden", "Il tuo account non è abilitato come rider.");
    return actor;
  }

  app.get<{ Params: { id: string }; Querystring: { period: PilotAnalyticsPeriod; fromDate?: string; throughDate?: string } }>(
    "/v1/pilot/stores/:id/analytics", {
      schema: {
        params: orderParams,
        querystring: {
          type: "object", required: ["period"], additionalProperties: false,
          properties: {
            period: { type: "string", enum: ["today", "last_7_days", "last_30_days", "custom"] },
            fromDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            throughDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }
          }
        }
      }
    }, async (request, reply) => {
      reply.header("cache-control", "no-store");
      return options.analytics.report(await options.authenticate(request), { ...request.query, storeId: request.params.id });
    }
  );

  app.get("/v1/pilot/rider/session", async (request, reply) => {
    reply.header("cache-control", "no-store");
    return options.delivery.session(await options.authenticate(request));
  });
  app.get("/v1/pilot/rider/deliveries", async (request, reply) => {
    reply.header("cache-control", "no-store");
    return options.delivery.deliveries(await rider(request));
  });

  for (const action of ["dispatch", "complete"] as const) {
    app.post<{ Params: { id: string }; Body: Record<string, never> }>(`/v1/pilot/rider/deliveries/:id/${action}`, {
      preValidation: rawBody({}),
      schema: { params: orderParams, body: emptyBody }
    }, async (request, reply) => {
      await options.delivery[action](await rider(request), request.params.id);
      return reply.code(204).header("cache-control", "no-store").send();
    });
  }
  app.post<{ Params: { id: string }; Body: { note: string } }>("/v1/pilot/rider/deliveries/:id/failure", {
    preValidation: rawBody({ note: "string" }),
    schema: { params: orderParams, body: { type: "object", required: ["note"], additionalProperties: false,
      properties: { note: { type: "string", minLength: 1, maxLength: 2000 } } } }
  }, async (request, reply) => {
    await options.delivery.reportFailure(await rider(request), request.params.id, request.body.note);
    return reply.code(204).header("cache-control", "no-store").send();
  });

  app.get<{ Params: { id: string } }>("/v1/pilot/stores/:id/riders", { schema: { params: orderParams } }, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return options.delivery.riders(await options.authenticate(request), request.params.id);
  });
  app.post<{ Params: { id: string }; Body: { email: string; name: string } }>("/v1/pilot/stores/:id/riders", {
    preValidation: rawBody({ email: "string", name: "string" }),
    schema: { params: orderParams, body: { type: "object", required: ["email", "name"], additionalProperties: false,
      properties: { email: { type: "string", minLength: 1, maxLength: 254 }, name: { type: "string", minLength: 1, maxLength: 120 } } } }
  }, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return options.delivery.inviteRider(await options.authenticate(request), request.params.id, request.body.email, request.body.name);
  });
  app.patch<{ Params: { id: string; riderId: string }; Body: { active: boolean } }>("/v1/pilot/stores/:id/riders/:riderId", {
    preValidation: rawBody({ active: "boolean" }),
    schema: {
      params: { type: "object", required: ["id", "riderId"], additionalProperties: false, properties: { id: identifier, riderId: identifier } },
      body: { type: "object", required: ["active"], additionalProperties: false, properties: { active: { type: "boolean" } } }
    }
  }, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return options.delivery.setRiderActive(await options.authenticate(request), request.params.id, request.params.riderId, request.body.active);
  });
  app.get<{ Params: { id: string } }>("/v1/pilot/stores/:id/deliveries", { schema: { params: orderParams } }, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return options.delivery.assignments(await options.authenticate(request), request.params.id);
  });
  app.put<{ Params: { id: string }; Body: { riderId: string } }>("/v1/pilot/orders/:id/assignment", {
    preValidation: rawBody({ riderId: "string" }),
    schema: { params: orderParams, body: { type: "object", required: ["riderId"], additionalProperties: false, properties: { riderId: identifier } } }
  }, async (request, reply) => {
    await options.delivery.assign(await options.authenticate(request), request.params.id, request.body.riderId);
    return reply.code(204).header("cache-control", "no-store").send();
  });
}
