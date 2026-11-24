import { materializePizzaMenu, type MenuDraft, type PizzaCatalog } from "@pizzaos/domain";
import type { OrderingState } from "./ordering-contract";
import { initialMenuWorkspace, validateDraftHeader, validateMenuDraft } from "./menu-catalog";
import { validatePizzaCatalog } from "./pizza-catalog";
import { validateStoreConfiguration } from "./ordering-service";

export interface PizzaMenuMigration {
  storeId: string; sourceDraftId?: string; draftId: string; name: string; pizzaCatalog: PizzaCatalog;
  /** Explicit replacements also permit replacing a legacy container with several formula entries. */
  replacements: { productId: string; pizzaIds: string[] }[];
}
export interface PizzaMenuMigrationReport {
  draftId: string; changed: boolean; replacedProductIds: string[]; pizzaIds: string[]; pending: string[];
}

/** Pure migration preview. Applying callers commit only the returned state, never a published catalog. */
export function planPizzaMenuMigration(input: OrderingState, source: PizzaMenuMigration): { state: OrderingState; report: PizzaMenuMigrationReport } {
  function invalid(message: string): never { throw new Error(message); }
  if (!source || typeof source !== "object" || !Array.isArray(source.replacements) || source.replacements.length > 500) invalid("Manifest pizza non valido.");
  const state = structuredClone(input);
  const store = Object.hasOwn(state.stores, source.storeId) ? state.stores[source.storeId] : undefined;
  if (!store) invalid("Sede non trovata.");
  if (source.sourceDraftId === source.draftId || store.menu?.id === source.draftId) invalid("La conversione deve produrre una bozza distinta dalla fonte e dal menu pubblicato.");
  const workspace = state.menuDrafts?.[store.id] ?? { revision: 0, drafts: [] };
  const original = source.sourceDraftId ? workspace.drafts.find(draft => draft.id === source.sourceDraftId)
    : store.menu ? { ...store.menu, products: store.products } : initialMenuWorkspace(store).published;
  if (!original) invalid("Bozza sorgente non trovata.");
  validatePizzaCatalog(source.pizzaCatalog, new Set(store.ingredients.map(item => item.id)), invalid);
  const pizzaIds = [...source.pizzaCatalog.tastes, ...source.pizzaCatalog.formulas].map(item => item.id);
  const replacements = new Map<string, string[]>();
  for (const item of source.replacements) {
    if (!item || typeof item.productId !== "string" || replacements.has(item.productId) || !original.products.some(product => product.id === item.productId) ||
      !Array.isArray(item.pizzaIds) || !item.pizzaIds.length || new Set(item.pizzaIds).size !== item.pizzaIds.length || item.pizzaIds.some(id => !pizzaIds.includes(id))) invalid("Corrispondenza pizza assente, duplicata o ambigua.");
    replacements.set(item.productId, item.pizzaIds);
  }
  if (original.products.some(product => !product.pizza && pizzaIds.includes(product.id) && !replacements.has(product.id))) {
    invalid("Un ID pizza coincide con un prodotto non incluso nelle sostituzioni esplicite.");
  }
  const draft: MenuDraft = materializePizzaMenu({ ...structuredClone(original), id: source.draftId, name: source.name,
    pizzaCatalog: structuredClone(source.pizzaCatalog), products: original.products.filter(product => !replacements.has(product.id)),
    sections: original.sections.map(section => ({ ...section,
      productIds: [...new Set(section.productIds.flatMap(id => replacements.get(id) ?? [id]))] })) });
  validateDraftHeader(draft, invalid);
  validateStoreConfiguration({ ...store, products: draft.products });
  validateMenuDraft(draft, store, invalid);
  const previous = workspace.drafts.findIndex(item => item.id === draft.id);
  const changed = JSON.stringify(workspace.drafts[previous]) !== JSON.stringify(draft);
  if (previous < 0 && workspace.drafts.length >= 20) invalid("Hai raggiunto il numero massimo di bozze.");
  if (changed) {
    if (previous < 0) workspace.drafts.push(draft); else workspace.drafts[previous] = draft;
    workspace.revision++;
    (state.menuDrafts ??= {})[store.id] = workspace;
  }
  const pending: string[] = [];
  for (const id of pizzaIds) if (!draft.sections.some(section => section.productIds.includes(id))) pending.push(`Sezione da assegnare: ${id}`);
  for (const item of [...source.pizzaCatalog.doughs, ...source.pizzaCatalog.bases, ...source.pizzaCatalog.formats, ...source.pizzaCatalog.toppings]) {
    for (const [id, dose] of Object.entries(item.ingredients)) {
      if (dose === null) pending.push(`Dose: ${item.name} / ${id}`);
      if (store.ingredients.find(ingredient => ingredient.id === id)?.stock == null) pending.push(`Scorta: ${id}`);
    }
  }
  return { state, report: { draftId: draft.id, changed, replacedProductIds: [...replacements.keys()], pizzaIds, pending: [...new Set(pending)] } };
}
