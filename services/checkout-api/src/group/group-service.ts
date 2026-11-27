import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { GroupCheckout, GroupContext, GroupCreate, GroupFulfillment, GroupOperationalOrder, GroupOrderingApi, GroupParticipant, GroupPaymentResult, GroupQuote, GroupSharePayment, GroupSnapshot, IndividualActor, IndividualCart, IndividualCheckoutResult } from "@pizzaos/domain";
import type { GroupCanonicalContext, OrderingPayments, OrderingRepository, OrderingService, OrderingState, ProviderPayment } from "../ordering-contract";
import { fail, fulfillment, identifier, invalid, lines, revision, shape, text } from "./group-validation";
export { GroupOrderingError } from "./group-validation";

export interface GroupAccess { actor: IndividualActor | null; capability?: string; networkKey?: string; }
type Input<K extends keyof GroupOrderingApi> = Parameters<GroupOrderingApi[K]>;
export interface GroupOrderingService {
  context(access: GroupAccess, storeId: string): Promise<GroupContext>;
  activate(access: GroupAccess, storeId: string, groupId: string | null): Promise<GroupContext>;
  create(access: GroupAccess, input: GroupCreate): Promise<GroupSnapshot>;
  read(access: GroupAccess, id: string, inviteToken?: string): Promise<GroupSnapshot>;
  join(access: GroupAccess, id: string, input: Input<"join">[1]): Promise<GroupSnapshot>;
  rename(access: GroupAccess, id: string, input: Input<"rename">[1]): Promise<GroupSnapshot>;
  replaceLines(access: GroupAccess, id: string, input: Input<"replaceLines">[1]): Promise<GroupSnapshot>;
  removeParticipant(access: GroupAccess, id: string, input: Input<"removeParticipant">[1]): Promise<GroupSnapshot>;
  close(access: GroupAccess, id: string, input: Input<"close">[1]): Promise<GroupSnapshot>;
  quote(access: GroupAccess, id: string, input: Input<"quote">[1]): Promise<GroupQuote>;
  checkout(access: GroupAccess, id: string, input: GroupCheckout): Promise<IndividualCheckoutResult>;
  recover(access: GroupAccess, id: string): Promise<IndividualCheckoutResult>;
  payShare(access: GroupAccess, id: string, input: Input<"payShare">[1]): Promise<GroupPaymentResult>;
  reconcileShare(access: GroupAccess, id: string, paymentId: string): Promise<GroupPaymentResult>;
  refundShare(access: GroupAccess, id: string, input: Input<"refundShare">[1]): Promise<GroupSnapshot>;
  operations(actor: IndividualActor | null, storeId: string): Promise<GroupOperationalOrder[]>;
  refund(actor: IndividualActor | null, id: string, input: { paymentId?: string; idempotencyKey: string; cashReturned?: boolean }): Promise<GroupOperationalOrder>;
  tick(): Promise<void>;
}
interface Member extends GroupParticipant { actorId?: string; capabilityHash?: string; }
interface Charge extends GroupSharePayment {
  actor: IndividualActor; compositionHash?: string; key: string; clientKey: string; kind: "share" | "balance";
  recipe: Record<string, number>; quotedLines: NonNullable<GroupParticipant["quotedLines"]>;
  orderId?: string; productCents?: number; providerId?: string; expiresAt?: string; refundId?: string; refundKey?: string; refundAttempt?: number;
}
interface Frozen { input: GroupCheckout; cart: IndividualCart; actor: IndividualActor; pricing: GroupCanonicalContext; }
interface RecordGroup {
  id: string; storeId: string; hostId?: string; revision: number; status: GroupSnapshot["status"];
  inviteToken: string; inviteHash: string; participants: Member[]; payments?: Charge[];
  canonicalKey: string; creationKey?: string; creationHash?: string; fulfillment?: GroupFulfillment;
  orderRefundAttempts?: Record<string, number>;
  confirmed?: { revision: number; fingerprint: string; fulfillmentHash: string };
  frozen?: Frozen; orderId?: string; previousOrderIds?: string[]; checkoutCompleted?: boolean;
}
interface GroupState extends OrderingState { groupRefundRequests?: Record<string, { fingerprint: string; paymentIds: string[] }>; groups?: Record<string, RecordGroup>; groupContexts?: Record<string, string | null>; groupLimits?: Record<string, number[]>; }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
function hash(value: unknown): string { return createHash("sha256").update(stable(value)).digest("hex"); }
function matches(secret: string | undefined, digest: string): boolean { return typeof secret === "string" && secret.length <= 500 && digest.length === 64 && timingSafeEqual(Buffer.from(hash(secret), "hex"), Buffer.from(digest, "hex")); }
function scope(access: GroupAccess): string { if (access.actor) return `actor:${access.actor.id}`; if (access.capability) return `guest:${hash(access.capability)}`; return fail("unauthorized", 401, "Riapri il carrello per continuare."); }
function member(group: RecordGroup, access: GroupAccess): Member | undefined {
  const actorMember = access.actor && group.participants.find(person => person.actorId === access.actor!.id || (person.host && group.hostId === access.actor!.id));
  if (actorMember) return actorMember;
  const own = group.participants.find(person => person.capabilityHash && matches(access.capability, person.capabilityHash));
  if (own?.actorId && own.actorId !== access.actor?.id) return undefined;
  if (own && access.actor) { own.actorId = access.actor.id; if (own.host) group.hostId = access.actor.id; }
  return own;
}
function requireHost(group: RecordGroup, access: GroupAccess): Member { const own = member(group, access); if (!own?.host) fail("forbidden", 403, "Solo il creatore può gestire il gruppo."); return own; }
function editable(group: RecordGroup) { if (group.frozen || group.status === "submitted" || group.status === "cancelled") fail("checkout_pending", 409, "Il carrello è in conferma o è già stato concluso."); }
function expected(group: RecordGroup, value: number) { if (group.revision !== value) fail("revision_conflict", 409, "Il gruppo è cambiato: aggiorna il riepilogo."); }
function busyCharge(group: RecordGroup, participantId: string) { return group.payments?.find(payment => payment.participantId === participantId && ["processing", "requires_action", "paid"].includes(payment.status)); }
function publicPayment(payment: Charge, canRefund: boolean, own = false): GroupSharePayment { return { id: payment.id, participantId: payment.participantId, participantName: payment.participantName, amountCents: payment.amountCents, status: payment.status, method: payment.method ?? "card", canRefund, own }; }
function snapshot(group: RecordGroup, access: GroupAccess, invitation?: string): GroupSnapshot {
  const own = member(group, access);
  const historical = Boolean(access.actor && group.payments?.some(payment => payment.actor.id === access.actor!.id));
  if (!own && !historical && !matches(invitation, group.inviteHash)) fail("forbidden", 403, "Invito o accesso personale non valido.");
  const payments = (group.payments ?? []).map(payment => publicPayment(payment, group.status !== "submitted" && !group.frozen && payment.actor.id === access.actor?.id && ["paid", "refund_failed"].includes(payment.status), payment.actor.id === access.actor?.id));
  return { id: group.id, storeId: group.storeId, status: group.status, revision: group.revision,
    participants: group.participants.map(person => { const current = [...payments].reverse().find(payment => payment.participantId === person.id && !["refunded", "failed"].includes(payment.status)); const quoted = group.payments?.find(payment => payment.id === current?.id)?.quotedLines; return { id: person.id, name: person.name, host: person.host, lines: structuredClone(person.lines), ...(current ? { payment: current } : {}), ...(quoted?.length ? { quotedLines: structuredClone(quoted) } : {}) }; }),
    role: own?.host ? "host" : own ? "participant" : "visitor", participantId: own?.id ?? null,
    ...(own ? { inviteToken: group.inviteToken } : {}), ...(group.orderId ? { orderId: group.orderId } : {}), checkoutPending: Boolean(group.frozen && !group.checkoutCompleted),
    ...(own?.host && group.fulfillment ? { fulfillment: structuredClone(group.fulfillment) } : {}), payments };
}
function projection(group: RecordGroup): GroupOperationalOrder {
  const all = (group.payments ?? []).map(payment => publicPayment(payment, ["paid", "refund_failed"].includes(payment.status)));
  return { id: group.id, storeId: group.storeId, status: group.status, revision: group.revision, participants: group.participants.map(person => { const paid = group.payments?.find(payment => payment.participantId === person.id && payment.status === "paid"); return { id: person.id, name: person.name, host: person.host, lines: structuredClone(person.lines), ...(paid ? { payment: all.find(payment => payment.id === paid.id), quotedLines: structuredClone(paid.quotedLines) } : {}) }; }), payments: all, ...(group.orderId ? { orderId: group.orderId } : {}) };
}
export function groupStoreId(state: OrderingState, groupId: string): string | undefined { const records = (state as GroupState).groups; return records && Object.hasOwn(records, groupId) ? records[groupId].storeId : undefined; }
export function validateGroupInput(operation: keyof GroupOrderingApi | "refund", value: unknown): void {
  if (operation === "create") { shape(value, ["storeId", "lines", "idempotencyKey"], ["fulfillment"]); identifier(value.storeId); lines(value.lines); text(value.idempotencyKey); if (value.fulfillment !== undefined) fulfillment(value.fulfillment); }
  else if (operation === "join") { shape(value, ["inviteToken"], ["lines", "idempotencyKey"]); text(value.inviteToken, 500); if (value.lines !== undefined) lines(value.lines); if (value.idempotencyKey !== undefined) text(value.idempotencyKey); }
  else if (operation === "rename") { shape(value, ["name", "revision"]); text(value.name, 120); revision(value.revision); }
  else if (operation === "replaceLines") { shape(value, ["participantId", "revision", "lines"]); identifier(value.participantId); revision(value.revision); lines(value.lines); }
  else if (operation === "removeParticipant") { shape(value, ["participantId", "revision"]); identifier(value.participantId); revision(value.revision); }
  else if (operation === "close") { shape(value, ["revision"]); revision(value.revision); }
  else if (operation === "quote") { shape(value, ["revision", "fulfillment"]); revision(value.revision); fulfillment(value.fulfillment); }
  else if (operation === "checkout") { shape(value, ["revision", "fingerprint", "fulfillment", "phone", "method", "idempotencyKey"]); revision(value.revision); text(value.fingerprint); text(value.phone, 100); text(value.idempotencyKey); fulfillment(value.fulfillment); if (value.method !== "cash" && value.method !== "card") invalid(); }
  else if (operation === "payShare") { shape(value, ["revision", "idempotencyKey"]); revision(value.revision); text(value.idempotencyKey); }
  else if (operation === "refundShare" || operation === "refund") { shape(value, operation === "refundShare" ? ["paymentId", "idempotencyKey"] : ["idempotencyKey"], operation === "refund" ? ["paymentId", "cashReturned"] : []); if (value.paymentId !== undefined) identifier(value.paymentId); text(value.idempotencyKey); if (value.cashReturned !== undefined && typeof value.cashReturned !== "boolean") invalid(); }
  else if (operation === "activate") { shape(value, ["storeId", "groupId"]); identifier(value.storeId); if (value.groupId !== null) identifier(value.groupId); }
  else if (operation === "recover" || operation === "reconcileShare") shape(value, []);
}

