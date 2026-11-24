import { createHash } from "node:crypto";
import type { IndividualProduct, MenuDraft } from "@pizzaos/domain";
import type { OrderingState } from "./ordering-contract";
import { validateDraftHeader, validateMenuDraft } from "./menu-catalog";
import { validateStoreConfiguration } from "./ordering-service";

export interface ImportedRecipe {
  name: string;
  aliases?: string[];
  description: string;
  sourceText?: string;
  ingredients: { name: string; aliases?: string[]; quantity: number | null }[];
}
export interface MenuImportSource {
  storeId: string; recipes: ImportedRecipe[]; draft?: MenuDraft;
  provenance?: { source: string; capturedAt: string; notes: string[] };
}
export interface MenuImportReport {
  created: string[];
  matched: { name: string; id: string }[];
  pending: string[];
  updatedRecipes: number;
}

/** Comparison only: preserve the source spelling on newly created records. */
export function ingredientNameKey(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("it-IT")
    .replace(/[’‘`]/g, "'").trim().replace(/\s+/g, " ");
}

function keys(entry: { name: string; aliases?: string[] }): string[] {
  return [entry.name, ...entry.aliases ?? []].map(ingredientNameKey);
}

function text(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= 200;
}

/** Validate untrusted CLI JSON before any reconciliation. */
export function validateMenuImportSource(value: unknown): asserts value is MenuImportSource {
  if (!value || typeof value !== "object") throw new Error("Fonte importazione non valida.");
  const source = value as Partial<MenuImportSource>;
  const aliasesValid = (aliases: unknown) => aliases === undefined || (Array.isArray(aliases) && aliases.every(text));
  if (!text(source.storeId) || !Array.isArray(source.recipes) || source.recipes.length > 1000) throw new Error("Sede o ricette mancanti.");
  for (const recipe of source.recipes) {
    if (!recipe || !text(recipe.name) || !aliasesValid(recipe.aliases) || typeof recipe.description !== "string" ||
      recipe.description.length > 1000 || !Array.isArray(recipe.ingredients) || recipe.ingredients.length > 1000) throw new Error("Ricetta della fonte non valida.");
    for (const ingredient of recipe.ingredients) {
      if (!ingredient || !text(ingredient.name) || !aliasesValid(ingredient.aliases) ||
        (ingredient.quantity !== null && (!Number.isSafeInteger(ingredient.quantity) || ingredient.quantity < 1))) {
        throw new Error("Ingrediente o dose della fonte non validi.");
      }
    }
  }
}

/** Pure planning API: callers choose whether to commit the returned state. */
export function reconcileMenuImport(input: OrderingState, source: MenuImportSource): { state: OrderingState; report: MenuImportReport } {
  validateMenuImportSource(source);
  const state = structuredClone(input);
  const existingStore = Object.hasOwn(state.stores, source.storeId) ? state.stores[source.storeId] : undefined;
  if (!existingStore) throw new Error("Sede non trovata.");
  const store = existingStore;
  const report: MenuImportReport = { created: [], matched: [], pending: [], updatedRecipes: 0 };
  const pending = new Set<string>();
  const matched = new Set<string>();
  const definitions = new Map<string, ImportedRecipe>();
  const ingredientDefinitions = new Map<string, string>();
  for (const recipe of source.recipes) {
    for (const key of keys(recipe)) {
      const previous = definitions.get(key);
      if (previous && previous !== recipe) throw new Error(`Ricetta ambigua: ${recipe.name}`);
      definitions.set(key, recipe);
    }
    for (const ingredient of recipe.ingredients) {
      const canonical = ingredientNameKey(ingredient.name);
      for (const key of keys(ingredient)) {
        const previous = ingredientDefinitions.get(key);
        if (previous && previous !== canonical) throw new Error(`Alias ingrediente ambiguo: ${ingredient.name}`);
        ingredientDefinitions.set(key, canonical);
      }
    }
  }

  const previousWorkspace = JSON.stringify(state.menuDrafts?.[store.id]);
  const previousProducts = JSON.stringify(store.products);
  if (source.draft) {
    validateDraftHeader(source.draft, message => { throw new Error(message); });
    const workspace = (state.menuDrafts ??= {})[store.id] ??= { revision: 0, drafts: [] };
    if (store.menu?.id === source.draft.id) throw new Error("Importa una bozza, senza sostituire il menu pubblicato.");
    const candidates = workspace.drafts.filter(draft => draft.id === source.draft?.id ||
      ingredientNameKey(draft.name) === ingredientNameKey(source.draft?.name ?? ""));
    if (candidates.length > 1) throw new Error("Menu di destinazione ambiguo.");
    const old = candidates[0];
    const incoming = structuredClone(source.draft);
    if (old) { incoming.id = old.id; preserveRecipes(incoming, old, definitions); }
    const index = workspace.drafts.findIndex(draft => draft.id === incoming.id);
    if (index < 0) {
      if (workspace.drafts.length >= 20) throw new Error("Hai raggiunto il numero massimo di bozze.");
      workspace.drafts.push(incoming);
    }
    else workspace.drafts[index] = incoming;
  }

  const seenDefinitions = new Set<ImportedRecipe>();
  function reconcile(target: { name: string; description?: string; ingredients: IndividualProduct["ingredients"] }) {
    const definition = definitions.get(ingredientNameKey(target.name));
    if (!definition) return;
    seenDefinitions.add(definition);
    const before = JSON.stringify(target);
    const resolved = new Set<string>();
    for (const ingredient of definition.ingredients) {
      const canonical = ingredientNameKey(ingredient.name);
      const candidates = store.ingredients.filter(item =>
        (ingredientDefinitions.get(ingredientNameKey(item.name)) ?? ingredientNameKey(item.name)) === canonical);
      if (candidates.length > 1) throw new Error(`Corrispondenza magazzino ambigua: ${ingredient.name}`);
      let existing = candidates[0];
      if (!existing) {
        const id = `import-${createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
        if (store.ingredients.some(item => item.id === id)) throw new Error(`Identificativo ingrediente già utilizzato: ${ingredient.name}`);
        existing = { id, name: ingredient.name.trim().replace(/\s+/g, " "), stock: null };
        store.ingredients.push(existing);
        report.created.push(existing.name);
      } else if (!matched.has(existing.id) && !report.created.includes(existing.name)) {
        report.matched.push({ name: ingredient.name, id: existing.id });
        matched.add(existing.id);
      }
      if (resolved.has(existing.id)) throw new Error(`Ingrediente ripetuto nella ricetta: ${ingredient.name}`);
      resolved.add(existing.id);
      target.ingredients[existing.id] = ingredient.quantity ?? target.ingredients[existing.id] ?? null;
      if (target.ingredients[existing.id] === null) pending.add(`Dose: ${definition.name} / ${existing.name}`);
      if (existing.stock === null) pending.add(`Scorta: ${existing.name}`);
    }
    target.description = definition.description;
    if (JSON.stringify(target) !== before) report.updatedRecipes++;
  }
  for (const products of [store.products, ...state.menuDrafts?.[store.id]?.drafts.map(draft => draft.products) ?? []]) {
    for (const product of products) {
      reconcile(product);
      for (const option of product.options) reconcile(option);
    }
  }
  for (const definition of source.recipes) {
    if (!seenDefinitions.has(definition)) pending.add(`Voce non trovata: ${definition.name}`);
    else if (!definition.ingredients.length) pending.add(`Composizione da verificare: ${definition.name}`);
  }
  if (JSON.stringify(state.menuDrafts?.[store.id]) !== previousWorkspace || JSON.stringify(store.products) !== previousProducts) {
    const workspace = (state.menuDrafts ??= {})[store.id] ??= { revision: 0, drafts: [] };
    workspace.revision++;
  }
  validateStoreConfiguration(store);
  for (const draft of state.menuDrafts?.[store.id]?.drafts ?? []) {
    validateDraftHeader(draft, message => { throw new Error(message); });
    validateStoreConfiguration({ ...store, products: draft.products });
    validateMenuDraft(draft, store, message => { throw new Error(message); });
  }
  report.pending = [...pending];
  return { state, report };
}

