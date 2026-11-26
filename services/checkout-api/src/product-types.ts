import { materializeSandwich, productType, type IndividualIngredient, type IndividualProduct, type MealSelection, type MenuDraft, type MenuWorkspace } from "@pizzaos/domain";

type Invalid = (message: string) => never;
function isMenuRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
const types = new Set(["pizza", "sandwich", "product", "box", "meal"]);
const id = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= 200 && !["__proto__", "constructor", "prototype"].includes(value);
const only = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).every(key => fields.includes(key));

export function validateMealSelections(value: unknown, invalid: Invalid): asserts value is MealSelection[] {
  if (!Array.isArray(value) || value.length > 30) invalid("Scelte del Menu non valide.");
  const seen = new Set<string>();
  for (const item of value) {
    if (!isMenuRecord(item) || !only(item, ["stepId", "productId", "removedIngredientIds", "notes"])
      || !id(item.stepId) || seen.has(item.stepId) || !id(item.productId)
      || !Array.isArray(item.removedIngredientIds) || item.removedIngredientIds.length > 100
      || item.removedIngredientIds.some(entry => !id(entry))
      || new Set(item.removedIngredientIds).size !== item.removedIngredientIds.length
      || typeof item.notes !== "string" || item.notes.length > 1000) invalid("Controlla le scelte e le note delle fasi del Menu.");
    seen.add(item.stepId);
  }
}

/** Check both supplied projections and source pizza identities before regenerating products. */
export function validateImmutableProductTypes(draft: MenuDraft, current: MenuWorkspace, invalid: Invalid): void {
  const previous = current.drafts.find(item => item.id === draft.id);
  const sources = previous ? [previous] : [current.published, ...current.drafts];
  const known = new Map<string, IndividualProduct>();
  for (const source of sources) for (const product of source.products) if (!known.has(product.id)) known.set(product.id, product);
  const knownPizzaIds = new Set(sources.flatMap(source => source.pizzaCatalog ? [...source.pizzaCatalog.tastes, ...source.pizzaCatalog.formulas].map(entry => entry.id) : []));
  const catalog = draft.pizzaCatalog;
  if (catalog !== undefined && (!isMenuRecord(catalog) || !Array.isArray(catalog.tastes) || !Array.isArray(catalog.formulas))) invalid("Catalogo pizza non valido.");
  const entries = catalog ? [...catalog.tastes, ...catalog.formulas] : [];
  if (entries.some(entry => !isMenuRecord(entry) || !id(entry.id))) invalid("Catalogo pizza non valido.");
  const pizzaIds = new Set(entries.map(entry => entry.id));
  for (const product of draft.products) {
    if (!isMenuRecord(product)) invalid("Prodotto del menu non valido.");
    if (product.productType !== undefined && !types.has(product.productType)
      || product.groups !== undefined && (!Array.isArray(product.groups) || product.groups.some(group => !isMenuRecord(group)))) invalid("Tipo o gruppi del prodotto non validi.");
    const original = known.get(product.id);
    if (original && productType(original) !== productType(product)) invalid("Il tipo del prodotto è definitivo. Crea un nuovo prodotto per usare un altro tipo.");
    if (knownPizzaIds.has(product.id) && productType(product) !== "pizza") invalid("Il tipo del prodotto è definitivo. Crea un nuovo prodotto per usare un altro tipo.");
    if (original && pizzaIds.has(product.id) && productType(original) !== "pizza") invalid("Il tipo del prodotto è definitivo. Crea una nuova pizza.");
  }
  for (const pizzaId of pizzaIds) {
    const original = known.get(pizzaId);
    if (original && productType(original) !== "pizza") invalid("Il tipo del prodotto è definitivo. Crea una nuova pizza.");
  }
  if (previous) {
    const present = new Set([...draft.products.map(product => product.id), ...pizzaIds]);
    for (const product of previous.products) if (!present.has(product.id) && draft.products.some(item => isMenuRecord(item.meal) && Array.isArray(item.meal.steps)
      && item.meal.steps.some(step => isMenuRecord(step) && Array.isArray(step.alternatives) && step.alternatives.some(alternative => isMenuRecord(alternative) && alternative.productId === product.id)))) {
      invalid("Rimuovi prima il prodotto dalle fasi del Menu che lo utilizzano.");
    }
  }
}

export function normalizeProductTypes(draft: MenuDraft, inventory: readonly IndividualIngredient[]): MenuDraft {
  return { ...draft, products: draft.products.map(product => productType(product) === "sandwich"
    ? materializeSandwich(product, inventory)
    : { ...product, productType: productType(product) }) };
}

export function validateProductType(product: IndividualProduct, products: readonly IndividualProduct[], invalid: Invalid, publishing: boolean): void {
  if (product.productType !== undefined && !types.has(product.productType)) invalid("Tipo prodotto non valido.");
  const type = productType(product);
  if (type === "pizza" && !product.pizza) invalid("Una pizza deve appartenere al catalogo pizza.");
  if (type !== "pizza" && product.pizza) invalid("Il tipo prodotto non corrisponde alla sua configurazione.");
  if (type !== "meal") {
    if (product.meal !== undefined) invalid("Le fasi sono disponibili soltanto per il tipo Menu.");
    return;
  }
  if (Object.keys(product.ingredients).length || product.options.length || product.groups?.length || product.extraOffer) invalid("Il Menu contiene prodotti nelle fasi: non aggiungere ricette o gruppi propri.");
  if (product.meal === undefined && !publishing) return;
  if (!isMenuRecord(product.meal) || !only(product.meal, ["steps"]) || !Array.isArray(product.meal.steps) || product.meal.steps.length > 30) invalid("Fasi del Menu non valide.");
  if (publishing && !product.meal.steps.length) invalid("Aggiungi almeno una fase al Menu prima di pubblicare.");
  const seen = new Set<string>();
  let minimum = product.priceCents;
  let maximum = product.priceCents;
  for (const step of product.meal.steps) {
    if (!isMenuRecord(step) || !only(step, ["id", "name", "alternatives"]) || !id(step.id) || seen.has(step.id)
      || typeof step.name !== "string" || step.name.length > 200 || publishing && !step.name.trim()
      || !Array.isArray(step.alternatives) || step.alternatives.length > 100) invalid("Controlla nome e alternative di ogni fase del Menu.");
    seen.add(step.id);
    if (publishing && !step.alternatives.length) invalid(`«${step.name}»: scegli almeno un prodotto prima di pubblicare.`);
    const references = new Set<string>();
    for (const alternative of step.alternatives) {
      if (!isMenuRecord(alternative) || !only(alternative, ["productId", "priceCents"]) || !id(alternative.productId) || references.has(alternative.productId) || !Number.isSafeInteger(alternative.priceCents)) invalid("Alternative o variazioni prezzo del Menu non valide.");
      references.add(alternative.productId);
      const child = products.find(item => item.id === alternative.productId);
      if (publishing && (!child || !["pizza", "sandwich", "product"].includes(productType(child)) || child.pizza?.kind === "formula")) invalid(`«${step.name}»: scegli Pizza con ricetta, Panino o Prodotto presenti nel menu.`);
    }
    if (step.alternatives.length) {
      minimum += Math.min(...step.alternatives.map(item => item.priceCents));
      maximum += Math.max(...step.alternatives.map(item => item.priceCents));
    }
  }
  if (publishing && (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum < 0)) invalid("Le variazioni del Menu producono un totale negativo o non valido.");
}
