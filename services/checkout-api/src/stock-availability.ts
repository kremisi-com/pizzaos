import type { IndividualIngredient, IndividualStore } from "@pizzaos/domain";

export function bypassStock(ingredient: IndividualIngredient | undefined, store: IndividualStore): boolean {
  return ingredient?.stock === null || ingredient?.stock === 0 && store.outOfStockBehavior === "allow";
}

export function hasZeroStock(recipe: Record<string, number | null>, store: IndividualStore): boolean {
  return Object.keys(recipe).some(id => store.ingredients.some(item => item.id === id && item.stock === 0));
}

/** Snapshot only tracked consumption, so a later refill cannot consume untracked orders. */
export function trackedRecipe(recipe: Record<string, number>, store: IndividualStore): Record<string, number> {
  return Object.fromEntries(Object.entries(recipe).filter(([id]) => !bypassStock(store.ingredients.find(item => item.id === id), store)));
}
