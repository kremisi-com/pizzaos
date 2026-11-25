# @pizzaos/checkout-api

## Responsibility

Owns durable individual ordering for the pilot: Auth.js identity, store configuration and operator invitations, authoritative catalog/prices/recipes, delivery bands, slot and inventory reservations, checkout, Stripe payments/refunds, restaurant acceptance and fulfillment, and resumable events. Client and admin call versioned HTTP contracts; neither accesses this implementation or its database.

## Public HTTP surface

Public domain shapes are `Individual*` and `IndividualApi` from `@pizzaos/domain`. Through the same-origin app proxy `/api/pilot`, service routes are:

- `GET /v1/pilot/session`, `/stores`, `/stores/:id`: session and store/catalog discovery. The catalog includes the open windows and their remaining capacity. The weekly template and protected dates are visible to store operators.
- `POST /v1/pilot/quote`: `{cart}` produces an authoritative EUR quote/fingerprint; optional `cart.benefits` selects coupon codes and one reward, with authenticated identity from the session. No browser totals or customer IDs accepted.
- `/v1/pilot/stores/:id/promotions`, `/promotions/program`, `/promotions/coupons`, `/loyalty`: persistent operator configuration and own customer wallet; see [`src/promotions/README.md`](src/promotions/README.md).
- `GET /v1/pilot/stores/:id/emails`: stato completo degli aggiornamenti email all'acquirente, riservato a operatori della sede e superadmin; dettagli in [`src/operational-emails/README.md`](src/operational-emails/README.md).
- `POST /v1/pilot/checkouts`: authenticated individual checkout with cart, fingerprint, phone, method and idempotencyKey.
- `/v1/pilot/groups`: raccolte persistenti con invito e capability personali HttpOnly; chiusura per scadenza o organizzatore, preventivo e checkout canonico unico. Il contratto pubblico è `GroupOrderingApi`; dettagli e recupero dei tentativi incerti in [`src/group/README.md`](src/group/README.md).
- `GET /v1/pilot/orders?storeId=`: own customer history; store parameter requires current membership or superadmin.
- `POST /v1/pilot/orders/:id/reconcile`: recover payment and additional-payment state.
- `POST /v1/pilot/orders/:id/actions`: accept, wait_for_customer, cancel, prepare, ready, dispatch, complete, retry_refund.
- `PATCH /v1/pilot/orders/:id/notes`: customer notes before preparation.
- `POST /v1/pilot/orders/:id/additions/quote`: quote customer-added lines before acceptance.
- `POST /v1/pilot/orders/:id/additions`: confirm an increase, settled separately with the original method; no original line removal/repricing.
- `POST /v1/pilot/stores/:id/address-search`: an assigned operator or superadmin searches for the store address. Returns formatted choices with short-lived confirmations bound to the actor, store, and previous position. A new store ID requires superadmin access.
- `POST /v1/pilot/stores/:id/delivery-address-search` accepts guest and signed-in requests with `{query}` and returns delivery street or address suggestions ranked near the storefront. Only the address results contain a delivery point.
- `PUT /v1/pilot/stores/:id`: superadmin creates, assigned operator/superadmin updates configuration. Existing stores require the opaque `configurationRevision` returned by an operator read; missing/stale versions return 409 `revision_conflict`, malformed versions 400. Comparison and write share one transaction, including protection from stale stock after order completion. Creation needs no version. An optional `addressConfirmation` applies the confirmed address and coordinates together. To change the weekly order schedule, send its current revision. Omission preserves the saved schedule.
- `POST /v1/pilot/stores/:id/invitations`: superadmin authorizes an email for a store; the operator signs in via Google/magic link. Invitations are access grants; automatic invitation emails are outside this increment.
- `GET /v1/pilot/events?cursor=&storeId=` and `/stream`: matching JSON/SSE event envelopes, filtered by customer/store authorization.
- `GET /v1/pilot/ordering-site`: resolves the assigned storefront for the authenticated proxy origin. Storefront API access is limited to its store and the customer surface. `PUT /v1/pilot/stores/:id` accepts the optional, unique and immutable `orderingSubdomain` assigned by a superadmin.
- `/api/pilot/auth/*`: Auth.js endpoints proxied by both apps; Google and Nodemailer magic link, PostgreSQL sessions.
- `POST /v1/stripe/webhook`: direct Stripe endpoint, verifies signature on original bytes then reconciles provider state.
- `GET /health`: service liveness.

