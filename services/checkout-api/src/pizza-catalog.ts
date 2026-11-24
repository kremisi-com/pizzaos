import { materializePizzaMenu, PIZZA_EXTRA_OFFERS, type MenuDraft, type PizzaCatalog } from "@pizzaos/domain";
import { isMenuRecord, validateMenuFood } from "./menu-catalog";

type Invalid = (message: string) => never;
const safeId = (id: unknown): id is string => typeof id === "string" && id.trim().length > 0 && id.length <= 120 && !["__proto__", "constructor", "prototype"].includes(id);
const label = (value: unknown, max = 200): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100 && value.every(safeId) && new Set(value).size === value.length;
const asset = (value: unknown): value is string => typeof value === "string" && /^\/images\/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg)$/.test(value);
const cents = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const only = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).every(key => fields.includes(key));

/** Validate the source catalog before compiling any browser-supplied projections. */
export function validatePizzaCatalog(value: unknown, ingredientIds: Set<string>, invalid: Invalid, publishing = false, stocks?: Map<string, number | null>): asserts value is PizzaCatalog {
  const collections = ["doughs", "bases", "formats", "toppings", "tastes", "formulas"];
  if (!isMenuRecord(value) || !only(value, collections) || collections.some(key => !Array.isArray(value[key]) || value[key].length > 100)) invalid("Catalogo pizza non valido.");
  const catalog = value as unknown as PizzaCatalog;
  for (const collection of [catalog.doughs, catalog.bases, catalog.formats, catalog.toppings]) {
    const seen = new Set<string>();
    for (const item of collection) {
      if (!isMenuRecord(item) || !only(item, ["id", "name", "description", "priceCents", "available", "ingredients", "food", "imagePath", "category"]) ||
        !safeId(item.id) || seen.has(item.id) || !label(item.name) || typeof item.description !== "string" || item.description.length > 2000 ||
        !cents(item.priceCents) || typeof item.available !== "boolean" || !isMenuRecord(item.ingredients)) invalid("Controlla nome, prezzo e ricetta dei componenti pizza.");
      seen.add(item.id);
      if (item.food !== undefined) validateMenuFood(item.food, invalid);
      if (item.imagePath !== undefined && !asset(item.imagePath)) invalid("Immagine del componente pizza non valida.");
      if (Object.keys(item.ingredients).length > 1000) invalid("Ricetta del componente pizza troppo grande.");
      for (const [id, dose] of Object.entries(item.ingredients)) {
        if (!ingredientIds.has(id) || (dose !== null && (typeof dose !== "number" || !Number.isSafeInteger(dose) || dose < 1))) invalid("Ricetta del componente pizza non valida.");
        if (publishing && (dose === null || stocks?.get(id) == null)) invalid(`«${item.name}»: verifica dosi e scorte prima di pubblicare.`);
      }
    }
  }
  for (const topping of catalog.toppings) if (!label(topping.category)) invalid("Indica una categoria per ogni topping.");
  const ids = new Set<string>();
  for (const entry of [...catalog.tastes, ...catalog.formulas]) {
    if (!isMenuRecord(entry) || !only(entry, ["id", "name", "description", "priceCents", "available", "standardDoughId", "standardBaseId", "standardFormatId", "doughIds", "baseIds", "formatIds", "toppingIds", "imageId", "pairingProductIds", "includedToppingIds", "offer", "previewImages", "toppingImagePath"]) ||
      !safeId(entry.id) || ids.has(entry.id) || !label(entry.name) || typeof entry.description !== "string" || entry.description.length > 2000 || !cents(entry.priceCents) || typeof entry.available !== "boolean") invalid("Gusto o formula pizza non validi.");
    ids.add(entry.id);
    for (const [items, allowed, standard] of [[catalog.doughs, entry.doughIds, entry.standardDoughId], [catalog.bases, entry.baseIds, entry.standardBaseId], [catalog.formats, entry.formatIds, entry.standardFormatId]] as const) {
      if (!strings(allowed) || typeof standard !== "string" || (standard !== "" && !safeId(standard)) || allowed.some(id => !items.some(item => item.id === id)) ||
        (standard !== "" && !allowed.includes(standard)) || (publishing && (!allowed.length || !standard))) invalid(`«${entry.name}»: verifica impasti, basi, formati e scelte standard.`);
    }
    if (!strings(entry.toppingIds) || entry.toppingIds.some(id => !catalog.toppings.some(topping => topping.id === id))) invalid("Topping ammessi non validi.");
    if (entry.toppingImagePath !== undefined && !asset(entry.toppingImagePath)) invalid("Immagine degli ingredienti non valida.");
    if (entry.previewImages !== undefined) {
      if (!Array.isArray(entry.previewImages) || entry.previewImages.length > 100) invalid("Anteprime pizza non valide.");
      const seenPreviews = new Set<string>();
      for (const preview of entry.previewImages) {
        if (!isMenuRecord(preview) || !only(preview, ["doughId", "baseId", "imagePath"]) || !entry.doughIds.includes(preview.doughId) || !entry.baseIds.includes(preview.baseId) || !asset(preview.imagePath)) invalid("Associa ogni anteprima a impasto e base ammessi e a un'immagine locale.");
        const key = JSON.stringify([preview.doughId, preview.baseId]);
        if (seenPreviews.has(key)) invalid("Anteprima pizza duplicata.");
        seenPreviews.add(key);
      }
    }
    if (entry.imageId !== undefined && !safeId(entry.imageId)) invalid("Foto pizza non valida.");
    if (entry.pairingProductIds !== undefined && !strings(entry.pairingProductIds)) invalid("Abbinamenti pizza non validi.");
  }
  for (const taste of catalog.tastes) {
    if ("offer" in taste || !strings(taste.includedToppingIds) || taste.includedToppingIds.some(id => !catalog.toppings.some(topping => topping.id === id))) invalid("Ingredienti inclusi nel gusto non validi.");
  }
  for (const formula of catalog.formulas) {
    if ("includedToppingIds" in formula || typeof formula.offer !== "string" || !Object.hasOwn(PIZZA_EXTRA_OFFERS, formula.offer)) invalid("Seleziona Simple, Wild o Savage per la formula.");
  }
}

/** The source entities, rather than a supplied product price/recipe, own generated pizzas. */
export function preparePizzaMenu(draft: MenuDraft, ingredientIds: Set<string>, invalid: Invalid, publishing = false, stocks?: Map<string, number | null>): MenuDraft {
  if (draft.products.some(product => !isMenuRecord(product))) invalid("Prodotto del menu non valido.");
  if (draft.pizzaCatalog === undefined) {
    if (draft.products.some(product => product.pizza !== undefined || product.pizzaRecipeSources !== undefined ||
      (Array.isArray(product.options) && product.options.some(option => isMenuRecord(option) && option.pizza !== undefined)))) invalid("Una pizza deve appartenere al catalogo pizza.");
    return draft;
  }
  validatePizzaCatalog(draft.pizzaCatalog, ingredientIds, invalid, publishing, stocks);
  const pizzaIds = new Set([...draft.pizzaCatalog.tastes, ...draft.pizzaCatalog.formulas].map(entry => entry.id));
  for (const product of draft.products) {
    if (!pizzaIds.has(product.id) && (product.pizza !== undefined || product.pizzaRecipeSources !== undefined ||
      (Array.isArray(product.options) && product.options.some(option => isMenuRecord(option) && option.pizza !== undefined)))) {
      invalid("I metadati pizza devono appartenere a un gusto o a una formula del catalogo.");
    }
  }
  return materializePizzaMenu(draft);
}
