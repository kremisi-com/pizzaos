import type { IndividualIngredient, MenuDraft } from "./individual-ordering";
import type { PizzaCatalog, PizzaComponent, PizzaEntry, PizzaTopping } from "./pizza-types";
import { materializePizzaMenu } from "./pizza-catalog";

/** Convert an editable legacy menu; published menus and order snapshots are never mutated. */
export function simplifyPizzaInventory(draft: MenuDraft, inventory: readonly IndividualIngredient[] = []): MenuDraft {
  if (!draft.pizzaCatalog || draft.pizzaCatalog.inventoryMode === "dough-format") return draft;
  const source = draft.pizzaCatalog;
  const toppings: PizzaTopping[] = source.toppings.map(item => ({ ...item }));
  const allocated = new Set(toppings.map(item => item.id));
  const baseToppings = new Map<string, string[]>();
  function includedBase(entry: PizzaEntry): string[] {
    const baseId = source.defaults?.baseId ?? entry.standardBaseId;
    const previous = baseToppings.get(baseId);
    if (previous) return previous;
    const base = source.bases.find(item => item.id === baseId);
    const ids = Object.entries(base?.ingredients ?? {}).map(([ingredientId, dose], index) => {
      const stem = `base-recipe:${baseToppings.size}:${index}`;
      let id = stem;
      while (allocated.has(id)) id += ":copy";
      allocated.add(id);
      toppings.push({ id, name: inventory.find(item => item.id === ingredientId)?.name ?? ingredientId,
        description: "", priceCents: 0, available: base?.available ?? true, category: "Ricetta",
        ingredients: { [ingredientId]: dose } });
      return id;
    });
    baseToppings.set(baseId, ids);
    return ids;
  }
  const doughs = source.doughs.map(item => {
    const references = Object.keys(item.ingredients);
    return { ...item, ingredients: {}, ...(references.length === 1 ? { inventoryIngredientId: references[0] } : {}) };
  });
  function quantity(format: PizzaComponent): number | null {
    // A legacy recipe can be carried across only if it means the same consumption for every dough.
    const quantities = source.doughs.map(dough => {
      const entries = Object.entries(dough.ingredients);
      if (entries.length !== 1) return null;
      const [id, dose] = entries[0];
      if (dose === null || Object.keys(format.ingredients).some(key => key !== id)) return null;
      const delta = format.ingredients[id];
      return delta === null ? null : dose + (delta ?? 0);
    });
    const first = quantities[0];
    return first !== undefined && first !== null && Number.isSafeInteger(first) && first > 0
      && quantities.every(value => value === first) ? first : null;
  }
  const withoutBase = <T extends PizzaEntry>(entry: T): T => ({ ...entry, standardBaseId: "", baseIds: [],
    previewImages: entry.previewImages?.filter(image => image.baseId === (source.defaults?.baseId ?? entry.standardBaseId))
      .map(image => ({ ...image, baseId: "" })) });
  const catalog: PizzaCatalog = { ...source, inventoryMode: "dough-format", bases: [], doughs,
    formats: source.formats.map(item => ({ ...item, ingredients: {}, doughQuantity: quantity(item) })),
    tastes: source.tastes.map(entry => ({ ...withoutBase(entry), includedToppingIds: [...entry.includedToppingIds, ...includedBase(entry)] })),
    formulas: source.formulas.map(entry => {
      const includedToppingIds = [...entry.includedToppingIds ?? [], ...includedBase(entry)];
      return { ...withoutBase(entry), ...(includedToppingIds.length ? { includedToppingIds } : {}) };
    }), toppings,
    ...(source.defaults ? { defaults: { ...source.defaults, baseId: "" } } : {}) };
  return materializePizzaMenu({ ...draft, pizzaCatalog: catalog });
}
