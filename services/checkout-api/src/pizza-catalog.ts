import { materializePizzaMenu, syncPizzaInventory, PIZZA_EXTRA_OFFERS, type IndividualIngredient, type MenuDraft, type PizzaCatalog } from "@pizzaos/domain";
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
  if (!isMenuRecord(value) || !only(value, [...collections, "inventoryMode", "defaults", "customEnabled", "inventoryExtras", "inventorySignature"]) || collections.some(key => !Array.isArray(value[key]) || value[key].length > 100)) invalid("Catalogo pizza non valido.");
  const catalog = value as unknown as PizzaCatalog;
  if (catalog.inventoryMode !== undefined && catalog.inventoryMode !== "dough-format") invalid("Gestione scorte pizza non valida.");
  const doughInventory = catalog.inventoryMode === "dough-format";
  if (doughInventory && catalog.bases.length) invalid("La base si gestisce tra gli ingredienti della pizza.");
  // A menu containing only ordinary products does not require pizza standards or recipe readiness.
  publishing = publishing && (catalog.tastes.length > 0 || catalog.formulas.length > 0);
  if ((catalog.customEnabled !== undefined && typeof catalog.customEnabled !== "boolean") ||
    (catalog.inventoryExtras !== undefined && typeof catalog.inventoryExtras !== "boolean") ||
    (catalog.inventorySignature !== undefined && (typeof catalog.inventorySignature !== "string" || catalog.inventorySignature.length > 200000))) invalid("Configurazione pizza non valida.");
  if (catalog.defaults !== undefined) {
    if (!isMenuRecord(catalog.defaults) || !only(catalog.defaults, ["doughId", "baseId", "formatId"])) invalid("Scelte standard del menu non valide.");
    for (const [key, items] of [["doughId", catalog.doughs], ["baseId", catalog.bases], ["formatId", catalog.formats]] as const) {
      const id = catalog.defaults[key];
      if (doughInventory && key === "baseId") { if (id !== "") invalid("La base non è una scelta standard."); continue; }
      if (typeof id !== "string" || (id !== "" && !items.some(item => isMenuRecord(item) && item.id === id)) || (publishing && !id)) invalid(doughInventory
        ? "Verifica impasto e formato standard del menu." : "Verifica impasto, base e formato standard del menu.");
    }
  }
  for (const collection of [catalog.doughs, catalog.bases, catalog.formats, catalog.toppings]) {
    const seen = new Set<string>();
    for (const item of collection) {
      if (!isMenuRecord(item) || !only(item, ["id", "name", "description", "priceCents", "available", "ingredients", "food", "imagePath", "category", "inventoryIngredientId", "doughQuantity"]) ||
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
  if (doughInventory) {
    for (const dough of catalog.doughs) {
      if (Object.keys(dough.ingredients).length || dough.doughQuantity !== undefined) invalid("Associa una sola voce di Magazzino a ogni impasto.");
      if (dough.inventoryIngredientId !== undefined && !ingredientIds.has(dough.inventoryIngredientId)) invalid("Voce di Magazzino dell'impasto non valida.");
      if (publishing && (!dough.inventoryIngredientId || stocks && stocks.get(dough.inventoryIngredientId) == null)) invalid(`«${dough.name}»: verifica collegamento e scorte dell'impasto prima di pubblicare.`);
    }
    for (const format of catalog.formats) {
      if (Object.keys(format.ingredients).length || format.inventoryIngredientId !== undefined) invalid("Il formato indica soltanto la quantità di impasto.");
      if (format.doughQuantity != null && (!Number.isSafeInteger(format.doughQuantity) || format.doughQuantity < 1)) invalid("Indica una quantità intera positiva di impasto per il formato.");
      if (publishing && format.doughQuantity == null) invalid(`«${format.name}»: verifica la quantità di impasto prima di pubblicare.`);
    }
  }
  const inventoryReferences = new Set<string>();
  for (const topping of catalog.toppings) {
    if (!label(topping.category)) invalid("Indica una categoria per ogni topping.");
    if (topping.inventoryIngredientId !== undefined) {
      if (!ingredientIds.has(topping.inventoryIngredientId) || !topping.id.startsWith("inventory:")
        || inventoryReferences.has(topping.inventoryIngredientId)) invalid("Riferimento extra al Magazzino non valido.");
      inventoryReferences.add(topping.inventoryIngredientId);
    }
  }
  const ids = new Set<string>();
  for (const entry of [...catalog.tastes, ...catalog.formulas]) {
    if (!isMenuRecord(entry) || !only(entry, ["id", "name", "description", "priceCents", "available", "standardDoughId", "recommendedDoughId", "standardBaseId", "standardFormatId", "doughIds", "baseIds", "formatIds", "toppingIds", "imageId", "pairingProductIds", "includedToppingIds", "offer", "extraOffer", "previewImages", "toppingImagePath", "customizations", "food", "allergens"]) ||
      !safeId(entry.id) || ids.has(entry.id) || !label(entry.name) || typeof entry.description !== "string" || entry.description.length > 2000 || !cents(entry.priceCents) || typeof entry.available !== "boolean") invalid("Gusto o formula pizza non validi.");
    ids.add(entry.id);
    for (const [items, allowed, standard] of [[catalog.doughs, entry.doughIds, entry.standardDoughId], [catalog.bases, entry.baseIds, entry.standardBaseId], [catalog.formats, entry.formatIds, entry.standardFormatId]] as const) {
      if (doughInventory && items === catalog.bases) {
        if (!Array.isArray(allowed) || allowed.length || standard !== "") invalid("Rimuovi le scelte base: usa gli ingredienti della pizza.");
        continue;
      }
      if (!strings(allowed) || typeof standard !== "string" || (standard !== "" && !safeId(standard)) || allowed.some(id => !items.some(item => item.id === id)) ||
        (standard !== "" && !allowed.includes(standard)) || (publishing && (!allowed.length || !standard))) invalid(doughInventory
          ? `«${entry.name}»: verifica impasti, formati e scelte standard.` : `«${entry.name}»: verifica impasti, basi, formati e scelte standard.`);
    }
    if (entry.recommendedDoughId !== undefined && (!safeId(entry.recommendedDoughId)
      || !entry.doughIds.includes(entry.recommendedDoughId))) invalid("Scegli un impasto consigliato fra quelli del menu.");
    if (!strings(entry.toppingIds) || entry.toppingIds.some(id => !catalog.toppings.some(topping => topping.id === id))) invalid("Topping ammessi non validi.");
    if (entry.toppingImagePath !== undefined && !asset(entry.toppingImagePath)) invalid("Immagine degli ingredienti non valida.");
    if (entry.previewImages !== undefined) {
      if (!Array.isArray(entry.previewImages) || entry.previewImages.length > 100) invalid("Anteprime pizza non valide.");
      const seenPreviews = new Set<string>();
      for (const preview of entry.previewImages) {
        if (!isMenuRecord(preview) || !only(preview, ["doughId", "baseId", "imagePath"]) || !entry.doughIds.includes(preview.doughId) || !(doughInventory ? preview.baseId === "" : entry.baseIds.includes(preview.baseId)) || !asset(preview.imagePath)) invalid("Associa ogni anteprima alle scelte ammesse e a un'immagine locale.");
        const key = JSON.stringify([preview.doughId, preview.baseId]);
        if (seenPreviews.has(key)) invalid("Anteprima pizza duplicata.");
        seenPreviews.add(key);
      }
    }
    if (entry.imageId !== undefined && !safeId(entry.imageId)) invalid("Foto pizza non valida.");
    if (entry.pairingProductIds !== undefined && !strings(entry.pairingProductIds)) invalid("Abbinamenti pizza non validi.");
  }
  for (const taste of catalog.tastes) {
    if ("offer" in taste || "extraOffer" in taste || !strings(taste.includedToppingIds) || taste.includedToppingIds.some(id => !catalog.toppings.some(topping => topping.id === id))) invalid("Ingredienti inclusi nel gusto non validi.");
    if (taste.food !== undefined) validateMenuFood(taste.food, invalid);
    if (taste.allergens !== undefined && (!Array.isArray(taste.allergens) || taste.allergens.length > 100 || taste.allergens.some(item => !label(item)))) invalid("Allergeni del gusto non validi.");
    const custom = taste.customizations;
    if (custom !== undefined) {
      if (!isMenuRecord(custom) || !only(custom, ["options", "groups"]) || !Array.isArray(custom.options)
        || custom.options.length > 100
        || custom.options.some(option => !isMenuRecord(option) || option.pizza !== undefined
          || !safeId(option.id) || /^(dough|base|format|extra|remove):/.test(option.id))
        || custom.groups !== undefined && (!Array.isArray(custom.groups) || custom.groups.some(group => !isMenuRecord(group)
          || ["dough", "base", "format", "ingredients", "extras", "product-choices"].includes(group.id)))) {
        invalid("Verifica i gruppi specifici della pizza: contengono dati o identificativi riservati.");
      }
    }
  }
  for (const formula of catalog.formulas) {
    if (formula.includedToppingIds !== undefined && (!doughInventory || !strings(formula.includedToppingIds)
      || formula.includedToppingIds.some(id => !catalog.toppings.some(topping => topping.id === id)))) invalid("Ingredienti inclusi nella combinazione non validi.");
    if ("customizations" in formula || "food" in formula || "allergens" in formula || (formula.offer !== undefined && (typeof formula.offer !== "string" || !Object.hasOwn(PIZZA_EXTRA_OFFERS, formula.offer)))) invalid("Regola precedente della formula non valida.");
    const offer = formula.extraOffer;
    if (offer !== undefined && (!isMenuRecord(offer) || !only(offer, ["quota", "percent"]) ||
      !Number.isSafeInteger(offer.quota) || offer.quota < 0 || offer.quota > 100 ||
      !Number.isSafeInteger(offer.percent) || offer.percent < 0 || offer.percent > 100)) invalid("Controlla numero di extra e percentuale di sconto.");
    if (formula.offer === undefined && offer === undefined) invalid("Configura lo sconto extra della combinazione.");
  }
}

/** The source entities, rather than a supplied product price/recipe, own generated pizzas. */
export function preparePizzaMenu(draft: MenuDraft, ingredientIds: Set<string>, invalid: Invalid, publishing = false, stocks?: Map<string, number | null>, inventory?: readonly IndividualIngredient[]): MenuDraft {
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
  if (inventory && (draft.pizzaCatalog.tastes.length > 0 || draft.pizzaCatalog.formulas.length > 0)) {
    const refreshed = syncPizzaInventory(draft, inventory);
    if (publishing && refreshed.pizzaCatalog?.inventorySignature !== draft.pizzaCatalog.inventorySignature) {
      invalid("Gli extra del Magazzino sono cambiati. Ricarica gli ingredienti, controlla e salva la bozza prima di pubblicare.");
    }
    if (publishing) for (const item of inventory.filter(item => item.extra?.enabled)) {
      if (item.extra?.priceCents == null || item.extra.dose == null) invalid(`«${item.name}»: verifica prezzo e dose extra nel Magazzino prima di pubblicare.`);
    }
    draft = refreshed;
    validatePizzaCatalog(draft.pizzaCatalog, ingredientIds, invalid, publishing, stocks);
  }
  return materializePizzaMenu(draft);
}
