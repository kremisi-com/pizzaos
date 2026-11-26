/** Catalog behavior is independent of names and categories. */
export type ProductType = "pizza" | "sandwich" | "product" | "box" | "meal";
export interface MealStep { id: string; name: string; alternatives: { productId: string; priceCents: number }[] }
export interface MealSelection { stepId: string; productId: string; removedIngredientIds: string[]; notes: string }
