import type { IndividualOption, IndividualProduct, MenuDraft } from "./individual-ordering";
import { PIZZA_EXTRA_OFFERS, type MenuFoodInformation, type MenuOptionGroup, type MenuSelection } from "./menu-ordering";

export * from "./pizza-types";
import type { PizzaCatalog, PizzaFormula, PizzaTaste } from "./pizza-types";

function copyFood(food: MenuFoodInformation): MenuFoodInformation {
  return { contains: [...food.contains], mayContain: [...food.mayContain] };
}

export function emptyPizzaCatalog(): PizzaCatalog {
  return { doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [] };
}

/** Pure projection. IDs are explicit catalog identities, never inferred from labels or commercial names. */
export function materializePizzaMenu(draft: MenuDraft): MenuDraft {
  const catalog = draft.pizzaCatalog;
  if (!catalog) return draft;
  const ids = new Set([...catalog.tastes, ...catalog.formulas].map(entry => entry.id));
  const ordinary = draft.products.filter(product => !product.pizza && !ids.has(product.id));
  return { ...draft, products: [...ordinary,
    ...catalog.tastes.map(entry => projectPizza(catalog, entry, "taste")),
    ...catalog.formulas.map(entry => projectPizza(catalog, entry, "formula"))] };
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
    ...("offer" in entry ? { extraOffer: { ...PIZZA_EXTRA_OFFERS[entry.offer] } } : {}),
    ...(entry.imageId ? { imageId: entry.imageId } : {}), ...(entry.pairingProductIds ? { pairingProductIds: [...entry.pairingProductIds] } : {}) };
}
