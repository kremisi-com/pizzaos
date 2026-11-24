# Contratti pubblici

Import da @pizzaos/domain. Le forme esistenti MenuDraft, IndividualProduct, IndividualIngredient, PizzaCatalog e resolveMenuComposition restano pubbliche. Checkbox derivata da product.pizza. Nessun nuovo endpoint: MenuAdminApi.saveDraft e publish mantengono revisione e autorizzazioni.

```ts
export interface ProductClassificationPlan {
  /** Bozza risultante solo se la conversione non perde dati; input mai mutato. */
  draft?: MenuDraft;
  /** Riepilogo leggibile delle modifiche da confermare. */
  changes: string[];
  /** Errori correggibili: draft assente se presenti. */
  errors: string[];
}
/** Cambia un gusto/prodotto conservando ID e contenuti; formula o ID assente producono errors. */
export declare function planProductClassification(
  draft: MenuDraft, productId: string, pizza: boolean,
  ingredients: readonly IndividualIngredient[], options?: { newProduct?: boolean }
): ProductClassificationPlan;
/** Tutte le pizze acquisiscono gli extra abilitati, indipendentemente da inventoryExtras/customEnabled. */
export declare function syncPizzaInventory(draft: MenuDraft, ingredients: readonly IndividualIngredient[]): MenuDraft;
```

`options.newProduct` è false per impostazione predefinita. Solo un nuovo prodotto con ricetta vuota e `newProduct: true` può iniziare dalla ricetta degli standard comuni senza compilare la ricetta generica. Un prodotto esistente con ricetta vuota o una ricetta non vuota insufficiente mantiene il blocco. Admin conserva l'identità dei prodotti appena aggiunti come stato dell'editor; il flag non viene persistito nel prodotto.

PizzaTaste può conservare `customizations?: { options: MenuSpecificOption[]; groups?: MenuOptionGroup[] }`, `food?: MenuFoodInformation`, `allergens?: string[]`. `MenuSpecificOption` ha i campi delle scelte prodotto senza identità pizza automatica. I gruppi restano specifici e riconvertibili; validazione autorevole uguale ai prodotti generici. Le scelte automatiche non fanno parte di customizations. Per configurazioni non rappresentabili, incluso `extraOffer` del prodotto generico, si restituisce un errore esplicito. Gli allergeni dichiarati senza `food` continuano a comparire in `resolveMenuComposition(...).composition.contains` dopo la conversione.

Un catalogo legacy con gusti/formule e senza `defaults` richiede la configurazione esplicita degli standard comuni prima della conversione verso pizza: il piano restituisce errori e non modifica la bozza o le altre pizze. La conversione inversa conserva gli standard specifici salvati senza uniformare altre voci. Un menu privo di gusti e formule può essere pubblicato senza componenti standard, anche se conserva un catalogo vuoto con riferimenti standard vuoti.

La sincronizzazione conserva le ricette incluse anche quando gli ID delle loro componenti sono simili agli ID automatici. Gli ID risultanti sono unici, la composizione inclusa è invariata e la sincronizzazione ripetuta è idempotente; nessuna particolare strategia di allocazione degli ID è pubblica.

Gli ingredienti con ID validi fino al limite del Magazzino restano utilizzabili come extra senza superare i limiti degli identificativi derivati. Il riferimento inventario esplicito rimane autorevole. La proiezione cliente conserva la possibilità di una scelta specifica che rimuove un ingrediente standard esaurito; il preventivo verifica sempre la ricetta finale effettiva.

Precondizioni: bozza e magazzino validi per i contratti esistenti. Nessuna modifica in-place. Operazioni idempotenti se il tipo è già quello richiesto. Le sezioni mantengono gli ID e l'ordine. Il servizio rigenera sempre i prodotti dalle sorgenti, valida anche customizations e rifiuta firme commerciali superate.

Admin: MenuDraftEditor mantiene le props esistenti, incluse ingredients e onInventory. Test via interazioni accessibili: Aggiungi prodotto, checkbox Pizza, Conferma cambio tipo/Annulla cambio tipo, Modifica <nome>. Il prodotto normale conserva editor generico; il gusto usa scheda pizza con stessa spunta e riepilogo extra comuni. LivePizzaEditor mantiene le props pubbliche, rende anche i gruppi specifici conservati con le loro cardinalità. Una scelta sconosciuta/esaurita richiede correzione.
