import type { GroupOrderingApi, GroupSnapshot, IndividualApi, IndividualCart } from "@pizzaos/domain";
import { acknowledgeIndividualDraft, readIndividualDraft, writeIndividualDraft } from "../features/individual-ordering";

interface PendingTransfer { idempotencyKey: string; storeId: string; cart: IndividualCart | null; }
const inFlight = new Map<string, Promise<GroupSnapshot>>();
const memoryTransfers = new Map<string, PendingTransfer>();
const transferKey = (scope: string) => `pizzaos.group-transfer.${scope}`;
const STORE_KEY = "pizzaos.group-store.v1";

/** A store hint selects a context; only the service decides access and active group. */
export function readSharedCartStoreId(): string | null {
  try { return sessionStorage.getItem(STORE_KEY); } catch { return null; }
}
export function rememberSharedCartStore(storeId: string): void {
  try { sessionStorage.setItem(STORE_KEY, storeId); } catch { /* Context authorization does not depend on storage. */ }
}
export async function suspendSharedCart(api: GroupOrderingApi, group: GroupSnapshot): Promise<void> {
  await api.activate(group.storeId, null);
  rememberSharedCartStore(group.storeId);
  if (!readSharedCartDraft()) {
    try { writeIndividualDraft(localStorage, { storeId: group.storeId, lines: [], mode: "pickup", slotId: null, notes: "" }); }
    catch { /* Individual ordering retains its existing storage-unavailable behavior. */ }
  }
}

function pendingTransfer(scope: string): PendingTransfer | null {
  const existing = memoryTransfers.get(scope);
  if (existing) return existing;
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(transferKey(scope)) ?? "null");
    if (raw && typeof raw === "object" && "idempotencyKey" in raw && typeof raw.idempotencyKey === "string"
      && "storeId" in raw && typeof raw.storeId === "string" && "cart" in raw) {
      const cart = raw.cart === null ? null : readIndividualDraft({
        getItem: () => JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), cart: raw.cart }), removeItem: () => {}
      });
      if (raw.cart !== null && !cart) return null;
      const transfer = { idempotencyKey: raw.idempotencyKey, storeId: raw.storeId, cart };
      memoryTransfers.set(scope, transfer);
      return transfer;
    }
  } catch { /* Storage can be unavailable; memory preserves retries in the current page. */ }
  return null;
}

function beginTransfer(scope: string, storeId: string, cart: IndividualCart | null): PendingTransfer {
  const previous = pendingTransfer(scope);
  if (previous) return previous;
  const transfer = { idempotencyKey: crypto.randomUUID(), storeId, cart };
  memoryTransfers.set(scope, transfer);
  try { sessionStorage.setItem(transferKey(scope), JSON.stringify(transfer)); } catch { /* Browser-owned composition is also retained in memory. */ }
  return transfer;
}

function finishTransfer(scope: string, transfer: PendingTransfer) {
  if (transfer.cart) { try { acknowledgeIndividualDraft(localStorage, transfer.cart); } catch { /* Never clear an unacknowledged or concurrently edited draft. */ } }
  memoryTransfers.delete(scope);
  try { sessionStorage.removeItem(transferKey(scope)); } catch { /* The server remains authoritative. */ }
}

export function readSharedCartDraft(): IndividualCart | null {
  try { return readIndividualDraft(localStorage); } catch { return null; }
}

/** Replay the original transfer until acknowledged, even if its response was lost. */
export function openSharedCart(api: GroupOrderingApi, individualApi: IndividualApi, groupId?: string, inviteToken?: string): Promise<GroupSnapshot> {
  const scope = groupId ?? "create";
  const pending = inFlight.get(scope);
  if (pending) return pending;
  const work = (async () => {
    const stores = await individualApi.stores();
    const draft = readSharedCartDraft();
    const original = pendingTransfer(scope);
    const hint = readSharedCartStoreId();
    const storeId = original?.storeId ?? (draft && stores.some(store => store.id === draft.storeId) ? draft.storeId : stores.find(store => store.id === hint)?.id ?? stores[0]?.id);
    if (!storeId) throw new Error("Nessuna sede disponibile.");
    const context = await api.context(storeId);
    if (groupId) {
      let group = await api.read(groupId, inviteToken);
      if (inviteToken && (original || group.role === "visitor" && group.status === "open")) {
        const transfer = original ?? beginTransfer(scope, group.storeId, draft?.storeId === group.storeId ? draft : null);
        group = await api.join(group.id, { inviteToken, lines: transfer.cart?.lines ?? [], idempotencyKey: transfer.idempotencyKey });
        finishTransfer(scope, transfer);
      }
      if (group.role !== "visitor" && !["submitted", "cancelled"].includes(group.status)) await api.activate(group.storeId, group.id);
      rememberSharedCartStore(group.storeId);
      return group;
    }
    const active = context.groups.find(group => group.id === context.activeId && !["submitted", "cancelled"].includes(group.status));
    if (active && !original) { rememberSharedCartStore(active.storeId); return active; }
    const transfer = original ?? beginTransfer(scope, storeId, draft?.storeId === storeId ? draft : null);
    const group = await api.create({ storeId: transfer.storeId, lines: transfer.cart?.lines ?? [], idempotencyKey: transfer.idempotencyKey,
      ...(transfer.cart ? { fulfillment: { mode: transfer.cart.mode, slotId: transfer.cart.slotId, notes: transfer.cart.notes,
        ...(transfer.cart.address ? { address: transfer.cart.address } : {}), ...(transfer.cart.benefits ? { benefits: transfer.cart.benefits } : {}) } } : {}) });
    await api.activate(storeId, group.id);
    rememberSharedCartStore(group.storeId);
    finishTransfer(scope, transfer);
    return group;
  })();
  inFlight.set(scope, work);
  void work.finally(() => { if (inFlight.get(scope) === work) inFlight.delete(scope); }).catch(() => {});
  return work;
}
