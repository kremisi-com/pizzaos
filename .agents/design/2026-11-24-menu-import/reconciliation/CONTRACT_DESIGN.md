# Contratto

Modulo server `services/checkout-api/src/menu-import.ts`:

```ts
interface ImportedRecipe {
  name: string;
  aliases?: string[];
  description: string;
  ingredients: { name: string; aliases?: string[]; quantity: number | null }[];
}
interface MenuImportSource {
  storeId: string;
  recipes: ImportedRecipe[];
  draft?: MenuDraft;
}
interface MenuImportReport {
  created: string[];
  matched: { name: string; id: string }[];
  pending: string[];
  updatedRecipes: number;
}
// Normalizzazione deterministica per il confronto, mai fuzzy.
function ingredientNameKey(name: string): string;
// Ritorna una copia dello stato e il rapporto. Non modifica l'input.
// draft opzionale inserisce/aggiorna una bozza, senza pubblicare.
// Le ambiguità o manifest non validi lanciano Error senza modifiche.
function reconcileMenuImport(state: OrderingState, source: MenuImportSource):
  { state: OrderingState; report: MenuImportReport };
```

`IndividualIngredient.stock` e valori delle mappe `IndividualProduct.ingredients` / `IndividualOption.ingredients` ammettono null per dati sconosciuti. Gli identificativi della ricetta devono sempre esistere nel magazzino. Gli ordini confermati conservano dosi numeriche positive; null non entra nelle riserve. Pubblicazione e preventivo rifiutano composizioni non verificate.
