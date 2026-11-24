# Backend pilota online

Stato verificato il 23 novembre 2026: ambiente **test** nuovamente raggiungibile dopo l'upgrade Neon. Il [collaudo del 23 novembre](#ripristino-e-collaudo-del-23-novembre-2026) conferma il percorso cliente → admin → rider. Client e admin offrono `/poc` con accesso manuale e [accesso automatico dalla landing](#accesso-dalla-landing-del-23-novembre-2026). Rider appartiene ad admin. `pizzaos-api` è il servizio condiviso per identità, permessi, ordini, pagamenti e persistenza.

## Salvataggio menu al blur del 24 novembre 2026

- Correzione admin `63baf1e`: campi testuali e numerici salvati alla perdita del focus, toast dopo risposta positiva, azioni immediate e richieste sequenziali. Admin/rider `dpl_CqAbxzGw18CYtn2bw8CmrKGZire1` Ready sugli alias operativi.
- Il backend online era ancora `6a872c5`: la validazione dell�intestazione rifiutava `pizzaCatalog`, causando lo stesso errore generico sia aggiungendo un impasto sia rinominandolo. Pubblicato il servizio dal sorgente `63baf1e`, deployment `dpl_Bxad278mEfoBnjYGtKmsQva1HzAT`, Ready su `api.pizzaos.app`; health HTTP 200. Worker verificato stopped, zero istanze totali/pronte. Nessuna pubblicazione del menu cliente.
- Verifiche locali: 129 test admin, lint, typecheck e build; 611 test servizio passati e 22 test PostgreSQL saltati in assenza dei database di test, typecheck/build servizio e controllo architettura passati. La suite autosave verifica nessuna richiesta durante la digitazione, toast dopo salvataggio al blur, aggiunta di impasti/basi/formati e gestione degli errori.
- Evidenza online: pagina autenticata riletta dopo i deploy con stato **Bozza salvata** e senza errore. La bozza risultava nel frattempo modificata dall�operatore; non sono state aggiunte scritture di prova concorrenti. Il comportamento dettagliato del blur e del toast � verificato localmente, non con una nuova modifica browser online.

## Importazione menu e magazzino del 24 novembre 2026

- Sorgente `6a872c5`: backend `dpl_2AN5ZoTg79YDspBequ64zV1awT9p` e admin/rider `dpl_GSVH4gQFfKGJpkBvaVUoSTC1ZVK6` compilati, Ready e promossi al pilota. Health API 200. Worker lasciato stopped, zero istanze ready. Il client mantiene il proprio deploy esistente.
- Analisi e backfill sul solo `pizzaos_test`, branch `br-tiny-art-baqa23dy`: 37 ingredienti creati senza inventare dosi/giacenze, 90 ricette collegate nelle due bozze. Pubblicato e dati operativi conservati. Ripetizione e reimportazione con ID rigenerati senza modifiche allo snapshot.
- Verificati online selettore completo con 38 ID distinti, sei riferimenti della ricetta signature, nuove descrizioni e campi Da verificare. Dosi, giacenze, allergeni e composizioni incomplete richiedono verifica del gestore prima della pubblicazione. [Analisi, ingredienti ed evidenze](../../.agents/design/2026-11-24-menu-import/REVIEW.md).

## Menu operativo del 23 novembre 2026

- D79 pubblicata sul pilota test dal sorgente `d29be4d`. Backend `dpl_8tUisMi9HQ8MB1zRgADkWb8z5vhP`, admin/rider `dpl_CUUsUrQHLbGBdSCJzmcvi5f15cL1`, client `dpl_94LPMRvFEQro4UkUZUBiMtLieVUQ`. Sul database `pizzaos_test` il ruolo proprietario ha creato `ordering_menu_images` e assegnato SELECT e INSERT al ruolo applicativo esistente.
- Verificati health del nuovo backend e accesso alle app. Dal pannello autenticato è stata compilata e riletta la bozza della sede pilota con cinque sezioni e quattordici voci. Sul sottodominio pubblico il catalogo continua a servire il menu precedente. La validazione da parte del gestore precede la pubblicazione della bozza.
- I totali e la conferma end-to-end di un ordine configurato sono stati provati nel fixture browser locale. [Verifiche](../../.agents/design/2026-11-23-menu-ordering/REVIEW.md).

