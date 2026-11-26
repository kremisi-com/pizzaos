# Contratti pubblici

Il componente IndividualOrderingScreen accetta i port IndividualApi/PromotionsApi/FoodPreferencesApi esistenti e la selezione opzionale `view?: "all" | "menu" | "cart" | "checkout"` (default `all`, compatibile con le prove esistenti).

```ts
/** Seleziona la schermata; il draft condiviso conserva la composizione tra percorsi. */
export type IndividualOrderingView = "all" | "menu" | "cart" | "checkout";
```

`/ordina` e `/` operative montano menu; `/ordina/carrello` monta cart; `/ordina/checkout` monta checkout. Il componente riceve `api: IndividualApi`, senza importare implementazioni del servizio. La composizione inietta gli stessi adapter HTTP in tutte le viste.

Invarianti: i prezzi mostrati prima del preventivo sono stime; `api.quote` e `api.checkout` conservano contratto e idempotenza. Nessuna nuova API. `all` conserva le interazioni già pubbliche per le prove di recupero. Il carrello vuoto non offre Vai al checkout. I pulsanti quantità portano i nomi accessibili descritti nei requisiti.
