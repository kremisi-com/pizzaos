# @pizzaos/domain

## Purpose

Owns shared domain types and constants used across all PizzaOS surfaces.

## Ownership

This package owns:

- shared domain-level type contracts
- shared domain constants
- deterministic domain helpers for simulation-safe behavior

This package does not own app-specific rendering concerns.

## Public API

Entry point: `@pizzaos/domain`

`IndividualIngredient.stock` ammette null per scorta non tracciata; le dosi di `IndividualProduct.ingredients` / `IndividualOption.ingredients` ammettono null per dati da completare. Zero indica esaurimento esplicito. `IndividualStore.outOfStockBehavior` sceglie `allow`, `disable` (default) o `hide` per gli ingredienti zero; la scelta appartiene alla sede e non alla bozza menu. `IndividualProduct.soldOut` è proiezione pubblica dell’esaurimento e distingue la dicitura Esaurito dalla disabilitazione manuale. Scorte null non bloccano pubblicazione/ordine; dosi incomplete restano bloccanti. [Regole correnti](../../.agents/product-definition/flows/store-configuration.md#scorte-non-tracciate-e-prodotti-esauriti).

`src/index.ts` is the stable public entry. The entity and status model lives in `src/model.ts`; client API contracts import that model directly, so the entry point has no internal dependency cycle.

`IndividualErrorCode` include `internal_error` per HTTP 500; `service_unavailable` resta per indisponibilità temporanea (503). Le risposte HTTP possono aggiungere `requestId`, senza modificare oggetti di dominio o stati di recupero dei pagamenti.

`IndividualStore.configurationRevision` è un token opaco presente soltanto nelle viste operatore. `saveStore` richiede la versione corrente per aggiornare una sede esistente; creazione senza token, conflitto o token mancante sull'aggiornamento -> `revision_conflict`, token malformato -> `invalid_input`. Ritrasmetterlo senza interpretarlo. [Flusso e casi limite](../../.agents/product-definition/flows/store-configuration.md).

Current exports from `src/index.ts`:

- durable pilot boundary: `IndividualApi` and `Individual*` shapes for store configuration, recipes, cart/quote, checkout, order lifecycle, additional-payment/refund ledger, session, and resumable events. This narrower live contract deliberately excludes unresolved demo capabilities from `ClientApiContract`; apps inject its HTTP implementation through their own composition. It contains no database/provider implementation and no persisted payment secrets.
- `StoreAddressApi` offre la ricerca di indirizzi della sede nel pannello operativo. `IndividualApi.saveStore` accetta la conferma del risultato scelto e il catalogo operatore restituisce l'indirizzo salvato.
- `IndividualStore.orderingSubdomain` indica l'etichetta pubblica opzionale della sede. `isOrderingSubdomain` e `orderingSubdomainForHost` condividono le regole di sintassi e i nomi riservati.
- `IndividualApi.searchDeliveryAddresses` cerca suggerimenti per il checkout cliente. `DeliveryAddressSuggestion` distingue le vie dai civici con un punto di consegna. `IndividualDeliveryAddress` rappresenta l’indirizzo scelto nel carrello individuale e di gruppo.
- `WeeklyOrderSchedule` descrive la settimana in minuti locali. `IndividualSlot` e `IndividualQuote` possono riportare fine e fuso della finestra. `formatOrderWindow` presenta la finestra o l'orario puntuale storico in italiano.
- `GroupOrderingApi`, `GroupSnapshot`, `GroupParticipant`, `GroupFulfillment`, `GroupQuote` e `GroupCheckout`: port live per raccolta condivisa, revisioni, chiusura e checkout canonico dell'organizzatore. Il riepilogo ospite espone nomi e scelte, senza contatti o capability personali; il trasporto custodisce queste ultime in cookie HttpOnly.

- app shell primitives: `APP_SURFACES`, `AppSurface`, `AppShellSeed`
- shared entity contracts: `Money`, `Product`, `Menu`, `Order`, `StoreProfile`, `InventoryItem`, `Coupon`,
  `LoyaltyState`, `AnalyticsSnapshot`, `AiInsight`, `SlotAvailability`
- identity and checkout contracts: `CustomerProfile`, `DeliveryAddress`, customer/operator demo sessions, and immutable
  order contact and fulfillment snapshots
- client frontend API boundary: `ClientApiContract`, with typed request and response contracts for catalog, cart,
  session, catalog, cart, checkout, orders and reorders, loyalty, rewards, and order tracking. The POC satisfies this boundary through local
  deterministic state; it does not make network calls. `getLiveUpdates` defines a cursor-based, revisioned event
  envelope for order timeline, product/slot availability, and rider tracking. It is transport-neutral (polling, SSE,
  or WebSocket) and carries server-authoritative availability conflicts for production checkout retries.
- status constants and unions:
  - checkout: `OrderStatus` include `pending_payment`; `PaymentAttempt` e `PaymentAttemptStatus` separano l'esito
    pagamento dall'avanzamento operativo dell'ordine
  - `PRODUCT_STATUS`, `ProductStatus`
  - `PREPARATION_MODES`, `PreparationMode`
  - `MENU_STATUS`, `MenuStatus`
  - `SLOT_AVAILABILITY_STATUSES`, `SlotAvailabilityStatus`
  - `ORDER_STATUS`, `OrderStatus`
  - `INVENTORY_STATUS`, `InventoryStatus`
  - `COUPON_STATUS`, `CouponStatus`
  - `AI_INSIGHT_STATUS`, `AiInsightStatus`
- deterministic order simulation helpers:
  - `ORDER_STATUS_TRANSITIONS`
  - `getNextOrderStatuses`
  - `isOrderStatusTransitionAllowed`
  - `progressOrderStatus`

## Menu e composizione

`MenuAdminApi`, `FoodPreferencesApi`, sezioni, gruppi, scelte e composizione estendono il catalogo operativo. `resolveMenuComposition` calcola un riepilogo da una configurazione, usato come anteprima dal client e dal servizio durante il preventivo. Le scorte, la validazione della richiesta e la pubblicazione appartengono al servizio.

`PizzaCatalog` distingue impasti, formati, topping, gusti e formule. Nel modello `inventoryMode="dough-format"`, `PizzaComponent.inventoryIngredientId` associa l'impasto a una voce di Magazzino e `doughQuantity` sul formato ne indica il consumo intero positivo per pizza. `resolveMenuComposition` applica la quantità esclusivamente all'impasto selezionato. La base è un ingrediente ordinario. `simplifyPizzaInventory` converte le bozze precedenti senza mutare l'input: conserva la base standard negli ingredienti inclusi di gusti e formule e lascia da verificare i dati non determinabili. Le vecchie collezioni basi restano leggibili per snapshot già salvati. `materializePizzaMenu` produce le voci ordinabili dai rispettivi ID espliciti. Ogni prezzo completo include i componenti standard; le alternative applicano la differenza rispetto allo standard. Le formule accettano `extraOffer` configurabile; `PIZZA_EXTRA_OFFERS` mantiene la compatibilità delle vecchie formule. Nessun prezzo o tipo si deduce dai nomi.

La proiezione `IndividualProduct.pizza` distingue gusto e formula, espone le selezioni standard, i riferimenti dei topping inclusi e le eventuali anteprime locali per coppia impasto/base con sovrapposizione del gusto. `IndividualOption.pizza` identifica componente, topping o rimozione e categoria degli extra. Le rimozioni eliminano solo il contributo del topping incluso, preservando ingredienti condivisi con altri topping, impasti o basi. `IndividualLine.kind` è opzionale per compatibilità con carrelli storici e viene verificato dal servizio quando presente. Lo snapshot della composizione acquistata conserva l'identità della pizza.

Le dosi di `pizzaRecipeSources` e il catalogo sorgente completo sono riservati al servizio e al workspace operatore; il catalogo pubblico contiene soltanto riferimenti agli ingredienti e informazioni alimentari, senza scorte o dosi.

## Import Rules

Pilot extensions are public through this package entry point: `PilotAnalyticsApi` and its calendar/report types describe the five store metrics; `RiderDeliveryApi` exposes minimized own-delivery operations; `DeliveryAdminApi` describes store-operator rider management and assignment. Rider memberships are distinct from operator `IndividualSession.storeIds`. `IndividualStore.timeZone` is optional for compatibility with existing pilot stores and is validated by the owning service.

- Must not import from `apps/*`.
- Should remain low-level and dependency-light.
- Consumers must import from `@pizzaos/domain` only.

`PromotionsApi` owns coupon/program administration and the authenticated own wallet. `PromotionSelection` extends individual carts and group host fulfillment; authoritative `PromotionBreakdown` extends quotes. Browser inputs carry only codes/reward selection, never discounts, points or customer identity.

## Standard comuni ed extra Magazzino

`PizzaCatalog.defaults` applica standard e alternative comuni tramite `applyPizzaDefaults`. `customEnabled=false` conserva formule e collocazione sorgente ma esclude i prodotti proiettati. `PizzaFormula.extraOffer` definisce quota e percentuale senza deduzioni dal nome; `offer` legge le vecchie regole.

`IndividualIngredient.extra` contiene abilitazione, prezzo e dose per aggiunta (null resta da verificare). `syncPizzaInventory` copia gli extra abilitati su tutti i gusti e le formule, indipendentemente dai precedenti flag `inventoryExtras` e `customEnabled`, con riferimenti espliciti e firma commerciale indipendente dalle scorte. Mantiene separate le ricette incluse dalle dosi degli extra. I prodotti ordinari non ereditano aggiunte. Pubblicazione e disponibilità restano responsabilità del servizio.

`planProductClassification` prepara una bozza e un riepilogo da confermare oppure errori correggibili, senza mutare l'input. Conserva ID/contenuti/collocazione e ripartisce le dosi fra standard e gusto; la conversione inversa ricompone la ricetta completa. `PizzaTaste.customizations` conserva le scelte specifiche; le forme comuni in `menu-choice-types.ts` evitano dipendenze circolari fra identità pizza e contratti di ordinazione. Tutti i contratti restano esportati da `@pizzaos/domain`. [Specifiche e casi limite](../../.agents/product-definition/flows/menu-ordering.md).

`PizzaEntry.recommendedDoughId` conserva un consiglio opzionale; la proiezione espone `PizzaProductIdentity.recommendedDoughOptionId` soltanto quando diverso dallo standard, senza cambiare `defaultSelections` o supplementi. Nei menu con `dough-format`, la composizione omette la voce impasto dai nomi degli ingredienti, conservandola in ricetta, allergeni e tracce.
