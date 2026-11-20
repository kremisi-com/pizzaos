# Versione pilota: avanzamento e perimetro da confermare

Allineamento documentale del 2026-11-20; le evidenze di verifica e deploy conservano le proprie date. Una specifica approvata o una schermata demo non equivale a una funzionalità completata. La mappa dei 24 flussi e delle relative fonti è nell'[inventario corrente](flow-inventory.md).

## Incrementi autorizzati

| Incremento | Stato attuale | Criterio di completamento |
|---|---|---|
| Ordine individuale e pagamento | Gate 1 chiuso; verificato anche online cliente → admin → rider, con Stripe Elements e challenge 3DS riuscita | Flusso persistente cliente → admin → evasione, accessi, scorte/slot, carta/contanti e rimborsi; verifiche SDD ed E2E; [verbale online](../../services/checkout-api/online-client-verification.md) |
| Analytics minime D59/D60 | Implementate e verificate localmente; evidenze nel [riesame integrazione](../design/2026-11-05-pilot-integration/REVIEW.md) | Cinque metriche da transizioni reali, filtri nel fuso della sede, accesso autorizzato e test indipendenti |
| Rider e gestione consegne D57/D58 | Implementati e verificati localmente, incluso scenario browser con problema e nuovo tentativo | Accesso ristretto, assegnazione manuale, avanzamento canonico, eccezioni aperte/riassegnazione, isolamento verificato |
| Ambiente online D56/D71 | Client, admin/rider e backend pubblicati sul test; percorso completo con Google, Stripe/3DS ed email Delivered verificato. Resta prova da dispositivi fisici distinti | Backend e frontend raggiungibili; admin/rider sullo stesso deploy per ambiente con ingressi e permessi distinti; database test separato dalla produzione; identità/email e Stripe test verificati da dispositivi distinti |
| Gruppo D61-D63 | Completato e verificato localmente, gate 2 chiuso | 67 test, PostgreSQL reale, browser con quattro contesti, build e verifiche; [riesame](../design/2026-11-05-group-ordering/REVIEW.md) |
| Coupon e fedeltà D64-D67 | Completati e verificati localmente; gate 3 chiuso | Configurazione admin e benefici persistenti, prezzi/limiti/saldo autorevoli, concorrenza e lifecycle individuale/gruppo verificati |
| Email operative D68-D69 | Gate 4 chiuso; ricevuta, accettazione e avvio consegna verificati anche online, tutti Delivered verso account di prova | Invii durevoli, retry/deduplica, errori admin e destinatari test; WhatsApp resta manuale |
| Errori e osservabilità backend D73 | Sentry collegato e verificato, alert attivo/scattato, variabili Vercel pronte; quota Neon diagnosticata e worker sospeso su richiesta: [verbale](../design/2026-11-20-backend-observability/SENTRY_VERIFICATION.md) | [Ripristino gratuito preparato](../../services/checkout-api/restore-test-after-quota.md), nessun nuovo deploy. Dopo reset: ridurre/misurare egress, verificare API/worker, recapito alert, retention/privacy provider. Pilota indisponibile per quota rete |
| Demo per sessione D72 | Implementata; [riesame locale](../design/2026-11-05-session-demo/REVIEW.md). Non attestata una nuova prova online da questo allineamento | POC locale dietro accesso dedicato, sessioni verificate dal servizio, API reali interdette e pagamenti simulati |
| Layout operativo admin | Implementato; [requisiti e task completata](../design/2026-11-06-admin-operational-layout/TASKS.md) | Sidebar per sede e sezioni operative collegate; il completamento della task non sostituisce un verbale di verifica online |
| Ricerca e conferma indirizzo sede | Implementata; [requisiti](../design/2026-11-06-store-address/address-confirmation/REQUIREMENTS.md) e [task completata](../design/2026-11-06-store-address/TASKS.md) | Ricerca dal servizio, scelta esplicita e conferma vincolata alla sede; [test HTTP](../../services/checkout-api/src/store-address-http.test.ts). Configurazione provider e rilascio sono distinti dalla presenza del codice |

Gli incrementi condividono il servizio canonico e sono stati integrati dopo i rispettivi gate. I [riesami della sequenza](sequential-increments.md) registrano evidenze e limiti locali; lo stato dell’ambiente online è distinto.

Il [verbale online del 5 novembre 2026](../../services/checkout-api/online-client-verification.md) conserva versioni, ID ordine/pagamento/email, controlli superati e limiti residui. La prova usa tre sessioni nello stesso Chrome desktop. Il form configurazione già aperto può conservare una scorta obsoleta: ricaricarlo prima del salvataggio; protezione da scritture obsolete ancora da verificare/correggere.

## Capacità non coperte dagli incrementi correnti

Questa è una proposta di priorità da sottoporre all'utente, non una modifica automatica a D02 o al perimetro commerciale.

| Capacità | Base attuale / decisione | Proposta per la versione semplice |
|---|---|---|
| Abbonamenti cliente | UI demo; D26/D53 rinviate | Rinviare |
| Marketing automatico | Simulazioni senza invii reali | Rinviare; resta da confermare rispetto a D02 |
| Insight AI, BI avanzata, prezzi automatici | Presentazioni simulate; AI rinviata da D13/D14 | Rinviare |
| GPS e ottimizzazione percorsi | Mappa demo, nessun trasporto GPS | Esclusi dall'incremento D57 |
| Esportazioni analytics | Non incluse da D60 | Rinviare |
| POS, contabilità e piattaforme esterne | Placeholder/integrations demo | Rinviare |
| Fatturazione commerciale PizzaOS e self-service | Profilo e piani simulati | Rinviare |
| Feedback/recensioni | UI/contratto demo; regole da definire | Rinviare |
| Aggiunte a ordine inviato con pagamento del delta | D36 implementata nel flusso individuale dalla chat originaria, con test ed evidenze propri | Inclusa nel lavoro corrente; non è una capacità secondaria da riapprovare |
| Ricerca testuale indirizzo cliente | Il cliente usa un punto con coordinate confermate; la ricerca indirizzo sede è già implementata separatamente | Valutare dopo prova utente: non confondere geocodifica della sede e indirizzo di consegna |
| Workflow editoriale catalogo con versioni/rollback | Non incluso nel semplice salvataggio configurazioni | Rinviare |
| Landing → lead persistenti/CRM | Moduli dimostrativi; D15 rinvia modifiche commerciali | Rinviare |

## Prima di clienti e pagamenti reali

Privacy, obblighi operativi/fiscali, conservazione dati, backup/ripristino, monitoraggio e supporto non sono classificati come semplici abbellimenti. Le relative decisioni non risultano risolte da un test online con dati fittizi (D16/D31). Il loro completamento va pianificato prima dell'apertura reale.

Riferimenti: [decisioni](decisions.md), [inventario corrente](flow-inventory.md), [architettura del deploy pilota](architecture/pilot-deployment.md).

## Sequenza approvata successivamente

Le decisioni D61-D70 del 2026-11-05 autorizzano ordine individuale → gruppo → coupon/fedeltà → email operative, un incremento alla volta dopo verifica del precedente. Il [piano di coordinamento](sequential-increments.md) registra i gate; le precedenti proposte di rinvio di queste tre capacità sono superate. Le sole approvazioni non attestano l’implementazione: il completamento locale dei quattro incrementi è ora documentato nei rispettivi riesami e nella tabella sopra.
