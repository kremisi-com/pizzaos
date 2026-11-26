import type { IndividualIngredient, IndividualProduct } from "./individual-ordering";
import { menuAllergenKey, type MenuComposition, type MenuOptionGroup, type MenuSelection } from "./menu-ordering";
import { resolveMenuComposition, type ResolvedMenuComposition } from "./menu-composition";

import type { MealSelection, ProductType } from "./product-type-contracts";
export type { MealSelection, MealStep, ProductType } from "./product-type-contracts";

/** Read explicit behavior, with structural interpretation of saved catalogs. */
export function productType(product: IndividualProduct): ProductType {
  return product.productType ?? (product.pizza ? "pizza" : product.groups?.some(group => group.kind === "selection") ? "box" : "product");
}

function optionId(kind: string, ingredientId: string): string {
  if (ingredientId.length <= 72) return `sandwich:${kind}:${ingredientId}`;
  // Stable across warehouse reordering and additions, including long external IDs.
  let first = 2166136261;
  let second = 5381;
  for (const character of ingredientId) {
    first = Math.imul(first ^ character.charCodeAt(0), 16777619);
    second = Math.imul(second, 33) ^ character.charCodeAt(0);
  }
  return `sandwich:${kind}:${(first >>> 0).toString(36)}:${(second >>> 0).toString(36)}`;
}

/** Generate sandwich removals and shared warehouse extras, without pizza dimensions. */
export function materializeSandwich(product: IndividualProduct, ingredients: readonly IndividualIngredient[]): IndividualProduct {
  if (productType(product) !== "sandwich") return product;
  const inventory = new Map(ingredients.map(item => [item.id, item]));
  const removals = Object.keys(product.ingredients).map(id => ({
    id: optionId("remove", id), name: `Senza ${inventory.get(id)?.name ?? id}`, priceCents: 0,
    ingredients: {}, removesIngredientIds: [id]
  }));
  const extras = ingredients.filter(item => item.extra?.enabled).map(item => ({
    id: optionId("extra", item.id), name: item.name, priceCents: item.extra?.priceCents ?? 0,
    ingredients: { [item.id]: item.extra?.dose ?? null },
    ...(item.food ? { food: structuredClone(item.food) } : {}), available: item.stock !== 0
  }));
  const groups: MenuOptionGroup[] = [
      { id: "sandwich-ingredients", name: "Ingredienti", kind: "ingredients", min: 0, max: removals.length,
        optionIds: removals.map(item => item.id) },
      { id: "sandwich-extras", name: "Extra", kind: "extras", min: 0, max: 100, allowRepeat: true,
        optionIds: extras.map(item => item.id) }
    ];
  return { ...product, productType: "sandwich", pizza: undefined, pizzaRecipeSources: undefined,
    options: [...removals, ...extras], groups: groups.filter(group => group.optionIds.length > 0) };
}

/** Automatic included recipe choices in a meal; never replace an unavailable recommendation. */
export function mealDefaultSelections(product: IndividualProduct): MenuSelection[] {
  if (productType(product) !== "pizza" || !product.pizza) return [];
  const recommendation = product.pizza.recommendedDoughOptionId;
  const choices = product.pizza.defaultSelections.filter(choice => {
    const kind = product.options.find(option => option.id === choice.optionId)?.pizza?.kind;
    return !recommendation || kind !== "dough";
  }).map(choice => ({ ...choice }));
  if (recommendation) choices.push({ optionId: recommendation, quantity: 1 });
  return choices;
}

/** Ingredients the customer may remove; dough and format components are not included. */
export function mealRemovableIngredientIds(product: IndividualProduct): string[] {
  return [...new Set(product.pizzaRecipeSources?.flatMap(source => Object.keys(source.ingredients))
    ?? product.pizza?.includedToppings?.flatMap(source => source.ingredientIds)
    ?? product.baseIngredientIds ?? Object.keys(product.ingredients))];
}