## Apertura delle email operative del pilota del 23 novembre 2026

- Su richiesta dell'utente, `OPERATIONAL_EMAIL_MODE=test_open` è attivo solo sul pilota. Le email operative seguono l'indirizzo dell'account che effettua l'ordine. Per ripristinare la lista di prova, impostare `OPERATIONAL_EMAIL_MODE=test` e ripubblicare API e worker.
- Backend da `a612d89`, deployment `dpl_9UgPUXaVmpjgnXi75QdRTdHdULYM` Ready su `api.pizzaos.app`. Worker `reconciliation` con una istanza pronta e attiva in `fra1`. Health, sessione anonima e provider di accesso del client rispondono 200. L'accesso via email è disponibile.
- Verifica locale: test di un ordine al ritiro con destinatario fuori lista, recupero della ricevuta bloccata e invio di accettazione e «Ordine pronto». Suite backend con 525 test passati e 22 PostgreSQL saltati, typecheck, build e lint passati.
- Prima del rilascio la coda del pilota non conteneva invii in sospeso. La verifica online del rilascio ha coperto configurazione e disponibilità del servizio. Il recapito a un nuovo destinatario resta da verificare con un ordine del pilota.

## Ricerca della sede con Geoapify del 23 novembre 2026

- D78 pubblicata nel pilota test dal commit `88be963`. Backend `dpl_8kqhZrtpHL4wpF2585BmxgsxUz4H` e admin/rider `dpl_DVMHmpwXwR4YPKczWBqpgw44btxW` sono Ready sui domini canonici. Il servizio riusa la variabile Secret `GEOAPIFY_API_KEY`; il worker resta pronto in una sola istanza `fra1`.
- La geocodifica con la chiave di test ha restituito Via della Tessitura 30 a Cavaria con Premezzo. I test browser locali hanno verificato scelta, salvataggio e rilettura con il servizio di test. La prova online ha verificato health e sessione anonima (200), rifiuto della ricerca sede senza sessione (401) e restituzione del civico dall'API pubblica dei suggerimenti di consegna (200).
- Il collaudo del salvataggio online richiede la conferma dell'indirizzo dal Profilo di un operatore.

## Sottodomini delle sedi del 23 novembre 2026

- Pilota test D76 pubblicato nel team `kremisis-projects` dal sorgente `2e40052` con le modifiche dei sottodomini. Backend `dpl_7rA21YdUcULUvEacmVsjDHXaBtzu`, client `dpl_GXuFnzn9839udrFjm3JrGKVdcPTc`, admin/rider `dpl_CpW3xWZMiCYD386efzeEbkdRRe8j`. L'autocompletamento indirizzi D77 segue il proprio rilascio.
- Il wildcard `*.pizzaos.app` è verificato sul progetto `pizzaos-client`. `lapizzaspeciale.pizzaos.app` risponde in HTTPS con la pagina di sito non configurato e il servizio risponde 404 alla ricerca della sede. `client.pizzaos.app` e `bella-napoli.pizzaos.app` restituiscono la lista pilota.
- Health API 200, accesso diretto senza credenziale 403, sessione anonima via proxy client 200. Worker `reconciliation` pronto, una istanza in `fra1`. Il primo deploy backend era privo del pacchetto workspace `@pizzaos/domain` e ha restituito 500. Dopo il ripristino del deploy precedente, il bundle corretto è stato caricato fuori dal monorepo con Node 24 e pubblicato.
- Assegnazione dal superadmin, menu della sede e gruppo sono stati provati localmente. Nessuna nuova sede è stata salvata nel pilota per il collaudo. Il login Google sul nuovo tipo di host ha una prova locale della callback con provider simulato.

