/** All amounts are integer cents. Component prices establish differences from the included standard. */
export interface PizzaComponent {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  ingredients: Record<string, number | null>; food?: { contains: string[]; mayContain: string[] }; imagePath?: string;
}
export interface PizzaTopping extends PizzaComponent { category: string; }
export interface PizzaPreviewImage { doughId: string; baseId: string; imagePath: string; }
export interface PizzaEntry {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  standardDoughId: string; standardBaseId: string; standardFormatId: string;
  doughIds: string[]; baseIds: string[]; formatIds: string[]; toppingIds: string[];
  imageId?: string; pairingProductIds?: string[]; previewImages?: PizzaPreviewImage[]; toppingImagePath?: string;
}
export interface PizzaTaste extends PizzaEntry { includedToppingIds: string[]; }
export interface PizzaFormula extends PizzaEntry { offer: "Simple" | "Wild" | "Savage"; }
export interface PizzaCatalog {
  doughs: PizzaComponent[]; bases: PizzaComponent[]; formats: PizzaComponent[];
  toppings: PizzaTopping[]; tastes: PizzaTaste[]; formulas: PizzaFormula[];
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