Errors: `{code,message,requestId}`, with 400 invalid input, 401 login required, 403 denied, 404 missing, 409 conflict, 413 oversized body, 415 unsupported media type, 500 `internal_error` and 503 `service_unavailable` for transient dependency failure. Every response carries a service-generated UUID in `x-request-id`; app proxies preserve it. Public POC `/v1/checkouts*` routes that trusted browser totals/identity are removed; the previous demo client does not use them.

## Errori e osservabilità

Il 23 novembre il pilota è tornato operativo dopo l'upgrade Neon a Launch. La migrazione dello snapshot e il nuovo backend sono pubblicati sul test. Il worker è stato attivato per il collaudo completo e riportato a zero istanze. [Stato e riscontri online](online-deployment.md#ripristino-e-collaudo-del-23-novembre-2026).

`diagnostics.ts` possiede classificazione, log JSON Pino, contesto asincrono e deduplica limitata a 1000 chiavi/processo (finestra 60 secondi, conteggio delle ripetizioni soppresse). API, Auth.js, PostgreSQL, pagamenti, email e worker condividono l'istanza runtime. I log usano solo campi ammessi, tipi/codici e frame file/riga/colonna; body, query, header, contatti e messaggi grezzi delle eccezioni sono esclusi anche dai logger derivati. Fastify usa `LogController` dalla versione minima dichiarata, senza log automatici duplicati.

`LOG_LEVEL` controlla i log (default `info`); `PIZZAOS_RELEASE` usa come fallback `VERCEL_GIT_COMMIT_SHA`, poi `local`. `SENTRY_DSN` abilita facoltativamente il reporter: assente significa nessun invio esterno. SDK Sentry 11 con raccolte automatiche disabilitate, eventi manuali sanitizzati e filtro finale; errori previsti 4xx esclusi. Flush SDK limitato a 1500ms, protezione esterna a 2000ms; la funzione HTTP attende completamento/chiusura e tenta flush. Il processo persistente drena i worker allo stop, con deadline 45s; un errore fatale viene registrato e termina il processo. L'admin conserva gli stati operativi canonici, senza pannello di stack trace.

Firma webhook Stripe non valida dà 400; guasto successivo dà 500/503. I retry e le riserve restano autorevoli. I bundle includono source map inline senza contenuto sorgente; `NODE_OPTIONS=--enable-source-maps` risolve i frame HTTP e il Dockerfile worker abilita già l'opzione. [Configurazione e prova Sentry](observability.md); [flusso corrente F23/F24](../../.agents/product-definition/flows/backend-observability.md). Il progetto Sentry è stato collegato il 20 novembre 2026 con un errore ricevuto dall'ingresso HTTP locale; rilascio/configurazione Vercel, alert e retention restano distinti da questa prova.

## Order and payment behavior

Card is collected only by Stripe Elements. The service creates a PaymentIntent for server-calculated cents, browser confirms via Stripe.js including 3DS, and service/provider reconciliation establishes payment outcome. No raw card fields or client secret enter persistence/logs/domain entities; clientSecret is transient checkout output only.

Orders wait for acceptance after cash submission or successful card payment. Deadline from submission: requested time within 30 minutes or ASAP = 5 minutes; within 90 minutes = 10; later = 15. Expiry cancels and requests card refund. Waiting for customer on unavailable items suspends deadline and keeps resources reserved indefinitely; operator must resolve it. Only customer changes notes; before acceptance customer can add products with explicit delta confirmation/payment, never reduce prices. Every paid delta has its own durable refund ledger.

A pending/uncertain payment blocks duplicate checkout. Provider idempotency keys survive network loss/restart. Reservation expiry first reconciles/cancels with the provider, then releases only on definitive outcome. `refund_pending`, `refund_failed`, and `refunded` remain distinct from cancelled order. Failed refunds are visible/retryable. Worker runs every 5 seconds even with no browsers connected; SSE does not advance orders locally.

