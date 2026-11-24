# Recupero importazione menu — 24 novembre 2026

## Analisi prima delle scritture

Schema: `individual_ordering_state.snapshot` JSONB, mappe `stores` e `menuDrafts`. Magazzino: `stores[storeId].ingredients`; ricette di prodotti e scelte: mappe `ingredients` con ID di magazzino. Fonte: cinque screenshot forniti il 23 novembre nella chat «Allinea menu e UX al PoC», recuperati e riletti il 24 novembre; hash nel manifest. Il sito sorgente risponde 403 al fetch, quindi gli screenshot originali restano la fonte verificata. Il flusso precedente era compilazione dal pannello, senza importatore versionato.

Database identificato in lettura: progetto Neon `dawn-base-64314765`, branch test `br-tiny-art-baqa23dy`, database `pizzaos_test`, sede `verifica-online`. Il magazzino aveva un solo ingrediente tecnico, non corrispondente alla fonte. Due bozze hanno ricette testuali con mappe vuote; menu pubblicato tecnico separato.

Dry-run reale, senza scritture: **37 ingredienti nuovi**, nessuna corrispondenza esistente, **90 ricette aggiornabili**, 106 segnalazioni uniche fra dosi, scorte e composizioni assenti. Simulazione ripetuta: stato identico, zero ricette aggiornate. Non sono stati dedotti dati dalle disponibilità commerciali storiche.

## Ingredienti previsti

- Castagne al vapore
- Farina di castagne
- Pomodoro
- Mozzarella
- Datterini gialli
- Datterini rossi
- Mozzarella di Bufala D.O.P.
- Pesto di Pra’ senza aglio
- Speck croccante
- Gorgonzola D.O.P.
- Mozzarella di Bufala campana D.O.P. in cottura
- Olio EVO made in Puglia
- Tonno al naturale
- Cipolle fresche caramellate
- Mix di verdure fresche in base a disponibilità
- Funghi con porcini
- Brie
- Salsiccia fresca
- Aglio bianco
- Olio EVO all’aglio
- Origano pugliese BIO
- Würstel giganti del Trentino
- Patate fresche al forno in tripla cottura
- Salame piccante
- Olio EVO al peperoncino
- Acciughe pregiate del Mar Cantabrico
- Origano di Sicilia BIO
- Tris di formaggi in base a disponibilità
- Marmellata artigianale di Fico d’India
- Prosciutto cotto di Praga
- Carciofi gourmet con gambo
- Olive taggiasche
- Pane
- Nutella
- Farina integrale
- Mix di farine
- Origano

Le due varianti di datterini e le bufale della fonte restano distinte. La dicitura abbreviata Bufala DOP e Mozzarella di Bufala D.O.P. nella medesima ricetta usa un alias verificato. La bufala campana DOP in cottura resta distinta. Pesto di Pra’ senza aglio è un solo ingrediente. Origano generico, pugliese BIO e siciliano BIO restano distinti, come i tre oli della fonte. Würstel/Wurstel usa un alias ortografico; nessuna unione fuzzy.

## Dati da verificare

Tutte le 37 scorte nuove e le dosi non presenti nella fonte restano null. Nessuna unità fisica o equivalenza in grammi viene inventata: il dominio conserva unità intere astratte. Composizione di mix di verdure, tris di formaggi, mix di farine, impasti completi, dolci e varianti di bevande/box richiedono verifica. Pane e Nutella restano riferimenti distinti anche nel servizio a parte. Gli allergeni non sono inferiti.

## Verifica locale

I 13 test di riconciliazione sono stati scritti da un agente indipendente dai soli requisiti e contratto, senza leggere implementazione o disegno interno. La prima esecuzione è risultata verde perché l’implementazione era già disponibile: non si attesta un ciclo rosso prima dell’implementazione.

Test editor: selezione ingredienti dal magazzino, null senza default inventati, inserimento/rimozione e dose esplicita. Test HTTP: salvataggio null, blocco pubblicazione, conferma dosi/scorte e preventivo; scorta pubblicata ritornata sconosciuta. Gli altri risultati e l’esito del backfill saranno aggiunti dopo le rispettive esecuzioni.

Controlli locali: 557 test backend passati, 22 saltati per PostgreSQL locale non configurato; 110 test admin, 119 client e 19 dominio passati. Typecheck di servizio/admin/client e build TypeScript del servizio passati; lint servizio/admin passati. Artefatto runtime installato con npm ci: zero vulnerabilità segnalate. React: controlli null con input controllati, label associate, ID stabili e nessuna nuova dipendenza.

Il controllo architetturale globale segnala nove importazioni preesistenti di admin-toast dalla composizione verso feature admin, già presenti nel commit 5d0b642 e non modificate da questo intervento. La violazione è separata dalla riconciliazione.

## Applicazione e verifica online

Sorgente `6a872c55dad818ccbd6ace82d881c6c2795ccbb1`, verificato su `origin/client`. Rilascio backend `dpl_2AN5ZoTg79YDspBequ64zV1awT9p`, admin/rider `dpl_GSVH4gQFfKGJpkBvaVUoSTC1ZVK6`, progetti esistenti del team Kremisi sul piano Hobby. Entrambi Ready e promossi agli alias del pilota. Build admin completata con compilazione, lint e verifica tipi. Health API 200. Worker trovato e lasciato stopped con zero istanze ready; nessun ordine operativo eseguito per questo backfill. L'ambiente Vercel Production serve il pilota con database test, non il database di produzione commerciale.

Il comando `import-menu.ts` è stato eseguito prima in dry-run, poi con `--apply` sul branch/database test identificato sopra. Creati 37 ingredienti con stock null, aggiornate 90 ricette nelle due bozze, revisione workspace 3 → 4. Magazzino totale: 38 record, tutti con nome normalizzato e ID distinti. L'ingrediente tecnico precedente mantiene stock 6. I 296 riferimenti delle ricette presenti risolvono tutti nel magazzino, nessun riferimento orfano.

Seconda applicazione: zero creazioni, 37 ingredienti riconosciuti, zero ricette aggiornate. Ulteriore reimportazione transazionale della bozza impasto/pizza, rigenerando ID di menu, prodotti e scelte nell'export e lasciando vuote le mappe delle ricette: identità e riferimenti precedenti recuperati, stato interamente identico. Entrambe le operazioni mantengono revisione 4 e snapshot_version `92c8103c-14c0-4af1-8e19-e1644e8587b5`, quindi nessuna riscrittura effettiva.

Le impronte JSONB di tutti i dati esterni a stores/menuDrafts e dell'altra sede coincidono prima e dopo il backfill: ordini, riserve, membership, pagamenti, email e dati operativi non sono stati alterati. Il menu pubblicato tecnico non è stato sostituito. Gli screenshot storici non diventano giacenze attuali.

Dal browser autenticato, dopo ricaricamento del deploy, verificati: 38 ingredienti con 38 ID distinti nel selettore della ricetta base; sei riferimenti della ricetta signature, compresi datterini gialli/rossi separati e pesto di Pra’ senza aglio come unico ingrediente; descrizione promozionale distinta dalla ricetta strutturata; sei campi dose vuoti Da verificare. Il Magazzino mostra 37 scorte vuote Da verificare e la sola scorta tecnica confermata 6. Nessun salvataggio di valori fittizi per collaudare il pannello.

Restano le verifiche del gestore elencate sopra: dosi, unità operative coerenti, giacenze reali, allergeni e composizioni non specificate dalla fonte. La bozza non è stata pubblicata.