## Risorse attive

- Landing: [www.pizzaos.app](https://www.pizzaos.app/), progetto `pizzaos-landing` (`prj_yyR1GmNDbfdtbR6ssqOgqUB15Te8`), deployment `dpl_4QWPXgyvGo32WkGRfgPoHspspMHr`.
- Frontend operativo: [admin.pizzaos.app](https://admin.pizzaos.app) e [rider.pizzaos.app](https://rider.pizzaos.app), progetto Vercel `pizzaos-admin` (`prj_KzbNoKFKlPO2c8VhzHi5pfDCxDuO`), deployment `dpl_DVMHmpwXwR4YPKczWBqpgw44btxW`.
- Client: [client.pizzaos.app](https://client.pizzaos.app), progetto `pizzaos-client` (`prj_0qkFSagSHGAOMNrtRIRdRlQb1GmE`), deployment `dpl_GXuFnzn9839udrFjm3JrGKVdcPTc` con wildcard `*.pizzaos.app`, collegato allo stesso backend test.
- Backend: [api.pizzaos.app](https://api.pizzaos.app/health), progetto `pizzaos-api` (`prj_01XINfSPgNT78cwfwq34z62SyDbg`), deployment `dpl_9UgPUXaVmpjgnXi75QdRTdHdULYM`. API Node 24 e daemon `reconciliation` separati. Il daemon da 1 GiB è pronto con una istanza in `fra1`.
- Team Vercel `kremisis-projects`, piano Hobby. Il nome dell'ambiente Vercel Production identifica gli alias pubblici del pilota, con `PIZZAOS_ENVIRONMENT=test`, database test e chiavi Stripe test. L'organizzazione Neon è passata a Launch il 23 novembre.
- Il backend usa `test_open` per le email operative. La configurazione Secret conserva la lista dei destinatari per la modalità `test`. Client e admin usano il backend HTTPS e il relativo segreto proxy server-only; le origini canoniche di admin/rider sono configurate nello stesso progetto. Landing e backend condividono la chiave Secret dei pass demo. Nessun segreto nei sorgenti o nel pacchetto caricato.
- Neon, account Andrea: progetto `pizzaos` (`dawn-base-64314765`), PostgreSQL 17, `aws-eu-central-1`. Branch test `br-tiny-art-baqa23dy`, database `pizzaos_test`, migrazione idempotente. Ruolo `pizzaos_test_app` con lettura/scrittura, senza superuser o CREATE nello schema pubblico.
- Produzione isolata: branch `br-sweet-recipe-baucjxbe`, database `pizzaos_production`, vuoto e non migrato. Nessuna credenziale applicativa di produzione pubblicata. La copia iniziale di questo database nel branch test è inutilizzata.

## Autenticazione e provider

Google OAuth usa l'account scelto dall'utente e il progetto `pizzaos-pilota-2026`, client `PizzaOS Pilota Web`, pubblico esterno in modalità test, con i due superadmin come utenti di prova. Callback esatte: ciascuna origine admin/rider/client + `/api/pilot/auth/callback/google`. Gli scope sono soltanto openid, profilo ed email. Entrambe le email comunicate sono configurate come superadmin; l'accesso rider richiede comunque l'abilitazione nella sede.

Resend è sul piano gratuito verificato nel pannello ($0/mese, 3.000 email transazionali), con `pizzaos.app` verificato in Irlanda e mittente `PizzaOS <accesso@pizzaos.app>`. La chiave dedicata permette soltanto invio da questo dominio. SMTP TLS 465 autenticato. Aggiunti TXT `resend._domainkey` e CNAME `rsend`/`send` richiesti dal provider; nessuna modifica ai nameserver o alla posta in ingresso. Termini e creazione delle credenziali approvati esplicitamente dall'utente. Inviato un solo magic link di prova a `andrea.napolitano@kremisi.com`, con autorizzazione specifica: Resend conferma **Delivered**, email `01a1ab8d-b2df-7c62-9264-aadef5e46e14`. Il link non è stato consumato durante quella verifica. Nella successiva prova cliente, autorizzata dall'utente, le email operative sono rimaste in modalità test con allowlist limitata all'account di prova `napolitanoandrea00@gmail.com`: ricevuta, accettazione e avvio consegna del nuovo ordine risultano Delivered. ID ed evidenze nel [verbale client](online-client-verification.md); le altre destinazioni restano bloccate.

Stripe usa la sandbox dell'utente. Webhook `we_1UYORKAPiFV6wt8hBrXIYBh6` su `https://api.pizzaos.app/v1/stripe/webhook`, per stati PaymentIntent e rimborsi; segreto protetto su Vercel. Le chiavi Stripe esistenti non sono state create o ruotate.

## Verifiche online iniziali (prima del rilascio client)

- HTTPS e health del backend; API senza segreto proxy rifiutate; sessione e provider corretti per entrambi gli host; callback OAuth sul proprio dominio.
- Google reale su admin e rider, due sessioni Auth.js persistenti e distinte. Rider inizialmente anonimo dopo il login admin; autenticato ma non abilitato prima della relativa appartenenza; autorizzato dopo l'abilitazione attraverso il pannello admin.
- Cookie Secure/HttpOnly senza Domain, risposte auth no-store, mutazioni da origine diversa negate. Percorsi dell'altra area ricondotti alla home locale, API amministrative e demo vietate sull'host rider. DTO rider senza email cliente o dettagli Stripe.
- Sede fittizia `verifica-online`: ordine contanti `d19533cd-1e58-4154-85e2-48b420152021`, retry idempotente sullo stesso ordine, accettazione/preparazione/pronto nel pannello admin, assegnazione, avvio e completamento nel pannello rider. Esito `completed/cash_paid`; scorta da 10 a 9.
- Ordine carta `b8d18990-f4e1-4b93-8773-3e5b91dd20ec`: pagamento sandbox da 100 centesimi EUR confermato con Visa di test tramite API Stripe, rilevato automaticamente; evento Stripe con zero consegne webhook pendenti. Annullamento e rimborso reale in sandbox da 100 centesimi riuscito: `cancelled/refunded`. Nessun addebito live. La prova non copre Stripe Elements/3DS nel browser cliente.
- Firma webhook valida accettata, payload alterato rifiutato. Riconciliazione eseguita anche senza le viste ordini aperte.
- Worker arrestato e riavviato: nuova istanza Alive a `fra1`, stessi ordini, incasso, rimborso e stock dopo il riavvio. Nessuna identità o sessione sintetica creata in SQL: le prove HTTP autenticate hanno usato le sessioni prodotte dai login Google reali.
- Corretto il collegamento «Area rider» del pannello consegne: usa l'origine rider fornita dalle pagine server; fallback locale `/rider`.
- Corretta la conferma «Controlla la tua email» per i metadati email aggiunti da Auth.js all'URL di verifica; regressioni per flag locale, metadati standard e URL combinato. La stessa correzione è presente e verificata nei sorgenti client, senza pubblicare quel frontend.
- Sede di prova lasciata **chiusa ai nuovi ordini**. I due ordini fittizi restano consultabili nel database test; nessun dato commerciale di produzione.

Verifiche repository: 425 test backend inclusi PostgreSQL reale e SMTP locale, 97 test admin e 116 test client; TypeScript/lint/build delle app e controllo architettura superati. Artefatto backend Node 24 installabile con npm ci, audit senza vulnerabilità note. Evidenze locali e riepilogo senza segreti in `.codex/evidence/`.

## Verifica successiva con il client pubblicato

Il [verbale del 5 novembre](online-client-verification.md) documenta il percorso completo dal browser cliente con login Google reale, ordine `30d3f817-4f14-44fb-82ac-d0b67a67530d` da 1,00 €, Stripe Elements e challenge 3DS autenticata, accettazione/preparazione admin, assegnazione/partenza/completamento rider e tre email operative Delivered. Stato finale `completed/paid`, scorta 9 → 8 e punti 1 → 2; sede richiusa. Client lint/typecheck, 116 test e build rieseguiti con successo. Restano prova da dispositivi fisici distinti e gli altri scenari online elencati nel verbale, incluso il limite delle bozze di configurazione obsolete.

## Ripristino e collaudo del 23 novembre 2026

- Connessione diretta a `pizzaos_test` su Neon verificata. La migrazione additiva dello snapshot è stata applicata sul branch test con il ruolo proprietario. Il ruolo applicativo ha letto la versione dopo la migrazione e il trigger risulta abilitato. Typecheck e build superati. Riesecuzione locale del backend con 477 test passati e 22 saltati per indisponibilità del PostgreSQL locale. Le prove PostgreSQL del 20 novembre restano documentate nel [benchmark](../../.agents/design/2026-11-20-snapshot-traffic/REVIEW.md).
- Artefatto API/worker ricostruito da `24d2360` e pubblicato su `api.pizzaos.app` come `dpl_FCG6eQss3GTSH1HwR6d4GQ8xJZqG`. Deploy Ready, build 36 secondi. Health, sessione anonima, sedi e catalogo rispondono 200. La chiamata diretta senza credenziale proxy risponde 403, con `x-request-id` coerente con il payload. Il proxy client usato in quel collaudo non esponeva lo stesso header.
- Il worker del nuovo deploy è stato verificato con una sola istanza Ready in `fra1`. Con le tre sessioni esistenti nel browser desktop, la sede fittizia è stata aperta per una fascia con capacità 1. L'ordine `8948014a-c682-480a-9c10-ba66f77e89a1` da 1,00 € è stato accettato, preparato, assegnato e completato dalla vista rider. Client dopo ricarica e admin hanno mostrato il completamento. Stripe ha confermato `livemode=false`, `succeeded` e challenge 3DS autenticata sul PaymentIntent `pi_3UetvgAPiFV6wt8h34TQaUqA`.
- Ricevuta, accettazione e avvio consegna risultano inviati al primo tentativo nel servizio e ricevuti nella casella Gmail di prova. La sede fittizia è stata richiusa e il worker riportato a `fra1=0`, con zero istanze desiderate, pronte o presenti.
- Durante gli ultimi 152 secondi con worker attivo, `updated_at` dello snapshot è rimasto invariato. La pagina del piano Launch mostrava 0,00 USD e le metriche di consumo erano ancora a zero con ritardo dichiarato fino a un'ora. Resta la misura del traffico fatturabile Neon con finestre comparabili. Nei log Vercel sono comparsi avvisi SSL di node-postgres su stderr e due timeout di `/v1/pilot/stream` al limite di 300 secondi. La prova ha usato un unico dispositivo fisico. Recapito dell'alert tecnico e retention del provider richiedono ancora una verifica dedicata.

## Ingressi POC del 23 novembre 2026

Configurata una password demo Secret sul backend dell'ambiente test. Pubblicati i tre artefatti dagli aggiornamenti locali su `24d2360`. Su [client](https://client.pizzaos.app/poc) e [admin](https://admin.pizzaos.app/poc) sono stati verificati online form, password errata, sessione valida, rendering della demo e rifiuto 403 delle API operative con quella sessione. Su rider, `/poc` restituisce 404 e l'ingresso ordinario 200.

Il client ordinario mostra la copertina del POC e le azioni verso menu e gruppo. Catalogo e health rispondono 200. Il proxy client inoltra ora `x-request-id` nella lettura del catalogo e i due proxy lo inoltrano nel rifiuto demo verificato. Per le schermate e i servizi ancora da collegare vedere [accesso POC e interfaccia operativa](../../.agents/product-definition/flows/poc-and-interface.md).

Verifiche locali: 6 scenari browser demo e 6 scenari browser ordinazione individuale/gruppo passati, 116 test client, 97 admin, 478 servizio con 22 skip PostgreSQL locale. Lint, typecheck, build e confini architetturali verificati. Le prove online di questo rilascio coprono accesso, isolamento e letture pubbliche.

## Accesso dalla landing del 23 novembre 2026

I form demo e prova gratuita mostrano dopo l'invio due pulsanti verso `https://client.pizzaos.app/poc` e `https://admin.pizzaos.app/poc`. Ogni pulsante invia un pass firmato per la sua destinazione tramite POST. Il backend accetta l'origine canonica `https://www.pizzaos.app`; il pass scade dopo dieci minuti. Vercel conserva la chiave di firma come Secret su landing e API.

Playwright ha verificato l'invio con il servizio email simulato e l'apertura di entrambi i POC da browser. Online sono stati verificati i link canonici, il rifiuto di un form incompleto e i POST con pass firmati sulle due destinazioni. Entrambe mostrano la demo, rifiutano l'accesso alle API operative e respingono pass invalidi, scaduti o per l'altro dominio. Su rider `/poc` risponde 404 e il POST è rifiutato. La verifica online non ha inviato email.

## Limiti e gestione successiva

### Ispezione del 20 novembre 2026

Prima di qualsiasi deploy dell'osservabilità, `/health` ha risposto HTTP 500 con `FUNCTION_INVOCATION_FAILED`. Dopo il login corretto, i log del deployment `dpl_74ZKgDk81HKFv7oUtnggxiTdiWQP` hanno mostrato PostgreSQL 53000: quota superata. Neon conferma 5.533.768.020 byte di egress nel periodo novembre, oltre i 5 GB Free, ed endpoint test sospeso dal 9 novembre. Il nuovo periodo inizia il 1 dicembre alle 01:00 italiane. Le prove del 5 novembre sopra restano evidenze per quella versione/data e non attestano disponibilità corrente.

L'utente ha scelto di restare sul gratuito: worker `reconciliation` sospeso con override fra1=0, verificati desired/total/ready=0. Nessun nuovo deploy. Sul progetto corretto sono predisposti SENTRY_DSN Secret, PIZZAOS_RELEASE/NODE_OPTIONS Config e Node24.x; nessuna altra credenziale modificata. Sentry è collegato, alert dedicato attivo e prova risolta; il vero errore quota è registrato in PIZZAOS-BACKEND-2. [Verbale Sentry](../../.agents/design/2026-11-20-backend-observability/SENTRY_VERIFICATION.md), [pacchetto e procedura di ripristino](restore-test-after-quota.md). Il reset e la riduzione/verifica del traffico sono precondizioni del ripristino; nessun upgrade o riavvio automatico eseguito.

### Limiti registrati nel pilota del 5 novembre

La quota gratuita Daemon Hobby è condivisa dal team: 420 GB-ore di memoria al mese permettono al massimo 17,5 giorni a 1 GiB; la quota CPU o altri Daemon possono ridurre tale durata. Al raggiungimento del limite Vercel arresta i Daemon. Non è un servizio continuo mensile illimitato. [Limiti ufficiali](https://vercel.com/docs/daemons/limits).

Anche Neon Free ha una quota: 100 CU-ore mensili per progetto. Con il compute fissato a 0,25 CU e il worker che interroga il database ogni 5 secondi, equivale a circa 400 ore (16,7 giorni) di database attivo, prima di altri utilizzi. La durata effettiva del pilota gratuito dipende quindi da entrambe le quote, senza upgrade automatici. [Piano Neon](https://neon.com/pricing).

Il plugin Vercel collegato a Development Kremisi legge il progetto backend, ma la scrittura delle sue variabili risponde ancora Project not found: allowlist email e redeploy backend sono stati applicati dal pannello. Admin/rider e il successivo client sono stati pubblicati tramite il plugin esistente. La landing non è stata aggiornata. Le callback dei tre host applicativi sono configurate; il login Google del client è ora verificato.

L'attivazione commerciale con database, utenti e pagamenti live richiede un rilascio distinto; restano le decisioni D16/D31 del progetto.