## Persistence and scaling

### Catalogo pizza e conversione delle bozze

Il catalogo pizza mantiene entità esplicite per impasti, formati, topping, gusti e formule nello snapshot PostgreSQL esistente. Con `inventoryMode="dough-format"`, ogni impasto associa una voce di Magazzino e ogni formato indica la quantità da scalare da quella voce. La base è un ingrediente ordinario. Gli snapshot precedenti restano leggibili; la bozza convertita dall'Admin conserva gli ingredienti della base standard. Salvataggio e pubblicazione rigenerano prezzi, ricette e gruppi dalla sorgente; i prodotti derivati ricevuti dal browser non sono autorevoli. Le formule mantengono la propria identità e gli eventuali ingredienti inclusi trasferiti. La pubblicazione richiede associazioni, quantità intere positive e scorte verificate. Il catalogo cliente omette sorgente e dosi, incluso `doughQuantity`. Quantità del formato, ingredienti ed extra si riservano insieme e vengono scaricati al completamento. Ordini e snapshot storici restano invariati. Test: `src/dough-stock.test.ts`.

`pnpm --filter @pizzaos/checkout-api menu:migrate-pizza manifest.json` esegue l'anteprima senza scritture. Aggiungere `--apply` per salvare soltanto la bozza risultante in una transazione; non pubblica il menu. La funzione pura `planPizzaMenuMigration` permette la stessa verifica su uno snapshot isolato.

Il manifest contiene `storeId`, `draftId`, `name`, `pizzaCatalog` e `replacements: [{productId, pizzaIds}]`. `sourceDraftId` è opzionale: senza, la fonte è il menu pubblicato o il catalogo precedente. La bozza di destinazione deve essere distinta dalla fonte e dal pubblicato. Le sostituzioni esplicite possono convertire un contenitore generico in più formule; non si cercano corrispondenze per nome. ID assenti, duplicati o ambigui bloccano l'operazione. La ripetizione dello stesso manifest non incrementa la revisione se il risultato è invariato. Il report elenca dosi/scorte mancanti e pizze ancora senza sezione. Il gestore completa e verifica la bozza dal pannello prima di pubblicare.

Le anteprime configurate accettano esclusivamente asset sotto `/images/` con nomi e segmenti sicuri; le foto caricate restano soggette all'appartenenza alla sede. Nessun URL remoto viene interpretato come anteprima.

Eseguire `pnpm migrate` sul PostgreSQL dedicato prima di avviare API e worker aggiornati. La migrazione di `src/schema.sql` è ripetibile, conserva lo snapshot esistente ed è compatibile con il repository precedente. Su Neon usare la connessione diretta per applicare lo schema. Le tabelle POC e quelle dell'adapter Auth.js restano disponibili.

Ogni transazione verifica sotto lock la versione dello snapshot in `individual_ordering_state`. Quando coincide, il repository riusa la propria copia e PostgreSQL restituisce solo i metadati. Lo snapshot viene riscritto solo quando cambia il JSON. Il lock continua a serializzare scorte, capacità e transizioni tra istanze. Le operazioni Stripe restano fuori dal lock, dopo il salvataggio di un intento durevole. Il primo accesso di un processo a una versione può richiedere il documento intero, così come una scrittura effettiva. [Benchmark e verifica del traffico](../../.agents/design/2026-11-20-snapshot-traffic/REVIEW.md).

Ingredient quantities/recipe consumption are positive integer units. Stock updates cannot undercut current reservations. Delivery uses geodetic distance from configured store coordinates to the customer-confirmed delivery point and the first inclusive distance band. Store addresses are confirmed from the operator search and saved with the corresponding coordinates in the existing JSON state. Legacy stores retain their saved coordinates. In the client checkout the customer selects a suggested address for their delivery point.

The runtime activates the recurring order calendar for existing stores on first access and preserves dates with reservations in the same state document. The calendar covers today and the next 13 local dates. A window closes to new orders at its end and `acceptingOrders` still suspends new orders. Individual and group checkout share the same capacity. Local browser verification uses `pnpm exec playwright test --config playwright.order-calendar.config.ts`.

