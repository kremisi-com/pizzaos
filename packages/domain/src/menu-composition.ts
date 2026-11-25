import type { IndividualOption, IndividualProduct } from "./individual-ordering";
import { menuAllergenKey, type MenuComposition, type MenuFoodInformation, type MenuSelection } from "./menu-ordering";

export interface ResolvedMenuComposition {
  valid: boolean;
  unitCents: number;
  recipe: Record<string, number | null>;
  composition: MenuComposition;
}

export function resolveMenuComposition(product: IndividualProduct, selections: readonly MenuSelection[]): ResolvedMenuComposition {
  const options = new Map(product.options.map(option => [option.id, option]));
  const groupByOption = new Map(product.groups?.flatMap(group => group.optionIds.map(id => [id, group] as const)));
  const counts = new Map<string, number>();
  const selected: { option: IndividualOption; quantity: number; discounted: boolean }[] = [];
  const seen = new Set<string>();
  let valid = true;

  for (const choice of selections) {
    const option = options.get(choice.optionId);
    const group = groupByOption.get(choice.optionId);
    if (!option || seen.has(choice.optionId) || !Number.isInteger(choice.quantity) || choice.quantity < 1 || choice.quantity > 100) {
      valid = false;
      continue;
    }
    seen.add(choice.optionId);
    if (option.available === false || (product.groups && !group) || (choice.quantity > 1 && !group?.allowRepeat)) valid = false;
    if (group) counts.set(group.id, (counts.get(group.id) ?? 0) + choice.quantity);
    selected.push({ option, quantity: choice.quantity, discounted: group?.kind === "extras" });
  }
  for (const group of product.groups ?? []) {
    const count = counts.get(group.id) ?? 0;
    if (count < group.min || count > group.max) valid = false;
  }

  const removed = new Set(selected.filter(({ option }) => !option.pizza).flatMap(({ option }) => option.removesIngredientIds ?? []));
  const recipe = new Map<string, number | null>();
  function addDose(id: string, units: number | null) {
    const previous = recipe.get(id);
    recipe.set(id, units === null || previous === null ? null : (previous ?? 0) + units);
  }
  const removedToppings = new Set(selected.filter(({ option }) => option.pizza?.kind === "removal").map(({ option }) => option.pizza?.sourceId));
  const pizzaBase = product.pizzaRecipeSources?.filter(source => !removedToppings.has(source.sourceId)).flatMap(source => Object.entries(source.ingredients))
    ?? product.pizza?.includedToppings?.filter(source => !removedToppings.has(source.sourceId)).flatMap(source => source.ingredientIds.map(id => [id, 1] as const));
  const base = pizzaBase ?? product.baseIngredientIds?.map(id => [id, 1] as const) ?? Object.entries(product.ingredients);
  for (const [id, units] of base) {
    if (!removed.has(id)) addDose(id, units);
  }
  const contains = new Map<string, string>();
  const mayContain = new Map<string, string>();
  function includeFood(food: MenuFoodInformation) {
    for (const label of food.contains) contains.set(menuAllergenKey(label), label);
    for (const label of food.mayContain) mayContain.set(menuAllergenKey(label), label);
  }
  if (product.food) includeFood(product.food);
  else if (!product.groups || product.pizza) includeFood({ contains: product.allergens, mayContain: [] });

  let foodComplete = true;
  let identifiedFood = Boolean(product.food || base.length);
  for (const source of product.pizza?.includedToppings ?? []) {
    if (!removedToppings.has(source.sourceId) && source.available === false) valid = false;
    if (!removedToppings.has(source.sourceId) && source.food) { includeFood(source.food); identifiedFood = true; }
  }
  const ingredients = new Map(product.foodIngredients?.map(item => [item.id, item]));
  const format = selected.find(({ option }) => option.pizza?.kind === "format")?.option.pizza;
  const visibleIngredientIds = new Set(base.map(([id]) => id));
  const doughQuantity = format?.doughQuantity;
  if (doughQuantity != null && (!Number.isSafeInteger(doughQuantity) || doughQuantity < 1)) valid = false;
  for (const { option, quantity } of selected) {
    const references = option.ingredientIds?.map(id => [id, 1] as const) ?? Object.entries(option.ingredients);
    const ownRemovals = new Set(option.removesIngredientIds);
    for (const [id, units] of references) {
      if (option.pizza?.kind !== "dough" || doughQuantity === undefined) visibleIngredientIds.add(id);
      const dose = option.pizza?.kind === "dough" && doughQuantity !== undefined ? doughQuantity : units;
      if (!removed.has(id) || ownRemovals.has(id) || option.pizza?.kind === "dough" && doughQuantity !== undefined) {
        addDose(id, dose === null ? null : dose * quantity);
      }
    }
    if (option.food) { includeFood(option.food); identifiedFood = true; }
    else if (!references.length && !ownRemovals.size && ["recipe", "extras", "selection"].includes(groupByOption.get(option.id)?.kind ?? "")) foodComplete = false;
  }
  for (const id of recipe.keys()) {
    identifiedFood = true;
    const food = ingredients.get(id)?.food;
    if (food) includeFood(food);
    else foodComplete = false;
  }

  const discounts = new Map<string, number>();
  if (product.extraOffer) {
    const { quota, percent } = product.extraOffer;
    let remaining = quota;
    const eligible = selected.filter(item => item.discounted).sort((left, right) =>
      right.option.priceCents - left.option.priceCents || left.option.id.localeCompare(right.option.id));
    for (const { option, quantity } of eligible) {
      const eligibleQuantity = Math.min(remaining, quantity);
      const discountedUnit = Math.round(option.priceCents * (100 - percent) / 100);
      discounts.set(option.id, eligibleQuantity * (option.priceCents - discountedUnit));
      remaining -= eligibleQuantity;
    }
  }
  const extraDiscountCents = [...discounts.values()].reduce((sum, value) => sum + value, 0);
  const choices = selected.map(({ option, quantity }) => ({ optionId: option.id, name: option.name, quantity,
    subtotalCents: option.priceCents * quantity - (discounts.get(option.id) ?? 0) }));
  const unitCents = choices.reduce((sum, item) => sum + item.subtotalCents, product.priceCents);
  return {
    valid: valid && unitCents >= 0 && Number.isSafeInteger(unitCents) && [...recipe.values()].every(units => units === null || Number.isSafeInteger(units)),
    unitCents,
    recipe: Object.fromEntries(recipe),
    composition: {
      ...(product.pizza ? { pizza: product.pizza } : {}),
      choices, extraDiscountCents, foodComplete: identifiedFood && foodComplete && valid,
      ingredients: [...recipe.keys()].filter(id => !product.pizza || visibleIngredientIds.has(id)).map(id => ingredients.get(id)?.name ?? id),
      contains: [...contains.values()],
      mayContain: [...mayContain.values()]
    }
  };
}
