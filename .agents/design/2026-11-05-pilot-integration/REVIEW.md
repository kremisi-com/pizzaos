# Riesame integrazione pilota — 2026-11-05

## Risultato

D57-D60 implementate e integrate localmente: appartenenze rider ristrette, abilitazione/disattivazione e assegnazioni manuali, problemi aperti e riassegnazione, avanzamento canonico, cinque analytics con journal durevole e filtri nel fuso della sede. Cliente, operatore e rider condividono lo stesso ordine e lo stesso repository del servizio. Le viste si integrano in apps/admin; gli ingressi per host D71 appartengono al relativo incremento parallelo, preservato durante questo lavoro.

La composizione produttiva usa createOperationalServices e registra le route estensioni. Il guard rider viene verificato sotto il medesimo lock della transizione di ordine; nessuna impersonificazione di operatore, nessun nuovo accesso alle route generiche. Il riesame indipendente del codice non ha individuato problemi azionabili di isolamento, privilegi o concorrenza nel perimetro rider esaminato.

## Metodo SDD

Agenti separati hanno curato analytics e consegne. L'autore indipendente dei test ha ricevuto solo requisiti e contratti pubblici; prove rosse su stub prima delle implementazioni, quindi prove verdi. Anche integrazione HTTP e pannello assegnazioni hanno avuto test pubblici indipendenti. Gli SDD dei moduli conservano requisiti, contratti, disegno interno e checklist.

## Evidenze finali

| Verifica | Esito |
|---|---|
| Sei suite delle estensioni | 69 test verdi: analytics servizio/UI, rider servizio/UI, pannello admin e integrazione HTTP |
| pnpm exec vitest run services/checkout-api/src apps/admin/src | 231 test verdi, 8 test PostgreSQL/Auth.js saltati senza la configurazione database dedicata in questa sessione |
| pnpm exec playwright test --config playwright.pilot-extensions.config.ts | 1 scenario completo verde: abilita, assegna, avvia, segnala problema, riassegna stesso rider, completa; controllo ordine, contanti, stock, analytics e negazione accessi impropri |
| Build admin | Riuscita, usando PIZZAOS_BUILD_DIRECTORY=.next-pilot-build per evitare cache condivise con altre verifiche |
| Build servizio; typecheck servizio/admin/domain/client | Riusciti |
| Lint admin/servizio/domain | Riusciti |
| pnpm architecture:check | Confini e 3 test verdi |
| git diff --check | Nessun errore whitespace; soli avvisi di conversione LF/CRLF |

Lo scenario browser usa una vera app Next admin e un servizio locale isolato; l'ordine cliente è preparato tramite le API pubbliche con identità distinta sullo stesso proxy. Il flusso browser client completo è coperto dall'incremento individuale e non viene dichiarato ripetuto da questa suite. Identità e pagamenti sostituiti sono confinati nell'harness tests/fixtures/individual-service.ts.

Le prime esecuzioni browser hanno incontrato porte occupate e artefatti rimossi da verifiche parallele. La suite finale usa porte 3402/3404, directory Next dedicata e artefatti sotto .codex/test-results/pilot-extensions; il test conserva tutte le asserzioni funzionali e apre esplicitamente la scheda Statistiche prima della verifica visiva.

## Limiti e lavoro restante

Nessun deploy, acquisto o modifica DNS, creazione database remoto o invio a destinatari reali è stato effettuato da questo incremento. Ambiente D56, origini e host D71, Google OAuth, SMTP e Stripe test/webhook devono essere configurati e verificati esternamente. I test PostgreSQL/Auth.js saltati in questa sessione non sono dichiarati superati da queste evidenze; la chat dell'individuale ha registrato separatamente le proprie prove locali.

Un'abilitazione rider conserva l'email autorizzata: non dichiara un invito email inviato. Il rider usa i normali provider Auth.js. Analytics precedenti all'attivazione del journal non vengono ricostruite da date di creazione inattendibili. GPS, ottimizzazione percorsi ed esportazione sono fuori dall'incremento approvato.

Il checkout individuale, il recupero UI, la demo di sessione, gli host operativi e la successiva sequenza gruppo/promozioni/email sono lavori paralleli con evidenze proprie. Il repository condiviso contiene anche le loro modifiche; non sono state ripristinate o attribuite a questo incremento. Nessun commit o push eseguito.