/** Incoming exports may regenerate IDs: reuse existing product/option identities and operator doses. */
function preserveRecipes(incoming: MenuDraft, previous: MenuDraft, definitions: Map<string, ImportedRecipe>) {
  const identity = (name: string) => ingredientNameKey(definitions.get(ingredientNameKey(name))?.name ?? name);
  const productIds = new Map<string, string>();
  const seenProducts = new Set<string>();
  for (const product of incoming.products) {
    if (seenProducts.has(identity(product.name))) throw new Error(`Prodotto ripetuto: ${product.name}`);
    seenProducts.add(identity(product.name));
    const candidates = previous.products.filter(item => identity(item.name) === identity(product.name));
    if (candidates.length > 1) throw new Error(`Prodotto ambiguo: ${product.name}`);
    const old = candidates[0];
    if (!old) continue;
    productIds.set(product.id, old.id);
    product.id = old.id;
    product.ingredients = { ...old.ingredients, ...Object.fromEntries(Object.entries(product.ingredients).filter(([, dose]) => dose !== null)) };
    const optionIds = new Map<string, string>();
    for (const option of product.options) {
      const choices = old.options.filter(item => identity(item.name) === identity(option.name));
      if (choices.length > 1) throw new Error(`Scelta ambigua: ${option.name}`);
      const oldOption = choices[0];
      if (!oldOption) continue;
      optionIds.set(option.id, oldOption.id);
      option.id = oldOption.id;
      option.ingredients = { ...oldOption.ingredients, ...Object.fromEntries(Object.entries(option.ingredients).filter(([, dose]) => dose !== null)) };
    }
    for (const group of product.groups ?? []) group.optionIds = group.optionIds.map(id => optionIds.get(id) ?? id);
  }
  for (const section of incoming.sections) section.productIds = section.productIds.map(id => productIds.get(id) ?? id);
  for (const product of incoming.products) if (product.pairingProductIds) product.pairingProductIds = product.pairingProductIds.map(id => productIds.get(id) ?? id);
}
