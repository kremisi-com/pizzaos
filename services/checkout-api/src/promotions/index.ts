import { createHash, randomUUID } from "node:crypto";
import type { IndividualActor, IndividualCart, IndividualOrder, IndividualQuote, LoyaltyMovement, LoyaltyWallet, PromotionCoupon, PromotionCouponInput, PromotionProgram, PromotionProgramInput, PromotionsApi } from "@pizzaos/domain";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { OrderingRepository, OrderingServiceOptions, OrderingState } from "../ordering-contract";
import { createOperationalServices } from "../pilot-extensions";
import { OrderingError } from "../ordering-service";
import { normalizePromotionSelection } from "./selection";

export interface PromotionsService {
  configuration(actor: IndividualActor | null, storeId: string): ReturnType<PromotionsApi["configuration"]>;
  saveProgram(actor: IndividualActor | null, storeId: string, input: PromotionProgramInput): ReturnType<PromotionsApi["saveProgram"]>;
  saveCoupon(actor: IndividualActor | null, storeId: string, input: PromotionCouponInput): ReturnType<PromotionsApi["saveCoupon"]>;
  wallet(actor: IndividualActor | null, storeId: string): ReturnType<PromotionsApi["wallet"]>;
}
interface Terms { storeId: string; customerId: string; enabled: boolean; rate: number; }
interface Entry extends LoyaltyMovement { storeId: string; customerId: string; }
interface State extends OrderingState {
  promotions?: { programs: Record<string, PromotionProgram>; coupons: Record<string, PromotionCoupon[]>; terms: Record<string, Terms>; movements: Entry[] };
}
const defaults = (): PromotionProgram => ({ enabled: true, pointsPerEuro: 1, rewardPoints: 100, rewardCents: 500, revision: 0 });
function data(state: State) { return state.promotions ??= { programs: {}, coupons: {}, terms: {}, movements: [] }; }
function program(state: State, storeId: string) {
  const programs = data(state).programs;
  if (!Object.hasOwn(programs, storeId)) programs[storeId] = defaults();
  return programs[storeId];
}
function coupons(state: State, storeId: string) { const records = data(state).coupons; return Object.hasOwn(records, storeId) ? records[storeId] : []; }
function fail(code: ConstructorParameters<typeof OrderingError>[0], message: string): never { throw new OrderingError(code, message); }
function invalid(): never { return fail("invalid_input", "Controlla i dati delle promozioni."); }
function object(value: unknown): asserts value is Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) invalid(); }
function shape(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  object(value); if (required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) invalid();
}
function number(value: unknown, min = 1, max = 100000000): asserts value is number { if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) invalid(); }
function identifier(value: unknown): asserts value is string { if (typeof value !== "string" || !value.trim() || value.length > 200 || ["__proto__", "constructor", "prototype"].includes(value)) invalid(); }
function actor(input: IndividualActor | null | undefined): IndividualActor {
  if (!input) fail("unauthorized", "Accedi per continuare.");
  identifier(input.id); if (typeof input.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || typeof input.name !== "string" || !input.name.trim()) invalid();
  return input;
}
function store(state: State, id: string) { identifier(id); if (!Object.hasOwn(state.stores, id)) fail("not_found", "Sede non trovata."); return state.stores[id]; }
function validateProgram(value: unknown): asserts value is PromotionProgramInput {
  shape(value, ["enabled", "pointsPerEuro", "rewardPoints", "rewardCents", "revision"]);
  if (typeof value.enabled !== "boolean") invalid(); number(value.pointsPerEuro, 1, 10000); number(value.rewardPoints); number(value.rewardCents); number(value.revision, 0, Number.MAX_SAFE_INTEGER);
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(0); calendar.setUTCFullYear(year, month - 1, day);
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() === month - 1 && calendar.getUTCDate() === day && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60;
}
function validateCoupon(value: unknown): asserts value is PromotionCouponInput {
  shape(value, ["code", "active", "kind", "value", "startsAt", "endsAt", "minimumCents", "productIds", "globalLimit", "perCustomerLimit"], ["id", "revision"]);
  if ((value.id === undefined) !== (value.revision === undefined)) invalid();
  if (value.id !== undefined) { identifier(value.id); number(value.revision, 0, Number.MAX_SAFE_INTEGER); }
  if (typeof value.code !== "string" || !/^[A-Z0-9_-]{1,50}$/.test(value.code.trim().toUpperCase()) || typeof value.active !== "boolean" || (value.kind !== "percent" && value.kind !== "fixed")) invalid();
  number(value.value, 1, value.kind === "percent" ? 10000 : 100000000); number(value.minimumCents, 0);
  for (const limit of [value.globalLimit, value.perCustomerLimit]) if (limit !== null) number(limit);
  for (const date of [value.startsAt, value.endsAt]) if (date !== null && !validDate(date)) invalid();
  if (typeof value.startsAt === "string" && typeof value.endsAt === "string" && Date.parse(value.startsAt) >= Date.parse(value.endsAt)) invalid();
  if (!Array.isArray(value.productIds) || value.productIds.length > 500) invalid();
  value.productIds.forEach(identifier); if (new Set(value.productIds).size !== value.productIds.length) invalid();
}
function wallet(state: State, storeId: string, customerId: string): LoyaltyWallet {
  const movements = data(state).movements.filter(item => item.storeId === storeId && item.customerId === customerId);
  const balancePoints = movements.reduce((sum, item) => sum + (item.kind === "earn" && item.status === "posted" ? item.points : item.kind === "reward" && item.status === "spent" ? -item.points : 0), 0);
  const heldPoints = movements.reduce((sum, item) => sum + (item.kind === "reward" && item.status === "reserved" ? item.points : 0), 0);
  return { storeId, program: program(state, storeId), balancePoints, heldPoints, availablePoints: balancePoints - heldPoints,
    movements: movements.map(({ id, orderId, kind, points, status, createdAt }) => ({ id, orderId, kind, points, status, createdAt })) };
}
function usage(state: State, storeId: string, couponId: string, customerId?: string) {
  let reserved = 0; let consumed = 0;
  for (const order of Object.values(state.orders)) {
    if (order.storeId !== storeId || (customerId !== undefined && order.customerId !== customerId) || order.status === "cancelled" || !order.quote.promotions?.coupons.some(item => item.id === couponId)) continue;
    if (order.status === "pending_payment") reserved++; else consumed++;
  }
  return { couponId, reserved, consumed };
}
function multiplyFloor(left: number, right: number, denominator: number) { const value = Number(BigInt(left) * BigInt(right) / BigInt(denominator)); if (!Number.isSafeInteger(value)) invalid(); return value; }
/** Proportional integer allocation; largest remainders, then original line position. */
function allocate(residual: number[], indexes: number[], amount: number) {
  const total = indexes.reduce((sum, index) => sum + residual[index], 0); if (total === 0 || amount === 0) return;
  const parts = indexes.map(index => { const product = BigInt(residual[index]) * BigInt(amount); return { index, share: Number(product / BigInt(total)), remainder: product % BigInt(total) }; });
  let rest = amount - parts.reduce((sum, part) => sum + part.share, 0);
  parts.sort((a, b) => a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1);
  for (const part of parts) { if (rest > 0) { part.share++; rest--; } residual[part.index] -= part.share; }
}
function pricing(state: State, cart: IndividualCart, quote: IndividualQuote, user: IndividualActor | null | undefined, now: Date): IndividualQuote {
  if (cart.benefits === undefined) return quote;
  let selection; try { selection = normalizePromotionSelection(cart.benefits); } catch { return invalid(); }
  if (selection.couponCodes.length === 0 && !selection.redeemReward) return quote;
  const customer = actor(user); const config = program(state, cart.storeId);
  const selected = selection.couponCodes.map(code => {
    const coupon = coupons(state, cart.storeId).find(item => item.code === code);
    if (!coupon || !coupon.active || (coupon.startsAt && Date.parse(coupon.startsAt) > now.getTime()) || (coupon.endsAt && Date.parse(coupon.endsAt) <= now.getTime()) || quote.subtotalCents < coupon.minimumCents) fail("coupon_unavailable", "Coupon non disponibile per questo carrello.");
    const global = usage(state, cart.storeId, coupon.id); const personal = usage(state, cart.storeId, coupon.id, customer.id);
    if ((coupon.globalLimit !== null && global.reserved + global.consumed >= coupon.globalLimit) || (coupon.perCustomerLimit !== null && personal.reserved + personal.consumed >= coupon.perCustomerLimit)) fail("coupon_limit_reached", "Il limite di utilizzo del coupon è stato raggiunto.");
    return { coupon, global, personal };
  });
  const gross = quote.lines.map(line => line.unitCents * line.quantity); const residual = [...gross];
  const applied: { id: string; code: string; discountCents: number }[] = [];
  for (const { coupon } of [...selected.filter(item => item.coupon.kind === "percent"), ...selected.filter(item => item.coupon.kind === "fixed")]) {
    const indexes = quote.lines.flatMap((line, index) => coupon.productIds.length === 0 || coupon.productIds.includes(line.productId) ? [index] : []);
    const eligible = indexes.reduce((sum, index) => sum + residual[index], 0);
    const discountCents = coupon.kind === "percent" ? multiplyFloor(eligible, coupon.value, 10000) : Math.min(eligible, coupon.value);
    if (discountCents === 0) fail("coupon_unavailable", "Il coupon non genera uno sconto sui prodotti selezionati.");
    allocate(residual, indexes, discountCents); applied.push({ id: coupon.id, code: coupon.code, discountCents });
  }
  const balance = wallet(state, cart.storeId, customer.id); let rewardDiscountCents = 0; let redeemedPoints = 0;
  if (selection.redeemReward) {
    const available = residual.reduce((sum, value) => sum + value, 0);
    if (!config.enabled || available === 0) fail("loyalty_unavailable", "Il premio non è disponibile per questo carrello.");
    if (balance.availablePoints < config.rewardPoints) fail("loyalty_insufficient", "Punti disponibili insufficienti.");
    rewardDiscountCents = Math.min(available, config.rewardCents); redeemedPoints = config.rewardPoints;
    allocate(residual, residual.map((_, index) => index), rewardDiscountCents);
  }
  const netSubtotalCents = residual.reduce((sum, value) => sum + value, 0);
  const promotions = { originalSubtotalCents: quote.subtotalCents, discountCents: quote.subtotalCents - netSubtotalCents, netSubtotalCents, coupons: applied, rewardDiscountCents, redeemedPoints, pointsPerEuro: config.enabled ? config.pointsPerEuro : 0,
    lines: gross.map((grossCents, index) => ({ productId: quote.lines[index].productId, grossCents, discountCents: grossCents - residual[index], netCents: residual[index] })) };
  const fingerprint = createHash("sha256").update(JSON.stringify({ base: quote.fingerprint, selection, config, selected, ...(selection.redeemReward ? { availablePoints: balance.availablePoints } : {}), promotions })).digest("hex");
  return { ...quote, subtotalCents: netSubtotalCents, totalCents: netSubtotalCents + quote.deliveryCents, promotions, fingerprint };
}
function journal(state: State, previous: Map<string, IndividualOrder["status"]>, now: Date) {
  const ledger = data(state);
  for (const order of Object.values(state.orders)) {
    if (!previous.has(order.id)) { const config = program(state, order.storeId); ledger.terms[order.id] = { storeId: order.storeId, customerId: order.customerId, enabled: config.enabled, rate: config.pointsPerEuro }; }
    const terms = ledger.terms[order.id]; if (!terms) continue;
    const points = order.quote.promotions?.redeemedPoints ?? 0;
    if (points > 0) {
      let movement = ledger.movements.find(item => item.orderId === order.id && item.kind === "reward");
      if (!movement) { movement = { ...terms, id: `reward:${order.id}`, orderId: order.id, kind: "reward", points, status: "reserved", createdAt: now.toISOString() }; ledger.movements.push(movement); }
      movement.status = order.status === "cancelled" ? "released" : order.status === "pending_payment" ? "reserved" : "spent";
    }
    if (order.status === "completed" && previous.get(order.id) !== "completed" && terms.enabled && !ledger.movements.some(item => item.orderId === order.id && item.kind === "earn")) {
      ledger.movements.push({ ...terms, id: `earn:${order.id}`, orderId: order.id, kind: "earn", points: multiplyFloor(order.quote.subtotalCents, terms.rate, 100), status: "posted", createdAt: now.toISOString() });
    }
  }
}
export function createPromotionsOrderingServices(options: OrderingServiceOptions) {
  const now = options.now ?? (() => new Date()); const id = options.id ?? randomUUID;
  const decorated: OrderingRepository = { transact: work => options.repository.transact(async state => {
    const previous = new Map(Object.values(state.orders).map(order => [order.id, order.status]));
    const result = await work(state); journal(state, previous, now()); return result;
  }) };
  const operational = createOperationalServices({ ...options, repository: decorated, priceQuote: (state, cart, quote, user) => pricing(state, cart, quote, user, now()) });
  const repository = operational.repository;
  function operator(state: State, input: IndividualActor | null, storeId: string) {
    const user = actor(input); store(state, storeId);
    if (!options.superadminEmails.some(email => email.trim().toLowerCase() === user.email.trim().toLowerCase()) && !state.memberships.some(item => item.storeId === storeId && item.email.toLowerCase() === user.email.trim().toLowerCase())) fail("forbidden", "Non hai accesso a questa sede.");
  }
  const promotions: PromotionsService = {
    configuration: (user, storeId) => repository.transact(state => { operator(state, user, storeId); return structuredClone({ program: program(state, storeId), coupons: coupons(state, storeId), usage: coupons(state, storeId).map(item => usage(state, storeId, item.id)) }); }),
    saveProgram: (user, storeId, input) => repository.transact(state => {
      operator(state, user, storeId); validateProgram(input); const current = program(state, storeId);
      if (input.revision !== current.revision) fail("revision_conflict", "La configurazione è cambiata.");
      const saved = { ...input, revision: current.revision + 1 }; data(state).programs[storeId] = saved; return structuredClone(saved);
    }),
    saveCoupon: (user, storeId, input) => repository.transact(state => {
      operator(state, user, storeId); validateCoupon(input); const catalog = store(state, storeId);
      if (input.productIds.some(productId => !catalog.products.some(product => product.id === productId))) invalid();
      const list = coupons(state, storeId); const current = input.id === undefined ? undefined : list.find(item => item.id === input.id);
      if (input.id !== undefined && !current) fail("not_found", "Coupon non trovato.");
      if (current && current.revision !== input.revision) fail("revision_conflict", "Il coupon è cambiato.");
      const code = input.code.trim().toUpperCase(); if (list.some(item => item.code === code && item.id !== current?.id)) invalid();
      const saved: PromotionCoupon = { ...structuredClone(input), code, id: current?.id ?? id(), revision: current ? current.revision + 1 : 0 };
      identifier(saved.id); if (!current && list.some(item => item.id === saved.id)) invalid();
      data(state).coupons[storeId] = current ? list.map(item => item.id === current.id ? saved : item) : [...list, saved]; return structuredClone(saved);
    }),
    wallet: async (input, storeId) => { const user = actor(input); return repository.transact(state => { store(state, storeId); return structuredClone(wallet(state, storeId, user.id)); }); }
  };
  return { ...operational, promotions };
}

