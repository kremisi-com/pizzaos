# Coupon e fedeltà

Il modulo possiede configurazioni per sede, prezzi promozionali e movimenti punti. `createPromotionsOrderingServices` compone il servizio operativo canonico con un solo repository decorato condiviso da checkout, analytics, delivery/rider, gruppi e worker. Lo snapshot opzionale `promotions` conserva programmi, coupon, termini congelati per ordine e movimenti; non servono nuove tabelle.

Il programma predefinito è attivo: 1 punto/euro netto prodotti e premio da 100 punti/500 centesimi. Operatore della sede e superadmin configurano tramite `PromotionsApi`; wallet e movimenti sono esclusivi del cliente autenticato e della sede. Nessun endpoint accetta saldo o accrediti dal browser.

`priceQuote` opera sotto il lock canonico: percentuali in sequenza, fissi, infine un premio sui residui prodotti. Delivery resta piena. Coupon senza sconto effettivo producono `coupon_unavailable` e non impegnano utilizzi. L'allocazione proporzionale usa centesimi interi e resti maggiori deterministici; le moltiplicazioni usano BigInt. Quote senza selezione mantengono payload e fingerprint canonici. Le quote non prenotano: checkout registra ordine e riserve coupon/punti nella stessa transazione, prima del provider.

Il journal segue pending, submission, cancellazione e completamento canonici, compresi rider e worker. Un premio passa da reserved a spent o released; completamento accredita una sola volta con tasso/enabled congelati alla creazione. Gli ordini storici non ricevono retroaccrediti. Aggiunte mantengono benefici originali e aumentano lordo/netto a prezzo pieno. Un ordine carta a totale zero viene inviato senza PaymentIntent e non genera rimborso senza addebito.

`registerPromotionRoutes` registra GET `/v1/pilot/stores/:id/promotions`, PUT `.../promotions/program`, POST `.../promotions/coupons` e GET `.../loyalty`. Eredita proxy/sessione demo, verifica Origin sulle scritture e valida input senza coercizione o rimozione di proprietà. Risposte no-store.

Verifica: test indipendenti `promotions*.test.ts`, suite canonica checkout/gruppi/operazioni, typecheck, lint, build e architecture check. I test PostgreSQL richiedono il database dedicato indicato nel README del servizio.
