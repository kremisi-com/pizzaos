import { preparePizzaMenu } from "./pizza-catalog";
import { inventoryExtraProducts } from "./inventory-extras";
import { bypassStock, hasZeroStock, trackedRecipe } from "./stock-availability";
import { createHash, randomUUID } from "node:crypto";
import { createDefaultWeeklyOrderSchedule, isOrderingSubdomain, resolveMenuComposition } from "@pizzaos/domain";
import type {
  IndividualActor, IndividualCart, IndividualCheckoutResult, IndividualErrorCode,
  IndividualOrder, IndividualProduct, IndividualQuote, IndividualSlot, IndividualStore, MenuDraft, MenuWorkspace, IndividualAction, IndividualAddition, IndividualAdditionQuote, IndividualLine
} from "@pizzaos/domain";
import type { RiderOrderingService, OrderingServiceOptions, OrderingState, ProviderPayment, ProviderRefund } from "./ordering-contract";
import { normalizePromotionSelection } from "./promotions/selection";
import { addressConfirmation, readAddressConfirmation, storeAddressLimit, storeLocationKey } from "./store-address";
import {
  initialMenuWorkspace, normalizeFoodPreferences, validateDraftHeader, validateMenuDraft, validateMenuFood, validateMenuSelections
} from "./menu-catalog";
import { activateOrderCalendar, normalizeOrderSchedule, protectCalendarChanges, protectedOrderDates, upcomingOrderSlots } from "./order-calendar";
import { storeConfigurationVersion } from "./store-configuration-version";

interface Reservation { ingredients: Record<string, number>; slotId: string; }
interface State extends OrderingState {
  reservations?: Record<string, Reservation>;
  additionIdempotency?: Record<string, { hash: string; orderId: string; additionId: string }>;
}

export class OrderingError extends Error {
  readonly statusCode: number;
  constructor(readonly code: IndividualErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "OrderingError";
    this.statusCode = code === "unauthorized" ? 401 : code === "forbidden" ? 403 : code === "not_found" ? 404
      : code === "invalid_input" ? 400 : code === "service_unavailable" ? 503 : 409;
  }
}

