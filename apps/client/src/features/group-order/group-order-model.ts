import type { CartItem, CartItemDraft } from "../cart/cart-model";
import type { DemoStorage } from "@pizzaos/mock-data";

export const CLIENT_GROUP_ORDER_STORAGE_KEY = "pizzaos:client:group-order-state:v1";
export const GROUP_ORDER_CURRENT_PARTICIPANT_ID = "participant-tu";

export interface GroupOrderParticipant
{
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly isHost: boolean;
}

export interface GroupOrderItem extends CartItem
{
  readonly participantId: string;
}

export interface GroupOrderState
{
  readonly name: string;
  readonly participants: readonly GroupOrderParticipant[];
  readonly items: readonly GroupOrderItem[];
}

const GROUP_ORDER_PARTICIPANTS: readonly GroupOrderParticipant[] = [
  { id: "participant-sara", name: "Sara", emoji: "🍕", isHost: true },
  { id: "participant-luca", name: "Luca", emoji: "🌶️", isHost: false },
  { id: "participant-marta", name: "Marta", emoji: "🥗", isHost: false },
  { id: GROUP_ORDER_CURRENT_PARTICIPANT_ID, name: "Tu", emoji: "⭐", isHost: false }
];

const GROUP_ORDER_SEED_ITEMS: readonly GroupOrderItem[] = [
  createSeedItem("group-sara-pizza", "participant-sara", "product-margherita", "Margherita Classica", 900, 1, "Extra bufala"),
  createSeedItem("group-sara-drink", "participant-sara", "product-coca-cola", "Coca Cola", 300, 2),
  createSeedItem("group-luca-pizza", "participant-luca", "product-diavola", "Diavola Piccante", 1100, 1),
  createSeedItem("group-luca-drink", "participant-luca", "product-birra-bionda", "Birra artigianale bionda", 600, 1),
  createSeedItem("group-marta-pizza", "participant-marta", "product-vegetariana", "Vegetariana", 1050, 1, "Senza olive"),
  createSeedItem("group-marta-drink", "participant-marta", "product-acqua-frizzante", "Acqua frizzante", 200, 1)
];

export function createInitialGroupOrderState(): GroupOrderState
{
  return {
    name: "Pizza insieme stasera",
    participants: GROUP_ORDER_PARTICIPANTS,
    items: GROUP_ORDER_SEED_ITEMS
  };
}

export function loadGroupOrderState(storage?: DemoStorage): GroupOrderState
{
  if (!storage)
  {
    return createInitialGroupOrderState();
  }

  const parsed = parseGroupOrderState(storage.getItem(CLIENT_GROUP_ORDER_STORAGE_KEY));
  const state = parsed ?? createInitialGroupOrderState();

  return saveGroupOrderState(state, storage);
}

export function saveGroupOrderState(state: GroupOrderState, storage?: DemoStorage): GroupOrderState
{
  storage?.setItem(CLIENT_GROUP_ORDER_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function addGroupOrderItem(itemDraft: CartItemDraft, storage?: DemoStorage): GroupOrderState
{
  const state = loadGroupOrderState(storage);
  const item: GroupOrderItem = {
    id: `group-item-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    participantId: GROUP_ORDER_CURRENT_PARTICIPANT_ID,
    productId: itemDraft.productId,
    productName: itemDraft.productName,
    unitPriceCents: Math.max(0, Math.round(itemDraft.unitPriceCents)),
    quantity: Math.max(1, Math.round(itemDraft.quantity ?? 1)),
    notes: itemDraft.notes?.trim() ?? "",
    removedIngredients: itemDraft.removedIngredients ?? [],
    customization: itemDraft.customization ?? null
  };

  return saveGroupOrderState({ ...state, items: [...state.items, item] }, storage);
}

export function setGroupOrderItemQuantity(itemId: string, quantity: number, storage?: DemoStorage): GroupOrderState
{
  if (quantity <= 0)
  {
    return removeGroupOrderItem(itemId, storage);
  }

  const state = loadGroupOrderState(storage);
  return saveGroupOrderState({
    ...state,
    items: state.items.map((item) => item.id === itemId && item.participantId === GROUP_ORDER_CURRENT_PARTICIPANT_ID
      ? { ...item, quantity: Math.max(1, Math.round(quantity)) }
      : item)
  }, storage);
}

export function removeGroupOrderItem(itemId: string, storage?: DemoStorage): GroupOrderState
{
  const state = loadGroupOrderState(storage);
  return saveGroupOrderState({
    ...state,
    items: state.items.filter((item) => item.id !== itemId || item.participantId !== GROUP_ORDER_CURRENT_PARTICIPANT_ID)
  }, storage);
}

export function clearGroupOrderState(storage?: DemoStorage): void
{
  storage?.removeItem(CLIENT_GROUP_ORDER_STORAGE_KEY);
}

export function deriveGroupOrderSubtotalCents(items: readonly GroupOrderItem[], participantId?: string): number
{
  return items
    .filter((item) => !participantId || item.participantId === participantId)
    .reduce((total, item) => total + item.unitPriceCents * item.quantity, 0);
}

export function getGroupOrderParticipantItems(state: GroupOrderState, participantId: string): readonly GroupOrderItem[]
{
  return state.items.filter((item) => item.participantId === participantId);
}

function createSeedItem(id: string, participantId: string, productId: string, productName: string, unitPriceCents: number, quantity: number, notes = ""): GroupOrderItem
{
  return { id, participantId, productId, productName, unitPriceCents, quantity, notes, removedIngredients: [], customization: null };
}

function parseGroupOrderState(payload: string | null): GroupOrderState | null
{
  if (!payload)
  {
    return null;
  }

  try
  {
    const parsed = JSON.parse(payload) as unknown;
    if (!isRecord(parsed) || typeof parsed.name !== "string" || !Array.isArray(parsed.participants) || !Array.isArray(parsed.items))
    {
      return null;
    }
    if (!parsed.participants.every(isParticipant) || !parsed.items.every(isGroupOrderItem))
    {
      return null;
    }
    return { name: parsed.name, participants: parsed.participants, items: parsed.items };
  }
  catch
  {
    return null;
  }
}

function isParticipant(value: unknown): value is GroupOrderParticipant
{
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.emoji === "string" && typeof value.isHost === "boolean";
}

function isGroupOrderItem(value: unknown): value is GroupOrderItem
{
  return isRecord(value) && typeof value.id === "string" && typeof value.participantId === "string" && typeof value.productId === "string" && typeof value.productName === "string" && typeof value.unitPriceCents === "number" && typeof value.quantity === "number" && typeof value.notes === "string" && (value.customization === null || value.customization === undefined || isCustomization(value.customization));
}

function isCustomization(value: unknown): boolean
{
  return isRecord(value) && typeof value.doughId === "string" && typeof value.baseId === "string" && typeof value.variantId === "string" && Array.isArray(value.ingredientSelections) && Array.isArray(value.extraIds);
}

function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null;
}
