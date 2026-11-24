import type { IndividualIngredient, IndividualOption, IndividualProduct, MenuDraft } from "./individual-ordering";
import { PIZZA_EXTRA_OFFERS, type MenuFoodInformation, type MenuOptionGroup, type MenuSelection } from "./menu-ordering";

export * from "./pizza-types";
import type { PizzaCatalog, PizzaFormula, PizzaTaste } from "./pizza-types";

function copyFood(food: MenuFoodInformation): MenuFoodInformation {
  return { contains: [...food.contains], mayContain: [...food.mayContain] };
}

export function emptyPizzaCatalog(): PizzaCatalog {
  return { doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [] };
}

/** Apply menu-wide choices without changing commercial base prices. Legacy catalogs retain their choices. */
export function applyPizzaDefaults(catalog: PizzaCatalog): PizzaCatalog {
  const defaults = catalog.defaults;
  if (!defaults) return catalog;
  const common = {
    standardDoughId: defaults.doughId, standardBaseId: defaults.baseId, standardFormatId: defaults.formatId,
    doughIds: catalog.doughs.map(item => item.id), baseIds: catalog.bases.map(item => item.id),
    formatIds: catalog.formats.map(item => item.id)
  };
  return { ...catalog, tastes: catalog.tastes.map(entry => ({ ...entry, ...common })),
    formulas: catalog.formulas.map(entry => ({ ...entry, ...common })) };
}

/** Snapshot eligible warehouse extras; never infer links from names or alter the supplied draft. */
export function syncPizzaInventory(draft: MenuDraft, ingredients: readonly IndividualIngredient[]): MenuDraft {
  const catalog = draft.pizzaCatalog;
  if (!catalog?.inventoryExtras) return draft;
  const eligible = ingredients.filter(item => item.extra?.enabled).slice().sort((a, b) => a.id.localeCompare(b.id));
  const inventorySignature = JSON.stringify(eligible.map(item => [item.id, item.name, item.extra, item.food ?? null]));
  const generated = eligible.map(item => ({ id: `inventory:${item.id}`, name: item.name, description: "",
    priceCents: item.extra?.priceCents ?? 0, available: true, ingredients: { [item.id]: item.extra?.dose ?? null },
    ...(item.food ? { food: copyFood(item.food) } : {}), category: "Extra", inventoryIngredientId: item.id }));
  const activeIds = generated.map(item => item.id);
  // Keep recipes referenced by tastes even when an ingredient is no longer an offered extra.
  const included = new Set(catalog.tastes.flatMap(entry => entry.includedToppingIds));
  const existing = new Set(generated.map(item => item.id));
  const preserved = catalog.toppings.filter(item => !existing.has(item.id)
    && (!item.inventoryIngredientId || included.has(item.id)));
  const next = { ...catalog, inventorySignature, toppings: [...preserved, ...generated],
    formulas: catalog.formulas.map(entry => ({ ...entry, toppingIds: activeIds })),
    tastes: catalog.tastes.map(entry => ({ ...entry, toppingIds: [...new Set([
      ...entry.toppingIds.filter(id => preserved.some(item => item.id === id && !item.inventoryIngredientId)), ...activeIds
    ])] })) };
  return materializePizzaMenu({ ...draft, pizzaCatalog: next });
}

/** Pure projection. IDs are explicit catalog identities, never inferred from labels or commercial names. */
export function materializePizzaMenu(draft: MenuDraft): MenuDraft {
  if (!draft.pizzaCatalog) return draft;
  const catalog = applyPizzaDefaults(draft.pizzaCatalog);
  const ids = new Set([...catalog.tastes, ...catalog.formulas].map(entry => entry.id));
  const ordinary = draft.products.filter(product => !product.pizza && !ids.has(product.id));
  // Keep section placement in the source so enabling custom pizzas restores the same menu positions.
  return { ...draft, pizzaCatalog: catalog, products: [...ordinary,
    ...catalog.tastes.map(entry => projectPizza(catalog, entry, "taste")),
    ...(catalog.customEnabled === false ? [] : catalog.formulas.map(entry => projectPizza(catalog, entry, "formula")))] };
}

