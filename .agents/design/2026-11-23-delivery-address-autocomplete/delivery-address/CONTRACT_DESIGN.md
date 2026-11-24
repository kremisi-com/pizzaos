# Contratto

```ts
type DeliveryAddressSuggestion =
  | { kind: "street"; text: string }
  | { kind: "address"; text: string; latitude: number; longitude: number };

// Metodo di IndividualApi implementato dall’adapter live. Restituisce gli stessi risultati del servizio.
searchDeliveryAddresses?(storeId: string, query: string, signal?: AbortSignal): Promise<DeliveryAddressSuggestion[]>;
```

`POST /v1/pilot/stores/:id/delivery-address-search` accetta `{ "query": "Via Ver" }` tramite il proxy autorizzato, anche con sessione ospite. Il testo, tolti gli spazi alle estremità, deve contenere da 3 a 200 caratteri. La risposta è un array: `[{ "kind": "street", "text": "Via Verdi, Torino" }]` oppure, per un civico, `[{ "kind": "address", "text": "Via Verdi 10, Torino", "latitude": 45.07, "longitude": 7.69 }]`. La sola via non è un punto valido per consegnare. Nessuna corrispondenza restituisce `[]`; testo non valido, sede inesistente e provider indisponibile danno rispettivamente 400, 404 e 503. Le risposte non sono cacheabili.

L’indirizzo selezionato entra nel contratto di carrello esistente come `{ text, latitude, longitude }`. Il preventivo applica le fasce di consegna esistenti.