function mealChild(product: IndividualProduct, removed: Set<string>): IndividualProduct {
  const filterRecipe = (recipe: Record<string, number | null>) => Object.fromEntries(Object.entries(recipe).filter(([id]) => !removed.has(id)));
  const dimensions = new Set(["dough", "base", "format"]);
  return { ...product, priceCents: 0, allergens: [], food: undefined, extraOffer: undefined,
    ingredients: filterRecipe(product.ingredients),
    ...(product.baseIngredientIds ? { baseIngredientIds: product.baseIngredientIds.filter(id => !removed.has(id)) } : {}),
    ...(product.pizzaRecipeSources ? { pizzaRecipeSources: product.pizzaRecipeSources.map(source => ({ ...source, ingredients: filterRecipe(source.ingredients) })) } : {}),
    ...(product.pizza ? { pizza: { ...product.pizza, includedToppings: product.pizza.includedToppings?.map(source => ({
      ...source, ingredientIds: source.ingredientIds.filter(id => !removed.has(id)), food: undefined,
      // An entirely removed topping does not prevent the remaining recipe from being ordered.
      available: source.ingredientIds.every(id => removed.has(id)) ? true : source.available
    })) } } : {}),
    options: product.options.filter(option => option.pizza && dimensions.has(option.pizza.kind)).map(option => ({ ...option, priceCents: 0 })),
    groups: (product.groups ?? []).filter(group => dimensions.has(group.kind)) };
}

/** Resolve exactly one permitted product per step, at the meal's fixed price plus adjustments. */
export function resolveMealComposition(product: IndividualProduct, selections: readonly MealSelection[], products: readonly IndividualProduct[]): ResolvedMenuComposition {
  const steps = product.meal?.steps ?? [];
  const children = new Map(products.map(child => [child.id, child]));
  const recipe: Record<string, number | null> = {};
  const mealSteps: NonNullable<MenuComposition["mealSteps"]> = [];
  const contains = new Map<string, string>();
  const mayContain = new Map<string, string>();
  const names = new Set<string>();
  let valid = productType(product) === "meal" && product.available !== false && steps.length > 0 && selections.length === steps.length;
  let foodComplete = true;
  let unitCents = product.priceCents;
  if (new Set(steps.map(step => step.id)).size !== steps.length || new Set(selections.map(choice => choice.stepId)).size !== selections.length) valid = false;
  for (const step of steps) {
    const choice = selections.find(item => item.stepId === step.id);
    const alternative = step.alternatives.find(item => item.productId === choice?.productId);
    const child = alternative && children.get(alternative.productId);
    if (!choice || !alternative || !child || !["pizza", "sandwich", "product"].includes(productType(child))
      || child.pizza?.kind === "formula" || child.available === false) {
      valid = false;
      continue;
    }
    const removable = new Set(mealRemovableIngredientIds(child));
    const removed = new Set(choice.removedIngredientIds);
    if (removed.size !== choice.removedIngredientIds.length || [...removed].some(id => !removable.has(id))
      || choice.notes.length > 1000) valid = false;
    const resolved = resolveMenuComposition(mealChild(child, removed), mealDefaultSelections(child));
    const removedIngredientNames = choice.removedIngredientIds.map(id => child.foodIngredients?.find(item => item.id === id)?.name ?? id);
    resolved.composition.choices.push(...choice.removedIngredientIds.map((id, index) => ({
      optionId: `remove:${id}`, name: `Senza ${removedIngredientNames[index]}`, quantity: 1, subtotalCents: 0
    })));
    valid = valid && resolved.valid;
    foodComplete = foodComplete && resolved.composition.foodComplete;
    unitCents += alternative.priceCents;
    if (!Number.isSafeInteger(alternative.priceCents)) valid = false;
    for (const [id, units] of Object.entries(resolved.recipe)) {
      const previous = recipe[id];
      recipe[id] = previous === null || units === null ? null : (previous ?? 0) + units;
    }
    for (const label of resolved.composition.contains) contains.set(menuAllergenKey(label), label);
    for (const label of resolved.composition.mayContain) mayContain.set(menuAllergenKey(label), label);
    for (const name of resolved.composition.ingredients) names.add(name);
    mealSteps.push({ stepId: step.id, name: step.name, productId: child.id, productName: child.name,
      priceCents: alternative.priceCents, removedIngredientIds: [...choice.removedIngredientIds], removedIngredientNames, notes: choice.notes,
      composition: resolved.composition });
  }
  valid = valid && Number.isSafeInteger(unitCents) && unitCents >= 0
    && Object.values(recipe).every(units => units === null || Number.isSafeInteger(units) && units >= 0);
  return { valid, unitCents, recipe, composition: { choices: [], mealSteps,
    ingredients: [...names], contains: [...contains.values()], mayContain: [...mayContain.values()],
    foodComplete: foodComplete && valid, extraDiscountCents: 0 } };
}
