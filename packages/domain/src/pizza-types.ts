import type { MenuFoodInformation, MenuOptionGroup, MenuSpecificOption } from "./menu-choice-types";

/** All amounts are integer cents. Component prices establish differences from the included standard. */
export interface PizzaComponent {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  ingredients: Record<string, number | null>; food?: { contains: string[]; mayContain: string[] }; imagePath?: string;
}
export interface PizzaTopping extends PizzaComponent { category: string; inventoryIngredientId?: string; }
export interface PizzaPreviewImage { doughId: string; baseId: string; imagePath: string; }
export interface PizzaEntry {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  standardDoughId: string; standardBaseId: string; standardFormatId: string;
  doughIds: string[]; baseIds: string[]; formatIds: string[]; toppingIds: string[];
  imageId?: string; pairingProductIds?: string[]; previewImages?: PizzaPreviewImage[]; toppingImagePath?: string;
}
export interface PizzaTaste extends PizzaEntry {
  includedToppingIds: string[];
  /** Specific product choices remain separate from automatically supplied pizza choices. */
  customizations?: { options: MenuSpecificOption[]; groups?: MenuOptionGroup[] };
  food?: MenuFoodInformation;
  allergens?: string[];
}
export interface PizzaFormula extends PizzaEntry {
  /** Legacy rules remain readable; new formulas use explicit extraOffer. */
  offer?: "Simple" | "Wild" | "Savage";
  extraOffer?: { quota: number; percent: number };
}
export interface PizzaCatalog {
  doughs: PizzaComponent[]; bases: PizzaComponent[]; formats: PizzaComponent[];
  toppings: PizzaTopping[]; tastes: PizzaTaste[]; formulas: PizzaFormula[];
  defaults?: { doughId: string; baseId: string; formatId: string };
  customEnabled?: boolean;
  inventoryExtras?: boolean;
  inventorySignature?: string;
}
export interface PizzaOptionIdentity {
  kind: "dough" | "base" | "format" | "topping" | "removal";
  sourceId: string; category?: string; imagePath?: string;
}
export interface PizzaProductIdentity {
  kind: "taste" | "formula"; sourceId: string; defaultSelections: { optionId: string; quantity: number }[];
  previewImages?: PizzaPreviewImage[]; toppingImagePath?: string;
  includedToppings?: { sourceId: string; ingredientIds: string[]; available?: boolean; food?: { contains: string[]; mayContain: string[] } }[];
}
