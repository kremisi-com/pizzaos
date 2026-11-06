import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import type { GroupCheckout, GroupFulfillment, GroupOrderingApi, GroupParticipant, GroupQuote, GroupSnapshot, IndividualActor, IndividualCart, IndividualCheckout, IndividualCheckoutResult, IndividualLine } from "@pizzaos/domain";
import { normalizePromotionSelection } from "../promotions/selection";
import type { OrderingRepository, OrderingService, OrderingState } from "../ordering-contract";

export interface GroupAccess { actor: IndividualActor | null; capability?: string; }
export interface GroupOrderingService {
  create(actor: IndividualActor | null, input: Parameters<GroupOrderingApi["create"]>[0]): Promise<GroupSnapshot>;
  read(access: GroupAccess, id: string, inviteToken?: string): Promise<GroupSnapshot>;
  join(access: GroupAccess, id: string, input: Parameters<GroupOrderingApi["join"]>[1]): Promise<{ group: GroupSnapshot; capability: string }>;
  replaceLines(access: GroupAccess, id: string, input: Parameters<GroupOrderingApi["replaceLines"]>[1]): Promise<GroupSnapshot>;
  removeParticipant(access: GroupAccess, id: string, input: Parameters<GroupOrderingApi["removeParticipant"]>[1]): Promise<GroupSnapshot>;
  close(access: GroupAccess, id: string, input: { revision: number }): Promise<GroupSnapshot>;
  quote(access: GroupAccess, id: string, input: { revision: number; fulfillment: GroupFulfillment }): Promise<GroupQuote>;
  checkout(access: GroupAccess, id: string, input: GroupCheckout): Promise<IndividualCheckoutResult>;
  recover(access: GroupAccess, id: string): Promise<IndividualCheckoutResult>;
  tick(): Promise<void>;
}
interface Member extends GroupParticipant { capabilityHash?: string; }
interface Frozen { input: GroupCheckout; cart: IndividualCart; actor: IndividualActor; }
interface RecordGroup {
  id: string; storeId: string; hostId: string; deadline: string; revision: number;
  status: GroupSnapshot["status"]; inviteToken: string; inviteHash: string; participants: Member[];
  /** Private persisted key: public group IDs and browser keys cannot occupy it. */
  canonicalKey: string;
  confirmed?: { revision: number; fingerprint: string; fulfillmentHash: string };
  frozen?: Frozen; orderId?: string; checkoutCompleted?: boolean;
}
interface GroupState extends OrderingState { groups?: Record<string, RecordGroup>; }
export class GroupOrderingError extends Error {
  constructor(public code: string, public statusCode: number, message: string) { super(message); }
}
function fail(code: string, statusCode: number, message: string): never { throw new GroupOrderingError(code, statusCode, message); }
function invalid(): never { return fail("invalid_input", 400, "Controlla i dati inseriti."); }
function shape(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => ![...required, ...optional].includes(key)) || required.some(key => !Object.hasOwn(value, key))) invalid();
}
function text(value: unknown, max = 200, empty = false, multiline = false): asserts value is string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) invalid();
  if (Array.from(value).some(char => { const point = char.charCodeAt(0); return point === 127 || (point < 32 && !(multiline && [9, 10, 13].includes(point))); })) invalid();
}
function identifier(value: unknown): asserts value is string {
  text(value); if (["__proto__", "constructor", "prototype"].includes(value)) invalid();
}
function revision(value: unknown): asserts value is number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) invalid(); }
function lines(value: unknown): asserts value is IndividualLine[] {
  if (!Array.isArray(value) || value.length > 100) invalid();
  for (const line of value) {
    shape(line, ["productId", "quantity", "optionIds", "notes"]); identifier(line.productId); text(line.notes, 800, true, true);
    if (typeof line.quantity !== "number" || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 || !Array.isArray(line.optionIds) || line.optionIds.length > 50 || new Set(line.optionIds).size !== line.optionIds.length) invalid();
    for (const option of line.optionIds) identifier(option);
  }
}
function fulfillment(value: unknown): asserts value is GroupFulfillment {
  shape(value, ["mode", "slotId", "notes"], ["address", "benefits"]);
  if (value.benefits !== undefined) { try { normalizePromotionSelection(value.benefits); } catch { invalid(); } } text(value.notes, 2000, true, true);
  if (value.mode !== "pickup" && value.mode !== "delivery") invalid();
  if (value.slotId !== null) identifier(value.slotId);
  if (value.address !== undefined) {
    shape(value.address, ["text", "latitude", "longitude"]); text(value.address.text, 500);
    if (typeof value.address.latitude !== "number" || !Number.isFinite(value.address.latitude) || Math.abs(value.address.latitude) > 90 || typeof value.address.longitude !== "number" || !Number.isFinite(value.address.longitude) || Math.abs(value.address.longitude) > 180) invalid();
  } else if (value.mode === "delivery") invalid();
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
/** Strict validation is also used before invoking an injected service at the HTTP boundary. */
export function validateGroupInput(operation: keyof GroupOrderingApi, value: unknown): void {
  if (operation === "create") { shape(value, ["storeId", "name", "deadline"]); identifier(value.storeId); text(value.name, 120); text(value.deadline, 100); if (!Number.isFinite(Date.parse(value.deadline))) invalid(); }
  else if (operation === "join") { shape(value, ["inviteToken", "name"]); text(value.inviteToken, 500); text(value.name, 120); }
  else if (operation === "replaceLines") { shape(value, ["participantId", "revision", "lines"]); identifier(value.participantId); revision(value.revision); lines(value.lines); }
  else if (operation === "removeParticipant") { shape(value, ["participantId", "revision"]); identifier(value.participantId); revision(value.revision); }
  else if (operation === "close") { shape(value, ["revision"]); revision(value.revision); }
  else if (operation === "quote") { shape(value, ["revision", "fulfillment"]); revision(value.revision); fulfillment(value.fulfillment); }
  else if (operation === "checkout") {
    shape(value, ["revision", "fingerprint", "fulfillment", "phone", "method", "idempotencyKey"]); revision(value.revision); text(value.fingerprint); text(value.phone, 100); text(value.idempotencyKey); fulfillment(value.fulfillment);
    if (value.method !== "card" && value.method !== "cash") invalid();
  } else if (operation === "recover") shape(value, []);
}
function hash(value: unknown): string { return createHash("sha256").update(stable(value)).digest("hex"); }
function matches(secret: string | undefined, digest: string, scope?: string): boolean {
  return typeof secret === "string" && secret.length <= 500 && timingSafeEqual(Buffer.from(hash(scope ? { scope, secret } : secret), "hex"), Buffer.from(digest, "hex"));
}
function host(group: RecordGroup, access: GroupAccess): IndividualActor {
  if (!access.actor) fail("unauthorized", 401, "Accedi come organizzatore per gestire il gruppo.");
  if (access.actor.id !== group.hostId) fail("forbidden", 403, "Accesso non consentito.");
  return access.actor;
}
function member(group: RecordGroup, access: GroupAccess): Member | undefined {
  if (access.actor?.id === group.hostId) return group.participants.find(person => person.host);
  return group.participants.find(person => person.capabilityHash && matches(access.capability, person.capabilityHash, group.id));
}
function snapshot(group: RecordGroup, access: GroupAccess, invitation?: string): GroupSnapshot {
  const person = member(group, access); const isHost = access.actor?.id === group.hostId;
  if (!isHost && !person && !matches(invitation, group.inviteHash)) fail("forbidden", 403, "Invito o accesso personale non valido.");
  return {
    id: group.id, storeId: group.storeId, deadline: group.deadline, status: group.status, revision: group.revision,
    participants: group.participants.map(person => ({ id: person.id, name: person.name, host: person.host, lines: structuredClone(person.lines) })),
    role: isHost ? "host" : person ? "participant" : "visitor", participantId: person?.id ?? null,
    ...(isHost ? { inviteToken: group.inviteToken, ...(group.orderId ? { orderId: group.orderId } : {}), checkoutPending: !!group.frozen && !group.checkoutCompleted } : {})
  };
}
function editable(group: RecordGroup) {
  if (group.frozen || group.status === "submitted") fail("checkout_pending", 409, "Il checkout è già in corso o inviato.");
}
function expected(group: RecordGroup, value: number) { if (group.revision !== value) fail("revision_conflict", 409, "Il gruppo è cambiato: aggiorna il riepilogo."); }
function closed(group: RecordGroup) { if (group.status !== "closed") fail("group_closed", 409, "Chiudi la raccolta prima del checkout."); }
function cart(group: RecordGroup, details: GroupFulfillment): IndividualCart {
  const flattened = group.participants.flatMap(person => person.lines.map(line => ({ ...structuredClone(line), notes: `Per ${person.name}${line.notes ? ` · ${line.notes}` : ""}` })));
  if (!flattened.length) invalid();
  return { storeId: group.storeId, lines: flattened, ...structuredClone(details) };
}

/** Durable collection; every economic decision is delegated to canonical ordering. */
export function createGroupOrderingService(options: { repository: OrderingRepository; ordering: OrderingService; now?: () => Date; id?: () => string; token?: () => string }): GroupOrderingService {
  const now = options.now ?? (() => new Date()); const id = options.id ?? randomUUID; const token = options.token ?? (() => randomBytes(32).toString("base64url"));
  function expire(group: RecordGroup, state: OrderingState) {
    const entry = state.idempotency[JSON.stringify([group.hostId, group.canonicalKey])];
    if (entry && !group.orderId) { group.orderId = entry.orderId; group.status = "submitted"; group.revision++; }
    if (group.status === "open" && Date.parse(group.deadline) <= now().getTime()) { group.status = "closed"; group.revision++; }
  }
  async function work<T>(groupId: string, action: (group: RecordGroup, state: GroupState) => T): Promise<T> {
    identifier(groupId);
    // Return an error envelope so deadline closure commits even when access/write fails.
    const result = await options.repository.transact(state => {
      const extended: GroupState = state; const group = extended.groups && Object.hasOwn(extended.groups, groupId) ? extended.groups[groupId] : undefined;
      if (!group) return { error: { code: "not_found", statusCode: 404, message: "Gruppo non disponibile." } };
      expire(group, state);
      try { return { value: action(group, extended) }; }
      catch (error) { if (error instanceof GroupOrderingError) return { error: { code: error.code, statusCode: error.statusCode, message: error.message } }; throw error; }
    });
    if (result.error) fail(result.error.code, result.error.statusCode, result.error.message);
    return result.value as T;
  }
  async function submit(groupId: string, { frozen, canonicalKey }: { frozen: Frozen; canonicalKey: string }): Promise<IndividualCheckoutResult> {
    const input: IndividualCheckout = { cart: frozen.cart, fingerprint: frozen.input.fingerprint, phone: frozen.input.phone, method: frozen.input.method, idempotencyKey: canonicalKey };
    try {
      const result = await options.ordering.checkout(frozen.actor, input);
      await work(groupId, group => { if (!group.orderId) { group.orderId = result.order.id; group.status = "submitted"; group.revision++; } group.checkoutCompleted = !(result.order.method === "card" && result.order.status === "pending_payment" && !result.order.providerIntentId); });
      return result;
    } catch (error) {
      const failure = error as { statusCode?: number };
      await work(groupId, (group, state) => {
        const canonical = state.idempotency[JSON.stringify([group.hostId, group.canonicalKey])];
        if (!canonical && failure.statusCode && failure.statusCode >= 400 && failure.statusCode < 500) delete group.frozen;
      });
      throw error;
    }
  }
  return {
    async create(actor, input) {
      if (!actor) fail("unauthorized", 401, "Accedi per creare un gruppo.");
      validateGroupInput("create", input);
      if (!Number.isFinite(Date.parse(input.deadline)) || Date.parse(input.deadline) <= now().getTime()) invalid();
      return options.repository.transact(state => {
        if (!Object.hasOwn(state.stores, input.storeId)) fail("not_found", 404, "Sede non disponibile.");
        const extended: GroupState = state; extended.groups ??= {};
        const groupId = id(); identifier(groupId); if (Object.hasOwn(extended.groups, groupId)) fail("revision_conflict", 409, "Riprova la creazione del gruppo.");
        const inviteToken = token(); text(inviteToken, 500);
        const group: RecordGroup = { id: groupId, storeId: input.storeId, hostId: actor.id, deadline: new Date(input.deadline).toISOString(), revision: 1, status: "open", inviteToken, inviteHash: hash(inviteToken), canonicalKey: `group:${randomBytes(32).toString("base64url")}`, participants: [{ id: id(), name: input.name.trim(), host: true, lines: [] }] };
        extended.groups[groupId] = group; return snapshot(group, { actor });
      });
    },
    read: (access, groupId, invitation) => work(groupId, group => snapshot(group, access, invitation)),
    async join(access, groupId, input) {
      validateGroupInput("join", input);
      return work(groupId, group => {
        if (!matches(input.inviteToken, group.inviteHash)) fail("forbidden", 403, "Invito non valido.");
        const previous = member(group, access);
        if (previous && !previous.host && access.capability) return { group: snapshot(group, access), capability: access.capability };
        editable(group); if (group.status !== "open") fail("group_closed", 409, "La raccolta è chiusa.");
        if (previous?.host) fail("forbidden", 403, "L'organizzatore è già nel gruppo.");
        if (group.participants.length >= 100) invalid();
        const capability = token(); text(capability, 500); const participantId = id(); identifier(participantId);
        group.participants.push({ id: participantId, name: input.name.trim(), host: false, lines: [], capabilityHash: hash({ scope: group.id, secret: capability }) }); group.revision++;
        return { group: snapshot(group, { ...access, capability }), capability };
      });
    },
    async replaceLines(access, groupId, input) {
      shape(input, ["participantId", "revision", "lines"]); identifier(input.participantId); revision(input.revision); lines(input.lines);
      return work(groupId, group => {
        const own = member(group, access); const isHost = access.actor?.id === group.hostId;
        if (!own || (!isHost && own.id !== input.participantId)) fail("forbidden", 403, "Puoi modificare solo il tuo contributo.");
        editable(group); if (!isHost && group.status !== "open") fail("group_closed", 409, "La raccolta è chiusa."); expected(group, input.revision);
        const target = group.participants.find(person => person.id === input.participantId); if (!target) fail("not_found", 404, "Partecipante non disponibile.");
        if (isHost && target.id !== own.id) {
          let cursor = 0;
          for (const line of input.lines) {
            while (cursor < target.lines.length && !(stable({ ...target.lines[cursor], quantity: line.quantity }) === stable(line) && line.quantity <= target.lines[cursor].quantity)) cursor++;
            if (cursor === target.lines.length) fail("forbidden", 403, "Puoi soltanto rimuovere prodotti dal contributo altrui.");
            cursor++;
          }
        }
        if (group.participants.reduce((total, person) => total + (person === target ? input.lines.length : person.lines.length), 0) > 100) invalid();
        target.lines = structuredClone(input.lines); group.revision++; delete group.confirmed; return snapshot(group, access);
      });
    },
    async removeParticipant(access, groupId, input) {
      shape(input, ["participantId", "revision"]); identifier(input.participantId); revision(input.revision);
      return work(groupId, group => {
        host(group, access); editable(group); expected(group, input.revision);
        const person = group.participants.find(person => person.id === input.participantId); if (!person) fail("not_found", 404, "Partecipante non disponibile.");
        if (person.host) fail("invalid_transition", 409, "L'organizzatore deve restare nel gruppo.");
        group.participants = group.participants.filter(person => person.id !== input.participantId); group.revision++; delete group.confirmed; return snapshot(group, access);
      });
    },
    async close(access, groupId, input) {
      shape(input, ["revision"]); revision(input.revision);
      return work(groupId, group => { host(group, access); editable(group); expected(group, input.revision); if (group.status === "open") { group.status = "closed"; group.revision++; } return snapshot(group, access); });
    },
    async quote(access, groupId, input) {
      shape(input, ["revision", "fulfillment"]); revision(input.revision); fulfillment(input.fulfillment);
      const payload = await work(groupId, group => { host(group, access); editable(group); closed(group); expected(group, input.revision); return cart(group, input.fulfillment); });
      const quote = await options.ordering.quote(payload, access.actor);
      return work(groupId, group => { host(group, access); editable(group); closed(group); expected(group, input.revision); group.confirmed = { revision: group.revision, fingerprint: quote.fingerprint, fulfillmentHash: hash(input.fulfillment) }; return { revision: group.revision, quote }; });
    },
    async checkout(access, groupId, input) {
      shape(input, ["revision", "fingerprint", "fulfillment", "phone", "method", "idempotencyKey"]); revision(input.revision); text(input.fingerprint); text(input.phone, 100); text(input.idempotencyKey); fulfillment(input.fulfillment);
      if (input.method !== "card" && input.method !== "cash") invalid();
      const claim = await work(groupId, group => {
        const actor = host(group, access);
        if (group.frozen) { if (hash(group.frozen.input) !== hash(input)) fail("idempotency_conflict", 409, "Il checkout originale è già in corso."); return { frozen: structuredClone(group.frozen), canonicalKey: group.canonicalKey }; }
        editable(group); closed(group); expected(group, input.revision);
        if (!group.confirmed || group.confirmed.revision !== group.revision || group.confirmed.fingerprint !== input.fingerprint || group.confirmed.fulfillmentHash !== hash(input.fulfillment)) fail("price_changed", 409, "Richiedi e conferma nuovamente il preventivo.");
        group.frozen = { input: structuredClone(input), cart: cart(group, input.fulfillment), actor: structuredClone(actor) }; return { frozen: structuredClone(group.frozen), canonicalKey: group.canonicalKey };
      });
      return submit(groupId, claim);
    },
    async recover(access, groupId) {
      const claim = await work(groupId, group => { host(group, access); if (!group.frozen) fail("not_found", 404, "Nessun checkout da recuperare."); return { frozen: structuredClone(group.frozen), canonicalKey: group.canonicalKey }; });
      return submit(groupId, claim);
    },
    async tick() { await options.repository.transact(state => { for (const group of Object.values((state as GroupState).groups ?? {})) expire(group, state); }); }
  };
}
