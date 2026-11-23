# @pizzaos/client

## Purpose

Client app for the PizzaOS mobile-first ordering experience.

Il proxy pilota conserva `x-request-id` generato dal backend, anche su errori 500/503. I payload errore possono includere `requestId` oltre a codice e messaggio; il recupero del tentativo esistente rimane invariato. [Diagnostica backend](../../services/checkout-api/observability.md).

## Ownership

This app owns:

- route structure under `app/`
- client-facing composition and interaction flows
- client feature modules under `src/features`
- app-level local API and demo-state coordination under `src/composition`

This app does not own shared package APIs or admin and landing code paths.

Il flusso operativo predefinito usa i contratti pubblici di `@pizzaos/domain` (`IndividualApi` e le estensioni gruppo/promozioni) tramite adapter HTTP same-origin della composizione. Catalogo, ordini e pagamenti persistenti appartengono al servizio checkout.

Il POC autenticato usa separatamente `ClientApiContract`: `src/composition/api/local-client-api.ts` adatta seed e persistenza locale alla demo deterministica. Non è il repository del flusso operativo. Fonti funzionali e casi limite sono nell'[inventario corrente](../../.agents/product-definition/flow-inventory.md).

## Aggiornamenti operativi

Nel POC la schermata ordini avanza con timer locali deterministici: è intenzionale e rende la demo ripetibile. Il
confine `ClientApiContract` espone comunque `getLiveUpdates`, con cursore riprendibile ed eventi versionati per stato
ordine, disponibilità prodotto, slot e tracking. In produzione il repository HTTP potrà usare polling, SSE o WebSocket
senza cambiare le feature UI. La timeline, le revisioni e i conflitti di disponibilità sono server-authoritative:
un checkout che trova uno slot o un prodotto non più disponibile riceve un conflitto tipizzato (`slot_unavailable`,
`product_unavailable` o `inventory_changed`) e deve ricaricare il catalogo prima di un nuovo tentativo.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: client route entry
- `app/menu/page.tsx`: menu browsing route with section preselection support
- `app/group-order/page.tsx`: group order locale con contributi personali, riepilogo partecipanti e checkout unico dell'host
- `app/ordina/gruppo`: raccolta di gruppo persistente con inviti reali e checkout unico dell'organizzatore; separata dal POC locale
- `app/product/[id]/page.tsx`: product detail route with guided customization flow
- `app/cart/page.tsx`: cart review route with quantity updates and checkout entry
- `app/checkout/page.tsx`: contatti per ordine, consegna/ritiro, slot, tip, mock payment, and confirmation route
- `app/orders/page.tsx`: order timeline, notifications, tracking, history, quick reorder, and post-delivery feedback route
- `app/rewards/page.tsx`: loyalty, reward, coupon, and subscription overview route
- `src/composition/client-shell.tsx`: mobile-first home shell, reorder prompt, and reset UI
- [`src/features/menu`](src/features/menu/README.md): menu browsing
- [`src/features/customization`](src/features/customization/README.md): product choices
- [`src/features/cart`](src/features/cart/README.md): individual cart
- [`src/features/group-order`](src/features/group-order/README.md): local group cart
- [`src/features/checkout`](src/features/checkout/README.md): checkout flow
- [`src/features/orders`](src/features/orders/README.md): customer order lifecycle
- [`src/features/feedback`](src/features/feedback/README.md): post-order ratings
- [`src/features/loyalty`](src/features/loyalty/README.md): points and rewards
- `src/features/products`: extended catalog view using menu and cart behavior
- `src/features/navigation`: bottom navigation
- `src/composition/client-demo-state.ts`: local storage hydration and reset helpers
- `src/composition/api/local-client-api.ts`: local `ClientApiContract` repository for catalog, cart, checkout, orders, loyalty,
  coupons, group order, and tracking
- `src/composition/api/client-api-provider.tsx`: contract provider consumed by client UI features

