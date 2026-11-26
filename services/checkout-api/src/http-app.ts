import Fastify, { LogController, type FastifyRequest, type FastifyBaseLogger } from "fastify";
import { randomUUID } from "node:crypto";
import { classifyFailure, createDiagnostics, type Diagnostics } from "./diagnostics";
import { DELIVERY_ADDRESS_QUERY_MAX_LENGTH, DELIVERY_ADDRESS_QUERY_MIN_LENGTH } from "@pizzaos/domain";
import type { IndividualActor, IndividualAction, IndividualAdditionRequest, IndividualLine, IndividualCart, IndividualCheckout, IndividualStore } from "@pizzaos/domain";
import type { DeliveryAddressAutocomplete } from "./delivery-address-autocomplete";
import type { OrderingService } from "./ordering-contract";
import { OrderingError } from "./ordering-service";
import { normalizePromotionSelection } from "./promotions/selection";
import { registerMenuRoutes } from "./menu-http";
import { validateMenuSelections } from "./menu-catalog";
import { validateMealSelections } from "./product-types";
import type { MenuImages } from "./menu-images";
import { storeAddressLimit } from "./store-address";
import { authorizeOrderingSiteRoute, findOrderingSite, orderingSubdomainForOrigin, type OrderingSite, type OrderingSites } from "./ordering-sites";

export interface OrderingHttpOptions {
  service: OrderingService;
  authenticate: (request: FastifyRequest) => Promise<IndividualActor | null>;
  authorizeProxy?: (request: FastifyRequest) => boolean;
  authHandler?: (request: FastifyRequest) => Promise<Response>;
  isDemoRequest?: (request: FastifyRequest) => boolean;
  webhook?: (body: Buffer, signature: string) => Promise<void>;
  diagnostics?: Diagnostics;
  orderingSites?: OrderingSites;
  deliveryAddressAutocomplete?: DeliveryAddressAutocomplete;
  menuImages?: MenuImages;
}

