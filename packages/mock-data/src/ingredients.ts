import type { Ingredient, ProductAllergen } from "@pizzaos/domain";

interface IngredientCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly allergens: readonly ProductAllergen[];
}

export const INGREDIENT_CATALOG: readonly IngredientCatalogEntry[] = [
  { id: "ingredient-farina", name: "Farina", allergens: [{ code: "GLU", label: "Glutine" }] },
  { id: "ingredient-pomodoro-san-marzano", name: "Pomodoro San Marzano", allergens: [] },
  { id: "ingredient-pomodoro", name: "Pomodoro", allergens: [] },
  { id: "ingredient-fiordilatte", name: "Fiordilatte", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-mozzarella", name: "Mozzarella", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-ricotta", name: "Ricotta", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-provola", name: "Provola", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-gorgonzola", name: "Gorgonzola", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-fontina", name: "Fontina", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-parmigiano", name: "Parmigiano", allergens: [{ code: "LAT", label: "Lattosio" }] },
  { id: "ingredient-tonno", name: "Tonno", allergens: [{ code: "PES", label: "Pesce" }] },
  { id: "ingredient-uovo", name: "Uovo", allergens: [{ code: "UOV", label: "Uova" }] }
] as const;

export function createIngredientFromName(name: string): Ingredient
{
  const trimmedName = name.trim();
  const catalogEntry = INGREDIENT_CATALOG.find((entry) => entry.name.toLowerCase() === trimmedName.toLowerCase());

  if (catalogEntry)
  {
    return {
      id: catalogEntry.id,
      name: catalogEntry.name,
      allergens: catalogEntry.allergens
    };
  }

  const fallbackId = `ingredient-${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;

  return {
    id: fallbackId,
    name: trimmedName,
    allergens: []
  };
}

export function createIngredientsFromNames(names: readonly string[]): readonly Ingredient[]
{
  return names
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .map((name) => createIngredientFromName(name));
}
