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
    standardDoughId: defaults.doughId, standardBaseId: catalog.inventoryMode ? "" : defaults.baseId, standardFormatId: defaults.formatId,
    doughIds: catalog.doughs.map(item => item.id), baseIds: catalog.inventoryMode ? [] : catalog.bases.map(item => item.id),
    formatIds: catalog.formats.map(item => item.id)
  };
  return { ...catalog, tastes: catalog.tastes.map(entry => ({ ...entry, ...common })),
    formulas: catalog.formulas.map(entry => ({ ...entry, ...common })) };
}

/** Snapshot eligible warehouse extras; never infer links from names or alter the supplied draft. */
export function syncPizzaInventory(draft: MenuDraft, ingredients: readonly IndividualIngredient[]): MenuDraft {
  const catalog = draft.pizzaCatalog;
  if (!catalog) return draft;
  const eligible = ingredients.filter(item => item.extra?.enabled).slice().sort((a, b) => a.id.localeCompare(b.id));
  const inventorySignature = JSON.stringify(eligible.map(item => [item.id, item.name, item.extra, item.food ?? null]));
  const allocatedIds = new Set(catalog.toppings.map(item => item.id));
  const generated = eligible.map((item, index) => {
    const previous = catalog.toppings.find(topping => topping.inventoryIngredientId === item.id && topping.id.length <= 100);
    const stem = item.id.length <= 90 ? `inventory:${item.id}` : `inventory:extra:${index}`;
    let id = previous?.id ?? stem;
    let suffix = 0;
    if (!previous) while (allocatedIds.has(id)) id = `${stem}:${++suffix}`;
    allocatedIds.add(id);
    return { id, name: item.name, description: "", priceCents: item.extra?.priceCents ?? 0,
      available: true, ingredients: { [item.id]: item.extra?.dose ?? null },
      ...(item.food ? { food: copyFood(item.food) } : {}), category: "Extra", inventoryIngredientId: item.id };
  });
  const activeIds = generated.map(item => item.id);
  // Keep recipes referenced by tastes even when an ingredient is no longer an offered extra.
  const included = new Set([...catalog.tastes, ...catalog.formulas].flatMap(entry => entry.includedToppingIds ?? []));
  const existing = new Set(generated.map(item => item.id));
  const preserved = catalog.toppings.filter(item => !existing.has(item.id) && included.has(item.id));
  // Keep an included recipe stable even when its warehouse extra changes commercially.
  const reservedIds = new Set([...catalog.toppings.map(item => item.id), ...activeIds]);
  const copiedIds = new Map<string, string>();
  const recipeCopies = catalog.toppings.filter(item => included.has(item.id) && existing.has(item.id)).map(item => {
    const stem = `recipe:${item.id}`.slice(0, 100);
    let id = stem;
    let suffix = 0;
    while (reservedIds.has(id)) id = `${stem}:${++suffix}`;
    reservedIds.add(id);
    copiedIds.set(item.id, id);
    const recipe = { ...item };
    delete recipe.inventoryIngredientId;
    return { ...recipe, id };
  });
  const next = { ...catalog, inventoryExtras: true, inventorySignature, toppings: [...preserved, ...recipeCopies, ...generated],
    formulas: catalog.formulas.map(entry => ({ ...entry, toppingIds: activeIds,
      ...(entry.includedToppingIds ? { includedToppingIds: entry.includedToppingIds.map(id => copiedIds.get(id) ?? id) } : {}) })),
    tastes: catalog.tastes.map(entry => ({ ...entry, toppingIds: activeIds,
      includedToppingIds: entry.includedToppingIds.map(id => copiedIds.get(id) ?? id) })) };
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
    if (catalog.inventoryMode === "dough-format" && dimension.kind === "base") continue;
    const standard = dimension.items.find(item => item.id === dimension.standard);
    const optionIds: string[] = [];
    for (const component of dimension.items.filter(item => dimension.allowed.includes(item.id))) {
      const id = makeId(dimension.kind, component.id);
      optionIds.push(id);
      options.push({ id, name: component.name, ...(component.description ? { description: component.description } : {}),
        priceCents: component.priceCents - (standard?.priceCents ?? 0), ingredients: catalog.inventoryMode === "dough-format"
          ? dimension.kind === "dough" && component.inventoryIngredientId ? { [component.inventoryIngredientId]: 1 } : {}
          : { ...component.ingredients },
        ...(component.food ? { food: copyFood(component.food) } : {}), available: component.available
          && !(catalog.inventoryMode === "dough-format" && dimension.kind === "dough" && !component.inventoryIngredientId),
        pizza: { kind: dimension.kind, sourceId: component.id, ...(component.imagePath ? { imagePath: component.imagePath } : {}),
          ...(catalog.inventoryMode === "dough-format" && dimension.kind === "format" ? { doughQuantity: component.doughQuantity ?? null } : {}) } });
      if (component.id === dimension.standard) defaultSelections.push({ optionId: id, quantity: 1 });
    }
    groups.push({ id: dimension.kind, name: dimension.name, kind: dimension.kind, min: 1, max: 1, optionIds });
  }
  const included = entry.includedToppingIds ?? [];
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
  if (extraIds.length) groups.push({ id: "extras", name: "Extra", kind: "extras", min: 0, max: extraIds.length, allowRepeat: false, optionIds: extraIds });
  const taste = kind === "taste" ? entry as PizzaTaste : undefined;
  const customizations = taste?.customizations;
  if (customizations) {
    options.push(...structuredClone(customizations.options));
    groups.push(...structuredClone(customizations.groups ?? (customizations.options.length
      ? [{ id: "product-choices", name: "Scelte del prodotto", kind: "selection" as const, min: 0,
        max: customizations.options.length, optionIds: customizations.options.map(option => option.id) }] : [])));
  }
  return { id: entry.id, productType: "pizza", name: entry.name, description: entry.description, priceCents: entry.priceCents,
    available: entry.available, ingredients, allergens: taste?.allergens ? [...taste.allergens] : [], options, groups,
    ...(taste?.food ? { food: copyFood(taste.food) } : {}),
    pizza: { kind, sourceId: entry.id, defaultSelections,
      ...(entry.recommendedDoughId && entry.recommendedDoughId !== entry.standardDoughId
        ? { recommendedDoughOptionId: makeId("dough", entry.recommendedDoughId) } : {}), ...(entry.previewImages ? { previewImages: entry.previewImages.map(image => ({ ...image })) } : {}), ...(entry.toppingImagePath ? { toppingImagePath: entry.toppingImagePath } : {}), includedToppings: catalog.toppings.filter(item => included.includes(item.id)).map(item => ({ sourceId: item.id, ingredientIds: Object.keys(item.ingredients), available: item.available, ...(item.food ? { food: copyFood(item.food) } : {}) })) },
    pizzaRecipeSources: catalog.toppings.filter(item => included.includes(item.id)).map(item => ({ sourceId: item.id, ingredients: { ...item.ingredients } })),
    ...("extraOffer" in entry && entry.extraOffer ? { extraOffer: { ...entry.extraOffer } }
      : "offer" in entry && entry.offer ? { extraOffer: { ...PIZZA_EXTRA_OFFERS[entry.offer] } } : {}),
    ...(entry.imageId ? { imageId: entry.imageId } : {}), ...(entry.pairingProductIds ? { pairingProductIds: [...entry.pairingProductIds] } : {}) };
}
