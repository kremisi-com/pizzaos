# Riesame locale — 20 novembre 2026

## Stato e perimetro

Approvato: D73, implementare la proposta con SDD. Implementato e verificato localmente nel checkout-api, nel codice pubblico errore del dominio e nella propagazione header dei due proxy. Nessun deploy, account Sentry, piano a pagamento o configurazione remota è stato eseguito. La working copy conteneva già modifiche documentali dell'utente: sono state conservate; gli aggiornamenti D73/F23/F24 sono aggiuntivi. Nessun commit creato.

Fonti correnti: [flusso errori/esercizio](../../product-definition/flows/backend-observability.md), [procedura operativa](../../../services/checkout-api/observability.md). [Requisiti](backend-diagnostics/REQUIREMENTS.md), [contratti](backend-diagnostics/CONTRACT_DESIGN.md), [design interno](backend-diagnostics/INTERNAL_DESIGN.md).

## Processo SDD ed evidenza

Il test agent ha ricevuto solo requisiti, contratti/stub e, dopo richiesta esplicita, tipi pubblici e fixture/test preesistenti. Non ha letto implementazione o design interno. Il primo RED è stato il modulo diagnostico mancante. I successivi probe hanno individuato e preceduto correzioni per binding dei logger derivati, frame persi nella pipeline SDK11, errore Writable asincrono, abort durante inizializzazione serverless e cancellazione Stripe recuperata non osservabile.

| Requisiti | Verifica indipendente |
|---|---|
| R1/R2/R3/R4/R8 | [HTTP](../../../services/checkout-api/src/diagnostics-http.acceptance.test.ts): UUID, mapping errori, singola segnalazione, dati esclusi e webhook; [proxy](../../../tests/observability-proxy.test.ts): header/status/body, nessun ID spoofato inoltrato |
| R2/R3/R4/R6/R7 | [Diagnostica](../../../services/checkout-api/src/diagnostics.acceptance.test.ts): classificazione, contesto concorrente, allowlist, cause, child logger, finestra/evizione, sink/reporting asincroni e flush bloccato |
| R5/R6/R9 | [Operazioni e worker](../../../services/checkout-api/src/diagnostics-operational.acceptance.test.ts): pending/idempotenza, retry SMTP, identificatori, timer, recovery, non sovrapposizione e drain; [Stripe recuperata](../../../services/checkout-api/src/stripe-diagnostics.acceptance.test.ts) |
| R4/R7 | [Adapter Sentry](../../../services/checkout-api/src/sentry-reporter.acceptance.test.ts) e [SDK reale in memoria](../../../services/checkout-api/src/sentry-reporter-sdk.acceptance.test.ts): nessuna rete, configurazione privacy11, filtro finale scope, impronta e frame mantenuti |
| R7/R9 | [Adapter serverless](../../../services/checkout-api/src/vercel-api.acceptance.test.ts): attesa risposta/flush, startup sicuro/ritentabile, abort durante init |

SSE usa lo stesso reporter e chiude lo stream senza secondo payload; non è stata aggiunta una nuova prova browser specifica di interruzione SSE o di errore fatale a processo già operativo. L'avvio fallito del processo è stato verificato direttamente su sorgente e bundle. La suite ordini/rimborsi e quella dell'admin/email restano le regressioni degli stati canonici.

## Controlli eseguiti

- `pnpm --filter @pizzaos/checkout-api test`: **473 pass, 16 skip**, 25 file pass e 5 skip. Gli skip richiedono `PIZZAOS_TEST_DATABASE_URL` su database isolato, non configurato in questa sessione.
- Vitest su `tests/individual-proxy.test.ts`, `tests/observability-proxy.test.ts`, `apps/client/src/test`, `apps/admin/src/test`: **247 pass in 53 file**.
- `pnpm exec playwright test --config playwright.individual.config.ts`: **4 pass**, guest/reload/login/ordine contanti completato, sidebar/autorizzazioni admin, conferma indirizzo e configurazione legacy. Provider e identità sono adapter isolati del fixture, non servizi esterni.
- Lint/typecheck/build di checkout-api, client, admin e dominio: pass. `pnpm architecture:check`: boundary pass e 3 test pass.
- `build:deployment`, generazione/copia lock e `npm ci --omit=dev --ignore-scripts` sull'artefatto: pass, 116 dipendenze installate; audit npm riportato 0 vulnerabilità al momento della prova.
- Startup smoke sorgente e bundle worker senza DATABASE_URL/DSN: exit1, evento JSON startup_failed, nessun dump della configurazione. Bundle con source map: frame `runtime-config.ts` risolto senza sourcesContent.

Ambiente locale Node25.2.1; l'artefatto mantiene target/runtime Node24 dichiarato. npm ha segnalato la differenza engine durante l'installazione locale: non è una prova di esecuzione nell'host Node24 remoto. Il primo tentativo browser/app era bloccato dai link Next dopo installazione filtrata delle dipendenze: `pnpm install --frozen-lockfile --ignore-scripts` ha riallineato il workspace e le prove complete successive sono passate. Un file next-env generato dalla build è stato riportato al contenuto precedente.

## Attivazione online ancora necessaria

Nessun DSN locale trovato. Occorrono progetto/DSN Sentry nell'API e worker, release, destinatari/regole alert, retention prevista dal piano e prova controllata con evento ricevuto. La procedura prepara il probe ma flush non certifica consegna. Non sono state rinnovate le evidenze online del pilota del 5 novembre. D16/D31, backup/ripristino e readiness commerciale restano aperti. La deduplica è locale e limitata, non un audit durevole o un rate limit distribuito.
