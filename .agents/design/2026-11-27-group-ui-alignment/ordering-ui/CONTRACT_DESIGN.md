# Contratti pubblici

Le API GroupOrderingApi, IndividualApi, PromotionsApi e i tipi di @pizzaos/domain restano invariati. Nessun cambiamento server. Le feature sono consumate dai loro index.ts.

Le firme delle capacità di presentazione sono nello stub [public-contract.ts](public-contract.ts). `CartProductRow` non emette incrementi oltre 100 e il chiamante elimina la riga a quantità zero; senza callback non offre modifiche. `OrderActionDock` non interpreta l'importo, che può essere sconosciuto (`null`), e presenta il label e l'azione forniti dal proprietario. `CheckoutChoices` conserva selezione esclusiva e blocchi espliciti.

## Schermata gruppo esistente

```ts
/** Mostra la vista richiesta con stato e permessi autorevoli del gruppo. */
declare function PersistentGroupScreen(props: {
  api: GroupOrderingApi;
  individualApi: IndividualApi;
  groupId: string;
  initialGroup?: GroupSnapshot;
  inviteToken?: string;
  view?: "share" | "menu" | "cart" | "checkout";
  storefront?: boolean;
  pollMs?: number;
  promotionsApi?: PromotionsApi;
  preferencesApi?: FoodPreferencesApi;
  onUseIndividual?: (group: GroupSnapshot) => Promise<void>;
}): React.JSX.Element;
```

Precondizioni: port pubblici iniettati, groupId valido; view predefinita share. Output: requisiti 1–9; dati sconosciuti hanno stato caricamento/errore, non importi inventati. Le modifiche invocano replaceLines con participantId e ultima revisione. La verifica usa quote; l'invio usa checkout; recupero usa recover, anticipi payShare/reconcileShare, rimborsi refundShare. Nessuna chiamata checkout individuale nel gruppo.

Esempi: host con Alice e Marco non pagati può modificare entrambi; participant Alice non può modificare Marco. Paid Alice usa quotedLines e payment.amountCents. Revisione 2 quotata poi 8 letta rende non confermabile il vecchio totale. Sessione fallita richiede retry, non login inventato.

## UI condivisa

Le capacità estratte sono di sola presentazione: riga prodotto con slot per dettaglio/editor/note; azione fissa con importo, messaggio e azione forniti dal chiamante. Ricevono callback, non API di persistenza. Stato, autorizzazioni, stime e conferme restano nei flussi proprietari. Nomi e props concreti saranno documentati negli entry pubblici. Entrambi i consumatori devono restare verificabili dai comportamenti utente, senza selettori legati ai dettagli interni.

## Convenzioni test

Usare @pizzaos/testing, Vitest e port pubblici simulati. È disponibile una suite esistente persistent-group.test.tsx con fixture/adapter mock, e tests/e2e/persistent-group.spec.ts con contesti browser distinti e fixture servizio. Le convenzioni esistenti possono essere lette per predisporre i test senza leggere il codice della nuova implementazione o INTERNAL_DESIGN.md. Le azioni conservano i testi già presenti: Vai al checkout →, Paga la mia quota, Conferma pagamento quota, Verifica totale gruppo, Conferma ordine di gruppo, Recupera tentativo gruppo, Accedi per pagare la tua quota. Gli stati fissi possono essere interrogati con role complementary; gruppi radio Modalità/Come paghi?.
