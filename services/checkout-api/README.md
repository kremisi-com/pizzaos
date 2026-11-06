# @pizzaos/checkout-api

## Responsibility

Owns durable individual ordering for the pilot: Auth.js identity, store configuration and operator invitations, authoritative catalog/prices/recipes, delivery bands, slot and inventory reservations, checkout, Stripe payments/refunds, restaurant acceptance and fulfillment, and resumable events. Client and admin call versioned HTTP contracts; neither accesses this implementation or its database.

## Public HTTP surface

Public domain shapes are `Individual*` and `IndividualApi` from `@pizzaos/domain`. Through the same-origin app proxy `/api/pilot`, service routes are:

- `GET /v1/pilot/session`, `/stores`, `/stores/:id`: session and store/catalog discovery; guests receive catalog with stock redacted.
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
- `PUT /v1/pilot/stores/:id`: superadmin creates, assigned operator/superadmin updates configuration.
- `POST /v1/pilot/stores/:id/invitations`: superadmin authorizes an email for a store; the operator signs in via Google/magic link. Invitations are access grants; automatic invitation emails are outside this increment.
- `GET /v1/pilot/events?cursor=&storeId=` and `/stream`: matching JSON/SSE event envelopes, filtered by customer/store authorization.
- `/api/pilot/auth/*`: Auth.js endpoints proxied by both apps; Google and Nodemailer magic link, PostgreSQL sessions.
- `POST /v1/stripe/webhook`: direct Stripe endpoint, verifies signature on original bytes then reconciles provider state.
- `GET /health`: service liveness.

Errors: `{code,message}`, with 400 invalid input, 401 login required, 403 denied, 404 missing, 409 conflict and 503 transient dependency failure. Public POC `/v1/checkouts*` routes that trusted browser totals/identity are removed; the previous demo client does not use them.

## Order and payment behavior

Card is collected only by Stripe Elements. The service creates a PaymentIntent for server-calculated cents, browser confirms via Stripe.js including 3DS, and service/provider reconciliation establishes payment outcome. No raw card fields or client secret enter persistence/logs/domain entities; clientSecret is transient checkout output only.

Orders wait for acceptance after cash submission or successful card payment. Deadline from submission: requested time within 30 minutes or ASAP = 5 minutes; within 90 minutes = 10; later = 15. Expiry cancels and requests card refund. Waiting for customer on unavailable items suspends deadline and keeps resources reserved indefinitely; operator must resolve it. Only customer changes notes; before acceptance customer can add products with explicit delta confirmation/payment, never reduce prices. Every paid delta has its own durable refund ledger.

A pending/uncertain payment blocks duplicate checkout. Provider idempotency keys survive network loss/restart. Reservation expiry first reconciles/cancels with the provider, then releases only on definitive outcome. `refund_pending`, `refund_failed`, and `refunded` remain distinct from cancelled order. Failed refunds are visible/retryable. Worker runs every 5 seconds even with no browsers connected; SSE does not advance orders locally.

## Persistence and scaling

Run `src/schema.sql` against a dedicated PostgreSQL database. Existing POC tables are retained; new runtime uses `individual_ordering_state` and official Auth.js adapter tables. The pilot state is a JSON snapshot under a database row lock, serializing inventory/capacity decisions across service instances. Remote Stripe operations occur outside the lock after a durable intent is saved. This intentionally favors atomicity and reviewability for a low-volume pilot; normalization/sharding is a future service-internal change, with no app contract change.

Ingredient quantities/recipe consumption are positive integer units; choose a consistent smallest unit per ingredient. Stock updates cannot undercut current reservations. Delivery uses geodetic distance from configured store coordinates to the customer-confirmed delivery point and the first inclusive distance band. Address geocoding is not included; the UI supports coordinates and geolocation. Slots are explicit dated capacity entries configured through admin, and acceptingOrders suspends new orders.

## Environment and local setup

Use `.env.example` as a template for a **local** `.env`. No credentials belong in committed files. Both app proxies share `PIZZAOS_PROXY_SECRET` with this service; `PIZZAOS_ALLOWED_ORIGINS` lists their exact public origins. Server rejects direct proxy routes without that credential. Browser mutations require matching Origin. Production origins must be HTTPS; run behind a TLS reverse proxy. Stripe webhook is the only remote write endpoint without proxy auth and has its own provider signature.

