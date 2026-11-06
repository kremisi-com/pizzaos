import Fastify, { type FastifyRequest } from "fastify";
import type { IndividualActor, IndividualAction, IndividualAdditionRequest, IndividualLine, IndividualCart, IndividualCheckout, IndividualStore } from "@pizzaos/domain";
import type { OrderingService } from "./ordering-contract";
import { OrderingError } from "./ordering-service";
import { normalizePromotionSelection } from "./promotions/selection";

export interface OrderingHttpOptions {
  service: OrderingService;
  authenticate: (request: FastifyRequest) => Promise<IndividualActor | null>;
  authorizeProxy?: (request: FastifyRequest) => boolean;
  authHandler?: (request: FastifyRequest) => Promise<Response>;
  isDemoRequest?: (request: FastifyRequest) => boolean;
  webhook?: (body: Buffer, signature: string) => Promise<void>;
}

const text = { type: "string", minLength: 1, maxLength: 500 };
const notes = { type: "string", maxLength: 2000 };
const cents = { type: "integer", minimum: 0, maximum: 100000000 };
const recipe = { type: "object", additionalProperties: { type: "integer", minimum: 1, maximum: 100000000 } };
const line = { type: "object", additionalProperties: false, required: ["productId", "quantity", "optionIds", "notes"], properties: {
  productId: text, quantity: { type: "integer", minimum: 1, maximum: 100 },
  optionIds: { type: "array", maxItems: 50, uniqueItems: true, items: text }, notes
} };
const cart = { type: "object", additionalProperties: false, required: ["storeId", "lines", "mode", "slotId", "notes"], properties: {
  storeId: text, lines: { type: "array", minItems: 1, maxItems: 100, items: line },
  mode: { enum: ["pickup", "delivery"] }, slotId: { anyOf: [text, { type: "null" }] }, notes,
  benefits: { type: "object", additionalProperties: false, required: ["couponCodes", "redeemReward"], properties: { couponCodes: { type: "array", maxItems: 10, items: { type: "string" } }, redeemReward: { type: "boolean" } } },
  address: { type: "object", additionalProperties: false, required: ["text", "latitude", "longitude"], properties: {
    text, latitude: { type: "number", minimum: -90, maximum: 90 }, longitude: { type: "number", minimum: -180, maximum: 180 }
  } }
} };
const store = { type: "object", additionalProperties: false, required: ["id", "name", "latitude", "longitude", "acceptingOrders", "deliveryBands", "ingredients", "products", "slots"], properties: {
  timeZone: { type: "string", minLength: 1, maxLength: 100 },
  id: text, name: text, contactEmail: { anyOf: [{ type: "string", format: "email", maxLength: 254 }, { const: "" }] }, contactPhone: { type: "string", maxLength: 100 }, latitude: { type: "number", minimum: -90, maximum: 90 }, longitude: { type: "number", minimum: -180, maximum: 180 }, acceptingOrders: { type: "boolean" },
  deliveryBands: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false, required: ["upToKm", "feeCents", "minimumCents"], properties: { upToKm: { type: "number", minimum: 0, maximum: 1000 }, feeCents: cents, minimumCents: cents } } },
  ingredients: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["id", "name", "stock"], properties: { id: text, name: text, stock: { type: "integer", minimum: 0, maximum: 100000000 } } } },
  products: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["id", "name", "description", "priceCents", "available", "allergens", "ingredients", "options"], properties: {
    id: text, name: text, description: notes, priceCents: cents, available: { type: "boolean" }, ingredients: recipe,
    allergens: { type: "array", maxItems: 50, items: text },
    options: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false, required: ["id", "name", "priceCents", "ingredients"], properties: { id: text, name: text, priceCents: cents, ingredients: recipe } } }
  } } },
  slots: { type: "array", maxItems: 2000, items: { type: "object", additionalProperties: false, required: ["id", "startsAt", "capacity"], properties: { id: text, startsAt: { type: "string", format: "date-time" }, capacity: { type: "integer", minimum: 0, maximum: 10000 } } } }
} };