export function registerPromotionRoutes(app: FastifyInstance, options: { promotions: PromotionsService; authenticate: (request: FastifyRequest) => Promise<IndividualActor | null> }): void {
  app.register(async routes => {
    routes.addHook("onRequest", async (request, reply) => {
      reply.header("cache-control", "no-store");
      if (request.method !== "GET") {
        const canonical = request.headers["x-pizzaos-origin"];
        if (typeof canonical !== "string" || request.headers.origin !== canonical) fail("forbidden", "Origine non consentita.");
        try { if (new URL(canonical).origin !== canonical) throw new Error("origin"); } catch { fail("forbidden", "Origine non consentita."); }
      }
    });
    routes.addHook("preValidation", async request => {
      if (Object.keys(request.query as Record<string, unknown>).length) invalid();
      if (request.method === "PUT") validateProgram(request.body);
      if (request.method === "POST") validateCoupon(request.body);
    });
    routes.get<{ Params: { id: string } }>("/v1/pilot/stores/:id/promotions", async request => options.promotions.configuration(await options.authenticate(request), request.params.id));
    routes.put<{ Params: { id: string }; Body: PromotionProgramInput }>("/v1/pilot/stores/:id/promotions/program", async request => options.promotions.saveProgram(await options.authenticate(request), request.params.id, request.body));
    routes.post<{ Params: { id: string }; Body: PromotionCouponInput }>("/v1/pilot/stores/:id/promotions/coupons", async request => options.promotions.saveCoupon(await options.authenticate(request), request.params.id, request.body));
    routes.get<{ Params: { id: string } }>("/v1/pilot/stores/:id/loyalty", async request => options.promotions.wallet(await options.authenticate(request), request.params.id));
  });
}
