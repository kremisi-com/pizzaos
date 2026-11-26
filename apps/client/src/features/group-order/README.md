# Ordine di gruppo

Nel gruppo persistente l'organizzatore può mostrare e nascondere un QR accanto al link invito. `qrcode.react` genera un SVG nel browser con lo stesso URL assoluto e frammento invito, sull'origine della sede corrente, senza servizi esterni. La scansione apre il normale ingresso con nome; autorizzazioni e scadenza restano quelle del servizio. Il POC conserva il suo QR illustrativo.

La feature possiede due esperienze separate. Il POC autenticato `/group-order` conserva roster e contributi locali tramite `group-order-model.ts`; link e QR di quella schermata sono dimostrativi.

Il flusso operativo `/ordina/gruppo` usa `PersistentGroupScreen` e i port pubblici `GroupOrderingApi` e `IndividualApi` iniettati dalla composizione. `/ordina/gruppo/[id]` apre una raccolta persistente su servizio, con invito nel frammento URL e capability personale esclusivamente nel cookie HttpOnly. Il browser non conserva roster o contatti nello storage. Polling riprende riepilogo e catalogo server, senza sostituire campi locali in corso; ogni scrittura usa la revisione osservata.

Solo l'organizzatore autenticato crea, chiude e paga. Dopo la scadenza gli invitati non modificano la raccolta; l'organizzatore può correggere il proprio contributo e rimuovere articoli o partecipanti, senza modificare personalizzazioni e note altrui, e verificare prezzi/disponibilità prima del checkout canonico. Il recupero usa la richiesta congelata sul server. Stripe Elements proviene dall'entry pubblico della feature `individual-ordering`; il pagamento e la gestione successiva restano sullo stesso ordine individuale. Le note di ogni riga identificano il partecipante al ristorante.

Il checkout host riceve `PromotionsApi` opzionale dal port UI, fornito sempre dalla shell live: saldo e riscatto appartengono all'organizzatore. `GroupFulfillment.benefits` porta solo codici e scelta premio al motore canonico; nessun saldo o controllo fedeltà è mostrato agli invitati. A totale zero verificato la conferma carta non richiede Stripe; la raccolta resta congelata dopo l'invio e l'annullamento individuale ripristina benefici sul servizio.

Per la consegna, il checkout dell’organizzatore riusa `DeliveryAddressField` dall’entry pubblico di `individual-ordering` e cerca l’indirizzo tramite `IndividualApi`. Il civico scelto entra nel preventivo canonico del gruppo. [Flusso](../../../../../.agents/product-definition/flows/group-ordering.md).

Verifica: test/lint/typecheck/build client e `pnpm architecture:check`. Browser: `pnpm exec playwright test --config playwright.group-ordering.config.ts`, con due app reali e servizio test isolato, guest distinti, riepilogo admin e regressione individuale. Specifica: `.agents/design/2026-11-05-group-ordering/`.
