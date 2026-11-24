# Riesame SDD — allineamento brand, 2026-11-24

## Approvato e implementato
D81 autorizza il piano completo su admin/client, inclusi demo, accessi e rider. Il kit originale è conservato nel package brand, con rigenerazione deterministica delle data URL; 14 SVG e due icone browser confrontati byte per byte con la fonte. Palette canonica, azioni accessibili, token semantici, Poppins locale con licenza OFL e componente logo accessibile sono condivisi. I temi landing esistenti mantengono i loro valori pubblici.

Migrati 23 moduli CSS admin e 20 client, oltre ai grafici inline e alle primitive condivise. Nome e contenuti della sede, autenticazione, pagamenti e contratti operativi restano invariati. Corretti due difetti visuali emersi: barra demo sovrapposta alla shell e comando di riapertura sidebar nascosto dal contenuto. Le piccole icone operative vengono caricate immediatamente.

## Test-first indipendente
L'agente test ha ricevuto solamente REQUIREMENTS.md e CONTRACT_DESIGN.md delle tre attività. Prima dell'implementazione: 10 test falliti e 1 riuscito; suite ampliata a 14 casi. Il primo tentativo dalla root ha evidenziato la mancanza della risoluzione React nel test harness: aggiunti alias alle dipendenze workspace. La suite finale risiede in tests/ e importa solo gli entry pubblici per i contratti condivisi, senza import applicativi dal package UI.

## Verifiche locali
| Controllo | Esito |
|---|---|
| Lint/typecheck brand e UI | Riusciti |
| Lint/typecheck admin e client | Riusciti |
| Test admin | 115 test riusciti; dopo correzione toggle anche 19 test mirati shell/navigazione riusciti |
| Test client | 125 test riusciti |
| Contratti brand + test pacchetti brand/UI | 29 test riusciti, inclusi 14 di accettazione indipendenti |
| Build admin e client | Riuscite con directory isolate .next-brand-build |
| Browser brand + sessione demo | Prima esecuzione: 9 riusciti (3 brand + 6 sessione). Dopo correzioni visuali: 3 brand riusciti |
| Ordinazione persistente cliente → admin | 6 scenari riusciti; scenario sidebar/permessi aggiornato e poi riuscito separatamente |
| Test del controllore architetturale | 4 riusciti |
| git diff --check | Riuscito |

Il test sidebar precedente cercava pulsanti dove l'interfaccia corrente usa link; aggiornati tre selettori preservando le asserzioni di navigazione e autorizzazione. Il successivo controllo ha individuato il difetto reale del toggle compresso, corretto e verificato senza click forzati. Le asserzioni visuali verificano logo decodificato, Poppins effettivamente disponibile, icona browser, assenza di overflow orizzontale e logo sotto la barra demo. Le immagini lazy fuori schermo non vengono attese dal controllo di decodifica.

La revisione React ha verificato import pubblici, accessibilità del logo/focus, assenza di nuovi effetti o richieste applicative, nessuna duplicazione dei dati di dominio. Font e asset non richiedono external a runtime. Screenshot ispezionati in .codex/brand-alignment/: admin demo/operativo/accesso/ordini, client ordinazione/accesso/demo/carrello, login rider mobile. Le catture dev possono mostrare gli indicatori Next.js.

## Limite architetturale preesistente
pnpm architecture:check segnala nove import admin feature → composition/admin-toast. Il confronto puntuale con HEAD iniziale edaafbe8a4da179af77d2e279931d44df11b3c03 conferma tutte e nove le stesse violazioni già presenti. Nessuna nuova violazione introdotta; il comando globale resta rosso per quel debito precedente, non occultato o corretto fuori perimetro.

## Stato online e repository
Verifiche eseguite contro fixture di servizio isolata e app locali, senza attestare provider esterni o deploy di questa revisione. Le precedenti prove online restano riferite alle loro versioni. Commit/push sul branch client come previsto dalle istruzioni del repository; i quattro file next-env.d.ts/tsconfig.json delle app, già modificati all'inizio, sono esclusi. Gli artefatti di test restano ignorati in .codex/ e test-results/.