function fail(code: IndividualErrorCode, message: string): never { throw new OrderingError(code, message); }
function invalid(message: string): never { return fail("invalid_input", message); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function text(value: unknown, maximum = 200, allowEmpty = false): asserts value is string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > maximum) fail("invalid_input", "Testo mancante o non valido.");
}
function identifier(value: unknown): asserts value is string {
  text(value);
  if (["__proto__", "constructor", "prototype"].includes(value)) fail("invalid_input", "Identificatore non valido.");
}
function integer(value: unknown, minimum = 0): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) fail("invalid_input", "Numero non valido.");
}
function coordinate(value: unknown, limit: number): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > limit) fail("invalid_input", "Coordinate non valide.");
}
function unique(ids: string[]) { if (new Set(ids).size !== ids.length) fail("invalid_input", "Identificatori duplicati."); }
function email(value: unknown): string {
  text(value, 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail("invalid_input", "Indirizzo email non valido.");
  return value.trim().toLowerCase();
}
function hash(value: unknown): string { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function copy<T>(value: T): T { return structuredClone(value); }
function getStore(state: OrderingState, id: string): IndividualStore {
  text(id);
  const store = Object.hasOwn(state.stores, id) ? state.stores[id] : undefined;
  if (!store) fail("not_found", "Sede non trovata.");
  return store;
}
function getOrder(state: OrderingState, id: string): IndividualOrder {
  text(id);
  const order = Object.hasOwn(state.orders, id) ? state.orders[id] : undefined;
  if (!order) fail("not_found", "Ordine non trovato.");
  return order;
}
function authenticated(actor: IndividualActor | null): IndividualActor {
  if (!actor) fail("unauthorized", "Accedi per continuare.");
  text(actor.id); email(actor.email); text(actor.name, 300);
  return actor;
}
function recipeValid(recipe: unknown, ingredientIds: Set<string>): asserts recipe is Record<string, number | null> {
  if (!record(recipe)) fail("invalid_input", "Ricetta non valida.");
  for (const [id, quantity] of Object.entries(recipe)) {
    if (!ingredientIds.has(id)) fail("invalid_input", "Ingrediente della ricetta non presente.");
    if (quantity !== null) integer(quantity, 1);
  }
}
export function validateStoreConfiguration(store: IndividualStore): void {
  if (!record(store)) fail("invalid_input", "Configurazione sede non valida.");
  identifier(store.id); text(store.name); coordinate(store.latitude, 90); coordinate(store.longitude, 180);
  if (store.address !== undefined) text(store.address, storeAddressLimit);
  if (store.timeZone !== undefined) {
    text(store.timeZone, 100);
    try { new Intl.DateTimeFormat("it-IT", { timeZone: store.timeZone }).format(); }
    catch { fail("invalid_input", "Fuso orario della sede non valido."); }
  }
  if (store.contactEmail !== undefined && store.contactEmail !== "") email(store.contactEmail);
  if (store.contactPhone !== undefined) text(store.contactPhone, 100, true);
  if (store.outOfStockBehavior !== undefined && !["allow", "disable", "hide"].includes(store.outOfStockBehavior)) {
    invalid("Comportamento dei prodotti esauriti non valido.");
  }
  if (typeof store.acceptingOrders !== "boolean" || !Array.isArray(store.ingredients) || !Array.isArray(store.products)
    || !Array.isArray(store.slots) || !Array.isArray(store.deliveryBands)) fail("invalid_input", "Configurazione sede incompleta.");
  if (store.products.length > 500 || store.ingredients.length > 1000 || store.slots.length > 5000 || store.deliveryBands.length > 100) fail("invalid_input", "Configurazione troppo grande.");
  for (const ingredient of store.ingredients) {
    if (!record(ingredient)) fail("invalid_input", "Ingrediente non valido.");
    identifier(ingredient.id); text(ingredient.name); if (ingredient.stock !== null) integer(ingredient.stock);
    if (ingredient.food !== undefined) validateMenuFood(ingredient.food, invalid);
    if (ingredient.extra !== undefined) {
      if (!record(ingredient.extra) || Object.keys(ingredient.extra).some(key => !["enabled", "priceCents", "dose"].includes(key))
        || typeof ingredient.extra.enabled !== "boolean") invalid("Configurazione extra del Magazzino non valida.");
      if (ingredient.extra.priceCents !== null) integer(ingredient.extra.priceCents);
      if (ingredient.extra.dose !== null) { integer(ingredient.extra.dose); if (ingredient.extra.dose < 1) invalid("La dose extra deve essere positiva."); }
    }
  }
  unique(store.ingredients.map(item => item.id)); unique(store.products.map(item => item.id)); unique(store.slots.map(item => item.id));
  const ids = new Set(store.ingredients.map(item => item.id));
  for (const product of store.products) {
    if (!record(product)) fail("invalid_input", "Prodotto non valido.");
    identifier(product.id); text(product.name); text(product.description, 2000, true); integer(product.priceCents);
    if (typeof product.available !== "boolean" || !Array.isArray(product.options) || !Array.isArray(product.allergens)) fail("invalid_input", "Prodotto incompleto.");
    product.allergens.forEach(allergen => text(allergen)); recipeValid(product.ingredients, ids);
    for (const option of product.options) {
      if (!record(option)) invalid("Opzione prodotto non valida.");
      identifier(option.id); text(option.name); integer(option.priceCents, product.pizza ? -Number.MAX_SAFE_INTEGER : 0); recipeValid(option.ingredients, ids);
    }
    unique(product.options.map(option => option.id));
  }
  for (const slot of store.slots) {
    identifier(slot.id); text(slot.startsAt); integer(slot.capacity);
    if (!Number.isFinite(Date.parse(slot.startsAt))) fail("invalid_input", "Orario fascia non valido.");
  }
  let lastDistance = -1;
  for (const band of store.deliveryBands) {
    if (typeof band.upToKm !== "number" || !Number.isFinite(band.upToKm) || band.upToKm < 0 || band.upToKm <= lastDistance || band.upToKm > 1000) fail("invalid_input", "Fasce di distanza non valide o non ordinate.");
    integer(band.feeCents); integer(band.minimumCents); lastDistance = band.upToKm;
  }
}
function validCart(value: IndividualCart): void {
  if (!record(value)) fail("invalid_input", "Carrello non valido.");
  if (Object.keys(value).some(key => !["storeId", "notes", "mode", "slotId", "lines", "address", "benefits"].includes(key))) fail("invalid_input", "Campi carrello non validi.");
  if (value.benefits !== undefined) { try { normalizePromotionSelection(value.benefits); } catch { fail("invalid_input", "Selezione benefici non valida."); } }
  text(value.storeId); text(value.notes, 2000, true);
  if (value.mode !== "pickup" && value.mode !== "delivery") fail("invalid_input", "Modalità ordine non valida.");
  if (value.slotId !== null) text(value.slotId);
  if (!Array.isArray(value.lines) || value.lines.length === 0 || value.lines.length > 100) fail("invalid_input", "Inserisci almeno un prodotto.");
  for (const line of value.lines) {
    if (!record(line)) fail("invalid_input", "Riga carrello non valida.");
    if (Object.keys(line).some(key => !["kind", "productId", "quantity", "notes", "optionIds", "selections"].includes(key))) fail("invalid_input", "Campi riga non validi.");
    if (line.kind !== undefined && !["product", "pizza_taste", "pizza_formula"].includes(line.kind)) invalid("Tipo di riga non valido.");
    text(line.productId); integer(line.quantity, 1); text(line.notes, 1000, true);
    if (line.quantity > 100 || !Array.isArray(line.optionIds)) fail("invalid_input", "Quantità o opzioni non valide.");
    line.optionIds.forEach(id => text(id)); unique(line.optionIds);
    if (line.selections !== undefined) {
      if (line.optionIds.length) invalid("Usa un solo formato per le scelte prodotto.");
      validateMenuSelections(line.selections, invalid);
    }
  }
  if (value.mode === "delivery") {
    if (!record(value.address)) fail("invalid_input", "Inserisci l'indirizzo di consegna.");
    if (Object.keys(value.address).some(key => !["text", "latitude", "longitude"].includes(key))) fail("invalid_input", "Indirizzo non valido.");
    text(value.address.text, 1000); coordinate(value.address.latitude, 90); coordinate(value.address.longitude, 180);
  }
}
function cleanCart(cart: IndividualCart): IndividualCart {
  return {
    storeId: cart.storeId, mode: cart.mode, slotId: cart.slotId, notes: cart.notes,
    lines: cart.lines.map(line => ({ ...(line.kind ? { kind: line.kind } : {}), productId: line.productId, quantity: line.quantity, notes: line.notes, optionIds: [...line.optionIds].sort(),
      ...(line.selections !== undefined ? { selections: [...line.selections].sort((left, right) => left.optionId.localeCompare(right.optionId))
        .map(({ optionId, quantity }) => ({ optionId, quantity })) } : {}) })),
    ...(cart.benefits && (cart.benefits.couponCodes.length || cart.benefits.redeemReward) ? { benefits: normalizePromotionSelection(cart.benefits) } : {}),
    ...(cart.mode === "delivery" && cart.address ? { address: { text: cart.address.text, latitude: cart.address.latitude, longitude: cart.address.longitude } } : {})
  };
}
function catalogChanged(state: State, storeId: string) {
  state.cursor += 1;
  state.events.push({ cursor: state.cursor, storeId, orderId: "", revision: state.cursor });
}

function describeFood(product: IndividualProduct, store: IndividualStore): IndividualProduct {
  const used = new Set([...Object.keys(product.ingredients), ...product.options.flatMap(option => Object.keys(option.ingredients))]);
  return { ...product, foodIngredients: store.ingredients.filter(item => used.has(item.id))
    .map(({ id, name, food }) => ({ id, name, ...(food ? { food } : {}) })) };
}

function publicProduct(product: IndividualProduct, store: IndividualStore, reserved: Record<string, number>): IndividualProduct {
  const remaining = new Map(store.ingredients.map(item => [item.id, bypassStock(item, store) ? Infinity : (item.stock ?? 0) - (reserved[item.id] ?? 0)]));
  const removable = new Set(product.options.flatMap(option => option.removesIngredientIds ?? []));
  const specificRemovable = new Set(product.options.filter(option => !option.pizza).flatMap(option => option.removesIngredientIds ?? []));
  const ingredientPossible = (id: string, units: number | null) => remaining.has(id)
    && (units === null ? store.ingredients.some(item => item.id === id && (item.stock !== 0 || store.outOfStockBehavior === "allow")) : (remaining.get(id) ?? 0) >= units);
  const possible = (recipe: Record<string, number | null>, allowRemovals = false) => Object.entries(recipe).every(([id, units]) => ((allowRemovals && removable.has(id)) || ingredientPossible(id, units)));
  const base = Object.entries(product.ingredients).filter(([id]) => !removable.has(id));
  const managed = Boolean(store.menu || product.groups);
  const maxAvailable = managed && base.length ? Math.max(0, Math.min(...base.map(([id, units]) => units === null ? Infinity : Math.floor((remaining.get(id) ?? 0) / units)))) : undefined;
  function optionPossible(option: IndividualProduct["options"][number]) {
    const component = option.pizza && ["dough", "base", "format"].includes(option.pizza.kind);
    return Object.entries(option.ingredients).every(([id, units]) =>
      (component && specificRemovable.has(id) || ingredientPossible(id, units)));
  }
  const zeroBlocked = store.outOfStockBehavior !== "allow" && hasZeroStock(product.ingredients, store);
  const soldOut = product.available && (zeroBlocked || base.some(([id, units]) => units !== null && (remaining.get(id) ?? 0) < units));
  const hiddenOptions = new Set(store.outOfStockBehavior === "hide"
    ? product.options.filter(option => hasZeroStock(option.ingredients, store)).map(option => option.id) : []);
  return { ...(managed ? describeFood(product, store) : product), available: product.available && !zeroBlocked && possible(product.ingredients, true),
    soldOut,
    ...(managed ? { baseIngredientIds: Object.keys(product.ingredients), ...(maxAvailable !== undefined && Number.isFinite(maxAvailable) ? { maxAvailable } : {}) } : {}),
    ...(product.groups ? { groups: product.groups.map(group => ({ ...group, optionIds: group.optionIds.filter(id => !hiddenOptions.has(id)) })) } : {}),
    pizzaRecipeSources: undefined, ingredients: {}, options: product.options.filter(option => !hiddenOptions.has(option.id)).map(option => ({ ...option,
      ...(option.pizza ? { pizza: { ...option.pizza, doughQuantity: undefined } } : {}), ingredients: {},
      available: option.available !== false && optionPossible(option),
      ...(managed ? { ingredientIds: Object.keys(option.ingredients) } : {}) })) };
}

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const radians = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * radians; const dLon = (b.longitude - a.longitude) * radians;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
function reservations(state: State): Record<string, Reservation> { return state.reservations ??= {}; }
function activeReservation(order: IndividualOrder): boolean { return !order.reservationReleased && order.status !== "completed" && order.status !== "cancelled"; }
function slotOccupied(order: IndividualOrder): boolean { return order.status !== "cancelled" && order.payment !== "failed"; }
function ingredientsReserved(state: State, storeId: string): Record<string, number> {
  const result: Record<string, number> = {};
  const include = (recipe: Record<string, number>) => {
    for (const [id, quantity] of Object.entries(recipe)) result[id] = (result[id] ?? 0) + quantity;
  };
  for (const order of Object.values(state.orders)) {
    if (order.storeId !== storeId) continue;
    if (activeReservation(order)) include(reservations(state)[order.id]?.ingredients ?? {});
    for (const addition of order.additions ?? []) {
      if (!addition.applied && !addition.reservationReleased) include(reservations(state)[addition.id]?.ingredients ?? {});
    }
  }
  return result;
}
function slotCount(state: State, storeId: string, slotId: string): number {
  return Object.values(state.orders).filter(order => order.storeId === storeId && order.quote.slotId === slotId && slotOccupied(order)).length;
}
function changed(state: OrderingState, order: IndividualOrder): void {
  order.revision += 1; state.cursor += 1;
  state.events.push({ cursor: state.cursor, orderId: order.id, storeId: order.storeId, revision: order.revision });
}
function release(order: IndividualOrder): void { order.reservationReleased = true; order.reservationExpiresAt = null; order.acceptanceDeadline = null; }

export function createOrderingService(options: OrderingServiceOptions): RiderOrderingService {
  const now = options.now ?? (() => new Date()); const id = options.id ?? randomUUID;
  const reservationMs = options.reservationMs ?? 10 * 60_000;
  if (!Number.isSafeInteger(reservationMs) || reservationMs <= 0) fail("invalid_input", "Durata riserva non valida.");
  const superadmins = new Set(options.superadminEmails.map(value => email(value)));
  const transact = <T>(work: (state: State) => T | Promise<T>) => options.repository.transact(state => work(state));
  const inFlight = new Map<string, Promise<IndividualCheckoutResult>>();
  const refundInFlight = new Map<string, Promise<void>>();
  const additionInFlight = new Map<string, Promise<IndividualCheckoutResult>>();
  const additionRefundInFlight = new Map<string, Promise<void>>();
  function isSuper(actor: IndividualActor | null | undefined) { return Boolean(actor && superadmins.has(actor.email.trim().toLowerCase())); }
  function member(state: State, actor: IndividualActor | null | undefined, storeId: string) {
    return isSuper(actor) || Boolean(actor && state.memberships.some(item => item.storeId === storeId && item.email.toLowerCase() === actor.email.trim().toLowerCase()));
  }
  function operator(state: State, actor: IndividualActor | null, storeId: string) {
    authenticated(actor); getStore(state, storeId);
    if (!member(state, actor, storeId)) fail("forbidden", "Non hai accesso a questa sede.");
  }
  function viewer(state: State, actor: IndividualActor | null, order: IndividualOrder) {
    const user = authenticated(actor);
    if (order.customerId !== user.id && !member(state, user, order.storeId)) fail("forbidden", "Non hai accesso a questo ordine.");
  }
  function occupiedOrders(state: State, storeId: string) {
    return Object.values(state.orders).filter(order => order.storeId === storeId && slotOccupied(order));
  }
  function ensureCalendar(state: State, store: IndividualStore, instant: number) {
    if (options.activateOrderCalendar && !store.orderSchedule) {
      activateOrderCalendar(state, store, instant, occupiedOrders(state, store.id));
    }
  }
  function remainingSlots(state: State, store: IndividualStore, instant: number) {
    const occupied = new Map<string, number>();
    for (const order of occupiedOrders(state, store.id)) {
      occupied.set(order.quote.slotId, (occupied.get(order.quote.slotId) ?? 0) + 1);
    }
    return upcomingOrderSlots(state, store, instant).map(slot => ({
      ...slot, capacity: Math.max(0, slot.capacity - (occupied.get(slot.id) ?? 0))
    }));
  }
  function quoteIn(state: State, cart: IndividualCart, reservedSlot?: Omit<IndividualSlot, "capacity">): { quote: IndividualQuote; recipe: Record<string, number> } {
    validCart(cart);
    const store = getStore(state, cart.storeId);
    if (!store.acceptingOrders) fail("slot_unavailable", "La sede non accetta ordini in questo momento.");
    const recipe: Record<string, number> = {};
    let subtotalCents = 0;
    const products = inventoryExtraProducts(store);
    const lines = cart.lines.map(line => {
      const product = products.find(item => item.id === line.productId);
      if (!product?.available) fail("product_unavailable", "Un prodotto non è disponibile: correggi il carrello.");
      if (store.outOfStockBehavior !== "allow" && hasZeroStock(product.ingredients, store)) {
        fail("inventory_changed", "Un prodotto è esaurito: correggi il carrello.");
      }
      const expectedKind = product.pizza ? product.pizza.kind === "taste" ? "pizza_taste" : "pizza_formula" : "product";
      if (line.kind !== undefined && line.kind !== expectedKind) fail("customization_changed", "Il tipo di pizza è cambiato: scegli nuovamente la composizione.");
      const addRecipe = (requirements: Record<string, number | null>) => {
        for (const [ingredientId, units] of Object.entries(requirements)) {
          const ingredient = store.ingredients.find(item => item.id === ingredientId);
          if (!ingredient) fail("inventory_changed", "Ingrediente non più disponibile.");
          if (ingredient.stock === 0 && store.outOfStockBehavior !== "allow") fail("inventory_changed", "Un ingrediente è esaurito: correggi il carrello.");
          if (units === null) continue;
          const next = (recipe[ingredientId] ?? 0) + units * line.quantity;
          if (!Number.isSafeInteger(next)) fail("invalid_input", "Quantità troppo grande.");
          recipe[ingredientId] = next;
        }
      };
      const optionIds = [...line.optionIds].sort();
      const result = { productId: product.id, name: product.name, quantity: line.quantity, unitCents: product.priceCents, optionIds, notes: line.notes };
      if (store.menu || product.groups) {
        const selections = line.selections ?? optionIds.map(optionId => ({ optionId, quantity: 1 }));
        const ordered = [...selections].sort((left, right) => left.optionId.localeCompare(right.optionId));
        const resolved = resolveMenuComposition(describeFood(product, store), ordered);
        if (!resolved.valid) fail("customization_changed", "Controlla le scelte di un prodotto nel carrello.");
        addRecipe(resolved.recipe);
        subtotalCents += resolved.unitCents * line.quantity;
        if (!Number.isSafeInteger(subtotalCents)) invalid("Totale non valido.");
        return { ...result, unitCents: resolved.unitCents, composition: resolved.composition };
      }
      if (line.selections?.length) fail("customization_changed", "Personalizzazione non più disponibile.");
      const requirements = { ...product.ingredients };
      for (const optionId of line.optionIds) {
        const option = product.options.find(item => item.id === optionId);
        if (!option || option.available === false) fail("invalid_input", "Personalizzazione non più disponibile.");
        result.unitCents += option.priceCents;
        for (const [id, units] of Object.entries(option.ingredients)) {
          const previous = requirements[id];
          requirements[id] = units === null || previous === null ? null : (previous ?? 0) + units;
        }
      }
      addRecipe(requirements);
      subtotalCents += result.unitCents * line.quantity;
      if (!Number.isSafeInteger(subtotalCents) || !Number.isSafeInteger(result.unitCents)) invalid("Totale non valido.");
      return result;
    });
    const reserved = ingredientsReserved(state, store.id);
    for (const [ingredientId, quantity] of Object.entries(recipe)) {
      const ingredient = store.ingredients.find(item => item.id === ingredientId);
      if (!ingredient) fail("inventory_changed", "Ingrediente non più disponibile.");
      if (bypassStock(ingredient, store)) continue;
      const available = ingredient?.stock ?? 0;
      if (quantity > available - (reserved[ingredientId] ?? 0)) fail("inventory_changed", "Ingredienti non sufficienti: correggi il carrello.");
    }
    const instant = now().getTime();
    ensureCalendar(state, store, instant);
    const slot = reservedSlot ?? remainingSlots(state, store, instant).find(item => item.capacity > 0 && (cart.slotId === null || item.id === cart.slotId));
    if (!slot) fail("slot_unavailable", "La fascia non è più disponibile: scegli un nuovo orario.");
    let deliveryCents = 0;
    if (cart.mode === "delivery" && cart.address) {
      const distance = distanceKm(store, cart.address);
      const band = store.deliveryBands.find(item => distance <= item.upToKm);
      if (!band) fail("outside_delivery_area", "Indirizzo fuori copertura: puoi scegliere il ritiro.");
      if (subtotalCents < band.minimumCents) fail("minimum_not_met", "Il carrello non raggiunge il minimo per la consegna.");
      deliveryCents = band.feeCents;
    }
    const totalCents = subtotalCents + deliveryCents;
    if (!Number.isSafeInteger(totalCents)) fail("invalid_input", "Totale non valido.");
    const details = { subtotalCents, deliveryCents, totalCents, slotId: slot.id, slotStartsAt: slot.startsAt,
      ...(slot.endsAt ? { slotEndsAt: slot.endsAt, slotTimeZone: slot.timeZone } : {}), lines };
    return { quote: { ...details, fingerprint: hash({ cart: cleanCart(cart), details, recipe, ...(store.menu ? { menu: store.menu.id } : {}) }) }, recipe: trackedRecipe(recipe, store) };
  }
  function submitted(order: IndividualOrder) {
    const instant = now().getTime(); const minutes = (Date.parse(order.quote.slotStartsAt) - instant) / 60_000;
    const timeout = order.cart.slotId === null || minutes <= 30 ? 5 : minutes <= 90 ? 10 : 15;
    order.status = "awaiting_acceptance"; order.submittedAt = new Date(instant).toISOString();
    order.acceptanceDeadline = new Date(instant + timeout * 60_000).toISOString(); order.reservationExpiresAt = null;
  }
  function cancelOrder(state: State, order: IndividualOrder) {
    if (order.status === "cancelled") return;
    order.status = "cancelled"; release(order);
    if (order.method === "card" && order.payment === "paid" && order.providerIntentId) { order.payment = "refund_pending"; order.refundAttempt = Math.max(1, order.refundAttempt); }
    for (const addition of order.additions ?? []) {
      if (addition.method === "card" && addition.payment === "paid") { addition.payment = "refund_pending"; addition.refundAttempt = Math.max(1, addition.refundAttempt); }
    }
    changed(state, order);
  }
  function deadlineExpired(order: IndividualOrder) {
    return order.status === "awaiting_acceptance" && order.acceptanceDeadline !== null && Date.parse(order.acceptanceDeadline) <= now().getTime();
  }
  function customerBeforeAcceptance(actor: IndividualActor | null, order: IndividualOrder) {
    const user = authenticated(actor);
    if (user.id !== order.customerId) fail("forbidden", "Solo il cliente può aggiungere prodotti al proprio ordine.");
    if (!["awaiting_acceptance", "awaiting_customer"].includes(order.status)) fail("invalid_transition", "Puoi aggiungere prodotti solo prima dell'accettazione.");
    return user;
  }
  function unresolvedAddition(addition: IndividualAddition) {
    return !addition.applied && ["processing", "requires_action"].includes(addition.payment);
  }
  function additionQuoteIn(state: State, order: IndividualOrder, lines: IndividualLine[]): { result: IndividualAdditionQuote; recipe: Record<string, number> } {
    const deltaCart: IndividualCart = { storeId: order.storeId, lines, mode: "pickup", slotId: order.quote.slotId, notes: "" };
    const { quote: delta, recipe } = quoteIn(state, deltaCart, {
      id: order.quote.slotId, startsAt: order.quote.slotStartsAt, endsAt: order.quote.slotEndsAt, timeZone: order.quote.slotTimeZone
    });
    const subtotalCents = order.quote.subtotalCents + delta.subtotalCents;
    const totalCents = order.quote.totalCents + delta.subtotalCents;
    if (!Number.isSafeInteger(totalCents) || !Number.isSafeInteger(subtotalCents)) fail("invalid_input", "Totale non valido.");
    const fingerprint = hash({ orderId: order.id, original: order.quote, delta });
    const quote: IndividualQuote = { ...copy(order.quote), fingerprint, subtotalCents, totalCents, lines: [...copy(order.quote.lines), ...delta.lines] };
    if (quote.promotions) {
      quote.promotions.originalSubtotalCents += delta.subtotalCents;
      quote.promotions.netSubtotalCents = subtotalCents;
      quote.promotions.lines.push(...delta.lines.map(line => ({ productId: line.productId, grossCents: line.quantity * line.unitCents, discountCents: 0, netCents: line.quantity * line.unitCents })));
    }
    return { result: { fingerprint, deltaCents: delta.subtotalCents, quote }, recipe };
  }
  function getAddition(order: IndividualOrder, additionId: string): IndividualAddition {
    const addition = order.additions?.find(item => item.id === additionId);
    if (!addition) fail("not_found", "Aggiunta non trovata.");
    return addition;
  }
  function mergeAddition(state: State, order: IndividualOrder, addition: IndividualAddition) {
    if (addition.applied) return;
    order.cart.lines.push(...copy(addition.lines)); order.quote = copy(addition.quote);
    const base = reservations(state)[order.id] ?? { slotId: order.quote.slotId, ingredients: {} };
    for (const [ingredientId, quantity] of Object.entries(reservations(state)[addition.id]?.ingredients ?? {})) {
      base.ingredients[ingredientId] = (base.ingredients[ingredientId] ?? 0) + quantity;
    }
    reservations(state)[order.id] = base;
    addition.applied = true; addition.reservationReleased = true; addition.reservationExpiresAt = null;
  }
  async function refundAddition(orderId: string, additionId: string): Promise<void> {
    const existing = additionRefundInFlight.get(additionId); if (existing) return existing;
    const task = (async () => {
      const original = await transact(state => copy(getAddition(getOrder(state, orderId), additionId)));
      if (original.payment !== "refund_pending" || !original.providerIntentId) return;
      let remote: ProviderRefund;
      try {
        remote = original.refundId ? await options.payments.readRefund(original.refundId)
          : await options.payments.refund({ intentId: original.providerIntentId, key: `refund-addition:${original.id}:${original.refundAttempt}` });
      } catch (error) {
        options.diagnostics?.report(error, { operation: "addition_refund", orderId, additionId, provider: "stripe", code: "refund_failed", category: record(error) && error.definitive === true ? "operational" : "dependency" });
        if (!original.refundId && record(error) && error.definitive === true) {
          await transact(state => {
            const order = getOrder(state, orderId); const addition = getAddition(order, additionId);
            if (addition.payment === "refund_pending" && addition.refundAttempt === original.refundAttempt && addition.refundId === null) {
              addition.payment = "refund_failed"; changed(state, order);
            }
          });
        }
        return;
      }
      await transact(state => {
        const order = getOrder(state, orderId); const addition = getAddition(order, additionId);
        if (addition.payment !== "refund_pending" || addition.refundAttempt !== original.refundAttempt) return;
        const status = remote.status === "succeeded" ? "refunded" : remote.status === "failed" ? "refund_failed" : "refund_pending";
        if (addition.refundId !== remote.id || addition.payment !== status) { addition.refundId = remote.id; addition.payment = status; changed(state, order); }
      });
      if (remote.status === "failed") options.diagnostics?.report(new Error(), { operation: "addition_refund", orderId, additionId, provider: "stripe", code: "refund_failed", category: "operational" });
    })();
    additionRefundInFlight.set(additionId, task);
    try { await task; } finally { if (additionRefundInFlight.get(additionId) === task) additionRefundInFlight.delete(additionId); }
  }
  async function additionPayment(orderId: string, additionId: string): Promise<IndividualCheckoutResult> {
    const existing = additionInFlight.get(additionId); if (existing) return existing;
    const task = (async () => {
      const original = await transact(state => ({ order: copy(getOrder(state, orderId)), addition: copy(getAddition(getOrder(state, orderId), additionId)) }));
      const addition = original.addition;
      if (addition.payment === "refund_pending") {
        await refundAddition(orderId, additionId); return { order: await transact(state => copy(getOrder(state, orderId))) };
      }
      if (addition.method === "cash" || ["refunded", "refund_failed"].includes(addition.payment)
        || (addition.payment === "failed" && !addition.providerIntentId)
        || (addition.applied && original.order.status !== "cancelled")) return { order: original.order };
      let remote: ProviderPayment;
      try {
        remote = addition.providerIntentId ? await options.payments.read(addition.providerIntentId)
          : await options.payments.create({ orderId: original.order.id, totalCents: addition.deltaCents, key: `addition:${addition.id}` });
        if ((original.order.status === "cancelled" || (addition.reservationExpiresAt && Date.parse(addition.reservationExpiresAt) <= now().getTime())) && ["processing", "requires_action"].includes(remote.status)) remote = await options.payments.cancel(remote.id);
      } catch (error) {
        options.diagnostics?.report(error, { operation: "addition_payment", orderId, additionId, storeId: original.order.storeId, provider: "stripe", code: record(error) && error.definitive === true ? "payment_declined" : "payment_uncertain", category: record(error) && error.definitive === true ? "expected" : "dependency" });
        if (!addition.providerIntentId && record(error) && error.definitive === true) {
          await transact(state => {
            const order = getOrder(state, orderId); const current = getAddition(order, additionId);
            if (!current.providerIntentId && unresolvedAddition(current)) { current.payment = "failed"; current.reservationReleased = true; current.reservationExpiresAt = null; changed(state, order); }
          });
        }
        return { order: await transact(state => copy(getOrder(state, orderId))) };
      }
      const result = await transact(state => {
        const order = getOrder(state, orderId); const current = getAddition(order, additionId); const before = JSON.stringify(order);
        if (current.providerIntentId && current.providerIntentId !== remote.id) fail("service_unavailable", "Tentativo aggiunta incoerente.");
        current.providerIntentId = remote.id;
        if (deadlineExpired(order)) cancelOrder(state, order);
        if (remote.status === "paid") {
          if (order.status === "cancelled") {
            if (!["refund_pending", "refunded", "refund_failed"].includes(current.payment)) { current.payment = "refund_pending"; current.refundAttempt = Math.max(1, current.refundAttempt); }
            current.reservationReleased = true; current.reservationExpiresAt = null;
          } else if (!current.applied && !["refund_pending", "refunded", "refund_failed"].includes(current.payment)) {
            current.payment = "paid"; mergeAddition(state, order, current);
          }
        } else if (!current.applied && !["refund_pending", "refunded", "refund_failed"].includes(current.payment)) {
          if (remote.status === "failed" || remote.status === "cancelled") {
            current.payment = "failed"; current.reservationReleased = true; current.reservationExpiresAt = null;
          } else current.payment = remote.status;
        }
        if (JSON.stringify(order) !== before) changed(state, order);
        return { order: copy(order), ...(current.payment === "requires_action" && order.status !== "cancelled" && remote.clientSecret ? { clientSecret: remote.clientSecret } : {}) };
      });
      if (result.order.payment === "refund_pending") await refundOrder(orderId);
      await refundAddition(orderId, additionId);
      return { ...result, order: await transact(state => copy(getOrder(state, orderId))) };
    })();
    additionInFlight.set(additionId, task);
    try { return await task; } finally { if (additionInFlight.get(additionId) === task) additionInFlight.delete(additionId); }
  }
  async function settleAdditions(orderId: string): Promise<IndividualCheckoutResult> {
    const order = await transact(state => copy(getOrder(state, orderId)));
    let clientSecret: string | undefined;
    for (const addition of order.additions ?? []) {
      if (unresolvedAddition(addition) || addition.payment === "refund_pending" || (order.status === "cancelled" && addition.payment === "failed" && addition.providerIntentId)) {
        const result = await additionPayment(orderId, addition.id); clientSecret ??= result.clientSecret;
      }
    }
    return { order: await transact(state => copy(getOrder(state, orderId))), ...(clientSecret ? { clientSecret } : {}) };
  }
  async function applyPayment(orderId: string, payment: ProviderPayment): Promise<IndividualCheckoutResult> {
    return transact(state => {
      const order = getOrder(state, orderId); const before = JSON.stringify(order);
      if (order.providerIntentId && order.providerIntentId !== payment.id) fail("service_unavailable", "Tentativo pagamento incoerente.");
      order.providerIntentId = payment.id;
      if (payment.status === "paid") {
        if (order.status === "cancelled") {
          if (!["refund_pending", "refunded", "refund_failed"].includes(order.payment)) {
            order.payment = "refund_pending"; order.refundAttempt = Math.max(1, order.refundAttempt);
          }
        } else if (order.status === "pending_payment") { order.payment = "paid"; submitted(order); }
      } else if (order.status === "pending_payment") {
        if (payment.status === "failed" || payment.status === "cancelled") {
          order.payment = "failed"; order.status = "cancelled"; release(order);
        } else { order.payment = payment.status; }
      }
      if (JSON.stringify(order) !== before) changed(state, order);
      return { order: copy(order), ...(order.status === "pending_payment" && order.payment === "requires_action" && payment.clientSecret ? { clientSecret: payment.clientSecret } : {}) };
    });
  }
  async function refundOrder(orderId: string): Promise<void> {
    const existing = refundInFlight.get(orderId); if (existing) return existing;
    const task = (async () => {
      const original = await transact(state => copy(getOrder(state, orderId)));
      if (original.payment !== "refund_pending" || !original.providerIntentId) return;
      let result: ProviderRefund;
      try {
        result = original.refundId ? await options.payments.readRefund(original.refundId)
          : await options.payments.refund({ intentId: original.providerIntentId, key: `refund:${original.id}:${original.refundAttempt}` });
      } catch (error) {
        options.diagnostics?.report(error, { operation: "refund", orderId, storeId: original.storeId, provider: "stripe", code: "refund_failed", category: record(error) && error.definitive === true ? "operational" : "dependency" });
        if (!original.refundId && record(error) && error.definitive === true) {
          await transact(state => {
            const order = getOrder(state, orderId);
            if (order.payment === "refund_pending" && order.refundAttempt === original.refundAttempt && order.refundId === null) {
              order.payment = "refund_failed"; changed(state, order);
            }
          });
        }
        return;
      }
      await transact(state => {
        const order = getOrder(state, orderId);
        if (order.payment !== "refund_pending" || order.refundAttempt !== original.refundAttempt) return;
        const payment = result.status === "succeeded" ? "refunded" : result.status === "failed" ? "refund_failed" : "refund_pending";
        if (order.refundId !== result.id || order.payment !== payment) { order.refundId = result.id; order.payment = payment; changed(state, order); }
      });
      if (result.status === "failed") options.diagnostics?.report(new Error(), { operation: "refund", orderId, provider: "stripe", code: "refund_failed", category: "operational" });
    })();
    refundInFlight.set(orderId, task);
    try { await task; } finally { if (refundInFlight.get(orderId) === task) refundInFlight.delete(orderId); }
  }
  async function paymentOrder(orderId: string): Promise<IndividualCheckoutResult> {
    const existing = inFlight.get(orderId); if (existing) return existing;
    const task = (async () => {
      const original = await transact(state => copy(getOrder(state, orderId)));
      if (original.method === "cash" || (original.payment === "paid" && !original.providerIntentId) || (original.quote.totalCents === 0 && !original.providerIntentId) || ["refunded", "refund_failed"].includes(original.payment)) return { order: original };
      if (original.payment === "refund_pending") {
        await refundOrder(orderId); return { order: await transact(state => copy(getOrder(state, orderId))) };
      }
      let remote: ProviderPayment;
      try {
        remote = original.providerIntentId ? await options.payments.read(original.providerIntentId)
          : await options.payments.create({ orderId: original.id, totalCents: original.quote.totalCents, key: `payment:${original.id}` });
      } catch (error) {
        options.diagnostics?.report(error, { operation: "payment", orderId, storeId: original.storeId, provider: "stripe", code: record(error) && error.definitive === true ? "payment_declined" : "payment_uncertain", category: record(error) && error.definitive === true ? "expected" : "dependency" });
        if (!original.providerIntentId && record(error) && error.definitive === true) {
          return transact(state => {
            const order = getOrder(state, orderId);
            if (order.status === "pending_payment" && order.providerIntentId === null) {
              order.status = "cancelled"; order.payment = "failed"; release(order); changed(state, order);
            }
            return { order: copy(order) };
          });
        }
        return { order: original };
      }
      const result = await applyPayment(orderId, remote);
      if (result.order.payment === "refund_pending") {
        await refundOrder(orderId); return { order: await transact(state => copy(getOrder(state, orderId))) };
      }
      return result;
    })();
    inFlight.set(orderId, task);
    try { return await task; } finally { if (inFlight.get(orderId) === task) inFlight.delete(orderId); }
  }
  async function expireOrder(orderId: string): Promise<void> {
    const original = await transact(state => {
      const order = getOrder(state, orderId);
      if (deadlineExpired(order)) cancelOrder(state, order);
      return copy(order);
    });
    if (original.payment === "refund_pending") await refundOrder(orderId);
    if (original.status === "pending_payment" && original.reservationExpiresAt && Date.parse(original.reservationExpiresAt) <= now().getTime()) {
      // Never release a reservation while the provider can still settle the charge.
      const reconciled = await paymentOrder(orderId);
      if (reconciled.order.status !== "pending_payment" || !reconciled.order.providerIntentId) return;
      try {
        const remote = await options.payments.cancel(reconciled.order.providerIntentId);
        const result = await applyPayment(orderId, remote);
        if (result.order.payment === "refund_pending") await refundOrder(orderId);
      } catch (error) {
        options.diagnostics?.report(error, { operation: "cancel_payment", orderId, provider: "stripe", code: "payment_uncertain", category: "dependency" });
        // Keep reservation and recover on the next tick.
      }
    }
  }
  function visibleStore(state: State, store: IndividualStore, actor?: IndividualActor | null): IndividualStore {
    const instant = now().getTime();
    ensureCalendar(state, store, instant);
    const operatorView = member(state, actor, store.id);
    if (operatorView) {
      const operatorStore = { ...copy(store), configurationRevision: storeConfigurationVersion(store) };
      return store.orderSchedule ? {
        ...operatorStore, slots: remainingSlots(state, store, instant), protectedOrderDates: protectedOrderDates(state, store, instant)
      } : operatorStore;
    }
    const reserved = ingredientsReserved(state, store.id);
    const publicStore = copy(store);
    delete publicStore.configurationRevision;
    delete publicStore.address;
    delete publicStore.orderSchedule;
    delete publicStore.protectedOrderDates;
    if (publicStore.menu) delete publicStore.menu.pizzaCatalog;
    publicStore.ingredients = [];
    const products = inventoryExtraProducts(store);
    const hiddenProductIds = new Set(store.outOfStockBehavior === "hide"
      ? products.filter(product => hasZeroStock(product.ingredients, store)).map(product => product.id) : []);
    publicStore.products = products
      .filter(product => !hiddenProductIds.has(product.id))
      .map(product => publicProduct(product, store, reserved));
    for (const product of publicStore.products) {
      if (product.pairingProductIds) product.pairingProductIds = product.pairingProductIds.filter(id => !hiddenProductIds.has(id));
    }
    if (publicStore.menu && hiddenProductIds.size > 0) publicStore.menu.sections = publicStore.menu.sections
      .map(section => ({ ...section, productIds: section.productIds.filter(id => !hiddenProductIds.has(id)) }))
      .filter(section => section.productIds.length > 0);
    publicStore.slots = remainingSlots(state, store, instant);
    return publicStore;
  }
  async function performAction(actor: IndividualActor | null, orderId: string, input: IndividualAction, surface?: "rider" | "customer"): Promise<IndividualOrder> {
      const user = authenticated(actor);
      if (!record(input)) fail("invalid_input", "Azione non valida.");
      const permittedActions = ["accept", "wait_for_customer", "cancel", "prepare", "ready", "dispatch", "complete", "retry_refund"];
      if (!permittedActions.includes(input.action)) fail("invalid_input", "Azione sconosciuta.");
      const result = await transact(state => {
        const order = getOrder(state, orderId);
      const isOperator = surface !== "customer" && member(state, user, order.storeId);
      if (surface === "rider") {
          if ((input.action !== "dispatch" && input.action !== "complete") || !options.authorizeRiderProgress?.(state, user, order, input.action)) {
            fail("forbidden", "Non puoi aggiornare questa consegna.");
          }
        } else {
        if (surface === "customer" && order.customerId !== user.id) fail("not_found", "Ordine non disponibile.");
          viewer(state, user, order);
          if (input.action !== "cancel" && !isOperator) fail("forbidden", "Questa azione è riservata agli operatori della sede.");
        }
        if (deadlineExpired(order)) { cancelOrder(state, order); return { expired: true, order: copy(order) }; }
        if (input.action === "cancel") {
          if (order.status === "cancelled") return { expired: false, order: copy(order) };
          if (order.status === "completed" || order.status === "pending_payment" || (!isOperator && !["awaiting_acceptance", "awaiting_customer"].includes(order.status))) fail("invalid_transition", "Per annullare dopo l'accettazione contatta il ristorante.");
          cancelOrder(state, order);
        } else if (input.action === "retry_refund") {
          const failedAdditions = (order.additions ?? []).filter(addition => addition.payment === "refund_failed");
          if (order.status !== "cancelled") fail("invalid_transition", "Nessun rimborso fallito da ripetere.");
          if (order.payment !== "refund_failed" && failedAdditions.length === 0) {
            if (["refunded", "refund_pending"].includes(order.payment) || (order.additions ?? []).some(addition => ["refunded", "refund_pending"].includes(addition.payment))) return { expired: false, order: copy(order) };
            fail("invalid_transition", "Nessun rimborso fallito da ripetere.");
          }
          if (order.payment === "refund_failed") { order.refundAttempt += 1; order.refundId = null; order.payment = "refund_pending"; }
          for (const addition of failedAdditions) { addition.refundAttempt += 1; addition.refundId = null; addition.payment = "refund_pending"; }
          changed(state, order);
        } else if (input.action === "wait_for_customer") {
          if (!Array.isArray(input.unavailableProductIds) || input.unavailableProductIds.length === 0 || input.unavailableProductIds.some(productId => !order.cart.lines.some(line => line.productId === productId))) fail("invalid_input", "Seleziona un prodotto dell'ordine non disponibile.");
          unique(input.unavailableProductIds);
          if (!["awaiting_acceptance", "awaiting_customer"].includes(order.status)) fail("invalid_transition", "Non puoi sospendere questo ordine.");
          const ids = [...input.unavailableProductIds].sort();
          if (order.status !== "awaiting_customer" || JSON.stringify(ids) !== JSON.stringify(order.unavailableProductIds)) {
            order.status = "awaiting_customer"; order.unavailableProductIds = ids; order.acceptanceDeadline = null; order.reservationExpiresAt = null; changed(state, order);
          }
        } else {
          if (input.action === "accept" && order.additions?.some(unresolvedAddition)) fail("payment_unresolved", "L'aggiunta del cliente ha un pagamento in verifica: attendi l'esito prima di accettare.");
          const transition: Record<string, { from: string[]; to: IndividualOrder["status"] }> = {
            accept: { from: ["awaiting_acceptance", "awaiting_customer"], to: "accepted" },
            prepare: { from: ["accepted"], to: "preparing" }, ready: { from: ["preparing"], to: "ready" },
            dispatch: { from: order.cart.mode === "delivery" ? ["ready"] : [], to: "out_for_delivery" },
            complete: { from: order.cart.mode === "delivery" ? ["out_for_delivery"] : ["ready"], to: "completed" }
          };
          const rule = transition[input.action];
          if (order.status === rule.to) return { expired: false, order: copy(order) };
          if (!rule.from.includes(order.status)) fail("invalid_transition", "Questo passaggio non è disponibile per l'ordine.");
          order.status = rule.to; order.acceptanceDeadline = null;
          if (rule.to === "completed") {
            const store = getStore(state, order.storeId); const recipe = reservations(state)[order.id]?.ingredients ?? {};
            for (const [ingredientId, quantity] of Object.entries(recipe)) {
              const ingredient = store.ingredients.find(item => item.id === ingredientId);
              if (ingredient?.stock === null) continue;
              if (!ingredient || ingredient.stock === null || ingredient.stock < quantity) fail("inventory_changed", "Scorte incoerenti con le riserve dell'ordine.");
              ingredient.stock -= quantity;
            }
            release(order);
            if (order.method === "cash") { order.payment = "cash_paid"; for (const addition of order.additions ?? []) if (addition.applied) addition.payment = "cash_paid"; }
          }
          changed(state, order);
        }
        return { expired: false, order: copy(order) };
      });
      if (result.order.payment === "refund_pending") await refundOrder(orderId);
      await settleAdditions(orderId);
      if (result.expired && input.action !== "cancel") fail("invalid_transition", "L'ordine è scaduto ed è stato annullato.");
      return transact(state => copy(getOrder(state, orderId)));
  }
  function workspace(state: State, store: IndividualStore): MenuWorkspace {
    const saved = state.menuDrafts?.[store.id];
    const initial = initialMenuWorkspace(store);
    return { revision: saved?.revision ?? 0, drafts: saved?.drafts ?? [],
      published: store.menu ? { ...store.menu, products: store.products } : initial.published };
  }
  function menuRevision(current: MenuWorkspace, revision: number) {
    integer(revision);
    if (revision !== current.revision) fail("revision_conflict", "Il menu è cambiato. Ricarica prima di salvare.");
  }
  function saveMenuWorkspace(state: State, storeId: string, current: MenuWorkspace, drafts: MenuDraft[]) {
    (state.menuDrafts ??= {})[storeId] = { revision: current.revision + 1, drafts };
  }

  const service: RiderOrderingService = {
    menu: {
      workspace(actor, storeId) {
        return transact(state => { operator(state, actor, storeId); return copy(workspace(state, getStore(state, storeId))); });
      },
      saveDraft(actor, storeId, revision, draft) {
        return transact(state => {
          operator(state, actor, storeId);
          const store = getStore(state, storeId);
          const current = workspace(state, store);
          menuRevision(current, revision);
          validateDraftHeader(draft, invalid);
          if (draft.id === current.published.id) invalid("Duplica il menu pubblicato per modificarlo.");
          draft = preparePizzaMenu(draft, new Set(store.ingredients.map(item => item.id)), invalid, false, store.ingredients);
          validateStoreConfiguration({ ...store, products: draft.products });
          validateMenuDraft(draft, store, invalid);
          const previous = current.drafts.findIndex(item => item.id === draft.id);
          if (previous < 0 && current.drafts.length >= 20) invalid("Hai raggiunto il numero massimo di bozze.");
          const drafts = previous < 0 ? [...current.drafts, copy(draft)] : current.drafts.map(item => item.id === draft.id ? copy(draft) : item);
          saveMenuWorkspace(state, storeId, current, drafts);
          return copy(workspace(state, store));
        });
      },
      removeDraft(actor, storeId, revision, draftId) {
        return transact(state => {
          operator(state, actor, storeId);
          identifier(draftId);
          const store = getStore(state, storeId);
          const current = workspace(state, store);
          menuRevision(current, revision);
          const drafts = current.drafts.filter(item => item.id !== draftId);
          if (drafts.length === current.drafts.length) fail("not_found", "Bozza del menu non trovata.");
          saveMenuWorkspace(state, storeId, current, drafts);
          return copy(workspace(state, store));
        });
      },
      publish(actor, storeId, revision, draftId) {
        return transact(state => {
          operator(state, actor, storeId);
          identifier(draftId);
          const store = getStore(state, storeId);
          const current = workspace(state, store);
          menuRevision(current, revision);
          let draft = current.drafts.find(item => item.id === draftId);
          if (!draft) fail("not_found", "Bozza del menu non trovata.");
          draft = preparePizzaMenu(draft, new Set(store.ingredients.map(item => item.id)), invalid, true, store.ingredients);
          validateStoreConfiguration({ ...store, products: draft.products });
          validateMenuDraft(draft, store, invalid, true);
          const { products, ...menu } = copy(draft);
          store.menu = menu;
          store.products = products;
          const drafts = current.drafts.filter(item => item.id !== draftId);
          if (current.published.products.length) drafts.push(current.published);
          saveMenuWorkspace(state, storeId, current, drafts);
          catalogChanged(state, storeId);
          return copy(workspace(state, store));
        });
      },
      imageAccess(actor, storeId, imageId) {
        return transact(state => {
          const store = getStore(state, storeId);
          if (imageId !== undefined) {
            identifier(imageId);
            if (store.products.some(product => product.imageId === imageId)) return "published";
            if (!member(state, actor, storeId)) fail("not_found", "Foto non trovata.");
          } else operator(state, actor, storeId);
          return "private";
        });
      },
      preferences(actor) {
        const { id } = authenticated(actor);
        return transact(state => copy(state.foodPreferences && Object.hasOwn(state.foodPreferences, id) ? state.foodPreferences[id] : { avoid: [] }));
      },
      savePreferences(actor, value) {
        const { id } = authenticated(actor);
        identifier(id);
        const preferences = normalizeFoodPreferences(value, invalid);
        return transact(state => {
          if (preferences.avoid.length) (state.foodPreferences ??= {})[id] = preferences;
          else if (state.foodPreferences) delete state.foodPreferences[id];
          return copy(preferences);
        });
      }
    },
    async session(actor) {
      if (!actor) return { actor: null, superadmin: false, storeIds: [] };
      authenticated(actor);
      return transact(state => ({ actor: copy(actor), superadmin: isSuper(actor), storeIds: isSuper(actor) ? Object.keys(state.stores)
        : state.memberships.filter(item => item.email.toLowerCase() === actor.email.trim().toLowerCase()).map(item => item.storeId) }));
    },
    async stores(actor) { return transact(state => Object.values(state.stores).map(store => visibleStore(state, store, actor))); },
    async catalog(storeId, actor) { return transact(state => visibleStore(state, getStore(state, storeId), actor)); },
    async quote(cart, actor) { return transact(state => { const quote = quoteIn(state, cart).quote; return copy(options.priceQuote ? options.priceQuote(state, cart, quote, actor) : quote); }); },
    async checkout(actor, input) {
      const user = authenticated(actor);
      if (!record(input)) fail("invalid_input", "Checkout non valido.");
      validCart(input.cart); text(input.phone, 100); text(input.fingerprint, 200); text(input.idempotencyKey, 200);
      if (input.method !== "card" && input.method !== "cash") fail("invalid_input", "Metodo pagamento non valido.");
      if (Object.keys(input).some(key => options.priceQuote ? !["cart", "phone", "fingerprint", "method", "idempotencyKey"].includes(key) : /coupon|reward|subscription|group/i.test(key))) fail("invalid_input", "Campi checkout non validi.");
      const request = { cart: cleanCart(input.cart), phone: input.phone.trim(), fingerprint: input.fingerprint, method: input.method };
      const requestHash = hash(request); const key = JSON.stringify([user.id, input.idempotencyKey]);
      const order = await transact(state => {
        const previous = state.idempotency[key];
        if (previous) {
          if (previous.hash !== requestHash) fail("idempotency_conflict", "Questa chiave è già stata usata per un ordine diverso.");
          return copy(getOrder(state, previous.orderId));
        }
        const pending = Object.values(state.orders).find(item => item.customerId === user.id && item.storeId === input.cart.storeId && item.status === "pending_payment");
        const selectedBenefits = input.cart.benefits && (input.cart.benefits.couponCodes.length > 0 || input.cart.benefits.redeemReward);
        if (pending && !(options.priceQuote && selectedBenefits)) fail("payment_unresolved", "Un pagamento è ancora in verifica. Recupera il tentativo esistente.");
        const canonical = quoteIn(state, input.cart);
        const recipe = canonical.recipe;
        const quote = options.priceQuote ? options.priceQuote(state, input.cart, canonical.quote, user) : canonical.quote;
        if (pending) fail("payment_unresolved", "Un pagamento è ancora in verifica. Recupera il tentativo esistente.");
        if (quote.fingerprint !== input.fingerprint) fail("price_changed", "Il riepilogo è cambiato: controlla e conferma nuovamente.");
        const createdAt = now().toISOString();
        const created: IndividualOrder = {
          id: id(), storeId: input.cart.storeId, customerId: user.id, cart: request.cart, quote,
          contact: { name: user.name, email: user.email, phone: request.phone },
          status: "pending_payment", payment: input.method === "cash" ? "cash_due" : "processing", method: input.method,
          notes: input.cart.notes, createdAt, submittedAt: null, acceptanceDeadline: null,
          reservationExpiresAt: new Date(now().getTime() + reservationMs).toISOString(), reservationReleased: false,
          unavailableProductIds: [], providerIntentId: null, refundId: null, refundAttempt: 0, revision: 0
        };
        identifier(created.id);
        if (Object.hasOwn(state.orders, created.id)) fail("service_unavailable", "Identificatore ordine già esistente.");
        state.orders[created.id] = created; reservations(state)[created.id] = { ingredients: recipe, slotId: quote.slotId };
        state.idempotency[key] = { hash: requestHash, orderId: created.id };
        if (input.method === "cash" || quote.totalCents === 0) { if (input.method === "card") created.payment = "paid"; submitted(created); }
        changed(state, created);
        return copy(created);
      });
      return order.method === "card" && order.status === "pending_payment" ? paymentOrder(order.id) : { order };
    },
    async orders(actor, storeId, customerStoreId) {
      const user = authenticated(actor);
      return transact(state => {
        if (storeId !== undefined) operator(state, user, storeId);
        return Object.values(state.orders).filter(order => storeId === undefined
          ? order.customerId === user.id && (customerStoreId === undefined || order.storeId === customerStoreId)
          : order.storeId === storeId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(copy);
      });
    },
    async reconcile(actor, orderId) {
      await transact(state => viewer(state, actor, getOrder(state, orderId)));
      await expireOrder(orderId);
      const original = await paymentOrder(orderId);
      const additions = await settleAdditions(orderId);
      return { order: additions.order, ...(original.clientSecret || additions.clientSecret ? { clientSecret: original.clientSecret ?? additions.clientSecret } : {}) };
    },
    action(actor, orderId, input, customerOnly) { return performAction(actor, orderId, input, customerOnly ? "customer" : undefined); },
    riderProgress(actor, orderId, action) { return performAction(actor, orderId, { action }, "rider"); },
    async notes(actor, orderId, notes) {
      const user = authenticated(actor); text(notes, 2000, true);
      return transact(state => {
        const order = getOrder(state, orderId);
        if (order.customerId !== user.id) fail("forbidden", "Solo il cliente può modificare le note.");
        if (!["awaiting_acceptance", "awaiting_customer", "accepted"].includes(order.status)) fail("invalid_transition", "La preparazione è iniziata: le note non sono più modificabili.");
        if (order.notes !== notes) { order.notes = notes; changed(state, order); }
        return copy(order);
      });
    },
    async additionQuote(actor, orderId, lines) {
      await transact(state => customerBeforeAcceptance(actor, getOrder(state, orderId)));
      await expireOrder(orderId);
      return transact(state => {
        const order = getOrder(state, orderId); customerBeforeAcceptance(actor, order);
        if (order.additions?.some(unresolvedAddition)) fail("payment_unresolved", "Un'aggiunta è ancora in verifica.");
        return copy(additionQuoteIn(state, order, lines).result);
      });
    },
    async additions(actor, orderId, input) {
      const user = authenticated(actor);
      if (!record(input)) fail("invalid_input", "Aggiunta non valida.");
      text(input.fingerprint, 200); text(input.idempotencyKey, 200);
      if (Object.keys(input).some(key => !["lines", "fingerprint", "idempotencyKey"].includes(key))) fail("invalid_input", "L'aggiunta ammette solo nuove righe e conferma del riepilogo.");
      const linesCart: IndividualCart = { storeId: "validation", mode: "pickup", slotId: null, notes: "", lines: input.lines };
      validCart(linesCart);
      const lines = cleanCart(linesCart).lines;
      const requestHash = hash({ lines, fingerprint: input.fingerprint }); const key = JSON.stringify([user.id, orderId, input.idempotencyKey]);
      const additionId = await transact(state => {
        const order = getOrder(state, orderId);
        if (order.customerId !== user.id) fail("forbidden", "Solo il cliente può aggiungere prodotti al proprio ordine.");
        const previous = (state.additionIdempotency ??= {})[key];
        if (previous) {
          if (previous.hash !== requestHash) fail("idempotency_conflict", "Questa chiave è già stata usata per un'aggiunta diversa.");
          return previous.additionId;
        }
        customerBeforeAcceptance(user, order);
        if (deadlineExpired(order)) return null;
        if (order.additions?.some(unresolvedAddition)) fail("payment_unresolved", "Un'aggiunta è ancora in verifica. Recupera il tentativo esistente.");
        const { result, recipe } = additionQuoteIn(state, order, lines);
        if (input.fingerprint !== result.fingerprint) fail("price_changed", "Il prezzo dell'aggiunta è cambiato: riconferma il riepilogo.");
        const addition: IndividualAddition = {
          id: id(), lines, quote: result.quote, deltaCents: result.deltaCents, method: order.method,
          payment: order.method === "cash" ? "cash_due" : "processing", applied: false,
          providerIntentId: null, refundId: null, refundAttempt: 0,
          reservationExpiresAt: new Date(now().getTime() + reservationMs).toISOString(), reservationReleased: false, createdAt: now().toISOString()
        };
        identifier(addition.id);
        if (Object.hasOwn(reservations(state), addition.id)) fail("service_unavailable", "Identificatore aggiunta già esistente.");
        (order.additions ??= []).push(addition);
        reservations(state)[addition.id] = { ingredients: recipe, slotId: order.quote.slotId };
        state.additionIdempotency[key] = { hash: requestHash, orderId: order.id, additionId: addition.id };
        if (order.method === "cash") mergeAddition(state, order, addition);
        changed(state, order); return addition.id;
      });
      if (additionId === null) { await expireOrder(orderId); fail("invalid_transition", "L'ordine è scaduto ed è stato annullato."); }
      return additionPayment(orderId, additionId);
    },
    async searchStoreAddresses(actor, storeId, query) {
      const user = authenticated(actor);
      identifier(storeId);
      text(query, storeAddressLimit);
      const normalized = query.trim();
      if (normalized.length < 5) fail("invalid_input", "Inserisci via, civico e città.");
      const previous = await transact(state => {
        const existing = Object.hasOwn(state.stores, storeId) ? state.stores[storeId] : undefined;
        if (!isSuper(user) && (!existing || !member(state, user, storeId))) {
          fail("forbidden", "Non hai accesso a questa sede.");
        }
        return storeLocationKey(existing);
      });
      const geocoding = options.storeGeocoding;
      if (!geocoding) fail("service_unavailable", "Ricerca indirizzi non configurata.");
      try {
        const matches = await geocoding.search(normalized);
        const searchedAt = now().getTime();
        return matches.slice(0, 5).map(location => ({
          address: location.address,
          confirmation: addressConfirmation(location, user.id, storeId, previous, searchedAt, geocoding.signingSecret)
        }));
      } catch (error) {
        throw new OrderingError("service_unavailable", "Ricerca indirizzi non disponibile.", { cause: error });
      }
    },
    async saveStore(actor, input, confirmation) {
      const user = authenticated(actor);
      if (!record(input)) fail("invalid_input", "Configurazione sede non valida.");
      text(input.id);
      return transact(state => {
        const existing = Object.hasOwn(state.stores, input.id) ? state.stores[input.id] : undefined;
        if (!existing && !isSuper(user)) fail("forbidden", "Solo il superadmin può creare una sede.");
        if (existing) operator(state, user, input.id);
        if (input.configurationRevision !== undefined) {
          text(input.configurationRevision, 200);
          if (!/^[a-f0-9]{64}$/.test(input.configurationRevision)) invalid("Versione della configurazione non valida.");
        }
        if (existing && input.configurationRevision !== storeConfigurationVersion(existing)) {
          fail("revision_conflict", "La configurazione è cambiata. Ricarica la sede e ripeti la modifica.");
        }
        const subdomain = input.orderingSubdomain;
        const currentSubdomain = existing?.orderingSubdomain;
        if (subdomain !== undefined && subdomain !== currentSubdomain) {
          if (!isSuper(user)) fail("forbidden", "Solo il superadmin può assegnare il sottodominio.");
          if (!isOrderingSubdomain(subdomain)) fail("invalid_input", "Sottodominio non valido o riservato.");
          if (currentSubdomain || Object.values(state.stores).some(store => store.orderingSubdomain === subdomain)) {
            fail("revision_conflict", "Il sottodominio è già assegnato. Scegli un indirizzo disponibile per una sede senza sottodominio.");
          }
        }
        let next = input.outOfStockBehavior === undefined && existing?.outOfStockBehavior !== undefined
          ? { ...input, outOfStockBehavior: existing.outOfStockBehavior } : input;
        if (confirmation !== undefined) {
          const geocoding = options.storeGeocoding;
          const confirmed = geocoding && readAddressConfirmation(confirmation, user.id, input.id, now().getTime(), geocoding.signingSecret);
          if (!confirmed) fail("invalid_input", "La conferma dell’indirizzo non è valida o è scaduta. Cerca di nuovo l’indirizzo.");
          const currentLocation = storeLocationKey(existing);
          if (currentLocation !== confirmed.previous && currentLocation !== storeLocationKey(confirmed.location)) {
            fail("revision_conflict", "L’indirizzo della sede è cambiato. Ricarica la sede e cerca di nuovo l’indirizzo.");
          }
          next = { ...next, ...confirmed.location };
        } else if (existing?.address) {
          if ((input.address !== undefined && input.address !== existing.address) ||
            input.latitude !== existing.latitude || input.longitude !== existing.longitude) {
            fail("invalid_input", "Cerca e conferma l’indirizzo prima di modificare la posizione.");
          }
          next = { ...next, address: existing.address };
        } else if (input.address !== undefined) {
          fail("invalid_input", "Cerca e conferma l’indirizzo prima di salvarlo.");
        }
        if (!Array.isArray(input.ingredients) || !Array.isArray(input.slots)) fail("invalid_input", "Configurazione sede incompleta.");
        const reserved = ingredientsReserved(state, input.id);
        for (const [ingredientId, quantity] of Object.entries(reserved)) {
          const ingredient = input.ingredients.find(item => item.id === ingredientId);
          if (ingredient?.stock === null) continue;
          if (!ingredient || ingredient.stock === null || ingredient.stock < quantity) fail("inventory_changed", "Le nuove scorte non coprono gli ordini riservati.");
        }
        const instant = now().getTime();
        const occupied = occupiedOrders(state, input.id);
        if (existing) ensureCalendar(state, existing, instant);
        const currentSchedule = existing?.orderSchedule;
        if (input.orderSchedule !== undefined || currentSchedule || options.activateOrderCalendar) {
          const submittedSchedule = input.orderSchedule === undefined ? undefined : normalizeOrderSchedule(input.orderSchedule);
          if (input.orderSchedule !== undefined && !submittedSchedule) fail("invalid_input", "Orari settimanali non validi o sovrapposti.");
          let schedule = currentSchedule ?? createDefaultWeeklyOrderSchedule();
          if (submittedSchedule && JSON.stringify(submittedSchedule.days) !== JSON.stringify(schedule.days)) {
            if (submittedSchedule.revision !== schedule.revision) fail("revision_conflict", "Il calendario è cambiato. Ricarica la sede e ripeti la modifica.");
            schedule = { ...submittedSchedule, revision: schedule.revision + 1 };
          }
          if (existing && !currentSchedule) activateOrderCalendar(state, existing, instant, occupied);
          next = { ...next, orderSchedule: schedule, slots: existing?.slots ?? [] };
        } else {
          for (const order of occupied) {
            const slot = input.slots.find(item => item.id === order.quote.slotId);
            const active = activeReservation(order);
            if (!slot && active) fail("slot_unavailable", "Non puoi eliminare una fascia con ordini attivi.");
            if (slot && (slot.capacity < slotCount(state, input.id, slot.id) || (active && Date.parse(slot.startsAt) !== Date.parse(order.quote.slotStartsAt)))) fail("slot_unavailable", "La nuova fascia non copre gli ordini già ricevuti.");
          }
        }
        if (existing?.menu) {
          next = { ...next, menu: existing.menu, products: existing.products };
        } else if (next.menu) {
          next = { ...next };
          delete next.menu;
        }
        validateStoreConfiguration(next);
        if (next.menu) validateMenuDraft({ ...next.menu, products: next.products }, next, invalid, true, false);
        if (existing) protectCalendarChanges(state, existing, next, instant, occupied);
        const saved = copy(next);
        if (currentSubdomain) saved.orderingSubdomain = currentSubdomain;
        delete saved.protectedOrderDates;
        delete saved.configurationRevision;
        state.stores[input.id] = saved;
        if (existing && !existing.menu && JSON.stringify(existing.products) !== JSON.stringify(saved.products)) {
          const current = workspace(state, existing);
          saveMenuWorkspace(state, input.id, current, current.drafts);
        }
        catalogChanged(state, input.id);
        return visibleStore(state, saved, user);
      });
    },
    async invite(actor, storeId, invitedEmail) {
      const user = authenticated(actor); const normalized = email(invitedEmail);
      if (!isSuper(user)) fail("forbidden", "Solo il superadmin può invitare operatori.");
      await transact(state => {
        getStore(state, storeId);
        if (!state.memberships.some(item => item.storeId === storeId && item.email === normalized)) state.memberships.push({ storeId, email: normalized });
      });
    },
    async events(actor, cursor, storeId, customerStoreId) {
      const user = authenticated(actor); integer(cursor);
      return transact(state => {
        if (storeId !== undefined) operator(state, user, storeId);
        const events = state.events.filter(event => event.cursor > cursor && (customerStoreId === undefined || event.storeId === customerStoreId)
          && (storeId !== undefined ? event.storeId === storeId
          : (event.orderId ? state.orders[event.orderId]?.customerId === user.id : false)));
        return { cursor: state.cursor, events: copy(events) };
      });
    },
    async tick() {
      const ids = await transact(state => Object.values(state.orders).filter(order => order.status === "pending_payment" || deadlineExpired(order) || order.payment === "refund_pending"
        || (order.status === "cancelled" && order.method === "card" && order.payment === "failed" && order.providerIntentId !== null)
        || order.additions?.some(addition => unresolvedAddition(addition) || addition.payment === "refund_pending" || (order.status === "cancelled" && addition.payment === "failed" && addition.providerIntentId !== null))).map(order => order.id));
      for (const orderId of ids) {
        try { await paymentOrder(orderId); await expireOrder(orderId); await settleAdditions(orderId); }
        catch (error) { options.diagnostics?.report(error, { operation: "order_tick", orderId }); }
      }
    }
  };
  return service;
}