const deliveryAddressSearch = "/v1/pilot/stores/:id/delivery-address-search";
const text = { type: "string", minLength: 1, maxLength: 500 };
const notes = { type: "string", maxLength: 2000 };
const cents = { type: "integer", minimum: 0, maximum: 100000000 };
const recipe = { type: "object", additionalProperties: { type: ["integer", "null"], minimum: 1, maximum: 100000000 } };
const line = { type: "object", additionalProperties: false, required: ["productId", "quantity", "optionIds", "notes"], properties: {
  kind: { enum: ["product", "pizza_taste", "pizza_formula"] }, productId: text, quantity: { type: "integer", minimum: 1, maximum: 100 },
  optionIds: { type: "array", maxItems: 50, uniqueItems: true, items: text }, notes,
  selections: { type: "array", maxItems: 50, items: { type: "object", additionalProperties: false,
    required: ["optionId", "quantity"], properties: { optionId: text, quantity: { type: "integer", minimum: 1, maximum: 100 } } } },
  mealSelections: { type: "array", maxItems: 30, items: { type: "object", additionalProperties: false,
    required: ["stepId", "productId", "removedIngredientIds", "notes"], properties: { stepId: text, productId: text,
      removedIngredientIds: { type: "array", maxItems: 100, uniqueItems: true, items: text }, notes: { type: "string", maxLength: 1000 } } } }
} };
const cart = { type: "object", additionalProperties: false, required: ["storeId", "lines", "mode", "slotId", "notes"], properties: {
  storeId: text, lines: { type: "array", minItems: 1, maxItems: 100, items: line },
  mode: { enum: ["pickup", "delivery"] }, slotId: { anyOf: [text, { type: "null" }] }, notes,
  benefits: { type: "object", additionalProperties: false, required: ["couponCodes", "redeemReward"], properties: { couponCodes: { type: "array", maxItems: 10, items: { type: "string" } }, redeemReward: { type: "boolean" } } },
  address: { type: "object", additionalProperties: false, required: ["text", "latitude", "longitude"], properties: {
    text, latitude: { type: "number", minimum: -90, maximum: 90 }, longitude: { type: "number", minimum: -180, maximum: 180 }
  } }
} };
const foodLabels = { type: "array", maxItems: 32, uniqueItems: true, items: { type: "string", minLength: 1, maxLength: 100 } };
const food = { type: "object", additionalProperties: false, required: ["contains", "mayContain"], properties: { contains: foodLabels, mayContain: foodLabels } };
const store = { type: "object", additionalProperties: false, required: ["id", "name", "latitude", "longitude", "acceptingOrders", "deliveryBands", "ingredients", "products", "slots"], properties: {
  configurationRevision: { type: "string", pattern: "^[a-f0-9]{64}$" },
  outOfStockBehavior: { enum: ["allow", "disable", "hide"] },
  orderingSubdomain: { type: "string", minLength: 1, maxLength: 63 },
  address: { type: "string", minLength: 1, maxLength: storeAddressLimit },
  addressConfirmation: { type: "string", minLength: 1, maxLength: 4044 },
  orderSchedule: { type: "object", additionalProperties: false, required: ["revision", "days"], properties: {
    revision: { type: "integer", minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    days: { type: "array", minItems: 7, maxItems: 7, items: { type: "object", additionalProperties: false, required: ["weekday", "windows"], properties: {
      weekday: { type: "integer", minimum: 1, maximum: 7 },
      windows: { type: "array", maxItems: 1440, items: { type: "object", additionalProperties: false, required: ["startMinute", "endMinute", "capacity"], properties: {
        startMinute: { type: "integer", minimum: 0, maximum: 1439 }, endMinute: { type: "integer", minimum: 1, maximum: 1440 },
        capacity: { type: "integer", minimum: 0, maximum: 10000 }
      } } }
    } } }
  } },
  timeZone: { type: "string", minLength: 1, maxLength: 100 },
  id: text, name: text, contactEmail: { anyOf: [{ type: "string", format: "email", maxLength: 254 }, { const: "" }] }, contactPhone: { type: "string", maxLength: 100 }, latitude: { type: "number", minimum: -90, maximum: 90 }, longitude: { type: "number", minimum: -180, maximum: 180 }, acceptingOrders: { type: "boolean" },
  deliveryBands: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false, required: ["upToKm", "feeCents", "minimumCents"], properties: { upToKm: { type: "number", minimum: 0, maximum: 1000 }, feeCents: cents, minimumCents: cents } } },
  ingredients: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["id", "name", "stock"], properties: { id: text, name: text, stock: { type: ["integer", "null"], minimum: 0, maximum: 100000000 }, food,
    extra: { type: "object", additionalProperties: false, required: ["enabled", "priceCents", "dose"], properties: {
      enabled: { type: "boolean" }, priceCents: { type: ["integer", "null"], minimum: 0, maximum: 100000000 },
      dose: { type: ["integer", "null"], minimum: 1, maximum: 100000000 }
    } }
  } } },
  products: { type: "array", maxItems: 1000, items: { type: "object", additionalProperties: false, required: ["id", "name", "description", "priceCents", "available", "allergens", "ingredients", "options"], properties: {
    id: text, name: text, description: notes, priceCents: cents, available: { type: "boolean" }, ingredients: recipe,
    productType: { enum: ["pizza", "sandwich", "product", "box", "meal"] }, meal: { type: "object" },
    allergens: { type: "array", maxItems: 50, items: text },
    options: { type: "array", maxItems: 100, items: { type: "object", additionalProperties: false, required: ["id", "name", "priceCents", "ingredients"], properties: { id: text, name: text, priceCents: cents, ingredients: recipe } } }
  } } },
  slots: { type: "array", maxItems: 2000, items: { type: "object", additionalProperties: false, required: ["id", "startsAt", "capacity"], properties: { id: text, startsAt: { type: "string", format: "date-time" }, capacity: { type: "integer", minimum: 0, maximum: 10000 } } } }
} };

