# Contratti pubblici

Entry point: `@pizzaos/domain`. Gli import dei test usano solo entry point pubblico e API HTTP, mai dettagli interni della compilazione.

```ts
interface PizzaComponent {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  ingredients: Record<string, number | null>; food?: MenuFoodInformation; imagePath?: string;
}
interface PizzaTopping extends PizzaComponent { category: string; }
interface PizzaEntry {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  standardDoughId: string; standardBaseId: string; standardFormatId: string;
  doughIds: string[]; baseIds: string[]; formatIds: string[]; toppingIds: string[];
  imageId?: string; pairingProductIds?: string[];
}
interface PizzaTaste extends PizzaEntry { includedToppingIds: string[]; }
interface PizzaFormula extends PizzaEntry { offer: 'Simple' | 'Wild' | 'Savage'; }
interface PizzaCatalog {
  doughs: PizzaComponent[]; bases: PizzaComponent[]; formats: PizzaComponent[];
  toppings: PizzaTopping[]; tastes: PizzaTaste[]; formulas: PizzaFormula[];
}
/** Produces commercial pizza entries alongside ordinary products. Pure; deterministic; idempotent. */
declare function materializePizzaMenu(draft: MenuDraft): MenuDraft;
```

`MenuDraft.pizzaCatalog` è opzionale. Le sezioni referenziano direttamente gli ID di gusti/formule; nessun contenitore commerciale intermedio. Le proiezioni mantengono gli stessi ID delle entry e dichiarano `product.pizza: {kind: 'taste'|'formula', sourceId: string, defaultSelections: MenuSelection[]}`. Le opzioni dichiarano `option.pizza: {kind:'dough'|'base'|'format'|'topping'|'removal', sourceId:string, category?:string, imagePath?:string}`.

Le scelte standard obbligatorie hanno prezzo differenziale zero e compaiono in `defaultSelections`. Le altre opzioni applicano prezzo componente scelto meno prezzo standard. `resolveMenuComposition(product, selections)` resta il contratto di anteprima: `valid`, `unitCents`, `recipe`, `composition`. I topping inclusi appartengono alla ricetta iniziale; rimozioni gratuite e aggiunte a prezzo configurato. La scelta alternativa sostituisce la ricetta del componente standard.

La proiezione `pizza.includedToppings` conserva per ogni topping `sourceId`, `ingredientIds`, eventuale `food` e `available?:boolean`. Se `available === false` la composizione è invalida finché il topping non viene rimosso; i metadati precedenti senza `available` restano compatibili. Le righe possono dichiarare `kind?: 'product'|'pizza_taste'|'pizza_formula'`; un tipo non coerente con la voce corrente viene rifiutato con `customization_changed`, mentre l'assenza mantiene la compatibilità storica.

Il servizio di amministrazione conserva le route esistenti saveDraft/publish/workspace. Il server valida il catalogo sorgente e rigenera la proiezione; un prezzo o ricetta contraffatti nella proiezione non cambiano la voce risultante. Una bozza incompleta si può conservare, la pubblicazione richiede riferimenti validi, scelte standard ammesse e ricette/scorte verificate. Le forme non valide producono errore di validazione, nessuna scrittura parziale.

Esempio: gusto 600 con impasto standard a prezzo componente 200 e alternativo 320 → totale alternativo 720. Formula Simple a 500 con extra 220/210/190/110 → 1106. Togliere topping incluso da gusto 600 → 600 senza supplementi.

Le entry possono dichiarare `previewImages?: {doughId:string;baseId:string;imagePath:string}[]` e `toppingImagePath?: string` per l'anteprima a livelli del PoC. Solo asset locali sotto `/images/`, senza traversal. Le informazioni vengono conservate nella proiezione pubblica; i percorsi commerciali non vengono dedotti dai nomi.

La migrazione service espone `planPizzaMenuMigration(state, source): {state, report}`. `source` contiene `{storeId,sourceDraftId?,draftId,name,pizzaCatalog,replacements:{productId,pizzaIds:string[]}[]}`; senza sourceDraftId usa il menu pubblicato o legacy. L'ID target deve essere distinto da fonte e pubblicato. Le sostituzioni sono esplicite e ammettono uno-a-molti (contenitore → tre formule). Pianificazione pura, ripetizione senza duplicazioni o incremento revisione, ordine e catalogo pubblicato invariati. Errori su sorgente mancante, mappature duplicate e riferimenti assenti.
