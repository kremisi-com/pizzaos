/** Shared menu choice shapes, independent of pizza and ordering entities. */
export interface MenuFoodInformation {
  contains: string[];
  mayContain: string[];
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  kind: "dough" | "base" | "format" | "ingredients" | "extras" | "recipe" | "selection";
  min: number;
  max: number;
  allowRepeat?: boolean;
  optionIds: string[];
}

export interface MenuExtraOffer {
  quota: number;
  percent: number;
}

/** A product-specific option has no automatic pizza identity. */
export interface MenuSpecificOption {
  id: string;
  name: string;
  priceCents: number;
  ingredients: Record<string, number | null>;
  description?: string;
  food?: MenuFoodInformation;
  removesIngredientIds?: string[];
  available?: boolean;
}