/** HTTP boundary: injectable identity/providers are server wiring, never request-selected. */
export function buildOrderingApp(options: OrderingHttpOptions) {
  const app = Fastify({ logger: false, bodyLimit: 1024 * 1024 });
  const service = options.service;
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ code: "not_found", message: "Percorso non disponibile." }));
  app.setErrorHandler((error, _request, reply) => {
    const failure = error as Error & { code?: string; statusCode?: number; validation?: unknown };
    const known = failure.statusCode && failure.statusCode >= 400 && failure.statusCode < 500;
    const invalid = failure.validation || failure.code?.startsWith("FST_ERR_");
    const status = invalid ? 400 : known ? failure.statusCode! : 503;
    return reply.code(status).send({ code: invalid ? "invalid_input" : known ? failure.code ?? "invalid_input" : "service_unavailable", message: invalid ? "Controlla i dati inseriti." : known ? failure.message : "Servizio temporaneamente non disponibile." });
  });
  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.url === "/v1/stripe/webhook" || request.routeOptions.url === "/health") return;
    if (options.authorizeProxy && !options.authorizeProxy(request)) {
      return reply.code(403).send({ code: "forbidden", message: "Accesso non consentito." });
    }
    // Deny by default outside authentication; raw URL prefixes can be percent-encoded.
    if (!request.url.startsWith("/api/pilot/auth/") && options.isDemoRequest?.(request)) {
      return reply.code(403).header("cache-control", "no-store").send({ code: "demo_session", message: "La demo non può accedere alle operazioni reali." });
    }
  });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/v1/pilot/session", async request => service.session(await options.authenticate(request)));
  app.get("/v1/pilot/stores", async request => service.stores(await options.authenticate(request)));
  app.get<{ Params: { id: string } }>("/v1/pilot/stores/:id", async request => service.catalog(request.params.id, await options.authenticate(request)));
  async function rawEconomicInput(request: FastifyRequest) {
    const body: unknown = request.body;
    const invalid = () => { throw new OrderingError("invalid_input", "Controlla i dati inseriti."); };
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
    const input = body as Record<string, unknown>;
    const allowed = request.routeOptions.url === "/v1/pilot/quote" ? ["cart"] : ["cart", "fingerprint", "phone", "method", "idempotencyKey"];
    if (Object.keys(input).some(key => !allowed.includes(key))) return invalid();
    const rawCart = input.cart;
    if (!rawCart || typeof rawCart !== "object" || Array.isArray(rawCart)) return invalid();
    const cartInput = rawCart as Record<string, unknown>;
    if (Object.keys(cartInput).some(key => !["storeId", "lines", "mode", "slotId", "notes", "address", "benefits"].includes(key))) return invalid();
    if (typeof cartInput.storeId !== "string" || typeof cartInput.notes !== "string" || typeof cartInput.mode !== "string" || (cartInput.slotId !== null && typeof cartInput.slotId !== "string")) return invalid();
    if (allowed.length > 1 && ["fingerprint", "phone", "method", "idempotencyKey"].some(key => typeof input[key] !== "string")) return invalid();
    if (cartInput.benefits !== undefined) { try { normalizePromotionSelection(cartInput.benefits); } catch { return invalid(); } }
    if (Array.isArray(cartInput.lines)) for (const entry of cartInput.lines) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return invalid();
      const row = entry as Record<string, unknown>;
      if (Object.keys(row).some(key => !["productId", "quantity", "optionIds", "notes"].includes(key)) || typeof row.quantity !== "number" || typeof row.productId !== "string" || typeof row.notes !== "string" || !Array.isArray(row.optionIds) || row.optionIds.some(value => typeof value !== "string")) return invalid();
    }
    if (cartInput.address !== undefined) {
      if (!cartInput.address || typeof cartInput.address !== "object" || Array.isArray(cartInput.address)) return invalid();
      const address = cartInput.address as Record<string, unknown>;
      if (Object.keys(address).some(key => !["text", "latitude", "longitude"].includes(key)) || typeof address.text !== "string" || typeof address.latitude !== "number" || typeof address.longitude !== "number") return invalid();
    }
  }
  app.post<{ Body: { cart: IndividualCart } }>("/v1/pilot/quote", { preValidation: rawEconomicInput, schema: { body: { type: "object", required: ["cart"], additionalProperties: false, properties: { cart } } } }, async request => service.quote(request.body.cart, await options.authenticate(request)));
  app.post<{ Body: IndividualCheckout }>("/v1/pilot/checkouts", { preValidation: rawEconomicInput, schema: { body: { type: "object", required: ["cart", "fingerprint", "phone", "method", "idempotencyKey"], additionalProperties: false, properties: { cart, fingerprint: text, phone: text, method: { enum: ["card", "cash"] }, idempotencyKey: text } } } }, async request => service.checkout(await options.authenticate(request), request.body));
  app.get<{ Querystring: { storeId?: string } }>("/v1/pilot/orders", async request => service.orders(await options.authenticate(request), request.query.storeId));
  app.post<{ Params: { id: string } }>("/v1/pilot/orders/:id/reconcile", async request => service.reconcile(await options.authenticate(request), request.params.id));
  app.post<{ Params: { id: string }; Body: { lines: IndividualLine[] } }>("/v1/pilot/orders/:id/additions/quote", { schema: { body: { type: "object", required: ["lines"], additionalProperties: false, properties: { lines: { type: "array", minItems: 1, maxItems: 100, items: line } } } } }, async request => service.additionQuote(await options.authenticate(request), request.params.id, request.body.lines));
  app.post<{ Params: { id: string }; Body: IndividualAdditionRequest }>("/v1/pilot/orders/:id/additions", { schema: { body: { type: "object", required: ["lines", "fingerprint", "idempotencyKey"], additionalProperties: false, properties: { lines: { type: "array", minItems: 1, maxItems: 100, items: line }, fingerprint: text, idempotencyKey: text } } } }, async request => service.additions(await options.authenticate(request), request.params.id, request.body));
  app.post<{ Params: { id: string }; Body: IndividualAction }>("/v1/pilot/orders/:id/actions", { schema: { body: { type: "object", additionalProperties: false, required: ["action"], properties: { action: { enum: ["accept", "wait_for_customer", "cancel", "prepare", "ready", "dispatch", "complete", "retry_refund"] }, unavailableProductIds: { type: "array", uniqueItems: true, maxItems: 100, items: text } } } } }, async request => service.action(await options.authenticate(request), request.params.id, request.body));
  app.patch<{ Params: { id: string }; Body: { notes: string } }>("/v1/pilot/orders/:id/notes", { schema: { body: { type: "object", required: ["notes"], additionalProperties: false, properties: { notes } } } }, async request => service.notes(await options.authenticate(request), request.params.id, request.body.notes));
  app.put<{ Params: { id: string }; Body: IndividualStore }>("/v1/pilot/stores/:id", { schema: { body: store } }, async (request, reply) => {
    if (request.params.id !== request.body.id) return reply.code(400).send({ code: "invalid_input", message: "La sede non corrisponde." });
    return service.saveStore(await options.authenticate(request), request.body);
  });
  app.post<{ Params: { id: string }; Body: { email: string } }>("/v1/pilot/stores/:id/invitations", { schema: { body: { type: "object", additionalProperties: false, required: ["email"], properties: { email: { type: "string", format: "email", maxLength: 254 } } } } }, async (request, reply) => {
    await service.invite(await options.authenticate(request), request.params.id, request.body.email);
    return reply.code(204).send();
  });
  const eventsQuery = { type: "object", properties: { cursor: { type: "integer", minimum: 0 }, storeId: text } };
  app.get<{ Querystring: { cursor?: number; storeId?: string } }>("/v1/pilot/events", { schema: { querystring: eventsQuery } }, async request => service.events(await options.authenticate(request), request.query.cursor ?? 0, request.query.storeId));
  app.get<{ Querystring: { cursor?: number; storeId?: string } }>("/v1/pilot/stream", { schema: { querystring: eventsQuery } }, async (request, reply) => {
    let cursor = request.query.cursor ?? Number(request.headers["last-event-id"] ?? 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) return reply.code(400).send({ code: "invalid_input", message: "Cursore non valido." });
    let actor = await options.authenticate(request);
    const initial = await service.events(actor, cursor, request.query.storeId);
    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    const emit = (payload: typeof initial) => { cursor = payload.cursor; reply.raw.write(`id: ${cursor}\ndata: ${JSON.stringify(payload)}\n\n`); };
    emit(initial);
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        actor = await options.authenticate(request);
        emit(await service.events(actor, cursor, request.query.storeId));
      } catch { reply.raw.end(); } finally { busy = false; }
    }, 2000);
    reply.raw.on("close", () => clearInterval(timer));
  });
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_request, body, done) => done(null, body));
  app.route({ method: ["GET", "POST"], url: "/api/pilot/auth/*", handler: async (request, reply) => {
    if (!options.authHandler) return reply.code(503).send({ code: "service_unavailable", message: "Accesso non configurato." });
    const response = await options.authHandler(request);
    response.headers.forEach((value, name) => { if (name !== "set-cookie") reply.header(name, value); });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) reply.header("set-cookie", cookies);
    return reply.code(response.status).send(await response.text());
  } });
  app.register(async webhookApp => {
    webhookApp.removeContentTypeParser("application/json");
    webhookApp.addContentTypeParser("application/json", { parseAs: "buffer" }, (_request, body, done) => done(null, body));
    webhookApp.post<{ Body: Buffer }>("/v1/stripe/webhook", async (request, reply) => {
      const signature = request.headers["stripe-signature"];
      if (!options.webhook || typeof signature !== "string") return reply.code(400).send({ code: "invalid_input", message: "Firma webhook mancante." });
      try { await options.webhook(request.body, signature); }
      catch { return reply.code(400).send({ code: "invalid_input", message: "Webhook non valido o non elaborato; riprovare." }); }
      return { received: true };
    });
  });
  return app;
}
