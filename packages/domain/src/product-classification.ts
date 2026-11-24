import type { IndividualIngredient, IndividualProduct, MenuDraft } from "./individual-ordering";
import type { PizzaCatalog, PizzaEntry, PizzaTaste } from "./pizza-types";
import { applyPizzaDefaults, emptyPizzaCatalog, materializePizzaMenu, syncPizzaInventory } from "./pizza-catalog";

export interface ProductClassificationPlan {
  draft?: MenuDraft;
  changes: string[];
  errors: string[];
}

type Recipe = IndividualProduct["ingredients"];

function combine(recipes: readonly Recipe[]): Recipe {
  const result: Recipe = {};
  for (const recipe of recipes) for (const [id, dose] of Object.entries(recipe)) {
    result[id] = dose === null || result[id] === null ? null : (result[id] ?? 0) + dose;
  }
  return result;
}

function standards(catalog: PizzaCatalog, entry: PizzaEntry): Recipe {
  return combine([
    catalog.doughs.find(item => item.id === entry.standardDoughId)?.ingredients ?? {},
    catalog.bases.find(item => item.id === entry.standardBaseId)?.ingredients ?? {},
    catalog.formats.find(item => item.id === entry.standardFormatId)?.ingredients ?? {}
  ]);
}

/** Prepare a reviewable classification without changing the supplied menu or its published counterpart. */
export function planProductClassification(
  draft: MenuDraft, productId: string, pizza: boolean, ingredients: readonly IndividualIngredient[],
  options: { newProduct?: boolean } = {}
): ProductClassificationPlan {
  const product = draft.products.find(item => item.id === productId);
  const fail = (message: string): ProductClassificationPlan => ({ changes: [], errors: [message] });
  if (!product) return fail("Prodotto assente dalla bozza.");
  if (product.pizza?.kind === "formula") return fail("Le combinazioni Pizza custom si gestiscono nel pannello dedicato.");
  if (Boolean(product.pizza) === pizza) return { draft: structuredClone(draft), changes: [], errors: [] };
  const next = structuredClone(draft);
  const source = next.pizzaCatalog ?? emptyPizzaCatalog();
  if (pizza && !source.defaults && (source.tastes.length || source.formulas.length)) {
    return fail("Configura esplicitamente gli standard comuni in Impasti, basi e formati prima di convertire il prodotto. Le altre pizze restano invariate.");
  }
  const catalog = pizza ? applyPizzaDefaults({ ...source, defaults: source.defaults ?? {
    doughId: source.doughs[0]?.id ?? "", baseId: source.bases[0]?.id ?? "", formatId: source.formats[0]?.id ?? ""
  } }) : applyPizzaDefaults(source);
  if (!pizza) {
    const taste = catalog.tastes.find(item => item.id === productId);
    if (!taste) return fail("La ricetta pizza non è presente nel catalogo: verifica la bozza.");
    const recipe = combine([standards(catalog, taste), ...taste.includedToppingIds.map(id =>
      catalog.toppings.find(item => item.id === id)?.ingredients ?? {})]);
    const ordinary: IndividualProduct = { id: product.id, name: product.name, description: product.description,
      priceCents: product.priceCents, available: product.available, allergens: [...product.allergens], ingredients: recipe,
      options: structuredClone(taste.customizations?.options ?? []),
      ...(taste.customizations?.groups ? { groups: structuredClone(taste.customizations.groups) } : {}),
      ...(product.food ? { food: structuredClone(product.food) } : {}),
      ...(product.imageId ? { imageId: product.imageId } : {}),
      ...(product.pairingProductIds ? { pairingProductIds: [...product.pairingProductIds] } : {}) };
    catalog.tastes = catalog.tastes.filter(item => item.id !== productId);
    next.products = next.products.map(item => item.id === productId ? ordinary : item);
    next.pizzaCatalog = catalog;
    return { draft: syncPizzaInventory(next, ingredients), errors: [], changes: [
      "Il prodotto conserva ricetta completa, prezzo, foto, posizione e scelte specifiche.",
      "Impasti, basi, formati ed extra comuni non saranno più proposti per questa voce."
    ] };
  }
  if (product.extraOffer) return fail("Verifica lo sconto extra del prodotto prima di convertirlo: le formule pizza si gestiscono in Pizza custom.");
  const custom = structuredClone({ options: product.options, ...(product.groups ? { groups: product.groups } : {}) });
  if (custom.options.some(option => option.pizza || /^(dough|base|format|extra|remove):/.test(option.id))
    || custom.groups?.some(group => ["dough", "base", "format", "ingredients", "extras", "product-choices"].includes(group.id))) {
    return fail("Le scelte specifiche usano identificativi riservati alla pizza. Verifica i gruppi prima di cambiare tipo.");
  }
  const entry: PizzaTaste = { id: product.id, name: product.name, description: product.description,
    priceCents: product.priceCents, available: product.available,
    standardDoughId: catalog.defaults?.doughId ?? "", standardBaseId: catalog.defaults?.baseId ?? "",
    standardFormatId: catalog.defaults?.formatId ?? "", doughIds: catalog.doughs.map(item => item.id),
    baseIds: catalog.bases.map(item => item.id), formatIds: catalog.formats.map(item => item.id), toppingIds: [], includedToppingIds: [],
    ...(custom.options.length || custom.groups ? { customizations: custom } : {}),
    allergens: [...product.allergens], ...(product.food ? { food: structuredClone(product.food) } : {}),
    ...(product.imageId ? { imageId: product.imageId } : {}),
    ...(product.pairingProductIds ? { pairingProductIds: [...product.pairingProductIds] } : {}) };
  const standardRecipe = standards(catalog, entry);
  const recipe = { ...(options.newProduct && !Object.keys(product.ingredients).length ? standardRecipe : product.ingredients) };
  for (const [id, dose] of Object.entries(standardRecipe)) {
    const original = recipe[id];
    if (original === undefined || dose === null && original !== null || dose !== null && original !== null && original < dose) {
      return fail(`Verifica ricetta e standard: la dose di ${ingredients.find(item => item.id === id)?.name ?? id} non copre quella dei componenti standard.`);
    }
    if (original === null || dose === null) recipe[id] = null;
    else if (original === dose) delete recipe[id];
    else recipe[id] = original - dose;
  }
  for (const [id, dose] of Object.entries(recipe)) {
    // Index-based IDs stay short even when the original ingredient ID reaches its contract limit.
    let toppingId = `product-recipe:${product.id}:${entry.includedToppingIds.length}`;
    if (toppingId.length > 100) toppingId = `product-recipe:${catalog.toppings.length}`;
    let suffix = 0;
    const stem = toppingId;
    while (catalog.toppings.some(item => item.id === toppingId)) toppingId = `${stem.slice(0, 100)}:${++suffix}`;
    const ingredient = ingredients.find(item => item.id === id);
    catalog.toppings.push({ id: toppingId, name: ingredient?.name ?? id,
      description: "", priceCents: 0, available: true, ingredients: { [id]: dose }, category: "Ricetta",
      ...(ingredient?.food ? { food: structuredClone(ingredient.food) } : {}) });
    entry.includedToppingIds.push(toppingId);
  }
  catalog.tastes.push(entry);
  next.pizzaCatalog = catalog;
  return { draft: syncPizzaInventory(materializePizzaMenu(next), ingredients), errors: [], changes: [
    "La voce diventa una pizza con impasti, basi e formati comuni ed extra dal Magazzino.",
    "Nome, prezzo, ricetta, foto, disponibilità, posizione e scelte specifiche vengono conservati.",
    ...(options.newProduct && !Object.keys(product.ingredients).length ? ["La nuova pizza parte dalla ricetta dei componenti standard."] : []),
    ...(!entry.standardDoughId || !entry.standardBaseId || !entry.standardFormatId
      ? ["Configura impasto, base e formato standard prima di pubblicare."] : [])
  ] };
}