export function createGroupOrderingService(options: { repository: OrderingRepository; ordering: OrderingService; payments?: OrderingPayments; now?: () => Date; id?: () => string; token?: () => string }): GroupOrderingService {
  const now = options.now ?? (() => new Date()); const id = options.id ?? randomUUID; const token = options.token ?? (() => randomBytes(32).toString("base64url"));
  const capability = () => { if (!options.ordering.group) fail("service_unavailable", 503, "Servizio gruppi non disponibile."); return options.ordering.group; };
  const provider = () => { if (!options.payments) fail("service_unavailable", 503, "Pagamento non disponibile."); return options.payments; };
  const inFlight = new Map<string, Promise<ProviderPayment | undefined>>();
  function touch(group: RecordGroup) { group.revision++; delete group.confirmed; }
  function limit(state: GroupState, key: string, maximum: number) {
    const limits = state.groupLimits ??= {};
    for (const [oldKey, instants] of Object.entries(limits)) if (!instants.some(value => value > now().getTime() - 600000)) delete limits[oldKey];
    const instants = (limits[key] ?? []).filter(value => value > now().getTime() - 600000);
    if (instants.length >= maximum) fail("rate_limited", 429, "Troppe richieste. Attendi qualche minuto e riprova.");
    limits[key] = [...instants, now().getTime()];
  }
  function nickname(group?: RecordGroup): string {
    const foods = ["Basilico", "Pomodoro", "Carciofo", "Peperone", "Rosmarino", "Oliva", "Rucola", "Mozzarella"];
    const moods = ["Allegro", "Felice", "Gentile", "Vivace", "Gioioso", "Solare", "Sorridente", "Curioso"];
    const used = new Set(group?.participants.map(person => person.name)); const offset = randomBytes(2).readUInt16BE();
    for (let i = 0; i < 64; i++) { const n = (offset + i) % 64; const name = `${foods[n % 8]} ${moods[Math.floor(n / 8)]}`; if (!used.has(name)) return name; }
    return `${foods[offset % 8]} ${moods[Math.floor(offset / 8) % 8]}`;
  }
  function records(state: GroupState) {
    const groups = state.groups ??= {};
    for (const group of Object.values(groups)) {
      Reflect.deleteProperty(group, "deadline"); group.payments ??= [];
      for (const person of group.participants) if (person.host && group.hostId && !person.actorId) person.actorId = group.hostId;
    }
    return groups;
  }
  function get(state: GroupState, groupId: string) {
    identifier(groupId); const groups = records(state); if (!Object.hasOwn(groups, groupId)) fail("not_found", 404, "Gruppo non disponibile.");
    const group = groups[groupId]; group.payments ??= [];
    for (const person of group.participants) if (person.host && group.hostId && !person.actorId) person.actorId = group.hostId;
    return group;
  }
  function pointer(access: GroupAccess, storeId: string) { return hash([scope(access), storeId]); }
  function contextIn(state: GroupState, access: GroupAccess, storeId: string): GroupContext {
    identifier(storeId); if (!Object.hasOwn(state.stores, storeId)) fail("not_found", 404, "Sede non disponibile.");
    const groups = Object.values(records(state)).filter(group => group.storeId === storeId && member(group, access));
    const contexts = state.groupContexts ??= {}; const key = pointer(access, storeId);
    const guestKey = access.capability ? hash([`guest:${hash(access.capability)}`, storeId]) : undefined;
    if (!Object.hasOwn(contexts, key) && guestKey && Object.hasOwn(contexts, guestKey)) contexts[key] = contexts[guestKey];
    const active = groups.find(group => group.id === contexts[key] && !["submitted", "cancelled"].includes(group.status));
    return { activeId: active?.id ?? null, groups: groups.map(group => snapshot(group, access)) };
  }
  async function work<T>(groupId: string, action: (group: RecordGroup, state: GroupState) => T | Promise<T>) {
    return options.repository.transact(async (state: GroupState) => {
      const group = get(state, groupId); const previousRevision = group.revision;
      const result = await action(group, state);
      if (group.revision !== previousRevision) { state.cursor++; state.events.push({ cursor: state.cursor, orderId: group.orderId ?? group.id, storeId: group.storeId, revision: group.revision }); }
      return result;
    });
  }
  function cart(group: RecordGroup, details: GroupFulfillment): IndividualCart {
    return { storeId: group.storeId, ...structuredClone(details), lines: group.participants.flatMap(person => person.lines.map(line => ({ ...structuredClone(line), notes: `Per ${person.name}${line.notes ? ` · ${line.notes}` : ""}` }))) };
  }
  function pricing(group: RecordGroup): GroupCanonicalContext {
    let index = 0; const context: GroupCanonicalContext = { groupId: group.id, reservationIds: [], lockedLines: [], prepaidCents: 0 };
    for (const person of group.participants) {
      const paid = group.payments?.find(payment => payment.participantId === person.id && payment.kind === "share" && payment.status === "paid");
      if (paid) { context.prepaidCents += paid.amountCents; context.reservationIds.push(paid.id); for (let n = 0; n < person.lines.length; n++) context.lockedLines.push({ index: index + n, line: paid.quotedLines[n], recipe: n === 0 ? paid.recipe : {} }); }
      index += person.lines.length;
    }
    return context;
  }
  function updateSettlement(group: RecordGroup, state: GroupState) {
    const orderIds = new Set([group.orderId, ...(group.payments ?? []).map(payment => payment.orderId)].filter((value): value is string => Boolean(value)));
    for (const orderId of orderIds) {
      const order = state.orders[orderId]; if (!order?.settlement) continue;
      const before = stable([order.settlement, order.payment]);
    const charges = (group.payments ?? []).filter(payment => payment.orderId === order.id); const additions = (order.additions ?? []).filter(addition => addition.applied); const sum = (statuses: string[]) => charges.filter(payment => statuses.includes(payment.status)).reduce((value, payment) => value + payment.amountCents, 0);
    order.settlement.refundedCents = sum(["refunded"]) + additions.filter(addition => addition.payment === "refunded").reduce((total, addition) => total + addition.deltaCents, 0); order.settlement.refundedProductCents = charges.filter(payment => payment.status === "refunded").reduce((total, payment) => total + (payment.productCents ?? payment.amountCents), 0) + additions.filter(addition => addition.payment === "refunded").reduce((total, addition) => total + addition.deltaCents, 0); order.settlement.refundPendingCents = sum(["refund_pending"]) + additions.filter(addition => addition.payment === "refund_pending").reduce((total, addition) => total + addition.deltaCents, 0); order.settlement.refundFailedCents = sum(["refund_failed"]) + additions.filter(addition => addition.payment === "refund_failed").reduce((total, addition) => total + addition.deltaCents, 0); order.settlement.paidCents = sum(["paid", "refund_pending", "refund_failed", "refunded"]) + additions.filter(addition => ["paid", "cash_paid", "refunded", "refund_pending", "refund_failed"].includes(addition.payment)).reduce((total, addition) => total + addition.deltaCents, 0);
    if (order.status === "cancelled") order.payment = order.settlement.refundFailedCents ? "refund_failed" : order.settlement.refundPendingCents ? "refund_pending" : order.settlement.refundedCents ? "refunded" : order.payment;
      if (before !== stable([order.settlement, order.payment])) { order.revision++; state.cursor++; state.events.push({ cursor: state.cursor, orderId: order.id, storeId: order.storeId, revision: order.revision }); }
    }
  }
  function notify(group: RecordGroup, state: GroupState, payment: Charge) {
    if (!["paid", "refunded", "refund_failed"].includes(payment.status)) return;
    const status = payment.status as "paid" | "refunded" | "refund_failed";
    const notifications = state.groupPaymentNotifications ??= [];
    const notificationId = `${payment.id}:${status}:${payment.refundAttempt ?? 0}`;
    if (notifications.some(event => event.id === notificationId)) return;
    notifications.push({ id: notificationId, groupId: group.id, storeId: group.storeId, payer: { name: payment.actor.name, email: payment.actor.email }, participantName: payment.participantName ?? "", amountCents: payment.amountCents, status, occurredAt: now().toISOString(), lines: structuredClone(payment.quotedLines), attempt: payment.refundAttempt ?? 0 });
  }
  async function settleCharge(groupId: string, paymentId: string): Promise<ProviderPayment | undefined> {
    const existing = inFlight.get(paymentId); if (existing) return existing;
    const task = (async () => {
      const charge = await work(groupId, group => structuredClone(group.payments!.find(payment => payment.id === paymentId)));
      if (!charge || !["processing", "requires_action"].includes(charge.status) || charge.method === "cash") return;
      let remote: ProviderPayment;
      try {
        remote = charge.providerId ? await provider().read(charge.providerId) : await provider().create({ orderId: groupId, totalCents: charge.amountCents, key: charge.key });
        if (charge.expiresAt && Date.parse(charge.expiresAt) <= now().getTime() && ["processing", "requires_action"].includes(remote.status)) remote = await provider().cancel(remote.id);
      } catch (failure) {
        if (failure && typeof failure === "object" && "definitive" in failure && failure.definitive === true) await work(groupId, (group, state) => { const current = group.payments!.find(payment => payment.id === paymentId)!; current.status = "failed"; delete state.groupReservations?.[current.id]; touch(group); });
        return;
      }
      await work(groupId, (group, state) => {
        const current = group.payments!.find(payment => payment.id === paymentId)!; if (!["processing", "requires_action"].includes(current.status)) return;
        const status = remote.status === "cancelled" ? "failed" : remote.status; const changed = current.status !== status || current.providerId !== remote.id;
        current.providerId = remote.id; current.status = status; if (status === "paid") delete current.expiresAt; if (status === "failed") delete state.groupReservations?.[current.id]; if (changed) { touch(group); if (status === "paid") notify(group, state, current); }
      });
      return remote;
    })();
    inFlight.set(paymentId, task); try { return await task; } finally { inFlight.delete(paymentId); }
  }
  async function settleRefund(groupId: string, paymentId: string) {
    const original = await work(groupId, group => structuredClone(group.payments!.find(payment => payment.id === paymentId)));
    if (!original || original.status !== "refund_pending" || !original.providerId || original.method === "cash") return;
    try {
      const result = original.refundId ? await provider().readRefund(original.refundId) : await provider().refund({ intentId: original.providerId, amountCents: original.amountCents, key: original.refundKey! });
      await work(groupId, (group, state) => {
        const current = group.payments!.find(payment => payment.id === paymentId)!; if (current.refundKey !== original.refundKey || current.status !== "refund_pending") return;
        current.refundId = result.id; current.status = result.status === "succeeded" ? "refunded" : result.status === "failed" ? "refund_failed" : "refund_pending"; touch(group); notify(group, state, current); updateSettlement(group, state);
      });
    } catch (failure) {
      if (failure && typeof failure === "object" && "definitive" in failure && failure.definitive === true) await work(groupId, (group, state) => { const current = group.payments!.find(payment => payment.id === paymentId)!; if (current.refundKey === original.refundKey) { current.status = "refund_failed"; touch(group); notify(group, state, current); updateSettlement(group, state); } });
    }
  }
  function refundRequest(state: GroupState, principal: string, groupId: string, input: { paymentId?: string; idempotencyKey: string; cashReturned?: boolean }) {
    const requests = state.groupRefundRequests ??= {}; const key = hash([principal, input.idempotencyKey]); const fingerprint = hash([groupId, input.paymentId ?? null, Boolean(input.cashReturned)]);
    const previous = requests[key]; if (previous && previous.fingerprint !== fingerprint) fail("idempotency_conflict", 409, "Questa richiesta riguarda già un altro rimborso.");
    return { previous, save(paymentIds: string[]) { requests[key] = { fingerprint, paymentIds }; } };
  }
  function requestRefund(group: RecordGroup, state: GroupState, payment: Charge, cashReturned: boolean) {
    if (["refunded", "refund_pending"].includes(payment.status)) return;
    if (!["paid", "refund_failed"].includes(payment.status)) fail("checkout_pending", 409, "Attendi la conferma del pagamento.");
    if (payment.method === "cash" && !cashReturned) invalid();
    const previousFailed = payment.status === "refund_failed";
    payment.status = payment.method === "cash" ? "refunded" : "refund_pending"; payment.refundAttempt = (payment.refundAttempt ?? 0) + 1;
    if (!payment.refundKey || previousFailed) payment.refundKey = `group-refund:${randomBytes(32).toString("base64url")}`;
    if (previousFailed) delete payment.refundId;
    delete state.groupReservations?.[payment.id];
    if (group.status !== "submitted" && payment.kind === "share") { const person = group.participants.find(person => person.id === payment.participantId); if (person?.host) person.lines = []; else group.participants = group.participants.filter(person => person.id !== payment.participantId); }
    if (group.status === "closed") group.status = "open";
    touch(group); if (payment.method === "cash") notify(group, state, payment); updateSettlement(group, state);
  }
  async function synchronize(groupId: string, result: IndividualCheckoutResult) {
    await work(groupId, (group, state) => {
      if (!group.frozen) return;
      if (result.order.status === "cancelled" && result.order.payment === "failed") {
        group.status = "open"; (group.previousOrderIds ??= []).push(result.order.id); delete group.frozen; delete group.orderId; group.canonicalKey = `group:${randomBytes(32).toString("base64url")}`;
        for (const payment of group.payments!.filter(payment => payment.kind === "share" && payment.status === "paid")) { state.groupReservations ??= {}; state.groupReservations[payment.id] = { storeId: group.storeId, recipe: structuredClone(payment.recipe) }; }
        touch(group); return;
      }
      group.orderId = result.order.id; if (!result.order.submittedAt) return;
      if (group.status !== "submitted") { group.status = "submitted"; touch(group); }
      group.checkoutCompleted = true;
      for (const payment of group.payments!.filter(payment => payment.kind === "share" && payment.status === "paid" && group.participants.some(person => person.id === payment.participantId))) payment.orderId = result.order.id;
      if (!group.payments!.some(payment => payment.kind === "balance" && payment.orderId === result.order.id)) {
        let offset = 0;
        for (const person of group.participants) {
          const paid = group.payments!.some(payment => payment.kind === "share" && payment.participantId === person.id && payment.status === "paid");
          const rows = result.order.quote.lines.slice(offset, offset + person.lines.length);
          let amountCents = paid ? 0 : rows.reduce((total, row, index) => total + (result.order.quote.promotions?.lines[offset + index]?.netCents ?? row.unitCents * row.quantity), 0);
          const productCents = amountCents;
          if (person.host) amountCents += result.order.quote.deliveryCents;
          if (amountCents > 0) group.payments!.push({ id: id(), participantId: person.id, participantName: person.name, amountCents, status: result.order.method === "cash" && result.order.payment !== "cash_paid" ? "processing" : "paid", method: result.order.method, actor: structuredClone(group.frozen.actor), key: "", clientKey: "", kind: "balance", orderId: result.order.id, productCents, recipe: {}, quotedLines: structuredClone(rows), ...(result.order.providerIntentId ? { providerId: result.order.providerIntentId } : {}) });
          offset += person.lines.length;
        }
      }
      updateSettlement(group, state);
    });
  }
  async function submit(groupId: string) {
    const frozen = await work(groupId, group => structuredClone(group.frozen)); if (!frozen) fail("not_found", 404, "Nessun checkout da recuperare.");
    const canonicalKey = await work(groupId, group => group.canonicalKey);
    try {
      const result = await capability().checkout(frozen.actor, { cart: frozen.cart, fingerprint: frozen.input.fingerprint, phone: frozen.input.phone, method: frozen.input.method, idempotencyKey: canonicalKey }, frozen.pricing);
      await synchronize(groupId, result); return result;
    } catch (failure) {
      const status = failure && typeof failure === "object" && "statusCode" in failure ? failure.statusCode : undefined;
      if (typeof status === "number" && status >= 400 && status < 500) await work(groupId, (group, state) => {
        if (group.canonicalKey !== canonicalKey || state.idempotency[JSON.stringify([frozen.actor.id, canonicalKey])]) return;
        delete group.frozen; group.status = "open"; touch(group);
      });
      throw failure;
    }
  }
  async function refundCancelled(orderId: string) {
    const groupId = await options.repository.transact((state: GroupState) => Object.values(records(state)).find(group => group.orderId === orderId || group.previousOrderIds?.includes(orderId))?.id); if (!groupId) return;
    const paymentIds = await work(groupId, (group, state) => { const order = state.orders[orderId]; if (order?.status !== "cancelled") return [];
      if (!order.submittedAt && order.providerIntentId && (order.settlement?.remainingCents ?? 0) > 0 && !group.payments!.some(payment => payment.orderId === orderId)) {
        const own = group.participants.find(person => person.host)!;
        group.payments!.push({ id: id(), participantId: own.id, participantName: own.name, amountCents: order.settlement!.remainingCents, status: "paid", method: "card", actor: { id: order.customerId, name: order.contact.name, email: order.contact.email }, key: "", clientKey: "", kind: "balance", orderId, recipe: {}, quotedLines: structuredClone(order.quote.lines), providerId: order.providerIntentId });
      }
      const attempts = group.orderRefundAttempts ??= {}; const retryFailed = order.refundAttempt > (attempts[orderId] ?? 0); attempts[orderId] = order.refundAttempt;
      for (const payment of group.payments!.filter(payment => payment.orderId === orderId && (payment.status === "paid" || (retryFailed && payment.status === "refund_failed")) && payment.method !== "cash")) requestRefund(group, state, payment, false); return group.payments!.filter(payment => payment.status === "refund_pending").map(payment => payment.id); });
    for (const paymentId of paymentIds) await settleRefund(groupId, paymentId);
    await work(groupId, (group, state) => updateSettlement(group, state));
  }
  options.ordering.group?.attach({ refundOrder: refundCancelled });
  const service: GroupOrderingService = {
    context: async (access, storeId) => options.repository.transact((state: GroupState) => contextIn(state, access, storeId)),
    activate: async (access, storeId, groupId) => options.repository.transact((state: GroupState) => {
      const context = contextIn(state, access, storeId);
      if (groupId !== null && !context.groups.some(group => group.id === groupId && !["cancelled", "submitted"].includes(group.status))) fail("forbidden", 403, "Carrello non disponibile.");
      state.groupContexts![pointer(access, storeId)] = groupId; return contextIn(state, access, storeId);
    }),
    create: async (access, input) => {
      validateGroupInput("create", input);
      return options.repository.transact((state: GroupState) => {
        scope(access); if (!Object.hasOwn(state.stores, input.storeId)) fail("not_found", 404, "Sede non disponibile.");
        const previous = Object.values(records(state)).find(group => group.storeId === input.storeId && group.creationKey === input.idempotencyKey && member(group, access)?.host);
        if (previous) { if (previous.creationHash !== hash(input)) fail("idempotency_conflict", 409, "Questa richiesta crea già un altro carrello."); return snapshot(previous, access); }
        limit(state, `create:${scope(access)}`, 5);
        if (access.networkKey) limit(state, `create-network:${access.networkKey}`, 100);
        const groupId = id(); const inviteToken = token();
        const group: RecordGroup = { id: groupId, storeId: input.storeId, hostId: access.actor?.id, revision: 1, status: "open", inviteToken, inviteHash: hash(inviteToken), canonicalKey: `group:${randomBytes(32).toString("base64url")}`, creationKey: input.idempotencyKey, creationHash: hash(input), ...(input.fulfillment ? { fulfillment: structuredClone(input.fulfillment) } : {}), participants: [{ id: id(), name: access.actor?.name ?? nickname(), host: true, lines: structuredClone(input.lines), ...(access.actor ? { actorId: access.actor.id } : {}), ...(access.capability ? { capabilityHash: hash(access.capability) } : {}) }], payments: [] };
        identifier(group.id); if (Object.hasOwn(records(state), group.id)) fail("revision_conflict", 409, "Riprova la creazione.");
        records(state)[group.id] = group; state.groupContexts ??= {}; state.groupContexts[pointer(access, input.storeId)] = group.id; return snapshot(group, access);
      });
    },
    read: async (access, groupId, inviteToken) => {
      const order = await work(groupId, (group, state) => { snapshot(group, access, inviteToken); const orderId = group.orderId ?? (group.frozen && state.idempotency[JSON.stringify([group.frozen.actor.id, group.canonicalKey])]?.orderId); return orderId ? state.orders[orderId] : undefined; });
      if (order) await synchronize(groupId, { order });
      return work(groupId, group => snapshot(group, access, inviteToken));
    },
    join: async (access, groupId, input) => {
      validateGroupInput("join", input);
      return work(groupId, (group, state) => {
        scope(access); if (!matches(input.inviteToken, group.inviteHash)) fail("forbidden", 403, "Invito non valido.");
        const previous = member(group, access); if (previous) return snapshot(group, access);
        editable(group); if (group.status !== "open") fail("group_closed", 409, "Il carrello è chiuso alle nuove scelte.");
        limit(state, `join:${scope(access)}`, 100);
        if (access.networkKey) limit(state, `join-network:${access.networkKey}`, 500);
        if (group.participants.length >= 100 || group.participants.reduce((sum, person) => sum + person.lines.length, input.lines?.length ?? 0) > 100) invalid();
        group.participants.push({ id: id(), name: access.actor?.name ?? nickname(group), host: false, lines: structuredClone(input.lines ?? []), ...(access.actor ? { actorId: access.actor.id } : {}), ...(access.capability ? { capabilityHash: hash(access.capability) } : {}) });
        touch(group); state.groupContexts ??= {}; state.groupContexts[pointer(access, group.storeId)] = group.id; return snapshot(group, access);
      });
    },
    rename: async (access, groupId, input) => {
      validateGroupInput("rename", input); return work(groupId, group => {
        const own = member(group, access); if (!own) fail("forbidden", 403, "Entra nel carrello per cambiare nome.");
        editable(group); expected(group, input.revision); own.name = input.name.trim(); touch(group); return snapshot(group, access);
      });
    },
    replaceLines: async (access, groupId, input) => {
      validateGroupInput("replaceLines", input); return work(groupId, group => {
        const own = member(group, access); if (!own || (!own.host && own.id !== input.participantId)) fail("forbidden", 403, "Puoi modificare solo le tue scelte.");
        editable(group); expected(group, input.revision); if (!own.host && group.status !== "open") fail("group_closed", 409, "Il carrello è chiuso alle nuove scelte.");
        const target = group.participants.find(person => person.id === input.participantId); if (!target) fail("not_found", 404, "Partecipante non disponibile.");
        if (busyCharge(group, target.id)) fail("checkout_pending", 409, "Le scelte pagate o con pagamento in corso non si modificano.");
        if (group.participants.reduce((sum, person) => sum + (person === target ? input.lines.length : person.lines.length), 0) > 100) invalid();
        target.lines = structuredClone(input.lines); touch(group); return snapshot(group, access);
      });
    },
    removeParticipant: async (access, groupId, input) => {
      validateGroupInput("removeParticipant", input); return work(groupId, group => {
        requireHost(group, access); editable(group); expected(group, input.revision);
        const target = group.participants.find(person => person.id === input.participantId); if (!target) fail("not_found", 404, "Partecipante non disponibile.");
        if (target.host) invalid(); if (busyCharge(group, target.id)) fail("checkout_pending", 409, "Non puoi rimuovere una quota pagata o in verifica.");
        group.participants = group.participants.filter(person => person.id !== target.id); touch(group); return snapshot(group, access);
      });
    },
    close: async (access, groupId, input) => { validateGroupInput("close", input); return work(groupId, group => { requireHost(group, access); editable(group); expected(group, input.revision); if (group.status === "open") { group.status = "closed"; touch(group); } return snapshot(group, access); }); },
    quote: async (access, groupId, input) => {
      validateGroupInput("quote", input); return work(groupId, (group, state) => {
        requireHost(group, access); if (!access.actor) fail("unauthorized", 401, "Accedi per confermare l'ordine."); editable(group); expected(group, input.revision);
        if (group.payments!.some(payment => ["processing", "requires_action"].includes(payment.status))) fail("checkout_pending", 409, "Attendi o recupera i pagamenti in verifica.");
        const context = pricing(group); const result = capability().quote(state, cart(group, input.fulfillment), context, access.actor);
        group.fulfillment = structuredClone(input.fulfillment); group.confirmed = { revision: group.revision, fingerprint: result.quote.fingerprint, fulfillmentHash: hash(input.fulfillment) };
        return { revision: group.revision, quote: result.quote, prepaidCents: context.prepaidCents, remainingCents: result.quote.totalCents - context.prepaidCents };
      });
    },
    checkout: async (access, groupId, input) => {
      validateGroupInput("checkout", input); await work(groupId, group => {
        requireHost(group, access); if (!access.actor) fail("unauthorized", 401, "Accedi per confermare l'ordine.");
        if (group.frozen) { if (hash(group.frozen.input) !== hash(input)) fail("idempotency_conflict", 409, "Recupera il tentativo già in corso."); return; }
        editable(group); expected(group, input.revision);
        if (group.payments!.some(payment => ["processing", "requires_action"].includes(payment.status))) fail("checkout_pending", 409, "Attendi la conferma delle quote.");
        if (!group.confirmed || group.confirmed.revision !== group.revision || group.confirmed.fingerprint !== input.fingerprint || group.confirmed.fulfillmentHash !== hash(input.fulfillment)) fail("price_changed", 409, "Verifica nuovamente il totale.");
        group.frozen = { input: structuredClone(input), cart: cart(group, input.fulfillment), actor: structuredClone(access.actor), pricing: pricing(group) };
      }); return submit(groupId);
    },
    recover: async (access, groupId) => { await work(groupId, group => { requireHost(group, access); if (!access.actor) fail("unauthorized", 401, "Accedi per recuperare l'ordine."); }); return submit(groupId); },
    payShare: async (access, groupId, input) => {
      validateGroupInput("payShare", input); if (!access.actor) fail("unauthorized", 401, "Accedi per pagare la tua quota.");
      const paymentId = await work(groupId, (group, state) => {
        const own = member(group, access); if (!own) fail("forbidden", 403, "Entra nel carrello per pagare.");
        const previous = group.payments!.find(payment => payment.actor.id === access.actor!.id && payment.clientKey === input.idempotencyKey && payment.kind === "share"); if (previous) { if (previous.participantId !== own.id || (previous.compositionHash && previous.compositionHash !== hash(own.lines))) fail("idempotency_conflict", 409, "Questa richiesta riguarda già un altro pagamento."); return previous.id; }
        editable(group); if (group.status !== "open") fail("group_closed", 409, "Il creatore sta confermando il carrello."); expected(group, input.revision);
        if (busyCharge(group, own.id)) fail("checkout_pending", 409, "Recupera il pagamento già in corso."); if (!own.lines.length) invalid();
        const priced = capability().price(state, group.storeId, own.lines); if (priced.subtotalCents < 50) fail("invalid_input", 400, "La quota inferiore a 0,50 euro resta nel saldo del creatore.");
        const charge: Charge = { id: id(), participantId: own.id, participantName: own.name, amountCents: priced.subtotalCents, status: "processing", method: "card", actor: structuredClone(access.actor!), key: `group-share:${randomBytes(32).toString("base64url")}`, clientKey: input.idempotencyKey, kind: "share", compositionHash: hash(own.lines), recipe: priced.recipe, quotedLines: priced.lines, expiresAt: new Date(now().getTime() + 600000).toISOString() };
        group.payments!.push(charge); state.groupReservations ??= {}; state.groupReservations[charge.id] = { storeId: group.storeId, recipe: structuredClone(priced.recipe) }; touch(group); return charge.id;
      });
      const remote = await settleCharge(groupId, paymentId);
      return work(groupId, group => { const payment = group.payments!.find(payment => payment.id === paymentId)!; return { group: snapshot(group, access), payment: publicPayment(payment, payment.status === "paid", true), ...(remote?.clientSecret && payment.status === "requires_action" ? { clientSecret: remote.clientSecret } : {}) }; });
    },
    reconcileShare: async (access, groupId, paymentId) => {
      await work(groupId, group => { const payment = group.payments!.find(payment => payment.id === paymentId); if (!payment || payment.actor.id !== access.actor?.id) fail("forbidden", 403, "Non puoi leggere il pagamento altrui."); });
      const remote = await settleCharge(groupId, paymentId); await settleRefund(groupId, paymentId);
      return work(groupId, group => { const payment = group.payments!.find(payment => payment.id === paymentId)!; return { group: snapshot(group, access), payment: publicPayment(payment, payment.status === "paid", true), ...(remote?.clientSecret && payment.status === "requires_action" ? { clientSecret: remote.clientSecret } : {}) }; });
    },
    refundShare: async (access, groupId, input) => {
      validateGroupInput("refundShare", input);
      const ids = await work(groupId, (group, state) => {
        const payment = group.payments!.find(payment => payment.id === input.paymentId); if (!payment || payment.actor.id !== access.actor?.id) fail("forbidden", 403, "Puoi rimborsare solo la quota che hai pagato.");
        const request = refundRequest(state, access.actor!.id, group.id, input); if (request.previous) return request.previous.paymentIds;
        if (group.status === "submitted") fail("forbidden", 403, "Per un rimborso dopo l'invio contatta la pizzeria.");
        if (group.frozen) fail("checkout_pending", 409, "Attendi la conferma del saldo in corso.");
        requestRefund(group, state, payment, false); request.save([payment.id]); return [payment.id];
      });
      for (const paymentId of ids) await settleRefund(groupId, paymentId);
      return work(groupId, group => snapshot(group, access));
    },
    operations: async (actor, storeId) => {
      await options.repository.transact((state: GroupState) => capability().authorizeOperator(state, actor, storeId));
      await service.tick();
      return options.repository.transact((state: GroupState) => Object.values(records(state)).filter(group => group.storeId === storeId && (group.payments?.some(payment => payment.status === "paid" || payment.refundKey) || group.orderId)).map(group => projection(group)));
    },
    refund: async (actor, groupId, input) => {
      validateGroupInput("refund", input);
      const ids = await work(groupId, (group, state) => {
        capability().authorizeOperator(state, actor, group.storeId);
        const request = refundRequest(state, actor!.id, group.id, input); if (request.previous) return request.previous.paymentIds;
        if (group.frozen && !group.checkoutCompleted) fail("checkout_pending", 409, "Recupera il saldo in corso prima del rimborso.");
        if (!input.paymentId && group.payments!.some(payment => payment.kind === "share" && ["processing", "requires_action"].includes(payment.status))) fail("checkout_pending", 409, "Recupera i pagamenti in verifica prima di annullare il gruppo.");
        if (!input.paymentId && group.orderId && !input.cashReturned && state.orders[group.orderId]?.additions?.some(addition => addition.applied && addition.method === "cash" && addition.payment === "cash_paid")) invalid();
        const payments = input.paymentId ? group.payments!.filter(payment => payment.id === input.paymentId) : group.payments!.filter(payment => ["paid", "refund_failed", "refund_pending", "refunded"].includes(payment.status));
        if (input.paymentId && !payments.length) fail("not_found", 404, "Quota non disponibile.");
        for (const payment of payments) requestRefund(group, state, payment, Boolean(input.cashReturned));
        if (!input.paymentId && group.status !== "submitted") { group.status = "cancelled"; group.participants = group.participants.filter(person => person.host).map(person => ({ ...person, lines: [] })); touch(group); }
        const paymentIds = payments.map(payment => payment.id); request.save(paymentIds); return paymentIds;
      });
      for (const paymentId of ids) await settleRefund(groupId, paymentId);
      const orderId = await work(groupId, group => group.orderId);
      if (!input.paymentId && orderId && actor) await capability().refundAdditions(actor, orderId, Boolean(input.cashReturned), input.idempotencyKey);
      return work(groupId, (group, state) => { updateSettlement(group, state); return projection(group); });
    },
    tick: async () => {
      const entries = await options.repository.transact((state: GroupState) => Object.values(records(state)).map(group => ({ id: group.id, pending: (group.payments ?? []).filter(payment => ["processing", "requires_action", "refund_pending"].includes(payment.status)).map(payment => ({ id: payment.id, refund: payment.status === "refund_pending", cash: payment.method === "cash" })), orderId: group.orderId })));
      for (const entry of entries) {
        for (const payment of entry.pending) if (!payment.cash) { if (payment.refund) await settleRefund(entry.id, payment.id); else await settleCharge(entry.id, payment.id); }
        if (entry.orderId) {
          const order = await options.repository.transact((state: GroupState) => state.orders[entry.orderId!]);
          if (order && !order.submittedAt && order.status === "cancelled") { await synchronize(entry.id, { order }); continue; }
          if (order?.status === "cancelled") await refundCancelled(entry.orderId);
          else if (order?.submittedAt) await synchronize(entry.id, { order });
          if (order?.payment === "cash_paid") await work(entry.id, (group, state) => { for (const payment of group.payments!.filter(payment => payment.method === "cash" && payment.status === "processing")) payment.status = "paid"; updateSettlement(group, state); });
        }
      }
    }
  };
  return service;
}
