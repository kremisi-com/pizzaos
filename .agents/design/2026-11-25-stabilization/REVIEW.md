# Riesame della stabilizzazione e punto zero

Data: 25 novembre 2026. Base isolata `9c27263610a01e57ef08e3bd5e1762a76c04aa0d`, ramo `codex/stabilizzazione-punto-zero`. Le modifiche non committate del checkout principale non sono state copiate o modificate. Nessun deploy, attivazione worker, scrittura su database/provider remoto o dato commerciale modificato.

## Correzioni

- La suite repository risolve gli alias `@/` in base all'app proprietaria del file importatore. I test proxy usano `NextRequest`, mantenendo le asserzioni su origine, header, stream, cookie, errori e correlazione. Lo scenario browser sidebar verifica lo stato «Menu pubblicato» nel ruolo `status` e il prodotto nell'anteprima corrente, invece di cercare un vecchio titolo: nessuna modifica all'interfaccia.
- Il calendario usa un clock esplicitamente congelato nelle prove. Il timer UI limita il ritardo al massimo del browser/Node: una finestra lontana non causa un ciclo ogni millisecondo; la chiusura effettiva aggiorna il selettore.
- Letture/salvataggi operatore espongono `configurationRevision`; confronto atomico nel servizio prima di ogni aggiornamento sede, versione assente/superata 409, malformata 400. La versione canonica resiste a normalizzazione JSONB e riavvio; cambi scorte/pubblicazione/configurazione la invalidano. Nessuna migrazione o nuovo contatore.
- Il merge admin usa la versione della rilettura e mantiene i campi indipendenti. Un conflitto conserva bozza ed errore senza retry automatico. I chiamanti e fixture interessati sono coerenti col contratto.

## Test indipendenti

Un agente test ha letto soltanto REQUIREMENTS e CONTRACT_DESIGN per la concorrenza. RED: 12 test, 11 falliti/1 passato. GREEN mirato: 12/12. Le prove coprono letture private/pubbliche, legacy, creazione duplicata, token mancanti/malformati/superati, concorrenza, rilettura, autorizzazioni, HTTP, ricostruzione/normalizzazione e consumo stock. Il repository della prova è serializzato e normalizza le chiavi; non viene presentato come PostgreSQL reale.

## Documentazione

[Punto zero corrente](../../product-definition/current-state.md), flussi accessi/sede/operazioni-rider/analytics consolidati, inventario e roadmap residuale. Pianificazione POC, ricerca iniziale, sequenza completata e ripristino Free sono nell'[archivio](../../archive/README.md), con link aggiornati. Gli SDD restano evidenze datate. Registro online e architettura distinguono ultimo stato registrato, cronologia e verifiche mancanti; corrette attesa reset Neon, worker, modalità email e configurazione client obsoleti.

## Verifica finale

| Controllo eseguito | Risultato |
|---|---|
| `pnpm test` | 139 file passati, 6 saltati; **1.242 test passati, 22 saltati**, nessun fallimento |
| `pnpm lint` | 11 task riuscite, zero warning ESLint |
| `pnpm typecheck` | 11 task riuscite |
| `pnpm architecture:check` | Confini e 4 test del checker passati |
| `pnpm build` | 11 task riuscite, incluse tre app Next e controllo servizio; warning Turbo sugli output dei workspace che non emettono file, non errori di build |
| `pnpm exec playwright test --config playwright.order-calendar.config.ts` | 2 scenari passati: calendario individuale/gruppo e conflitto fra rilettura/PUT, bozza mantenuta e salvataggio dopo reload |
| `pnpm exec playwright test --config playwright.individual.config.ts` | 6 scenari passati al primo giro; il settimo falliva su un selettore obsoleto del menu. Dopo la correzione, rieseguito solo lo scenario interessato con `--grep 'the live admin sidebar switches tools'`: passato |
| Documentazione locale | 548 collegamenti controllati senza destinazioni mancanti; 21 ancore della documentazione corrente risolte |

Le prove browser attraversano UI Next → proxy → servizio → repository isolato → risposta/UI. L'asserzione concorrente forza una scrittura fra GET di rilettura e PUT, osserva 409, dati canonici conservati e bozza ancora nel form. È poi verificato il salvataggio dopo reload. Nessuna sostituzione del servizio di produzione o accesso a dati remoti.

I 22 skip richiedono `PIZZAOS_TEST_DATABASE_URL` e PostgreSQL locale dedicato; non configurati in questo worktree. Il controllo Docker non ha fornito un engine disponibile ed è stato interrotto, senza avviare container o servizi. La stabilità JSONB è provata con normalizzazione delle chiavi nel repository indipendente, non dichiarata come una nuova prova PostgreSQL reale.

Riesame React: contratto fra componenti invariato salvo versione trasportata, nessun nuovo effetto di rete o retry automatico, timer con cleanup, bozza preservata e feedback italiano/accessibile. Nessuna modifica a nomi, titoli o contenuti delle sedi. I riferimenti generati da Next durante le prove vengono esclusi dal commit; i file del checkout principale restano intatti.

## Limiti

Nessuna nuova prova online. Il servizio e l'admin aggiornati richiedono un rilascio coordinato e una rilettura delle configurazioni; i deploy precedenti non includono queste correzioni. Produzione, backup/ripristino, alert/retention, misura Neon, dispositivi fisici e D16/D31 restano criteri aperti nella roadmap.
