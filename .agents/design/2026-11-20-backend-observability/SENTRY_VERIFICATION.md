# Collegamento Sentry e verifica reale — 20 novembre 2026

## Risultato verificato

Progetto approvato dall'utente e creato nell'organizzazione/team `kremisi`: `pizzaos-backend`, piattaforma Node.js, ID `4512464277274704`. [Impostazioni progetto](https://kremisi.sentry.io/settings/projects/pizzaos-backend/).

Il DSN è configurato esclusivamente in `services/checkout-api/.env.sentry.local`, ignorato da Git. La CLI gestisce le credenziali utente fuori dal repository. Nessun token è stato aggiunto al codice. SDK installato `@sentry/node` 11.15.0, versione registry verificata durante l'handoff. Nessun piano, trial o budget è stato modificato.

## Prova attraverso il backend

È stato avviato su loopback un server HTTP che invoca il **vero ingresso `src/vercel-api.ts`**, con il suo normale `createRuntimeDiagnostics` e l'SDK/reporter del progetto. Non è stata usata una chiamata diretta standalone a captureException. L'assenza intenzionale di DATABASE_URL ha provocato un vero errore di inizializzazione prima dell'apertura del database o di chiamate Stripe/SMTP. Nessun ordine, pagamento o dato persistente è stato modificato.

- Richiesta `/health`: HTTP 503, JSON pubblico `service_unavailable`, header e payload requestId coerenti.
- Diagnostica: operation `function_startup`, code `startup_failed`, category unexpected, environment test.
- Release: `pizzaos-sentry-verification-20261120131924842` (working copy basata su `de2e9b8c6a37`, non un commit di rilascio).
- requestId: `f1d735e1-4396-49f1-8baf-c9adcfc52f8a`.
- Evento ricevuto in Sentry alle 14:19 CET del 20 novembre 2026: [PIZZAOS-BACKEND-1](https://kremisi.sentry.io/issues/162614072/), titolo `Error: Errore backend`, valore eccezione `Errore backend`, conteggio 1. Il collegamento e il titolo sono stati mostrati all'utente.
- Frame ricevuti: vercel-api.ts:14:17, runtime.ts:21:18, runtime-config.ts:26:23 e runtime-config.ts:23:23; nessun errore di elaborazione Sentry. File e righe TypeScript sono leggibili; contenuto sorgente e nomi funzione restano intenzionalmente esclusi dalla sanitizzazione. Non sono stati caricati sorgenti o mappe sul provider.
- Nessuna entry request/breadcrumbs; id/email/username/IP/nome utente nulli. Il provider arricchisce l'evento con geo derivata dal traffico di ingestione (country_code/city/region), distinta dai dati cliente o dai dati spediti dall'app. Le impostazioni privacy e retention lato account richiedono un riesame prima dell'uso commerciale.

Il server locale è stato chiuso e il trigger temporaneo rimosso. Evidenze private/diagnostiche sono in `.codex/sentry/`, ignorate da Git. L'utente ha successivamente autorizzato il rilascio sul pilota test, l'alert dedicato e la risoluzione dell'issue di prova.

## Seconda verifica e alert autorizzato

La prima ricezione ha evidenziato che il filtro finale ometteva la piattaforma e i marcatori in-app. Il test agent indipendente ha aggiunto prima le attese e dimostrato RED; il reporter è stato corretto con piattaforma Node e marcatura dei frame TypeScript. I 9 test Sentry, l'intera suite backend (473 pass, 16 skip PostgreSQL), lint/typecheck/build e build dell'artefatto sono passati di nuovo.

Seconda ricezione nella stessa issue alle 14:31 CET: evento `b9b3a660eb3c4e9daf31ce946fb60199`, release `pizzaos-sentry-verification-20261120133112885`, requestId `dfddcc7e-7117-4411-8b96-c9690ab86752`. Piattaforma node, quattro frame TypeScript inApp true, requestId coincidente, zero errori di elaborazione. La regressione ha portato il conteggio a 2. L'issue è stata poi risolta come richiesto e il trigger locale eliminato.

Creata e riletta la regola **1519285**, `PizzaOS backend: nuovi errori e regressioni`: attiva, trigger first-seen/regression, email al team Kremisi, frequenza 30 minuti. La regola è scattata durante la seconda prova (lastTriggered 14:31:24 CET); il recapito effettivo nella casella del destinatario non è attestato.

## Stato del rilascio e limiti

### Aggiornamento finale: diagnosi quota e scelta gratuita

L'accesso Vercel è stato successivamente corretto: account development-4049, team Hobby kremisis-projects, progetto API confermato per ID. I log provano il rifiuto PostgreSQL SQLSTATE 53000 per quota. L'API Neon ha confermato piano free_v3, 5.533.768.020 byte di traffico pubblico e periodo fino al 1 dicembre 2026 00:00 UTC (01:00 italiane); endpoint test sospeso dal 9 novembre. Il limite di rete Free di 5 GB e il blocco delle connessioni sono confermati nelle [regole Neon](https://neon.com/docs/introduction/plans). Nessun upgrade effettuato.

L'utente ha scelto «Resta gratis: sospendi il worker e prepara il ripristino». Eseguito override fra1=0 e verificato due volte: zero istanze totali/desiderate/pronte. Non è stato effettuato alcun deploy. Impostate su Vercel SENTRY_DSN Secret, PIZZAOS_RELEASE e NODE_OPTIONS Config; soltanto questi ultimi valori non sensibili sono stati riletti per confronto. Node del progetto aggiornato da 26.x a 24.x in coerenza con il pacchetto. Questa differenza Node non è la causa provata dell'errore osservato: il rifiuto quota è esplicito nei log.

Il caso 53000 è stato aggiunto con test indipendenti RED → GREEN alla classificazione dependency/503 e al solo codice diagnostico ammesso. Controlli finali: **475 backend pass, 16 skip PostgreSQL**, lint/typecheck/build pass. Nuova prova tramite il vero ingresso HTTP, con la normale configurazione test e un'unica connessione rifiutata dal database, senza avviare worker o modificare dati: requestId `cc37b7fc-3334-4bed-9e4e-7ec4583aef5d`, release `pizzaos-quota-verification-20261120134447672`, HTTP503. Ricevuta [PIZZAOS-BACKEND-2](https://kremisi.sentry.io/issues/162619938/): warning, dependency, error.code53000, piattaforma node. L'issue reale resta aperta, distinta dalla prova risolta.

Il pacchetto è stato ricostruito e verificato con `vercel deploy --dry`: nove file runtime/config, nessun segreto/env/node_modules; generazione .vercelignore aggiunta al builder. Archivio e precondizioni del prossimo rilascio nella [procedura di ripristino](../../archive/2026-11-20-restore-test-after-quota.md). Il ripristino è manuale e richiede quota realmente disponibile e riduzione/verifica del traffico del repository a snapshot prima dell'uso continuativo.

Non è una prova del servizio online con database operativo. Nessun deploy Vercel è stato eseguito; le tre variabili Sentry/release/source map sono state predisposte sul progetto per il prossimo rilascio. L'alert dedicato è attivo e scattato; consegna email e retention non sono attestate.

Nella prima fase la CLI era nell'account benjanapo e non aveva accesso al progetto. L'utente ha aperto la sessione corretta e il login development-4049 ha risolto l'accesso a kremisis-projects; non sono stati modificati gli altri team. La lettura dei log ha poi diagnosticato la quota Neon come causa del blocco. La scelta successiva dell'utente è sospendere il worker e rinviare il ripristino restando sul gratuito, secondo la procedura sopra collegata.

Il pacchetto backend e worker è pronto in `.codex/deployments/pizzaos-api`; i controlli iniziali sono nel [riesame locale](REVIEW.md), gli aggiornamenti e il dry-run sono registrati sopra. Il prossimo rilascio deve usare le variabili già predisposte, mantenere `PIZZAOS_ENVIRONMENT=test`, Node24 e le risorse autorizzate; verificare quota residua, health API e liveness worker prima di dichiararlo operativo.