## Pagamenti reali

La carta è raccolta esclusivamente da Stripe Elements. Configurare `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` nel client e
`DATABASE_URL`, `STRIPE_SECRET_KEY`, `CLIENT_ORIGIN` nel servizio `@pizzaos/checkout-api`; nessun segreto Stripe o
numero carta deve essere inserito in `localStorage`, props, contratti di dominio o log. Il backend è la source of truth
per tentativi, idempotenza e conferma operativa.

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/domain`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Commands

From repository root:

- `pnpm --filter @pizzaos/client dev`
- `pnpm --filter @pizzaos/client build`
- `pnpm --filter @pizzaos/client lint`
- `pnpm --filter @pizzaos/client typecheck`
- `pnpm --filter @pizzaos/client test`
- `pnpm architecture:check` from the repository root

## Environment

- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: optional Microsoft Clarity project ID. When unset, the Clarity tracking script is not rendered.
- Google tag measurement ID is currently configured as `G-VVZ3HVXHX8` in `app/google-tag.tsx`.

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/client`.
- Keep install and build aligned with the app-level `vercel.json`.
- Use `GET /api/deploy-probe` on any assigned domain to confirm that a request reaches the client app. A Vercel-level
  403 before this route responds points to project/domain protection or DNS routing outside the app code.

## Primo flusso individuale persistente

Pubblicato il 5 novembre 2026 su `https://client.pizzaos.app`, deployment `dpl_CiDb5zmoSTrPnebTdhq3zsGEJmcm`, collegato al backend e database test. Verificati online accesso Google, Stripe Elements con challenge 3DS, ordine fino al completamento rider e tre email operative Delivered. Versioni, evidenze e limiti sono nel [verbale del servizio](../../services/checkout-api/online-client-verification.md); non è ancora un'apertura commerciale e la sede fittizia è richiusa ai nuovi ordini.

Il flusso operativo `/ordina` usa il contratto pubblico `IndividualApi` di `@pizzaos/domain`, fornito dalla composizione attraverso un adapter HTTP same-origin. È l'esperienza predefinita della home. Il POC si apre solo con la sessione demo verificata dal servizio; `PIZZAOS_MODE` non seleziona più la modalità.

Il proxy `/api/pilot/*` raggiunge `services/checkout-api` tramite `PIZZAOS_SERVICE_URL`, `PIZZAOS_PROXY_SECRET` e `PIZZAOS_APP_ORIGIN` server-only. Le credenziali devono corrispondere alla configurazione del servizio. `/accesso` fornisce accesso italiano Google/magic link e logout protetto da CSRF; Auth.js e la persistenza appartengono al servizio. Nessuna identità o integrazione di pagamento simulata è attivabile dal browser nel runtime reale.

La feature `src/features/individual-ordering` gestisce composizione guest, preventivo server, conferma ordine carta/contanti, aggiornamento note, annullamento e riordino, aggiunte con conferma del delta e recupero pagamento. Il draft locale scade sette giorni dopo l'ultima modifica; non conserva contatti o dati pagamento. Per la carta occorre `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. Le conferme e il 3DS usano Stripe Elements; stato ordine e pagamento provengono dal servizio. La navigazione live rimanda esclusivamente al flusso persistente.

La composizione riceve eventi SSE con cursore e usa polling di recupero; i messaggi heartbeat non ricaricano dati né modificano i form. Configurazione completa, migrazioni e dipendenze esterne sono documentate nel README del servizio.

## Ordine di gruppo persistente

Da `/ordina` si accede a `/ordina/gruppo`. L'organizzatore autenticato sceglie sede, nome e scadenza raccolta e condivide il link con frammento invito; ogni invitato entra con nome senza account, con una capability personale HttpOnly. Il roster risiede nel servizio PostgreSQL e si aggiorna tramite polling revisionato. La scadenza chiude solo le scelte: nessuna prenotazione o pagamento automatico.

