import type {
  AdminDeliveryItem,
  DeliveryAssignment,
  DeliveryIssue,
  DeliveryRider,
  IndividualActor,
  IndividualErrorCode,
  IndividualOrder,
  RiderDelivery,
  RiderSession
} from "@pizzaos/domain";
import type { OrderingRepository, OrderingState } from "../ordering-contract";
import { randomUUID } from "node:crypto";

export interface DeliveryData {
  riders: Record<string, DeliveryRider>;
  assignments: Record<string, DeliveryAssignment>;
  issues: Record<string, DeliveryIssue>;
}

export type DeliveryOrderingState = OrderingState & { delivery?: DeliveryData };

export interface DeliveryServiceOptions {
  repository: OrderingRepository;
  superadminEmails: string[];
  now?: () => Date;
  id?: () => string;
  /** Rechecks isRiderProgressAllowed inside the canonical order transaction. */
  progress(actor: IndividualActor, orderId: string, action: "dispatch" | "complete"): Promise<IndividualOrder>;
}

export interface DeliveryService {
  session(actor: IndividualActor | null): Promise<RiderSession>;
  deliveries(actor: IndividualActor | null): Promise<RiderDelivery[]>;
  riders(actor: IndividualActor | null, storeId: string): Promise<DeliveryRider[]>;
  inviteRider(actor: IndividualActor | null, storeId: string, email: string, name: string): Promise<DeliveryRider>;
  setRiderActive(actor: IndividualActor | null, storeId: string, riderId: string, active: boolean): Promise<DeliveryRider>;
  assignments(actor: IndividualActor | null, storeId: string): Promise<AdminDeliveryItem[]>;
  assign(actor: IndividualActor | null, orderId: string, riderId: string): Promise<void>;
  dispatch(actor: IndividualActor | null, orderId: string): Promise<void>;
  complete(actor: IndividualActor | null, orderId: string): Promise<void>;
  reportFailure(actor: IndividualActor | null, orderId: string, note: string): Promise<void>;
}

/** Public errors have stable domain codes and Italian user-facing messages. */
export class DeliveryError extends Error {
  readonly code: IndividualErrorCode;
  readonly statusCode: number;
  constructor(code: IndividualErrorCode, message: string) {
    super(message);
    this.name = "DeliveryError";
    this.code = code;
    this.statusCode = code === "unauthorized" ? 401 : code === "forbidden" ? 403
      : code === "not_found" ? 404 : code === "invalid_input" ? 400 : code === "service_unavailable" ? 503 : 409;
  }
}

/** Pure guard called inside the transaction that applies the canonical transition. */
export function isRiderProgressAllowed(
  state: DeliveryOrderingState,
  actor: IndividualActor | null,
  order: IndividualOrder,
  action: string
): boolean {
  if (!actor || order.cart.mode !== "delivery" || !ownsAssignment(state, actor, order)) return false;
  if (lookup(state.delivery?.issues, order.id)) return false;
  if (action === "dispatch") return order.status === "ready" || order.status === "out_for_delivery";
  return action === "complete" && order.status === "out_for_delivery";
}

function fail(code: IndividualErrorCode, message: string): never {
  throw new DeliveryError(code, message);
}