## Environment and local setup

Il contratto di aggiornamento sede richiede servizio e admin allineati nella stessa candidata di rilascio. La versione operatore deriva dalla configurazione canonica, non richiede migrazione e non viene esposta nel catalogo cliente. [Flusso corrente](../../.agents/product-definition/flows/store-configuration.md), [test di concorrenza](src/store-configuration-concurrency.test.ts). Per esercizio e misura del traffico usare il [runbook del pilota](pilot-operations.md); i vecchi piani di ripristino sono archiviati.

Use `.env.example` as a template for a **local** `.env`. No credentials belong in committed files. Both app proxies share `PIZZAOS_PROXY_SECRET` with this service; `PIZZAOS_ALLOWED_ORIGINS` lists their exact public origins. Server rejects direct proxy routes without that credential. Browser mutations require matching Origin. Production origins must be HTTPS; run behind a TLS reverse proxy. Stripe webhook is the only remote write endpoint without proxy auth and has its own provider signature.

Le origini HTTPS dei siti di sede si abilitano con `PIZZAOS_ORDERING_DOMAIN` e valgono soltanto dopo aver assegnato la sede. Usare `PIZZAOS_ORDERING_AUTH_ORIGIN` per l'origine client canonica, già presente in `PIZZAOS_ALLOWED_ORIGINS` e in Google. [Procedura deploy](../../.agents/product-definition/architecture/pilot-deployment.md#sottodomini-delle-sedi).