Dopo chiusura l'organizzatore risolve eventuali conflitti, verifica totale corrente e conferma carta o contanti, con un indirizzo e slot unici. Il ristorante riceve l'ordine canonico con partecipante nelle note di ogni riga; l'organizzatore lo gestisce in `/ordina`. Il recupero del tentativo usa la richiesta originale persistita dal servizio. `GroupOrderingApi` è fornito da `src/composition/api/group-ordering-api.ts`; nessun fallback locale in questo flusso.

Verifica browser: `pnpm exec playwright test --config playwright.group-ordering.config.ts` (porte 3501/3502/3504, build directory `.next-group-e2e`, output `test-results/group-ordering`). Google/Stripe esterni richiedono le configurazioni descritte sopra; il fixture test non è importato dal runtime produzione.

`PIZZAOS_BUILD_DIRECTORY` consente una directory Next isolata per verifiche locali; in assenza usa `.next`. Usare directory diverse tra dev server e build contemporanei. Le directory `.next-*` e i risultati dei test sono artefatti locali ignorati da Git.

## Coupon e fedeltà persistenti

Il checkout individuale e quello dell'organizzatore gruppo ricevono `PromotionsApi` dalla composizione e mostrano saldo, impegni e regole della sede. Il cliente inserisce codici coupon e può selezionare un premio; il servizio calcola percentuali in sequenza, importi fissi e premio sui prodotti. Il riepilogo distingue lordo, benefici, netto e consegna. Un coupon senza beneficio effettivo non consuma utilizzi; richiede correzione prima dell'invio.

Il browser conserva solo codici/riscatto nella composizione e nel tentativo originale, senza saldi o sconti fidati. Il server impegna coupon/punti con l'ordine, ripristina all'annullamento e accredita una volta al completamento. Il gruppo beneficia solo l'host. A totale zero, conferma esplicita carta senza raccolta dati Stripe; a importo positivo Elements resta obbligatorio.

Verifica: `pnpm exec playwright test --config playwright.promotions-loyalty.config.ts`, porte 3601/3602/3604, build directory `.next-promotions-e2e`, risultati `test-results/promotions-loyalty`; include baseline individuale e gruppo. [Feature e port](src/features/promotions/README.md).

## Demo autenticata

Aprire `/poc` e inserire la password demo. Lo stesso accesso resta disponibile da `/accesso` inserendo `poc@pizzaos.app`. La password è configurata solo nel servizio con `PIZZAOS_DEMO_PASSWORD`. Senza configurazione l'accesso demo è disabilitato. Google e magic link restano i metodi di accesso operativo. La demo mostra la barra identificativa ed `Esci`, con dati locali resettabili e carta interamente simulata senza Stripe.

Il pulsante ricevuto dopo il form della landing apre `/poc` senza chiedere la password. Il proxy inoltra il solo POST di accesso al servizio, che verifica origine e pass prima di rilasciare la sessione demo. [Flusso POC](../../.agents/product-definition/flows/poc-and-interface.md).

La [copertina del menu](src/features/menu/components/ordering-cover.tsx) è condivisa tra POC e ordinazione operativa. Su `/` e `/ordina` sono mostrati il nome e lo stato di apertura della sede restituiti dal servizio, con accesso al menu e al gruppo persistente.

`src/composition/session-mode.ts` verifica la modalità con il servizio usando cookie e credenziali server; errori o cookie falsi non attivano il POC. Il middleware limita i vecchi URL POC alla demo e reindirizza gli altri utenti a `/ordina`. Una sessione demo che apre `/ordina` torna alla home POC. Il servizio blocca ogni API operativa per le sessioni demo. Cookie e carrelli POC restano distinti dal draft reale; logout non cancella il carrello reale.

Eseguire `pnpm exec playwright test --config playwright.session-demo.config.ts` dalla root per accesso, isolamento, checkout carta simulato e logout.
