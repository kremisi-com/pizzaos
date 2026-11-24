# Contratti pubblici

Esportazioni da `@pizzaos/domain`:

```ts
interface PizzaComponent {
  // Campi commerciali e ingredients già esistenti.
  inventoryIngredientId?: string; // Voce unica per un impasto.
  doughQuantity?: number | null; // Unità di impasto consumate dal formato.
}
interface PizzaCatalog {
  inventoryMode?: "dough-format"; // Assente negli snapshot precedenti.
  // Collezioni e contratti precedenti leggibili.
}
interface PizzaFormula {
  includedToppingIds?: string[]; // Ingredienti ordinari provenienti dalla base precedente.
}
interface PizzaOptionIdentity {
  doughQuantity?: number | null; // Solo proiezione operatore/server del formato.
}
/** Converte una bozza senza mutare l'input. Conserva la base standard come ingredienti inclusi,
 * svuota basi/scelte base, associa impasti soltanto per ricette univoche,
 * lascia null i consumi non determinabili. Le chiamate successive sono idempotenti. */
function simplifyPizzaInventory(draft: MenuDraft, inventory?: readonly IndividualIngredient[]): MenuDraft;
```

`materializePizzaMenu`, `resolveMenuComposition`, `applyPizzaDefaults`, `planProductClassification` conservano le firme. Con inventoryMode=dough-format producono soltanto impasto/formato e ingredienti/extra; la quantità del formato sostituisce la dose unitaria dell'impasto.

`PizzaSettingsPanel` conserva la firma esistente: riceve draft, ingredients e callback onChange. Espone una selezione Magazzino filtrabile per ogni impasto e Quantità impasto per ogni formato. Ogni modifica restituisce una bozza nel nuovo modello.

`validatePizzaCatalog` e `preparePizzaMenu` conservano le firme del servizio: accettano dati incompleti in bozza, rifiutano dati malformati e bloccano pubblicazione incompleta. `IndividualApi` e richieste cliente restano identiche: i consumi sono autorevoli nel servizio.
