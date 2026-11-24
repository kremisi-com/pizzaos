# Contratto pubblico

`IndividualIngredient.extra?: { enabled: boolean; priceCents: number | null; dose: number | null }`.
`PizzaFormula.offer` rimane opzionale per leggere dati precedenti; nuova proprietà `extraOffer?: MenuExtraOffer` ha precedenza.
`PizzaCatalog.defaults?: { doughId: string; baseId: string; formatId: string }`, `customEnabled?: boolean`, `inventoryExtras?: boolean`, `inventorySignature?: string`.
`PizzaTopping.inventoryIngredientId?: string` identifica un topping generato dal Magazzino senza deduzioni testuali.

Esportazioni pubbliche pure:
```ts
// Applica scelte comuni preservando prezzi commerciali e identità.
export declare function applyPizzaDefaults(catalog: PizzaCatalog): PizzaCatalog;
// Copia prezzo/dose/allergeni degli ingredienti abilitati e produce firma deterministica.
// Non modifica l'input; solo cataloghi inventoryExtras=true.
export declare function syncPizzaInventory(draft: MenuDraft, ingredients: readonly IndividualIngredient[]): MenuDraft;
```
`materializePizzaMenu` continua a proiettare le voci, leggendo nuove regole o offer legacy. Contratti HTTP esistenti con estensioni additive. Il servizio non si fida delle proiezioni del browser. Errori invalid_input/revision_conflict esistenti. Prezzi interi non negativi, dose null o intero positivo, quota/percentuale 0..100 (0 disabilita sconto). Vecchie formule conservano Simple 3/20, Wild 5/40, Savage 7/50. Limiti tecnici esistenti sulle collezioni restano.
