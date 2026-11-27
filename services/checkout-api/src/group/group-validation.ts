import { normalizePromotionSelection } from "../promotions/selection";
import type { GroupFulfillment, IndividualLine } from "@pizzaos/domain";
import { validateMenuSelections } from "../menu-catalog";
import { validateMealSelections } from "../product-types";
export class GroupOrderingError extends Error { constructor(public code: string, public statusCode: number, message: string) { super(message); } }
export function fail(code: string, statusCode: number, message: string): never { throw new GroupOrderingError(code, statusCode, message); }
export function invalid(): never { return fail("invalid_input", 400, "Controlla i dati inseriti."); }
export function shape(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => ![...required, ...optional].includes(key)) || required.some(key => !Object.hasOwn(value, key))) invalid();
}
export function text(value: unknown, max = 200, empty = false, multiline = false): asserts value is string {
  if (typeof value !== "string" || value.length > max || (!empty && !value.trim())) invalid();
  if (Array.from(value).some(char => { const point = char.charCodeAt(0); return point === 127 || (point < 32 && !(multiline && [9, 10, 13].includes(point))); })) invalid();
}
export function identifier(value: unknown): asserts value is string {
  text(value); if (["__proto__", "constructor", "prototype"].includes(value)) invalid();
}
export function revision(value: unknown): asserts value is number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) invalid(); }
export function lines(value: unknown): asserts value is IndividualLine[] {
  if (!Array.isArray(value) || value.length > 100) invalid();
  for (const line of value) {
    shape(line, ["productId", "quantity", "optionIds", "notes"], ["selections", "kind", "mealSelections"]);
    if (line.kind !== undefined && (typeof line.kind !== "string" || !["product", "pizza_taste", "pizza_formula"].includes(line.kind))) invalid();
    identifier(line.productId); text(line.notes, 800, true, true);
    if (typeof line.quantity !== "number" || !Number.isSafeInteger(line.quantity) || line.quantity < 1 || line.quantity > 100 || !Array.isArray(line.optionIds) || line.optionIds.length > 50 || new Set(line.optionIds).size !== line.optionIds.length) invalid();
    for (const option of line.optionIds) identifier(option);
    if (line.selections !== undefined) {
      if (line.optionIds.length) invalid();
      validateMenuSelections(line.selections, invalid);
    }
    if (line.mealSelections !== undefined) {
      if (line.optionIds.length || Array.isArray(line.selections) && line.selections.length) invalid();
      validateMealSelections(line.mealSelections, invalid);
    }
  }
}
export function fulfillment(value: unknown): asserts value is GroupFulfillment {
  shape(value, ["mode", "slotId", "notes"], ["address", "benefits"]);
  if (value.benefits !== undefined) { try { normalizePromotionSelection(value.benefits); } catch { invalid(); } } text(value.notes, 2000, true, true);
  if (value.mode !== "pickup" && value.mode !== "delivery") invalid();
  if (value.slotId !== null) identifier(value.slotId);
  if (value.address !== undefined) {
    shape(value.address, ["text", "latitude", "longitude"]); text(value.address.text, 500);
    if (typeof value.address.latitude !== "number" || !Number.isFinite(value.address.latitude) || Math.abs(value.address.latitude) > 90 || typeof value.address.longitude !== "number" || !Number.isFinite(value.address.longitude) || Math.abs(value.address.longitude) > 180) invalid();
  } else if (value.mode === "delivery") invalid();
}
