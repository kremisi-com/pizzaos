import { menuImagePath } from "@pizzaos/domain";
import type { IndividualProduct, MenuSelection } from "@pizzaos/domain";

export interface PizzaMenuChoices {
  doughId?: string;
  baseId?: string;
}

/** Translates shared menu choices into this product's explicit option identities. */
export function pizzaInitialSelections(product: IndividualProduct, choices: PizzaMenuChoices): MenuSelection[] {
  const selections = product.pizza?.defaultSelections.map(choice => ({ ...choice })) ?? [];
  for (const kind of ["dough", "base"] as const) {
    const sourceId = kind === "dough" ? choices.doughId : choices.baseId;
    if (!sourceId) continue;
    const group = product.groups?.find(item => item.kind === kind);
    const option = product.options.find(item => item.pizza?.kind === kind && item.pizza.sourceId === sourceId
      && group?.optionIds.includes(item.id));
    if (!group || !option) continue;
    for (let index = selections.length - 1; index >= 0; index--) {
      if (group.optionIds.includes(selections[index].optionId)) selections.splice(index, 1);
    }
    selections.push({ optionId: option.id, quantity: 1 });
  }
  return selections;
}

/** Selects configured assets only. Uploaded product photos are the fallback. */
export function pizzaPreview(product: IndividualProduct, selections: readonly MenuSelection[], storeId: string) {
  const selected = product.options.filter(option => selections.some(choice => choice.optionId === option.id));
  const doughId = selected.find(option => option.pizza?.kind === "dough")?.pizza?.sourceId;
  const baseId = selected.find(option => option.pizza?.kind === "base")?.pizza?.sourceId;
  const configured = product.pizza?.previewImages?.find(image => image.doughId === doughId && image.baseId === baseId)?.imagePath
    ?? selected.find(option => option.pizza?.kind === "base" && option.pizza.imagePath)?.pizza?.imagePath
    ?? selected.find(option => option.pizza?.kind === "dough" && option.pizza.imagePath)?.pizza?.imagePath;
  return {
    src: configured ?? (product.imageId ? menuImagePath(storeId, product.imageId) : undefined),
    configured: Boolean(configured),
    overlay: configured ? product.pizza?.toppingImagePath : undefined
  };
}