function projectPizza(catalog: PizzaCatalog, entry: PizzaTaste | PizzaFormula, kind: "taste" | "formula"): IndividualProduct {
  const options: IndividualOption[] = [];
  const groups: MenuOptionGroup[] = [];
  const defaultSelections: MenuSelection[] = [];
  const ingredients: Record<string, number | null> = {};
  const makeId = (part: string, id: string) => `${part}:${id}`;
  const dimensions = [
    { kind: "dough", name: "Impasto", items: catalog.doughs, allowed: entry.doughIds, standard: entry.standardDoughId },
    { kind: "base", name: "Base", items: catalog.bases, allowed: entry.baseIds, standard: entry.standardBaseId },
    { kind: "format", name: "Formato", items: catalog.formats, allowed: entry.formatIds, standard: entry.standardFormatId }
  ] as const;
  for (const dimension of dimensions) {
    const standard = dimension.items.find(item => item.id === dimension.standard);
    const optionIds: string[] = [];
    for (const component of dimension.items.filter(item => dimension.allowed.includes(item.id))) {
      const id = makeId(dimension.kind, component.id);
      optionIds.push(id);
      options.push({ id, name: component.name, ...(component.description ? { description: component.description } : {}),
        priceCents: component.priceCents - (standard?.priceCents ?? 0), ingredients: { ...component.ingredients },
        ...(component.food ? { food: copyFood(component.food) } : {}), available: component.available,
        pizza: { kind: dimension.kind, sourceId: component.id, ...(component.imagePath ? { imagePath: component.imagePath } : {}) } });
      if (component.id === dimension.standard) defaultSelections.push({ optionId: id, quantity: 1 });
    }
    groups.push({ id: dimension.kind, name: dimension.name, kind: dimension.kind, min: 1, max: 1, optionIds });
  }
  const included = "includedToppingIds" in entry ? entry.includedToppingIds : [];
  for (const topping of catalog.toppings.filter(item => included.includes(item.id))) {
    for (const [id, quantity] of Object.entries(topping.ingredients)) {
      const previous = ingredients[id];
      ingredients[id] = quantity === null || previous === null ? null : (previous ?? 0) + quantity;
    }
    options.push({ id: makeId("remove", topping.id), name: `Senza ${topping.name}`, priceCents: 0, ingredients: {},
      removesIngredientIds: Object.keys(topping.ingredients), pizza: { kind: "removal", sourceId: topping.id, category: topping.category } });
  }
  if (included.length) groups.push({ id: "ingredients", name: "Ingredienti", kind: "ingredients", min: 0,
    max: included.length, optionIds: options.filter(option => option.pizza?.kind === "removal").map(option => option.id) });
  for (const topping of catalog.toppings.filter(item => entry.toppingIds.includes(item.id))) {
    options.push({ id: makeId("extra", topping.id), name: topping.name, ...(topping.description ? { description: topping.description } : {}),
      priceCents: topping.priceCents, ingredients: { ...topping.ingredients }, ...(topping.food ? { food: copyFood(topping.food) } : {}),
      available: topping.available, pizza: { kind: "topping", sourceId: topping.id, category: topping.category } });
  }
  const extraIds = options.filter(option => option.pizza?.kind === "topping").map(option => option.id);
  if (extraIds.length) groups.push({ id: "extras", name: "Extra", kind: "extras", min: 0, max: 100, allowRepeat: true, optionIds: extraIds });
  return { id: entry.id, name: entry.name, description: entry.description, priceCents: entry.priceCents,
    available: entry.available, ingredients, allergens: [], options, groups,
    pizza: { kind, sourceId: entry.id, defaultSelections, ...(entry.previewImages ? { previewImages: entry.previewImages.map(image => ({ ...image })) } : {}), ...(entry.toppingImagePath ? { toppingImagePath: entry.toppingImagePath } : {}), includedToppings: catalog.toppings.filter(item => included.includes(item.id)).map(item => ({ sourceId: item.id, ingredientIds: Object.keys(item.ingredients), available: item.available, ...(item.food ? { food: copyFood(item.food) } : {}) })) },
    pizzaRecipeSources: catalog.toppings.filter(item => included.includes(item.id)).map(item => ({ sourceId: item.id, ingredients: { ...item.ingredients } })),
    ...("extraOffer" in entry && entry.extraOffer ? { extraOffer: { ...entry.extraOffer } }
      : "offer" in entry && entry.offer ? { extraOffer: { ...PIZZA_EXTRA_OFFERS[entry.offer] } } : {}),
    ...(entry.imageId ? { imageId: entry.imageId } : {}), ...(entry.pairingProductIds ? { pairingProductIds: [...entry.pairingProductIds] } : {}) };
}
