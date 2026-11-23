# Contratti

```ts
// Etichetta DNS facoltativa della sede nei dati condivisi e nel salvataggio admin.
interface IndividualStorePublication { orderingSubdomain?: string }
```

`PUT /v1/pilot/stores/:id` accetta `orderingSubdomain`. Un valore uguale è idempotente. Omissione conserva l'associazione. Un valore duplicato o una modifica dell'etichetta già pubblicata restituisce `409 revision_conflict`. Etichetta invalida o riservata restituisce `400 invalid_input`. Un operatore senza diritto di assegnazione riceve `403 forbidden`.

Un proxy autenticato con `x-pizzaos-origin: https://lapizzaspeciale.pizzaos.app` opera come sito di quella sede se il suffisso è configurato nel servizio e l'associazione esiste. `GET /v1/pilot/stores` restituisce una sola sede. Catalogo esterno, riferimento a ordine/gruppo esterno e carrello per altra sede restituiscono `404 not_found`. API operative del pannello non sono pubblicate sul sito di sede. Origini sconosciute fuori suffisso o senza credenziale sono rifiutate.

`GET /v1/pilot/ordering-site` risponde `{ storeId, name }` dal sito di sede. L'host non associato riceve `404 not_found`. Configurare `PIZZAOS_ORDERING_DOMAIN` con il dominio base e `PIZZAOS_ORDERING_AUTH_ORIGIN` sul servizio con l'origine client registrata per Google.