Required: `DATABASE_URL`, `AUTH_SECRET` (32+ characters), `PIZZAOS_PROXY_SECRET` (different 32+ characters), `PIZZAOS_ALLOWED_ORIGINS`, `PIZZAOS_SUPERADMIN_EMAILS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SMTP_URL`, `AUTH_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Optional: `PIZZAOS_ENVIRONMENT` (`test` or `production`, default `production`; test rejects live Stripe keys), `PAYMENT_RESERVATION_MINUTES` (default 10), `PORT` (3004), `HOST` (127.0.0.1).

Configurare `GEOAPIFY_API_KEY` nel servizio checkout per entrambe le ricerche. Nel Profilo, **Cerca indirizzo** invia il testo alla [Geocoding API](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/) e propone civici o edifici identificati da un nome. Il gestore sceglie il risultato prima di salvare. Nel checkout, [Address Autocomplete](https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/) riceve il testo e la posizione della sede per ordinare i suggerimenti.

Senza la chiave le ricerche rispondono 503. Il ritiro e i salvataggi delle sedi che conservano la posizione già registrata restano disponibili. Pubblicare il backend con la chiave server-side nell'ambiente corretto. Admin e client mostrano i crediti Geoapify e OpenStreetMap vicino ai campi di ricerca.

From this service directory, using Node with env-file support:

```powershell
pnpm exec tsx --env-file=.env src/migrate.ts
pnpm exec tsx watch --env-file=.env src/server.ts
```

For already-exported environment variables: `pnpm migrate`, `pnpm dev`. Start client and admin separately with their README commands. Set their local `.env.local` values from app `.env.example`. Sign in as configured superadmin at admin `/operazioni`, create a store, add ingredients, products, recipes and delivery bands, review the default weekly schedule, then invite the operator email. Customer entry `/ordina`. Store and catalog data are created by the operator.

## Accesso POC per sessione

Configurare facoltativamente `PIZZAOS_DEMO_PASSWORD` **solo nel servizio** per abilitare `/poc` su client e admin e l'accesso con `poc@pizzaos.app` su `/accesso`. Scegliere una password dedicata e robusta. Senza la variabile la demo è disabilitata. Riavviare o ripubblicare il servizio dopo la configurazione. L'email è riservata e non può diventare un'identità reale tramite Google o magic link.

Il servizio espone `GET /api/pilot/auth/mode` (`live`/`demo`), `GET /api/pilot/auth/demo` (disponibilità, stato e CSRF), `POST /api/pilot/auth/demo` (email/password/CSRF) e `POST /api/pilot/auth/demo/signout` (CSRF), attraverso il proxy autorizzato. Login e logout richiedono Origin canonico. Le risposte non sono cacheabili. Cookie HttpOnly, SameSite=Lax, Secure con prefisso `__Host-` in HTTPS, senza Domain, limitati a otto ore e vincolati all'origine. La rotazione di password o AUTH_SECRET invalida le sessioni demo.

Il login da `/poc` invia `callbackUrl=/poc`. Il servizio riconosce solo questo valore esatto: ritorna a `/poc` dopo il successo o a `/poc?errore=demo` in caso di credenziali errate o demo disabilitata. Gli accessi esistenti da `/accesso` conservano le proprie destinazioni.

Per l'accesso automatico, configurare `PIZZAOS_DEMO_HANDOFF_SECRET` (almeno 32 caratteri) sul servizio e sulla landing e `PIZZAOS_DEMO_LANDING_ORIGIN` sul servizio. Il POST `/api/pilot/auth/demo/handoff` transita attraverso il proxy della destinazione. Il servizio verifica l'origine del POST e il pass di quella destinazione, valido dieci minuti. Il successo crea la stessa sessione demo e reindirizza a `/poc`; i pass invalidi o scaduti da origine consentita tornano a `/poc?errore=invito`. L'accesso manuale e il rinnovo delle sessioni mantengono la propria configurazione.

La demo non crea utenti o sessioni Auth.js nel database. Tutte le richieste demo a `/v1/pilot/*`, inclusi catalogo, preventivi, analytics, rider e stream, ricevono 403 `demo_session` prima dell'esecuzione del servizio. Anche `authenticate` rifiuta la sessione demo. Login e logout demo eliminano cookie di sessione reale residui; un login reale completato elimina il cookie demo. Ogni host mantiene la propria sessione: non c'è passaggio automatico tra client e admin.

Il POC conserva seed locali e reset. La carta è simulata senza Stripe né raccolta dati carta. `PIZZAOS_MODE` è ritirata: l'esperienza predefinita è reale, il POC richiede sempre la sessione verificata. Le API e i segreti reali continuano a essere configurati normalmente; abilitare la demo non sostituisce i requisiti di avvio del servizio.

Verifica dedicata: `pnpm exec playwright test --config playwright.session-demo.config.ts`. Usa due vere app Next e il runtime demo con segreti esclusivamente del fixture di test, senza servizi esterni. I test Node `demo-access.test.ts` verificano anche che nessuna query o connessione al database sia eseguita dalla demo.

Google OAuth redirect URIs: each app origin + `/api/pilot/auth/callback/google`. Magic links point back to the requesting app; SMTP must deliver real email. Stripe test webhook target: service `/v1/stripe/webhook`; use the webhook signing secret returned by Stripe CLI or configured endpoint. Use **test keys** to verify provider flows before production activation. Current provisioning status is recorded in [`online-deployment.md`](online-deployment.md).

Per D71, la stessa app admin serve `https://admin.pizzaos.app` e `https://rider.pizzaos.app`. Includere entrambe le origini esatte in `PIZZAOS_ALLOWED_ORIGINS` e registrare entrambe le callback Google sopra indicate. Il proxy seleziona l'origine dell'host corrente e le sessioni/callback restano su quell'host. Le due superfici usano lo stesso servizio/database dell'ambiente, ma mantengono appartenenze operatore e rider distinte; test e produzione richiedono database, segreti e configurazioni provider separati. La pubblicazione del servizio resta necessaria prima di rilasciare il nuovo frontend operativo.

## Runtime e artefatto Vercel

`runtime.ts` compone database, Auth.js, Stripe e contratti operativi senza aprire socket o avviare timer. `server.ts` possiede HTTP e worker per lo sviluppo o un host persistente; `vercel-api.ts` possiede soltanto le richieste HTTP; `worker.ts` esegue riconciliazione ordini e dispatch email ogni 5 secondi come processo separato. `createOperationalWorkers` mantiene due timer indipendenti: uno SMTP lento non ferma le scadenze ordine, né ritarda lo start HTTP. Ogni timer serializza i propri tick, continua dopo errori temporanei e drena il tick corrente prima di chiudere sender e pool. `reconcileOrders` (`reconcile` alias compatibile) e `dispatchEmails` sono i due ingressi runtime per worker/cron; il webhook chiama solo il primo. La funzione HTTP non sostituisce il worker.

Da root repository, `pnpm --filter @pizzaos/checkout-api build:deployment` genera `.codex/deployments/pizzaos-api` con bundle ESM Node 24, dipendenze esterne, Dockerfile del worker, `vercel.json` e `.vercelignore` che esclude node_modules, env e log. La directory generata è ignorata da Git. Prima del deploy creare il lock con `npm install --package-lock-only --ignore-scripts --prefix .codex/deployments/pizzaos-api`, copiarlo in `worker/package-lock.json` e verificarne l'installazione con `npm ci --omit=dev --ignore-scripts --prefix .codex/deployments/pizzaos-api`. Distribuire soltanto i due bundle, i manifest e lock, Dockerfile, vercel.json e .vercelignore; escludere credenziali ed evidenze locali. Il dry-run CLI deve includere tutti i nove file.

L'artefatto richiede un progetto Vercel con root propria, Node 24, framework Other e regione `fra1`. Per il pilota l'utente ha autorizzato **solo risorse gratuite**: il Daemon generato prevede una istanza minima da 1 GiB sul piano Hobby, senza upgrade o risorse Pro. Verificare la quota residua del team prima del deploy. La quota Hobby non garantisce un mese intero di esecuzione continua: 420 GB-ore mensili permettono al massimo 420 ore (17,5 giorni) a 1 GiB, condivise con gli altri Daemon del team; al raggiungimento della quota Vercel arresta i Daemon. Durante l'arresto il flusso operativo non è pronto. La sua porta 3005 è solo liveness interna, senza ingresso pubblico. Configurazione e segreti sono variabili protette del progetto; il backend test usa solo `pizzaos_test` e `PIZZAOS_ENVIRONMENT=test`.

Auth.js è fissato a 0.41.3 e il suo adapter PostgreSQL a 1.11.3. Nodemailer è fissato a 10.3.1 per le correzioni di sicurezza. L'override mirato del peer Auth.js, che dichiara ancora le versioni 7/8, è esplicito nel workspace e nell'artefatto. Il trasporto realmente usato dal callback personalizzato è verificato con SMTP locale, Auth.js e PostgreSQL reali, inclusi link monouso/scaduti e sessioni HttpOnly; aggiornare questa verifica quando cambia una di queste dipendenze.

## Pilot analytics and rider delivery extensions

`src/pilot-extensions.ts` composes the canonical ordering service with delivery access and transactional analytics. The production runtime uses `createOperationalEmailServices` to share one outbox/promotions/analytics-decorated PostgreSQL repository with ordering, groups, delivery/rider and worker. Email snapshots commit atomically with canonical transitions; SMTP runs outside locks and order APIs through an independent email runner. Webhooks reconcile orders without awaiting SMTP. Rider memberships are separate from store-operator memberships; the trusted-server `riderProgress` entry checks the active assignment inside the order write transaction. Generic order action/read/event routes do not grant rider permissions.

- `GET /v1/pilot/stores/:id/analytics`: five metrics using `period=today|last_7_days|last_30_days|custom`, with `fromDate`/`throughDate` for inclusive custom dates. Store `timeZone` is an IANA zone; existing pilot stores default to `Europe/Rome`.
- `GET /v1/pilot/rider/session` and `GET /v1/pilot/rider/deliveries`: rider identity and minimized own-assignment views.
- `POST /v1/pilot/rider/deliveries/:id/dispatch`, `/complete`, `/failure`: delivery progress and issue reporting; mutation responses are empty 204, failure body is `{note}`.
- `GET|POST /v1/pilot/stores/:id/riders`, `PATCH /v1/pilot/stores/:id/riders/:riderId`: operator-managed rider access.
- `GET /v1/pilot/stores/:id/deliveries` and `PUT /v1/pilot/orders/:id/assignment`: assignments/issues and manual assignment `{riderId}`.

Every extension inherits proxy authentication and server authorization. Rider DTOs omit customer email and provider/refund details. Open delivery issues block rider progress until reassignment; cancellation/refund stays on the canonical operator workflow. Completion consumes stock and settles cash through the same canonical transition, then the analytics journal captures the terminal date once. Historical terminal orders without an observed transition are not backdated.

No new SQL tables are needed for these extensions: the existing durable state document stores the delivery and analytics records atomically. See `.agents/design/2026-11-05-pilot-integration/` and the module READMEs. Browser acceptance: `pnpm exec playwright test --config playwright.pilot-extensions.config.ts`.

## Catalogo e preferenze

### Importazione e recupero delle ricette

Per la nuova bozza dimostrativa completa del 25 novembre usare invece l'[importazione isolata](data/menu-demo-2026-11-25.md): aggiunge una sola bozza e scorte demo separate, senza riconciliare ricette di altri menu. Richiede `PIZZAOS_ENVIRONMENT=test` e database `pizzaos_test`; l'analisi è il default e `--apply` applica sotto lock. La ripetizione non cambia dati o revisioni; modifiche successive dell'operatore bloccano la reimportazione invece di essere sovrascritte. Verifica: `src/isolated-demo-menu.test.ts`.

Per modifiche ordinarie usare **Admin → Menu** e **Magazzino**. Il precedente caricamento del pilota era una trascrizione dal pannello: salvava ricette testuali, senza riferimenti al magazzino. `menu-import.ts` e `menu:import` riconciliano ingredienti, prodotti e scelte; il manifest separa nomi originali e descrizioni promozionali. Il [manifest del recupero del 24 novembre](data/menu-recipes-2026-11-24.json) documenta fonte e verifiche residue.

Da questa directory, con `DATABASE_URL` dell'ambiente scelto già esportata:

```powershell
pnpm menu:import data/menu-recipes-2026-11-24.json
pnpm menu:import data/menu-recipes-2026-11-24.json --apply
```

Il primo comando esegue soltanto SELECT e analisi. Il secondo ricalcola e applica sotto il lock del repository. Non pubblica menu e non modifica prezzi, ordini o riserve. Ripetere il comando non cambia record, ID o revisioni. Per una nuova importazione includere `draft` nel manifest, con ID stabile, sezioni, prodotti e scelte: inserisce/aggiorna la bozza e riusa identità e dosi note. ID o nome del menu devono identificare una sola bozza. Controllare il rapporto prima di applicare; corrispondenze ambigue bloccano la transazione.

La ricerca normalizza maiuscole, accenti, spazi e apostrofi. I refusi si risolvono con alias espliciti confrontati con la fonte, mai unendo automaticamente nomi simili. Nomi composti e varianti rimangono distinti. Non ricavare ingredienti dalle nuove descrizioni catchy.

Scorte e dosi `null` mantengono il dato da verificare. Magazzino ed editor mostrano campi vuoti **Da verificare**; zero indica scorta esaurita confermata. Dosi note e scorte esistenti si conservano. Le unità restano intere nella stessa convenzione delle ricette e del magazzino; la fonte non fornisce equivalenze in grammi. Dosi/scorte sconosciute bloccano pubblicazione e ordinazione delle composizioni coinvolte. Allergeni assenti restano non verificati. Nessun DDL aggiuntivo sullo snapshot JSONB: distribuire API e admin compatibili prima del backfill.

Verifiche: `src/menu-import.acceptance.test.ts`, `src/menu-ordering.acceptance.test.ts` e test editor admin. [Analisi e riesame](../../.agents/design/2026-11-24-menu-import/REVIEW.md).

Il [flusso Menu](../../.agents/product-definition/flows/menu-ordering.md) usa le rotte `/v1/pilot/stores/:id/menu-admin`, `/menu-images` e `/v1/pilot/food-preferences`. Il servizio conserva le bozze con revisione e pubblica il menu nella transazione del catalogo. La migrazione additiva crea `ordering_menu_images`, tabella per foto statiche JPEG, PNG e WebP fino a 2 MB. Dopo la migrazione verificare che il ruolo applicativo possa fare SELECT e INSERT sulla tabella. I byte restano separati dallo snapshot degli ordini.

Il preventivo convalida gruppi e scorte effettive, calcola gli extra e conserva le scelte nella riga confermata. Le preferenze si leggono sul solo account cliente. Le rotte usano l'autenticazione e il proxy già configurati.

## Verification commands

From repository root:

- `pnpm --filter @pizzaos/checkout-api test`
- `pnpm --filter @pizzaos/checkout-api typecheck`
- `pnpm --filter @pizzaos/checkout-api lint`
- `pnpm --filter @pizzaos/checkout-api build`
- `pnpm architecture:check`
- `pnpm exec playwright test --config playwright.individual.config.ts`

The last command starts two real Next apps and an isolated test-only service harness. Fake identity/provider adapters exist only in `tests/fixtures/individual-service.ts`; production server never imports it or accepts its test cookie. Test service ports: 3104, client 3101, admin 3102. Real PostgreSQL tests require `PIZZAOS_TEST_DATABASE_URL` with dedicated database name exactly `pizzaos_individual_test`; they are skipped otherwise. Migrate that database first. Auth tests use real Auth.js and PostgreSQL while capturing mail at the transport boundary. External Google sign-in and actual Stripe/3DS remain credential-dependent smoke checks.

SDD source: `.agents/design/2026-11-05-individual-ordering/` from repository root; persistent group collection and canonical checkout are specified in `.agents/design/2026-11-05-group-ordering/`. Product decisions D49-D55 recorded on 2026-11-05. Coupon/rewards and transactional operational emails are composed through the canonical checkout and shared repository; subscriptions, marketing automation and AI remain outside this increment. Email configuration and SMTP delivery limitations are documented in [`src/operational-emails/README.md`](src/operational-emails/README.md); SDD source `.agents/design/2026-11-05-operational-emails/`. Production privacy/legal readiness remains governed by D16/D31.

## Pizza custom ed extra pubblicati

La configurazione ingrediente opzionale `extra` memorizza Possibile extra, prezzo in centesimi e dose per aggiunta (null significa da verificare). Il salvataggio sincronizza automaticamente gli extra su tutti i gusti e le formule, senza un flag di collegamento, e registra una firma commerciale. La pubblicazione rifiuta una firma superata richiedendo controllo e nuovo salvataggio. Prezzi e dosi del menu attivo restano quelli pubblicati; le scorte correnti governano sempre la disponibilità. Le ricette incluse restano distinte dalle dosi extra. Il servizio valida i gruppi specifici `PizzaTaste.customizations` e rigenera la proiezione; non accetta identità automatiche o campi sconosciuti fra le scelte specifiche. Le formule accettano quota e percentuale configurabili. Gli standard comuni si applicano nella proiezione autorevole; disattivare Pizza custom conserva la sorgente e nasconde soltanto le formule. Nessun DDL aggiuntivo; snapshot PostgreSQL esistente. [Regole e casi limite](../../.agents/product-definition/flows/menu-ordering.md).

## Extra correnti dal Magazzino

Il servizio proietta gli extra abilitati con prezzo e dose completi sul catalogo pizza pubblicato, sia nella lettura cliente sia nel preventivo, senza modificare lo snapshot commerciale delle ricette incluse. Il salvataggio Magazzino ha effetto immediato: scorta nulla o positiva mostra l’extra, zero lo nasconde. Gli extra con scorta nulla restano ordinabili e non generano giacenze numeriche al completamento; le quantità note sono riservate e scaricate normalmente. Prezzi/dosi incompleti non sono offerte implicite. Le altre ricette mantengono i controlli sui dati da verificare. [Flusso e casi limite](../../.agents/product-definition/flows/menu-ordering.md).

Copertura locale API: `src/pizza-catalog.acceptance.test.ts`. Browser: `pnpm exec playwright test --config playwright.inventory-extras.config.ts`, porte 3831/3832/3834 e directory `.next-inventory-extras-e2e`; verifica scorta/prezzo/dose al blur con ricaricamento e visibilità immediata di extra ignoti, positivi e a zero. Nessuna nuova evidenza online.
