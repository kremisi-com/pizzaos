import type { MenuFoodInformation, MenuExtraOffer } from "./menu-choice-types";
export type { MenuFoodInformation, MenuOptionGroup, MenuExtraOffer, MenuSpecificOption } from "./menu-choice-types";

export interface MenuFoodIngredient {
  id: string;
  name: string;
  food?: MenuFoodInformation;
}

export interface OrderingMenuSection {
  id: string;
  name: string;
  description?: string;
  productIds: string[];
}

export interface PublishedMenu {
  id: string;
  name: string;
  sections: OrderingMenuSection[];
  kitchenNotice?: string;
  /** Operator-owned source catalog; omitted from public storefront responses. */
  pizzaCatalog?: import("./pizza-types").PizzaCatalog;
}

export const PIZZA_EXTRA_OFFERS = {
  Simple: { quota: 3, percent: 20 },
  Wild: { quota: 5, percent: 40 },
  Savage: { quota: 7, percent: 50 }
} satisfies Record<string, MenuExtraOffer>;

export interface MenuSelection {
  optionId: string;
  quantity: number;
}

export interface MenuComposition {
  choices: (MenuSelection & { name: string; subtotalCents: number })[];
  ingredients: string[];
  contains: string[];
  mayContain: string[];
  foodComplete: boolean;
  extraDiscountCents: number;
  pizza?: import("./pizza-types").PizzaProductIdentity;
}

export interface FoodPreferences {
  avoid: string[];
}

export const MENU_ALLERGENS = [
  "Glutine", "Crostacei", "Uova", "Pesce", "Arachidi", "Soia", "Latte", "Frutta a guscio", "Sedano",
  "Senape", "Sesamo", "Solfiti", "Lupini", "Molluschi", "Lattosio"
] as const;

export function menuAllergenKey(value: string): string {
  return value.trim().toLocaleLowerCase("it-IT");
}

export interface FoodPreferencesApi {
  get(): Promise<FoodPreferences>;
  save(preferences: FoodPreferences): Promise<FoodPreferences>;
}

export function menuImagePath(storeId: string, imageId: string): string {
  return `/api/pilot/v1/pilot/stores/${encodeURIComponent(storeId)}/menu-images/${encodeURIComponent(imageId)}`;
}
