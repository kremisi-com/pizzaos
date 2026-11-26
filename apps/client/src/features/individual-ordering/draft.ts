import type { IndividualCart, IndividualDraft, MealSelection, MenuSelection, PromotionSelection } from "@pizzaos/domain";

const KEY = "pizzaos.individual-cart.v1";
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function isSelection(value: unknown): value is PromotionSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const selection = value as Record<string, unknown>;
  return Object.keys(selection).every(key => key === "couponCodes" || key === "redeemReward")
    && typeof selection.redeemReward === "boolean" && Array.isArray(selection.couponCodes)
    && selection.couponCodes.length <= 10
    && selection.couponCodes.every(code => typeof code === "string" && code.trim().length > 0 && code.length <= 50)
    && new Set(selection.couponCodes.map(code => String(code).trim().toUpperCase())).size === selection.couponCodes.length;
}

function isMenuSelection(value: unknown): value is MenuSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const selection = value as Partial<MenuSelection>;
  return typeof selection.optionId === "string" && selection.optionId.length > 0
    && Number.isInteger(selection.quantity) && (selection.quantity ?? 0) > 0;
}

function isMealSelection(value: unknown): value is MealSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const selection = value as Partial<MealSelection>;
  return typeof selection.stepId === "string" && selection.stepId.length > 0
    && typeof selection.productId === "string" && selection.productId.length > 0
    && typeof selection.notes === "string" && selection.notes.length <= 1000
    && Array.isArray(selection.removedIngredientIds) && selection.removedIngredientIds.every(id => typeof id === "string")
    && new Set(selection.removedIngredientIds).size === selection.removedIngredientIds.length;
}

export function isIndividualCart(value: unknown): value is IndividualCart {
  if (!value || typeof value !== "object") return false;
  const cart = value as Partial<IndividualCart>;
  return typeof cart.storeId === "string" && typeof cart.notes === "string"
    && (cart.mode === "pickup" || cart.mode === "delivery")
    && (cart.slotId === null || typeof cart.slotId === "string")
    && (cart.benefits === undefined || isSelection(cart.benefits))
    && Array.isArray(cart.lines) && cart.lines.every(line => line && typeof line.productId === "string"
      && (line.kind === undefined || ["product", "pizza_taste", "pizza_formula"].includes(line.kind))
      && Number.isInteger(line.quantity) && line.quantity > 0 && typeof line.notes === "string"
      && Array.isArray(line.optionIds) && line.optionIds.every((id: unknown) => typeof id === "string")
      && (line.selections === undefined || (Array.isArray(line.selections) && line.selections.every(isMenuSelection)
        && new Set(line.selections.map(selection => selection.optionId)).size === line.selections.length))
      && (line.mealSelections === undefined || (Array.isArray(line.mealSelections) && line.mealSelections.every(isMealSelection)
        && new Set(line.mealSelections.map(selection => selection.stepId)).size === line.mealSelections.length)))
    && (cart.address === undefined || (typeof cart.address.text === "string"
      && Number.isFinite(cart.address.latitude) && Number.isFinite(cart.address.longitude)));
}

/** Reading never renews the seven-day lifetime. Malformed and expired drafts are discarded. */
export function readIndividualDraft(storage: Pick<Storage, "getItem" | "removeItem">, now = new Date()): IndividualCart | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Partial<IndividualDraft>;
    const updatedAt = typeof draft.updatedAt === "string" ? Date.parse(draft.updatedAt) : NaN;
    if (draft.version !== 1 || !Number.isFinite(updatedAt) || updatedAt > now.getTime()
      || now.getTime() - updatedAt >= MAX_AGE || !isIndividualCart(draft.cart)) {
      storage.removeItem(KEY);
      return null;
    }
    return draft.cart;
  } catch {
    try { storage.removeItem(KEY); } catch { /* Storage may be unavailable in private browsing. */ }
    return null;
  }
}

/** Persist browser-owned composition only, never contact or payment credentials. */
export function writeIndividualDraft(storage: Pick<Storage, "setItem">, cart: IndividualCart, now = new Date()): void {
  const draft: IndividualDraft = { version: 1, updatedAt: now.toISOString(), cart: copyIndividualCart(cart) };
  storage.setItem(KEY, JSON.stringify(draft));
}

export function copyIndividualCart(cart: IndividualCart): IndividualCart {
  if (cart.benefits !== undefined && !isSelection(cart.benefits)) throw new Error("Selezione promozioni non valida.");
  return {
    storeId: cart.storeId,
    lines: cart.lines.map(line => ({
      ...(line.kind ? { kind: line.kind } : {}),
      productId: line.productId, quantity: line.quantity, optionIds: [...line.optionIds], notes: line.notes,
      ...(line.selections ? { selections: line.selections.map(({ optionId, quantity }) => ({ optionId, quantity })) } : {}),
      ...(line.mealSelections ? { mealSelections: line.mealSelections.map(({ stepId, productId, removedIngredientIds, notes }) => ({ stepId, productId, removedIngredientIds: [...removedIngredientIds], notes })) } : {})
    })),
    mode: cart.mode, slotId: cart.slotId, notes: cart.notes,
    ...(cart.benefits ? { benefits: { couponCodes: [...cart.benefits.couponCodes], redeemReward: cart.benefits.redeemReward } } : {}),
    ...(cart.mode === "delivery" && cart.address ? { address: { text: cart.address.text, latitude: cart.address.latitude, longitude: cart.address.longitude } } : {})
  };
}
