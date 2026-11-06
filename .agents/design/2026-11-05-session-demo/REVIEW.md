# Verifica POC per sessione

## Comportamento verificato

- Accesso email/password demo su client e admin, shell POC, barra identificativa e logout.
- Sessioni firmate di otto ore, origine, CSRF, cookie alterati/scaduti, rotazione password, credenziali errate e demo disabilitata.
- 403 prima di servizi/database/provider su API operative, anche URL codificati e futuri endpoint fuori da `/v1/pilot`.
- Nessuna connessione/query PostgreSQL per l'accesso demo; nessun attore reale creato.
- Tutti i vecchi URL POC respingono guest e cookie falsi; i link operativi aperti dalla demo tornano al POC.
- Carta POC senza dati carta, iframe, script o traffico Stripe; ordine di gruppo, riordino, ritiro, coupon e feedback conservati.
- Flusso persistente guest → autenticazione fixture → ordine contanti → completamento nell'admin.
- Controllo visuale mobile client e desktop admin: barra leggibile, logout visibile, nessun errore JavaScript nelle due home.

## Evidenza

- `pnpm exec vitest run`: 570 test passati, 8 saltati perché manca il database PostgreSQL dedicato (snapshot prima delle 9 ulteriori regressioni URL demo e degli ultimi fix POC).
- `demo-access.test.ts`: 27 test passati, inclusi i 9 casi aggiuntivi di isolamento.
- `session-mode.test.ts`: 40 test passati.
- Test mirati checkout, carrello e personalizzazione: passati.
- `pnpm exec playwright test --config playwright.session-demo.config.ts`: 4 passati.
- Suite browser POC standard con directory di build isolata: 8 passati, incluse tutte e tre le superfici.
- `pnpm exec playwright test --config playwright.individual.config.ts`: 1 passato.
- Build produzione di client, admin e checkout-api: passate. I fix successivi di carrello e disponibilità del pulsante sono coperti da unit test e suite browser POC.
- Lint client/admin e delle modifiche demo nel servizio, controllo architettura e `git diff --check`: passati. Typecheck finale client, admin e servizio: passati. Il lint integrale del servizio intercetta un errore nel lavoro concorrente del gruppo persistente: `no-control-regex` in `services/checkout-api/src/group/group-service.ts:36`. Non sono stati rimossi o esclusi test, né modificato il codice del gruppo persistente.
- Ultima verifica dei confini demo/HTTP/proxy/modalità dopo l'irrigidimento delle eccezioni salute/webhook: 104 test passati (27 demo, 7 HTTP, 30 proxy, 40 modalità).

## Configurazione e limiti

La demo è disabilitata finché non si imposta `PIZZAOS_DEMO_PASSWORD` nel servizio e lo si riavvia. Non è stata scritta una password in configurazioni locali o remote né effettuato un deploy. Avvio servizio e accessi reali mantengono i prerequisiti documentati.

Il browser usa il vero runtime demo e un fixture isolato per il servizio operativo. Google, invio email reale e conferma Stripe esterna non sono stati eseguiti con credenziali esterne. I test Auth.js/PostgreSQL preesistenti restano condizionati alla disponibilità di `PIZZAOS_TEST_DATABASE_URL`.

Le numerose modifiche locali di altri incrementi sono preservate; il diff complessivo del workspace non coincide con il solo intervento demo. I test legacy sono stati aggiornati per usare l'accesso demo e i selettori attuali. La landing usa una porta dedicata per non riutilizzare un server di un altro progetto.