/** HTTP boundary: injectable identity/providers are server wiring, never request-selected. */
export function buildOrderingApp(options: OrderingHttpOptions) {
  const diagnostics = options.diagnostics ?? createDiagnostics();
  const app = Fastify({ loggerInstance: diagnostics.logger as FastifyBaseLogger, logController: new LogController({ disableRequestLogging: true }), requestIdHeader: false, genReqId: () => randomUUID(), bodyLimit: 1024 * 1024 });
  const service = options.service;
  const starts = new WeakMap<FastifyRequest, number>();
  const sites = options.orderingSites;
  const requestSites = new WeakMap<FastifyRequest, OrderingSite>();
  const actors = new WeakMap<FastifyRequest, Promise<IndividualActor | null>>();
  function authenticate(request: FastifyRequest) {
    const cached = actors.get(request);
    if (cached) return cached;
    const actor = options.authenticate(request);
    actors.set(request, actor);
    return actor;
  }
  app.addHook("onRequest", (request, reply, done) => {
    starts.set(request, performance.now());
    reply.header("x-request-id", request.id);
    if (request.routeOptions.url === deliveryAddressSearch) reply.header("cache-control", "no-store");
    diagnostics.run({ operation: "http_request", requestId: request.id, method: request.method, route: request.routeOptions.url ?? "/unknown" }, done);
  });
  app.addHook("onResponse", async (request, reply) => {
    diagnostics.record("http_completed", { operation: "http_request", requestId: request.id, method: request.method,
      route: request.routeOptions.url ?? "/unknown", statusCode: reply.statusCode, durationMs: Math.max(0, performance.now() - (starts.get(request) ?? performance.now())) });
  });
  // Covers explicit 4xx replies as well as exceptions, without changing success DTOs.
  app.addHook("preSerialization", async (request, reply, payload) => {
    if (reply.statusCode >= 400 && payload && typeof payload === "object" && "code" in payload && "message" in payload) return { ...payload, requestId: request.id };
    return payload;
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ code: "not_found", message: "Percorso non disponibile." }));
  app.setErrorHandler((error, request, reply) => {
    const failure = classifyFailure(error);
    diagnostics.report(error, { operation: "http_request", requestId: request.id, method: request.method,
      route: request.routeOptions.url ?? "/unknown", statusCode: failure.statusCode });
    return reply.code(failure.statusCode).send({ code: failure.code, message: failure.message, requestId: request.id });
  });
  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.url === "/v1/stripe/webhook" || request.routeOptions.url === "/health") return;
    if (options.authorizeProxy && !options.authorizeProxy(request)) {
      return reply.code(403).send({ code: "forbidden", message: "Accesso non consentito." });
    }
    const origin = request.headers["x-pizzaos-origin"];
    if (sites && typeof origin === "string" && !sites.origins.includes(origin)) {
      const subdomain = orderingSubdomainForOrigin(origin, sites.domain);
      const site = subdomain && await findOrderingSite(sites, subdomain);
      if (!site) throw new OrderingError("not_found", "Il sito ordini di questa sede non è configurato.");
      if (request.method !== "GET" && request.headers.origin !== origin) {
        throw new OrderingError("forbidden", "Origine richiesta non consentita.");
      }
      requestSites.set(request, site);
    }
    // Deny by default outside authentication; raw URL prefixes can be percent-encoded.
    if (!request.url.startsWith("/api/pilot/auth/") && options.isDemoRequest?.(request)) {
      return reply.code(403).header("cache-control", "no-store").send({ code: "demo_session", message: "La demo non può accedere alle operazioni reali." });
    }
  });
  app.addHook("preHandler", async request => {
    const site = requestSites.get(request);
    if (sites && site) await authorizeOrderingSiteRoute(request, site, sites, async () => (await authenticate(request))?.id);
  });
  registerMenuRoutes(app, { service, authenticate, menuImages: options.menuImages });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/v1/pilot/ordering-site", async request => {
    const site = requestSites.get(request);
    if (!site) throw new OrderingError("not_found", "Il sito ordini di questa sede non è configurato.");
    return site;
  });
  app.get("/v1/pilot/session", async request => {
    const actor = await authenticate(request);
    return requestSites.has(request) ? { actor, superadmin: false, storeIds: [] } : service.session(actor);
  });
  app.get("/v1/pilot/stores", async request => {
    const site = requestSites.get(request);
    return site ? [await service.catalog(site.storeId)] : service.stores(await authenticate(request));
  });
  app.get<{ Params: { id: string } }>("/v1/pilot/stores/:id", async request => service.catalog(request.params.id,
    requestSites.has(request) ? null : await authenticate(request)));
  app.post<{ Params: { id: string }; Body: { query?: unknown } | null }>(deliveryAddressSearch, { bodyLimit: 4096 }, async request => {
    const body = request.body;
    const query = typeof body?.query === "string" && Object.keys(body).length === 1 ? body.query.trim() : "";
    if (query.length < DELIVERY_ADDRESS_QUERY_MIN_LENGTH || query.length > DELIVERY_ADDRESS_QUERY_MAX_LENGTH) {
      throw new OrderingError("invalid_input", "Inserisci da 3 a 200 caratteri per cercare l’indirizzo.");
    }
    const { id, latitude, longitude } = await service.catalog(request.params.id, null);
    const provider = options.deliveryAddressAutocomplete;
    const unavailable = "Ricerca indirizzi temporaneamente non disponibile.";
    if (!provider) throw new OrderingError("service_unavailable", unavailable);
    try {
      return await provider.search(query, { id, latitude, longitude });
    } catch {
      throw new OrderingError("service_unavailable", unavailable);
    }
  });
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
      if (Object.keys(row).some(key => !["kind", "productId", "quantity", "optionIds", "notes", "selections", "mealSelections"].includes(key)) || typeof row.quantity !== "number" || typeof row.productId !== "string" || typeof row.notes !== "string" || !Array.isArray(row.optionIds) || row.optionIds.some(value => typeof value !== "string")) return invalid();
      if (row.selections !== undefined) validateMenuSelections(row.selections, message => { throw new OrderingError("invalid_input", message); });
      if (row.mealSelections !== undefined) validateMealSelections(row.mealSelections, message => { throw new OrderingError("invalid_input", message); });
    }
    if (cartInput.address !== undefined) {
      if (!cartInput.address || typeof cartInput.address !== "object" || Array.isArray(cartInput.address)) return invalid();
      const address = cartInput.address as Record<string, unknown>;
      if (Object.keys(address).some(key => !["text", "latitude", "longitude"].includes(key)) || typeof address.text !== "string" || typeof address.latitude !== "number" || typeof address.longitude !== "number") return invalid();
    }
  }
  app.post<{ Body: { cart: IndividualCart } }>("/v1/pilot/quote", { preValidation: rawEconomicInput, schema: { body: { type: "object", required: ["cart"], additionalProperties: false, properties: { cart } } } }, async request => service.quote(request.body.cart, await options.authenticate(request)));
  app.post<{ Body: IndividualCheckout }>("/v1/pilot/checkouts", { preValidation: rawEconomicInput, schema: { body: { type: "object", required: ["cart", "fingerprint", "phone", "method", "idempotencyKey"], additionalProperties: false, properties: { cart, fingerprint: text, phone: text, method: { enum: ["card", "cash"] }, idempotencyKey: text } } } }, async request => service.checkout(await options.authenticate(request), request.body));
  async function rawAdditionInput(request: FastifyRequest) {
    const value = request.body;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrderingError("invalid_input", "Aggiunta non valida.");
    const input = value as Record<string, unknown>;
    const allowed = request.routeOptions.url?.endsWith("/quote") ? ["lines"] : ["lines", "fingerprint", "idempotencyKey"];
    if (Object.keys(input).some(key => !allowed.includes(key)) || !Array.isArray(input.lines)) throw new OrderingError("invalid_input", "Aggiunta non valida.");
    for (const value of input.lines) {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new OrderingError("invalid_input", "Riga aggiunta non valida.");
      const row = value as Record<string, unknown>;
      if (Object.keys(row).some(key => !["kind", "productId", "quantity", "optionIds", "notes", "selections", "mealSelections"].includes(key))) throw new OrderingError("invalid_input", "Campi riga non validi.");
      if (row.mealSelections !== undefined) validateMealSelections(row.mealSelections, message => { throw new OrderingError("invalid_input", message); });
    }
  }
  app.get<{ Querystring: { storeId?: string } }>("/v1/pilot/orders", async request => {
    const actor = await authenticate(request);
    const site = requestSites.get(request);
    return site ? service.orders(actor, undefined, site.storeId) : service.orders(actor, request.query.storeId);
  });
  app.post<{ Params: { id: string } }>("/v1/pilot/orders/:id/reconcile", async request => service.reconcile(await authenticate(request), request.params.id));
  app.post<{ Params: { id: string }; Body: { lines: IndividualLine[] } }>("/v1/pilot/orders/:id/additions/quote", { preValidation: rawAdditionInput, schema: { body: { type: "object", required: ["lines"], additionalProperties: false, properties: { lines: { type: "array", minItems: 1, maxItems: 100, items: line } } } } }, async request => service.additionQuote(await authenticate(request), request.params.id, request.body.lines));
  app.post<{ Params: { id: string }; Body: IndividualAdditionRequest }>("/v1/pilot/orders/:id/additions", { preValidation: rawAdditionInput, schema: { body: { type: "object", required: ["lines", "fingerprint", "idempotencyKey"], additionalProperties: false, properties: { lines: { type: "array", minItems: 1, maxItems: 100, items: line }, fingerprint: text, idempotencyKey: text } } } }, async request => service.additions(await authenticate(request), request.params.id, request.body));
  app.post<{ Params: { id: string }; Body: IndividualAction }>("/v1/pilot/orders/:id/actions", { schema: { body: { type: "object", additionalProperties: false, required: ["action"], properties: { action: { enum: ["accept", "wait_for_customer", "cancel", "prepare", "ready", "dispatch", "complete", "retry_refund"] }, unavailableProductIds: { type: "array", uniqueItems: true, maxItems: 100, items: text } } } } }, async request => service.action(await authenticate(request), request.params.id, request.body, requestSites.has(request)));
  app.patch<{ Params: { id: string }; Body: { notes: string } }>("/v1/pilot/orders/:id/notes", { schema: { body: { type: "object", required: ["notes"], additionalProperties: false, properties: { notes } } } }, async request => service.notes(await authenticate(request), request.params.id, request.body.notes));
  app.post<{ Params: { id: string }; Body: { query: string } }>("/v1/pilot/stores/:id/address-search", {
    schema: { body: { type: "object", additionalProperties: false, required: ["query"], properties: {
      query: { type: "string", minLength: 5, maxLength: storeAddressLimit }
    } } }
  }, async (request, reply) => {
    reply.header("cache-control", "no-store");
    return service.searchStoreAddresses(await options.authenticate(request), request.params.id, request.body.query);
  });
  app.put<{ Params: { id: string }; Body: IndividualStore & { addressConfirmation?: string } }>("/v1/pilot/stores/:id", { schema: { body: store } }, async (request, reply) => {
    if (request.params.id !== request.body.id) return reply.code(400).send({ code: "invalid_input", message: "La sede non corrisponde." });
    const { addressConfirmation, ...configuration } = request.body;
    return service.saveStore(await options.authenticate(request), configuration, addressConfirmation);
  });
  app.post<{ Params: { id: string }; Body: { email: string } }>("/v1/pilot/stores/:id/invitations", { schema: { body: { type: "object", additionalProperties: false, required: ["email"], properties: { email: { type: "string", format: "email", maxLength: 254 } } } } }, async (request, reply) => {
    await service.invite(await options.authenticate(request), request.params.id, request.body.email);
    return reply.code(204).send();
  });
  const eventsQuery = { type: "object", properties: { cursor: { type: "integer", minimum: 0 }, storeId: text } };
  app.get<{ Querystring: { cursor?: number; storeId?: string } }>("/v1/pilot/events", { schema: { querystring: eventsQuery } }, async request => service.events(await authenticate(request), request.query.cursor ?? 0, request.query.storeId, requestSites.get(request)?.storeId));
  app.get<{ Querystring: { cursor?: number; storeId?: string } }>("/v1/pilot/stream", { schema: { querystring: eventsQuery } }, async (request, reply) => {
    let cursor = request.query.cursor ?? Number(request.headers["last-event-id"] ?? 0);
    if (!Number.isSafeInteger(cursor) || cursor < 0) return reply.code(400).send({ code: "invalid_input", message: "Cursore non valido." });
    let actor = await options.authenticate(request);
    const customerStoreId = requestSites.get(request)?.storeId;
    const initial = await service.events(actor, cursor, request.query.storeId, customerStoreId);
    reply.hijack();
    reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no", "X-Request-Id": request.id });
    const emit = (payload: typeof initial) => { cursor = payload.cursor; reply.raw.write(`id: ${cursor}\ndata: ${JSON.stringify(payload)}\n\n`); };
    emit(initial);
    let busy = false;
    const timer = setInterval(async () => {
      if (busy) return;
      busy = true;
      try {
        actor = await options.authenticate(request);
        emit(await service.events(actor, cursor, request.query.storeId, customerStoreId));
      } catch (error) {
        diagnostics.report(error, { operation: "event_stream", requestId: request.id, route: request.routeOptions.url, method: request.method });
        reply.raw.end();
      } finally { busy = false; }
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
      await options.webhook(request.body, signature);
      return { received: true };
    });
  });
  return app;
}