Required: `DATABASE_URL`, `AUTH_SECRET` (32+ characters), `PIZZAOS_PROXY_SECRET` (different 32+ characters), `PIZZAOS_ALLOWED_ORIGINS`, `PIZZAOS_SUPERADMIN_EMAILS`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `SMTP_URL`, `AUTH_EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. Optional: `PIZZAOS_ENVIRONMENT` (`test` or `production`, default `production`; test rejects live Stripe keys), `PAYMENT_RESERVATION_MINUTES` (default 10), `PORT` (3004), `HOST` (127.0.0.1).

From this service directory, using Node with env-file support:

```powershell
pnpm exec tsx --env-file=.env src/migrate.ts
pnpm exec tsx watch --env-file=.env src/server.ts
```

For already-exported environment variables: `pnpm migrate`, `pnpm dev`. Start client and admin separately with their README commands. Set their local `.env.local` values from app `.env.example`; durable surfaces are the default home pages. Sign in as configured superadmin at admin `/operazioni`, create store, add ingredients/products/recipes, dated future slots and delivery bands, then invite operator email. Customer entry `/ordina`. Nothing is automatically seeded in production.

## Accesso POC per sessione

Configurare facoltativamente `PIZZAOS_DEMO_PASSWORD` **solo nel servizio** per abilitare l'accesso demo con `poc@pizzaos.app` su `/accesso` di client e admin. Scegliere una password dedicata e robusta; nessuna credenziale è predefinita. Senza la variabile la demo è disabilitata. Riavviare il servizio dopo la configurazione. L'email è riservata e non può diventare un'identità reale tramite Google o magic link.

Il servizio espone `GET /api/pilot/auth/mode` (`live`/`demo`), `GET /api/pilot/auth/demo` (disponibilità, stato e CSRF), `POST /api/pilot/auth/demo` (email/password/CSRF) e `POST /api/pilot/auth/demo/signout` (CSRF), attraverso il proxy autorizzato. Login e logout richiedono Origin canonico. Le risposte non sono cacheabili. Cookie HttpOnly, SameSite=Lax, Secure con prefisso `__Host-` in HTTPS, senza Domain, limitati a otto ore e vincolati all'origine. La rotazione di password o AUTH_SECRET invalida le sessioni demo.

La demo non crea utenti o sessioni Auth.js nel database. Tutte le richieste demo a `/v1/pilot/*`, inclusi catalogo, preventivi, analytics, rider e stream, ricevono 403 `demo_session` prima dell'esecuzione del servizio. Anche `authenticate` rifiuta la sessione demo. Login e logout demo eliminano cookie di sessione reale residui; un login reale completato elimina il cookie demo. Ogni host mantiene la propria sessione: non c'è passaggio automatico tra client e admin.

Il POC conserva seed locali e reset. La carta è simulata senza Stripe né raccolta dati carta. `PIZZAOS_MODE` è ritirata: l'esperienza predefinita è reale, il POC richiede sempre la sessione verificata. Le API e i segreti reali continuano a essere configurati normalmente; abilitare la demo non sostituisce i requisiti di avvio del servizio.

Verifica dedicata: `pnpm exec playwright test --config playwright.session-demo.config.ts`. Usa due vere app Next e il runtime demo con segreti esclusivamente del fixture di test, senza servizi esterni. I test Node `demo-access.test.ts` verificano anche che nessuna query o connessione al database sia eseguita dalla demo.

Google OAuth redirect URIs: each app origin + `/api/pilot/auth/callback/google`. Magic links point back to the requesting app; SMTP must deliver real email. Stripe test webhook target: service `/v1/stripe/webhook`; use the webhook signing secret returned by Stripe CLI or configured endpoint. Use **test keys** to verify provider flows before production activation. Current provisioning status is recorded in [`online-deployment.md`](online-deployment.md).

Per D71, la stessa app admin serve `https://admin.pizzaos.app` e `https://rider.pizzaos.app`. Includere entrambe le origini esatte in `PIZZAOS_ALLOWED_ORIGINS` e registrare entrambe le callback Google sopra indicate. Il proxy seleziona l'origine dell'host corrente e le sessioni/callback restano su quell'host. Le due superfici usano lo stesso servizio/database dell'ambiente, ma mantengono appartenenze operatore e rider distinte; test e produzione richiedono database, segreti e configurazioni provider separati. La pubblicazione del servizio resta necessaria prima di rilasciare il nuovo frontend operativo.

## Runtime e artefatto Vercel

`runtime.ts` compone database, Auth.js, Stripe e contratti operativi senza aprire socket o avviare timer. `server.ts` possiede HTTP e worker per lo sviluppo o un host persistente; `vercel-api.ts` possiede soltanto le richieste HTTP; `worker.ts` esegue riconciliazione ordini e dispatch email ogni 5 secondi come processo separato. `createOperationalWorkers` mantiene due timer indipendenti: uno SMTP lento non ferma le scadenze ordine, né ritarda lo start HTTP. Ogni timer serializza i propri tick, continua dopo errori temporanei e drena il tick corrente prima di chiudere sender e pool. `reconcileOrders` (`reconcile` alias compatibile) e `dispatchEmails` sono i due ingressi runtime per worker/cron; il webhook chiama solo il primo. La funzione HTTP non sostituisce il worker.

Da root repository, `pnpm --filter @pizzaos/checkout-api build:deployment` genera `.codex/deployments/pizzaos-api` con bundle ESM Node 24, dipendenze esterne, Dockerfile del worker e `vercel.json`. La directory generata è ignorata da Git. Prima del deploy creare il lock con `npm install --package-lock-only --ignore-scripts --prefix .codex/deployments/pizzaos-api`, copiarlo in `worker/package-lock.json` e verificarne l'installazione con `npm ci --omit=dev --ignore-scripts --prefix .codex/deployments/pizzaos-api`. Distribuire soltanto i due bundle, i manifest e lock, Dockerfile e vercel.json; escludere node_modules, env, credenziali ed evidenze locali.

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
