import type { DemoStorage } from "@pizzaos/mock-data";
import type { ClientProductCustomization } from "@pizzaos/domain";

export const CLIENT_CART_STORAGE_KEY = "pizzaos:client:cart-state:v1";

export interface CartItem
{
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly notes: string;
  readonly removedIngredients: readonly string[];
  readonly customization?: ClientProductCustomization | null;
}

export interface CartState
{
  readonly items: readonly CartItem[];
}

export interface CartItemDraft
{
  readonly productId: string;
  readonly productName: string;
  readonly unitPriceCents: number;
  readonly quantity?: number;
  readonly notes?: string;
  readonly removedIngredients?: readonly string[];
  readonly customization?: ClientProductCustomization | null;
}

export function createInitialCartState(): CartState
{
  return {
    items: []
  };
}

export function loadCartState(storage?: DemoStorage): CartState
{
  if (!storage)
  {
    return createInitialCartState();
  }

  const payload = storage.getItem(CLIENT_CART_STORAGE_KEY);
  const parsed = parsePersistedCartState(payload);

  if (!parsed)
  {
    const initialState = createInitialCartState();
    saveCartState(initialState, storage);
    return initialState;
  }

  saveCartState(parsed, storage);
  return parsed;
}

export function saveCartState(state: CartState, storage?: DemoStorage): CartState
{
  if (!storage)
  {
    return state;
  }

  storage.setItem(CLIENT_CART_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function addCartItem(itemDraft: CartItemDraft, storage?: DemoStorage): CartState
{
  const currentState = loadCartState(storage);
  const nextState: CartState = {
    items: [
      ...currentState.items,
      {
        id: createCartItemId(),
        productId: itemDraft.productId,
        productName: itemDraft.productName,
        unitPriceCents: Math.max(0, Math.round(itemDraft.unitPriceCents)),
        quantity: Math.max(1, Math.round(itemDraft.quantity ?? 1)),
        notes: itemDraft.notes?.trim() ?? "",
        removedIngredients: itemDraft.removedIngredients ?? [],
        customization: itemDraft.customization ?? null
      }
    ]
  };

  return saveCartState(nextState, storage);
}

export function setCartItemQuantity(itemId: string, quantity: number, storage?: DemoStorage): CartState
{
  const currentState = loadCartState(storage);

  if (quantity <= 0)
  {
    return removeCartItem(itemId, storage);
  }

  const nextState: CartState = {
    items: currentState.items.map((item) =>
      item.id === itemId
        ? {
          ...item,
          quantity: Math.max(1, Math.round(quantity))
        }
        : item)
  };

  return saveCartState(nextState, storage);
}

export function removeCartItem(itemId: string, storage?: DemoStorage): CartState
{
  const currentState = loadCartState(storage);
  const nextState: CartState = {
    items: currentState.items.filter((item) => item.id !== itemId)
  };

  return saveCartState(nextState, storage);
}

export function clearCartState(storage?: DemoStorage): CartState
{
  return saveCartState(createInitialCartState(), storage);
}

function parsePersistedCartState(payload: string | null): CartState | null
{
  if (!payload)
  {
    return null;
  }

  try
  {
    const parsed = JSON.parse(payload) as unknown;

    if (!isPersistedCartState(parsed))
    {
      return null;
    }

    return {
      items: parsed.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        unitPriceCents: Math.max(0, Math.round(item.unitPriceCents)),
        quantity: Math.max(1, Math.round(item.quantity)),
        notes: item.notes,
        removedIngredients: item.removedIngredients ?? [],
        customization: parseCustomization(item.customization)
      }))
    };
  }
  catch
  {
    return null;
  }
}

function isPersistedCartState(value: unknown): value is { readonly items: readonly PersistedCartItem[] }
{
  if (!isRecord(value))
  {
    return false;
  }

  if (!Array.isArray(value.items))
  {
    return false;
  }

  return value.items.every((item) => isPersistedCartItem(item));
}

function isPersistedCartItem(value: unknown): value is PersistedCartItem
{
  if (!isRecord(value))
  {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.productId === "string" &&
    typeof value.productName === "string" &&
    typeof value.unitPriceCents === "number" &&
    typeof value.quantity === "number" &&
    typeof value.notes === "string" &&
    (value.removedIngredients === undefined || (Array.isArray(value.removedIngredients) && value.removedIngredients.every((ingredient) => typeof ingredient === "string"))) &&
    (
      (value.customization === undefined || value.customization === null || isCustomization(value.customization))
    )
  );
}

function createCartItemId(): string
{
  return `cart-item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

interface PersistedCartItem
{
  readonly id: string;
  readonly productId: string;
  readonly productName: string;
  readonly unitPriceCents: number;
  readonly quantity: number;
  readonly notes: string;
  readonly removedIngredients?: readonly string[];
  readonly customization?: ClientProductCustomization | null;
}

function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null;
}

function parseCustomization(value: ClientProductCustomization | null | undefined): ClientProductCustomization | null
{
  if (!value || !isCustomization(value))
  {
    return null;
  }

  return value;
}

function isCustomization(value: unknown): value is ClientProductCustomization
{
  if (!isRecord(value) || typeof value.doughId !== "string" || typeof value.baseId !== "string" || typeof value.variantId !== "string")
  {
    return false;
  }

  return Array.isArray(value.ingredientSelections) &&
    value.ingredientSelections.every((selection) =>
      isRecord(selection) &&
      typeof selection.ingredientId === "string" &&
      (selection.mode === "standard" || selection.mode === "senza" || selection.mode === "extra")) &&
    Array.isArray(value.extraIds) && value.extraIds.every((extraId) => typeof extraId === "string");
}
