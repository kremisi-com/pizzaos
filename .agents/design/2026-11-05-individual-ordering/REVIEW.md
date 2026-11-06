# Verifica del primo flusso individuale

Data: 2026-11-05. Perimetro: D49-D55, D36 aggiunte e regole precedenti richiamate nel design. Implementazione locale completata; nessun deploy o provisioning di credenziali esterne.

## Evidenze del perimetro

- 132 test indipendenti superati in 7 file: servizio53, HTTP7, PostgreSQL4, Auth.js4, adapter Stripe25, proxy30, draft9.
- Test creati da agente senza accesso alle implementazioni o ai design interni. Rilevati e corretti in sequenza red/green: fascia distanza zero, rifiuto identità dal payload, normalizzazione JSON invalido, rimborsi definitivi falliti, replay metadata Stripe, deadline ASAP indipendente dalla distanza dello slot.
- PostgreSQL17 reale in container isolato: migrazione riuscita, transazioni tra pool distinti, concorrenza, rollback, recupero e risultati detached. Database dedicato `pizzaos_individual_test`; nessun dato reale.
- Auth.js reale e adapter PostgreSQL con server SMTP locale di test: email consegnata, magic link monouso, cookie HttpOnly, scadenza, replay e cookie/header falsi respinti. Guardia email Google verificata e collegamento stessa identità configurati; OAuth esterno non eseguito.
- Stripe SDK boundary: mapping stato, chiavi stabili, cancellazione con rilettura, recupero rimborso tramite metadata oltre finestra idempotente, errori definitivi vs incerti. Nessuna chiamata finanziaria esterna effettuata.
- Playwright `playwright.individual.config.ts`: 1/1 superato, carrello guest/reload/login, preventivo, invio contanti, reload ordine, accettazione/preparazione/pronto/completamento da admin e stato finale client. Due reali app Next e servizio HTTP isolato; identità/provider sostituiti SOLO nell'harness di test.
- Build produzione client e admin superate. Lint/typecheck app superati. Build/typecheck servizio superati durante integrazione, inclusi test Stripe dopo correzione fixture. Ultimo controllo globale servizio interrotto da TS2352 in `src/demo-access.test.ts:227`, file apparso nel lavoro parallelo successivo; non modificato da questo incremento. Lint servizio superato nell'ultimo controllo. Architettura e tre test del controllo passano.

Comando test mirato (con `PIZZAOS_TEST_DATABASE_URL` del database dedicato):

```text
pnpm exec vitest run services/checkout-api/src/ordering-service.test.ts services/checkout-api/src/http-app.test.ts services/checkout-api/src/postgres-repository.test.ts services/checkout-api/src/auth-runtime.test.ts services/checkout-api/src/stripe-payments.test.ts tests/individual-proxy.test.ts apps/client/src/test/individual-draft.test.ts
```

## Verifiche globali e lavoro concorrente

Il checkout è condiviso con altre chat attive che aggiungono analytics, rider, accesso demo e integrazioni. Questi file/decisioni sono stati preservati, senza cancellare stub o indebolire test. La prima suite globale ha restituito 376 passati/15 falliti per stub delivery non implementati; un controllo successivo del servizio ha mostrato delivery15 verdi e integrazione pilot8 ancora rosse (stub createOperationalServices). Sono risultati transitori delle altre attività e non una dichiarazione di repository globalmente verde.

La verifica aggiuntiva della demo storica `client-order-flow.spec.ts` ha dato 1 passato/2 timeout: selettore button Continua nel vecchio customization e label Contanti alla consegna (simulazione). Il codice HEAD precedente già non espone questi selettori (Continua è link, la label non contiene simulazione). Non sono state cambiate asserzioni per mascherare i timeout. Il flusso persistente usa il test E2E dedicato; i test UI client88 e quelli admin esistenti48 risultano passati nelle verifiche di compatibilità. Il test individuale è escluso dalla configurazione Playwright demo perché richiede il proprio harness.

## Limiti per l'esercizio

Le credenziali DATABASE_URL/Auth/SMTP/Stripe non sono presenti nei file env locali del runtime. Le integrazioni reali Google OAuth e Stripe carta/3DS/webhook richiedono test keys e callback configurati e restano smoke test esterni da eseguire nell'ambiente condiviso; non sono sostituiti da fallback nel server live. Le transazioni HTTP del browser sono verificate con repository dell'harness; persistenza PostgreSQL e Auth sono verificate separatamente con servizi reali locali.

Prima dell'utilizzo occorre configurare variabili dagli .env.example, migrare il database, creare sede/inviti dal superadmin, inserire menu/scorte/fasce/consegne dal pannello. Delivery iniziale usa indirizzo e coordinate confermate, senza geocodifica automatica. Privacy/norme D16/D31 non sono dichiarate risolte. Riferimento operativo: services/checkout-api/README.md.
