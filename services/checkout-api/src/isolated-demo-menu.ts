import { isDeepStrictEqual } from "node:util";
import type { IndividualIngredient, MenuDraft } from "@pizzaos/domain";
import type { OrderingState } from "./ordering-contract";
import { validateDraftHeader, validateMenuDraft } from "./menu-catalog";
import { preparePizzaMenu } from "./pizza-catalog";
import { validateStoreConfiguration } from "./ordering-service";

export interface IsolatedDemoMenuSource {
  database: "pizzaos_test";
  storeId: string;
  storeName: string;
  inventoryPrefix: string;
  ingredients: IndividualIngredient[];
  draft: MenuDraft;
  provenance: { capturedAt: string; notes: string[] };
}

/** Add one demo draft and its private inventory; never repair or overwrite existing data. */
export function planIsolatedDemoMenu(input: OrderingState, source: IsolatedDemoMenuSource) {
  const state = structuredClone(input);
  const store = state.stores[source.storeId];
  if (!store || store.name !== source.storeName) throw new Error("Sede di destinazione non corrispondente.");
  if (source.database !== "pizzaos_test" || !source.inventoryPrefix.startsWith("demo-menu-") ||
    source.inventoryPrefix.length < 15 || !Array.isArray(source.ingredients) || !source.ingredients.length ||
    new Set(source.ingredients.map(item => item.id)).size !== source.ingredients.length ||
    new Set(source.ingredients.map(item => item.name)).size !== source.ingredients.length ||
    source.ingredients.some(item => !item.id.startsWith(source.inventoryPrefix) ||
      item.stock === null || !Number.isSafeInteger(item.stock) || item.stock < 0 || item.extra !== undefined)) {
    throw new Error("Usa soltanto scorte dimostrative separate e verificate.");
  }
  const invalid = (message: string): never => { throw new Error(message); };
  validateDraftHeader(source.draft, invalid);
  const existingWorkspace = state.menuDrafts?.[store.id];
  if (source.draft.id === store.menu?.id || store.products.some(product => product.id === source.draft.id)) {
    throw new Error("La destinazione deve essere una nuova bozza.");
  }
  const created: string[] = [];
  for (const ingredient of source.ingredients) {
    // Stock isolation is encoded in stable IDs, never in operator-facing labels.
    const existing = store.ingredients.find(item => item.id === ingredient.id);
    if (existing) {
      if (!isDeepStrictEqual(existing, ingredient)) throw new Error(`Scorta demo già modificata: ${ingredient.name}`);
    } else {
      store.ingredients.push(structuredClone(ingredient));
      created.push(ingredient.name);
    }
  }
  const privateIds = new Set(source.ingredients.map(item => item.id));
  const draft = preparePizzaMenu(structuredClone(source.draft), privateIds, invalid, false, undefined, store.ingredients);
  const references = draft.products.flatMap(product => [product.ingredients, ...product.options.map(option => option.ingredients)]);
  if (references.some(recipe => Object.keys(recipe).some(id => !privateIds.has(id)))) {
    throw new Error("La bozza demo non può consumare scorte condivise.");
  }
  validateStoreConfiguration({ ...store, products: draft.products });
  validateMenuDraft(draft, store, invalid, true);
  const old = existingWorkspace?.drafts.find(item => item.id === draft.id || item.name === draft.name);
  if (old && !isDeepStrictEqual(old, draft)) throw new Error("Bozza già presente o modificata: non verrà sovrascritta.");
  if (!old) {
    if ((existingWorkspace?.drafts.length ?? 0) >= 20) throw new Error("Numero massimo di bozze raggiunto.");
    const workspace = (state.menuDrafts ??= {})[store.id] ??= { revision: 0, drafts: [] };
    workspace.drafts.push(draft);
    workspace.revision++;
  }
  return { state, report: { draftId: draft.id, draftName: draft.name, createdDraft: !old,
    createdIngredients: created, products: draft.products.length,
    sections: draft.sections.map(section => ({ name: section.name, products: section.productIds.length })),
    published: false, notes: source.provenance.notes } };
}