function lookup<T>(records: Record<string, T> | undefined, key: string): T | undefined {
  return records && Object.hasOwn(records, key) ? records[key] : undefined;
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function authenticated(actor: IndividualActor | null): IndividualActor {
  if (!actor || !actor.id || !actor.email?.trim()) fail("unauthorized", "Accedi per continuare.");
  return actor;
}

function text(value: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail("invalid_input", "Valore non valido.");
  return value.trim();
}

function identifier(value: string): string {
  const result = text(value, 200);
  if (result !== value || ["__proto__", "prototype", "constructor"].includes(result)) fail("invalid_input", "Identificatore non valido.");
  return result;
}

function ownsAssignment(state: DeliveryOrderingState, actor: IndividualActor, order: IndividualOrder): boolean {
  const assignment = lookup(state.delivery?.assignments, order.id);
  const rider = assignment ? lookup(state.delivery?.riders, assignment.riderId) : undefined;
  return Boolean(rider?.active && rider.storeId === order.storeId && normalizedEmail(rider.email) === normalizedEmail(actor.email));
}

function actionable(order: IndividualOrder): order is IndividualOrder & { status: "ready" | "out_for_delivery" } {
  return order.cart.mode === "delivery" && (order.status === "ready" || order.status === "out_for_delivery");
}

function ensureData(state: DeliveryOrderingState): DeliveryData {
  state.delivery ??= { riders: {}, assignments: {}, issues: {} };
  return state.delivery;
}

function changed(state: DeliveryOrderingState, order: IndividualOrder): void {
  order.revision += 1;
  state.cursor += 1;
  state.events.push({ cursor: state.cursor, storeId: order.storeId, orderId: order.id, revision: order.revision });
}

function getOrder(state: DeliveryOrderingState, orderId: string): IndividualOrder {
  const order = lookup(state.orders, identifier(orderId));
  if (!order) fail("not_found", "Ordine non trovato.");
  return order;
}

function requireAssignment(state: DeliveryOrderingState, actor: IndividualActor, order: IndividualOrder): void {
  if (!ownsAssignment(state, actor, order)) fail("forbidden", "La consegna non è assegnata a te.");
}

function toRiderDelivery(state: DeliveryOrderingState, order: IndividualOrder & { status: "ready" | "out_for_delivery" }): RiderDelivery {
  const store = lookup(state.stores, order.storeId);
  const address = order.cart.address;
  if (!store || !address) fail("service_unavailable", "Dati della consegna incompleti. Contatta il ristorante.");
  return {
    orderId: order.id,
    storeId: order.storeId,
    storeName: store.name,
    status: order.status,
    address: { text: address.text, latitude: address.latitude, longitude: address.longitude },
    contact: { name: order.contact.name, phone: order.contact.phone },
    notes: order.notes,
    items: order.quote.lines.map(line => ({ name: line.name, quantity: line.quantity })),
    cashDueCents: order.method === "cash" && order.payment === "cash_due" ? order.quote.totalCents : 0,
    issue: structuredClone(lookup(state.delivery?.issues, order.id) ?? null)
  };
}

export function createDeliveryService(options: DeliveryServiceOptions): DeliveryService {
  const now = options.now ?? (() => new Date());
  const id = options.id ?? randomUUID;
  const superadminEmails = new Set(options.superadminEmails.map(normalizedEmail));
  const transact = <T>(work: (state: DeliveryOrderingState) => T | Promise<T>): Promise<T> => options.repository.transact(work);

  function operator(state: DeliveryOrderingState, actor: IndividualActor, storeId: string): void {
    identifier(storeId);
    const email = normalizedEmail(actor.email);
    if (!superadminEmails.has(email) && !state.memberships.some(membership => membership.storeId === storeId && normalizedEmail(membership.email) === email)) {
      fail("forbidden", "Questa operazione è riservata agli operatori della sede.");
    }
    if (!lookup(state.stores, storeId)) fail("not_found", "Sede non trovata.");
  }

  async function progress(actor: IndividualActor | null, orderId: string, action: "dispatch" | "complete"): Promise<void> {
    const user = authenticated(actor);
    await transact(state => {
      const order = getOrder(state, orderId);
      requireAssignment(state, user, order);
      if (!isRiderProgressAllowed(state, user, order, action)) fail("invalid_transition", "La consegna richiede l'intervento del ristorante o non consente questo passaggio.");
    });
    // The canonical gateway must repeat the guard under its write lock.
    // This preliminary read never grants permission across a reassignment race.
    await options.progress(user, orderId, action);
  }

  return {
    async session(actor) {
      if (!actor) return { actor: null, storeIds: [] };
      const user = authenticated(actor);
      return transact(state => ({ actor: structuredClone(user), storeIds: [...new Set(Object.values(state.delivery?.riders ?? {})
        .filter(rider => rider.active && normalizedEmail(rider.email) === normalizedEmail(user.email))
        .map(rider => rider.storeId))].sort() }));
    },

    async deliveries(actor) {
      const user = authenticated(actor);
      return transact(state => Object.values(state.orders)
        .filter(order => actionable(order) && ownsAssignment(state, user, order))
        .sort((first, second) => first.quote.slotStartsAt.localeCompare(second.quote.slotStartsAt) || first.id.localeCompare(second.id))
        .filter(actionable)
        .map(order => toRiderDelivery(state, order)));
    },

    async riders(actor, storeId) {
      const user = authenticated(actor);
      return transact(state => {
        operator(state, user, storeId);
        return structuredClone(Object.values(state.delivery?.riders ?? {}).filter(rider => rider.storeId === storeId)
          .sort((first, second) => first.name.localeCompare(second.name, "it") || first.id.localeCompare(second.id)));
      });
    },

    async inviteRider(actor, storeId, inputEmail, inputName) {
      const user = authenticated(actor);
      const email = normalizedEmail(text(inputEmail, 254));
      const name = text(inputName, 120);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("invalid_input", "Indirizzo email non valido.");
      return transact(state => {
        operator(state, user, storeId);
        const data = ensureData(state);
        const existing = Object.values(data.riders).find(rider => rider.storeId === storeId && normalizedEmail(rider.email) === email);
        if (existing) return structuredClone(existing);
        const riderId = identifier(id());
        if (lookup(data.riders, riderId)) fail("service_unavailable", "Identificatore rider già esistente.");
        const rider: DeliveryRider = { id: riderId, storeId, email, name, active: true };
        data.riders[riderId] = rider;
        return structuredClone(rider);
      });
    },

    async setRiderActive(actor, storeId, riderId, active) {
      const user = authenticated(actor);
      identifier(riderId);
      if (typeof active !== "boolean") fail("invalid_input", "Stato rider non valido.");
      return transact(state => {
        operator(state, user, storeId);
        const rider = lookup(state.delivery?.riders, riderId);
        if (!rider) fail("not_found", "Rider non trovato.");
        if (rider.storeId !== storeId) fail("forbidden", "Il rider appartiene a un'altra sede.");
        rider.active = active;
        return structuredClone(rider);
      });
    },

    async assignments(actor, storeId) {
      const user = authenticated(actor);
      return transact(state => {
        operator(state, user, storeId);
        return Object.values(state.delivery?.assignments ?? {})
          .filter(assignment => lookup(state.orders, assignment.orderId)?.storeId === storeId)
          .sort((first, second) => first.orderId.localeCompare(second.orderId))
          .map(assignment => ({ orderId: assignment.orderId, riderId: assignment.riderId,
            issue: structuredClone(lookup(state.delivery?.issues, assignment.orderId) ?? null) }));
      });
    },

    async assign(actor, orderId, riderId) {
      const user = authenticated(actor);
      identifier(riderId);
      await transact(state => {
        const order = getOrder(state, orderId);
        operator(state, user, order.storeId);
        if (!actionable(order)) fail("invalid_transition", "Puoi assegnare solo consegne pronte o già in consegna.");
        const rider = lookup(state.delivery?.riders, riderId);
        if (!rider) fail("not_found", "Rider non trovato.");
        if (rider.storeId !== order.storeId || !rider.active) fail("forbidden", "Scegli un rider attivo della stessa sede.");
        const data = ensureData(state);
        if (lookup(data.assignments, orderId)?.riderId === riderId && !lookup(data.issues, orderId)) return;
        data.assignments[orderId] = { orderId, riderId, assignedAt: now().toISOString() };
        delete data.issues[orderId];
        changed(state, order);
      });
    },

    dispatch(actor, orderId) { return progress(actor, orderId, "dispatch"); },
    complete(actor, orderId) { return progress(actor, orderId, "complete"); },

    async reportFailure(actor, orderId, inputNote) {
      const user = authenticated(actor);
      const note = text(inputNote, 2000);
      await transact(state => {
        const order = getOrder(state, orderId);
        requireAssignment(state, user, order);
        if (order.cart.mode !== "delivery" || order.status !== "out_for_delivery") fail("invalid_transition", "Puoi segnalare un problema solo durante la consegna.");
        const data = ensureData(state);
        if (lookup(data.issues, orderId)?.note === note) return;
        data.issues[orderId] = { note, reportedAt: now().toISOString() };
        changed(state, order);
      });
    }
  };
}
