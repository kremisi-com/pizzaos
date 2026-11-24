import { menuAllergenKey, type FoodPreferences, type IndividualProduct, type IndividualStore,
  type MenuDraft, type MenuFoodInformation, type MenuSelection, type MenuWorkspace } from "@pizzaos/domain";

type Invalid = (message: string) => never;
const kinds = new Set(["dough", "base", "format", "ingredients", "extras", "recipe", "selection"]);

export function isMenuRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isText(value: unknown, limit = 200): value is string {
  return typeof value === "string" && Boolean(value.trim()) && value.length <= limit;
}

function isId(value: unknown): value is string {
  return isText(value) && !["__proto__", "constructor", "prototype"].includes(value);
}

function only(value: Record<string, unknown>, fields: string[]): boolean {
  return Object.keys(value).every(key => fields.includes(key));
}

function isUniqueStrings(value: unknown, limit: number, valid: (entry: unknown) => entry is string = isId): value is string[] {
  return Array.isArray(value) && value.length <= limit && value.every(valid) && new Set(value).size === value.length;
}

function whole(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isLabel(value: unknown): value is string { return isText(value, 100); }

export function validateMenuFood(value: unknown, invalid: Invalid): asserts value is MenuFoodInformation {
  if (!isMenuRecord(value) || !only(value, ["contains", "mayContain"]) ||
    !isUniqueStrings(value.contains, 32, isLabel) || !isUniqueStrings(value.mayContain, 32, isLabel) ||
    new Set(value.contains.map(menuAllergenKey)).size !== value.contains.length ||
    new Set(value.mayContain.map(menuAllergenKey)).size !== value.mayContain.length) {
    invalid("Controlla le informazioni alimentari.");
  }
}

export function validateMenuSelections(value: unknown, invalid: Invalid): asserts value is MenuSelection[] {
  if (!Array.isArray(value) || value.length > 50 || value.some(item =>
    !isMenuRecord(item) || !only(item, ["optionId", "quantity"]) || !isId(item.optionId) || !whole(item.quantity, 1, 100)
  ) || new Set(value.map(item => item.optionId)).size !== value.length) invalid("Scelte prodotto non valide.");
}

export function normalizeFoodPreferences(value: unknown, invalid: Invalid): FoodPreferences {
  if (!isMenuRecord(value) || !only(value, ["avoid"]) || !isUniqueStrings(value.avoid, 32, isLabel)) {
    invalid("Seleziona le preferenze alimentari da evitare.");
  }
  const avoid = [...new Map(value.avoid.map(label => [menuAllergenKey(label), label.trim()])).values()];
  return { avoid };
}

export function initialMenuWorkspace(store: IndividualStore): MenuWorkspace {
  return { revision: 0, drafts: [], published: {
    id: "legacy", name: "Menu", products: store.products,
    sections: [{ id: "prodotti", name: "Prodotti", productIds: store.products.map(product => product.id) }]
  } };
}

export function validateDraftHeader(draft: unknown, invalid: Invalid): asserts draft is MenuDraft {
  if (!isMenuRecord(draft) || !only(draft, ["id", "name", "sections", "products", "kitchenNotice", "pizzaCatalog"]) ||
    !isId(draft.id) || !isText(draft.name) || !Array.isArray(draft.sections) || draft.sections.length > 50 ||
    !Array.isArray(draft.products) || draft.products.length > 500 ||
    (draft.kitchenNotice !== undefined && !isText(draft.kitchenNotice, 1000))) invalid("Controlla nome, prodotti e sezioni del menu.");
}

export function validateMenuDraft(draft: MenuDraft, store: IndividualStore, invalid: Invalid, publishing = false, checkRecipeReadiness = publishing): void {
  const ingredientIds = new Set(store.ingredients.map(item => item.id));
  const productIds = new Set(draft.products.map(item => item.id));
  const sectionIds = new Set<string>();
  const listedProducts = new Set<string>();
  for (const section of draft.sections) {
    if (!isMenuRecord(section) || !only(section, ["id", "name", "description", "productIds"]) || !isId(section.id) ||
      !isText(section.name) || sectionIds.has(section.id) || !isUniqueStrings(section.productIds, 500) ||
      (section.description !== undefined && !isText(section.description, 1000))) invalid("Sezione del menu non valida.");
    sectionIds.add(section.id);
    for (const productId of section.productIds) {
      if (!productIds.has(productId)) invalid("Una sezione contiene un prodotto assente dal menu.");
      listedProducts.add(productId);
    }
  }
  if (publishing && (!listedProducts.size || listedProducts.size !== productIds.size)) {
    invalid("Assegna tutti i prodotti ad almeno una sezione prima di pubblicare.");
  }

  for (const product of draft.products) {
    if (checkRecipeReadiness) {
      for (const recipe of [product.ingredients, ...product.options.map(option => option.ingredients)]) {
        for (const [id, dose] of Object.entries(recipe)) {
          if (dose === null || store.ingredients.find(ingredient => ingredient.id === id)?.stock == null) {
            invalid(`«${product.name}»: verifica dosi e scorte degli ingredienti prima di pubblicare.`);
          }
        }
      }
    }
    if (!only(product as unknown as Record<string, unknown>,
      ["id", "name", "description", "priceCents", "available", "allergens", "ingredients", "options", "groups", "extraOffer", "pairingProductIds", "imageId", "food", "pizza", "pizzaRecipeSources"])) invalid("Prodotto del menu non valido.");
    if (product.imageId !== undefined && !isId(product.imageId)) invalid("Foto prodotto non valida.");
    if (product.food !== undefined) validateMenuFood(product.food, invalid);
    if (product.options.length > (product.pizza ? 500 : 100)) invalid("Il prodotto ha troppe opzioni.");
    if (product.pairingProductIds !== undefined && (!isUniqueStrings(product.pairingProductIds, 20) ||
      product.pairingProductIds.some(id => id === product.id || !productIds.has(id)))) invalid("Controlla gli abbinamenti del prodotto.");
    for (const option of product.options) {
      if (!only(option as unknown as Record<string, unknown>, ["id", "name", "priceCents", "ingredients", "description", "food", "removesIngredientIds", "pizza", "available"]) ||
        (option.available !== undefined && typeof option.available !== "boolean") ||
        (option.description !== undefined && !isText(option.description, 1000)) ||
        (option.removesIngredientIds !== undefined && (!product.groups ||
          !isUniqueStrings(option.removesIngredientIds, 100) || option.removesIngredientIds.some(id => !ingredientIds.has(id))))) invalid("Opzione prodotto non valida.");
      if (option.food !== undefined) validateMenuFood(option.food, invalid);
    }
    validateGroups(product, invalid, publishing);
  }
}

function validateGroups(product: IndividualProduct, invalid: Invalid, publishing: boolean) {
  const groups = product.groups;
  if (groups === undefined && product.extraOffer === undefined) return;
  if (!Array.isArray(groups) || groups.length > 30) invalid("Controlla i gruppi di scelte.");
  const optionIds = new Set(product.options.map(option => option.id));
  const assigned = new Set<string>();
  const groupIds = new Set<string>();
  for (const [index, group] of groups.entries()) {
    const label = isMenuRecord(group) && isText(group.name) ? `Il gruppo «${group.name}»` : `Il gruppo ${index + 1}`;
    if (!isMenuRecord(group) || !only(group, ["id", "name", "kind", "min", "max", "allowRepeat", "optionIds"]) ||
      !isId(group.id) || groupIds.has(group.id)) invalid(`Il gruppo ${index + 1} contiene dati non validi. Rimuovilo e aggiungilo di nuovo.`);
    if (!isText(group.name)) invalid(`Inserisci un nome per il gruppo ${index + 1}.`);
    if (!kinds.has(group.kind)) invalid(`${label}: seleziona un tipo di scelta valido.`);
    if (!whole(group.min, 0, 100)) invalid(`${label}: la quantità minima deve essere un numero intero da 0 a 100.`);
    if (!whole(group.max, group.min, 100)) invalid(`${label}: la quantità massima deve essere un numero intero maggiore o uguale alla minima, fino a 100.`);
    if (!isUniqueStrings(group.optionIds, 100)) invalid(`${label}: controlla le scelte associate, rimuovendo eventuali duplicati.`);
    if (group.allowRepeat !== undefined && typeof group.allowRepeat !== "boolean") invalid(`${label}: correggi l’impostazione «Consenti più unità della stessa scelta».`);
    if (publishing && !group.optionIds.length) invalid(`${label}: aggiungi almeno una scelta prima di pubblicare.`);
    if (publishing && !group.allowRepeat && group.max > group.optionIds.length) {
      invalid(`${label}: la quantità massima supera il numero di scelte disponibili. Riducila oppure consenti più unità della stessa scelta.`);
    }
    groupIds.add(group.id);
    for (const id of group.optionIds) {
      if (!optionIds.has(id) || assigned.has(id)) invalid("Ogni opzione deve appartenere a un solo gruppo.");
      assigned.add(id);
    }
  }
  if (publishing && assigned.size !== optionIds.size) invalid("Assegna ogni opzione a un gruppo.");
  const offer = product.extraOffer;
  if (offer !== undefined && (!isMenuRecord(offer) || !only(offer, ["quota", "percent"]) ||
    !whole(offer.quota, 1, 100) || !whole(offer.percent, 1, 100) ||
    (publishing && !groups.some(group => group.kind === "extras")))) invalid("Sconto extra non valido.");
}
