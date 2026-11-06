import type { PromotionSelection } from "@pizzaos/domain";

export function normalizePromotionSelection(value: unknown): PromotionSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Selezione benefici non valida.");
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 2 || !Object.hasOwn(input, "couponCodes") || !Object.hasOwn(input, "redeemReward")
    || !Array.isArray(input.couponCodes) || input.couponCodes.length > 10 || typeof input.redeemReward !== "boolean") throw new Error("Selezione benefici non valida.");
  const couponCodes = input.couponCodes.map(code => {
    if (typeof code !== "string") throw new Error("Codice coupon non valido.");
    const normalized = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,50}$/.test(normalized)) throw new Error("Codice coupon non valido.");
    return normalized;
  });
  if (new Set(couponCodes).size !== couponCodes.length) throw new Error("Codici coupon duplicati.");
  return { couponCodes, redeemReward: input.redeemReward };
}
