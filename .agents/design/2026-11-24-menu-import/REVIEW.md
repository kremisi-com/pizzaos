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
