# Diagnostica backend

Owner: checkout-api. D73 e [flusso F23/F24](../../.agents/product-definition/flows/backend-observability.md). Log e monitoraggio non sostituiscono gli stati persistenti ordine/rimborso/email o un registro di audit commerciale.

## Configurazione server

| Variabile | Comportamento |
|---|---|
| `LOG_LEVEL` | info predefinito; trace/debug/info/warn/error/fatal/silent. Un valore sconosciuto usa info. |
| `PIZZAOS_ENVIRONMENT` | test/production; separare dati, credenziali e destinatari degli alert. |
| `PIZZAOS_RELEASE` | Versione tecnica senza spazi; fallback commit Vercel, poi local. |
| `SENTRY_DSN` | Opzionale, protetta nel progetto backend e nel worker. Assente: nessuna inizializzazione/invio Sentry. |
| `NODE_OPTIONS` | `--enable-source-maps` per il bundle HTTP; il Dockerfile worker lo abilita già. |

Nessuna configurazione passa al browser. Non serve un token amministrativo Sentry per inviare eventi. Il codice non crea account/progetti, non configura destinatari e non acquista piani. DSN/SDK non utilizzabili lasciano operative API e log locali: verificare la ricezione prima di dichiarare il monitoraggio attivo.

## Consultazione e triage

1. Leggere `x-request-id` negli strumenti di rete del browser oppure `requestId` nel JSON errore. Il backend genera l'ID, ignorando quello del chiamante. Gli errori generati prima di raggiungere il servizio (proxy non configurato/rete interrotta) non hanno un ID backend.
2. Cercare quell'ID nei runtime log del progetto API. Per i worker cercare jobId, operation e orderId nei log del processo. stdout JSON è la destinazione canonica, senza file locali da ruotare o nuova tabella errori.
3. Usare code/category/route/statusCode/environment/release e frame file/riga/colonna. I messaggi arbitrari delle eccezioni sono esclusi: non aggiungere dump di request, oggetti provider, query SQL o contenuti email.
4. `http_completed` indica status e durata; dependency usa warn, unexpected/operational error, expected info senza Sentry. Usare almeno warn per conservare i guasti delle dipendenze. Sentry mostra identificatori nei dettagli e operation/code/category nei tag; l'impronta usa operazione/codice/route/tipo/posizione, senza raggruppare per cliente/ordine.

Pagamento incerto: recuperare lo stesso tentativo. Rimborso fallito: retry operativo esistente. Email blocked: correggere configurazione/allowlist server e riavviare; il dispatch rivaluta il messaggio al prossimo tentativo. Nessun limite globale ai tentativi email viene introdotto. Lo stato canonico nell'admin resta autorevole anche dopo la risoluzione dell'evento tecnico.

Deduplica: massimo 1000 chiavi per processo, finestra 60s e conteggio `suppressed` alla nuova emissione. Un riavvio azzera la memoria. Richieste diverse restano distinguibili, i job ripetuti non generano un alert ogni cinque secondi. L'evizione sotto carico può consentire un'emissione anticipata: non è un rate limit globale o un audit durevole. Dopo un tick fallito, il primo riuscito produce `worker_recovered`.

## Attivazione e prova controllata

Impostare il DSN nel backend e worker e rilasciare i bundle verificati; un aggiornamento solo frontend non basta. Provare prima sul test con dati fittizi. Nel pannello Sentry configurare destinatari, intervallo notifiche, ambienti e conservazione prevista dal piano. Restare sulle risorse gratuite autorizzate. Queste impostazioni non sono controllate dal repository.

Prova intenzionale, senza endpoint pubblico né accesso database, dal servizio con le variabili del test caricate:

```powershell
pnpm exec tsx --env-file=.env -e 'import {createRuntimeDiagnostics} from "./src/sentry-reporter.ts"; void (async () => { const diagnostics = await createRuntimeDiagnostics(); diagnostics.report(new Error(), {operation:"monitoring_probe",code:"monitoring_probe",category:"operational"}); await diagnostics.flush(); })();'
```

Il flush best effort **non certifica consegna**. Verificare nel pannello ambiente/release, frame, assenza PII e ricezione dell'alert dal destinatario configurato; poi risolvere l'evento di prova. Se non arriva, controllare DSN, rete in uscita, filtri/quota e release senza stampare credenziali. Registrare data, commit, ambiente ed esito solo dopo la prova effettiva.

Il 20 novembre 2026 è stato creato il progetto `kremisi/pizzaos-backend` e verificato un errore attraverso il vero ingresso HTTP locale e il normale SDK: [PIZZAOS-BACKEND-1](https://kremisi.sentry.io/issues/162614072/), con requestId correlato e frame TypeScript leggibili. Il DSN locale è in `.env.sentry.local`, ignorato da Git, da caricare esplicitamente insieme alle altre variabili del servizio. [Evidenza e limiti](../../.agents/design/2026-11-20-backend-observability/SENTRY_VERIFICATION.md).

La regola `PizzaOS backend: nuovi errori e regressioni` (1519285) è attiva con email al team Kremisi e intervallo di 30 minuti, ed è scattata nella prova; l'issue di prova è risolta. DSN/release e source map sono configurati su Vercel, ma il nuovo codice non è stato rilasciato: il database è bloccato per quota rete Free, e l'utente ha scelto di sospendere il worker e [preparare il ripristino gratuito](restore-test-after-quota.md). L'errore reale è consultabile in [PIZZAOS-BACKEND-2](https://kremisi.sentry.io/issues/162619938/). Restano rilascio/verifica servizio e worker, recapito email e retention. Sentry aggiunge geo dell'ingestione anche quando IP e identificativi utente sono nulli: distinguerla dai dati applicativi filtrati. Nessun upgrade/trial attivato. D16/D31 restano distinte da questa integrazione.
