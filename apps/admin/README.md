# @pizzaos/admin

## Purpose

Admin app for PizzaOS operations and insight-oriented workflows.

## Ownership

This app owns:

- route structure under `app/`
- admin composition and operational UX patterns
- admin feature modules under `src/features`
- application coordination under `src/composition`

This app does not own shared package internals or other app surfaces.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: admin route entry
- `src/composition/admin-shell.tsx`: shell composition, top-level KPIs, marketing opportunity cards, store reset, and coordination of operational features
- `src/features/store-switch`: multi-store selector with deterministic local dataset switching
- [`src/features/orders`](src/features/orders/README.md): operational orders
- [`src/features/catalog`](src/features/catalog/README.md): menu and product editing
- [`src/features/inventory`](src/features/inventory/README.md): ingredient stock
- [`src/features/marketing`](src/features/marketing/README.md): coupons and growth controls
- [`src/features/analytics`](src/features/analytics/README.md): analytics and AI presentation
- [`src/features/delivery`](src/features/delivery/README.md): delivery overview
- `src/features/integrations`: supported-only placeholder integrations for the POC scope
- [`src/features/profile`](src/features/profile/README.md): operator profile and mock billing

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Analytics e consegne del pilota

La composizione operativa collega le [analytics reali](src/features/pilot-analytics/README.md), il [pannello assegnazioni](src/features/delivery-assignment-panel/README.md) e l'[area rider](src/features/rider-deliveries/README.md) ai port pubblici del dominio. Il rider accede da `/rider` o dal relativo host operativo, usa l'identità Google/magic link e vede esclusivamente le proprie consegne. Le appartenenze rider non concedono permessi operatore.

L'operatore abilita i rider per email, attiva/disattiva gli accessi e assegna manualmente gli ordini pronti. Un problema di consegna resta aperto e può essere risolto riassegnando, anche allo stesso rider per riprovare, oppure annullando dalla gestione ordini. L'abilitazione non invia un'email di invito: il rider apre l'indirizzo dell'area e richiede il normale accesso.

Le cinque metriche sono calcolate dal journal transazionale del servizio; il fuso IANA è configurabile nella sede. Ordini storici già terminali prima dell'attivazione del journal non vengono retrodatati usando la data di creazione. I filtri restano selezionati durante gli aggiornamenti operativi.

Verifica browser estensioni: `pnpm exec playwright test --config playwright.pilot-extensions.config.ts`, con lo stesso harness isolato dell'ordinazione individuale. Il comando non verifica DNS o credenziali esterne.

## Coupon e fedeltà live

La sezione Marketing apre «Coupon e fedeltà», che gestisce programma, premio e coupon sul servizio persistente. L'operatore autorizzato può creare, modificare e disattivare coupon, scegliere prodotti ammessi, validità, minimo e limiti. Il programma iniziale e le modifiche sono configurazioni server: nessun valore commerciale nel template. [Feature pubblica](src/features/promotions/README.md).

L'ordine mostra un riepilogo dei benefici quando presenti, con prodotti lordi/netti e totale dovuto, mantenendo le righe attribuite del gruppo. Completamento e annullamento canonici aggiornano punti e utilizzi nel medesimo repository condiviso con rider e worker. Il ruolo rider non concede accesso alla configurazione commerciale.

Verifica browser: `pnpm exec playwright test --config playwright.promotions-loyalty.config.ts`, porte 3601/3602/3604, directory Next `.next-promotions-e2e`, output `test-results/promotions-loyalty`. Le identità simulate appartengono soltanto al fixture di test.

## Email operative

In Integrazioni, «Email operative» mostra invii in attesa, in corso, riusciti, bloccati o in retry, con destinatario, tentativi, date ed errori sanitizzati. Il pannello si aggiorna automaticamente e offre «Aggiorna invii» per riprendere una lettura. La configurazione SMTP resta server-only e i retry sono gestiti dal servizio; il guasto email non blocca la gestione dell'ordine. [Feature e port](src/features/operational-emails/README.md).

I messaggi riguardano ricevuta dopo invio, accettazione, pronto al ritiro/in consegna, annullamento ed esiti reali del rimborso. Nel gruppo riceve soltanto l'host pagante. Lo stato aggiornato resta sempre nell'app; WhatsApp rimane manuale. Le prove usano solo provider iniettati nei test e sink SMTP locale con destinatari `.test`.

Verifica browser: `pnpm exec playwright test --config playwright.operational-emails.config.ts`, porte 3701/3702/3704, directory Next `.next-emails-e2e`, output `test-results/operational-emails`.

## Comandi

From repository root:

- `pnpm --filter @pizzaos/admin dev`
- `pnpm --filter @pizzaos/admin build`
- `pnpm --filter @pizzaos/admin lint`
- `pnpm --filter @pizzaos/admin typecheck`
- `pnpm --filter @pizzaos/admin test`
- `pnpm architecture:check` from the repository root

## Environment

- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: optional Microsoft Clarity project ID. When unset, the Clarity tracking script is not rendered.
- Google tag measurement ID is currently configured as `G-CSKKSEV8MG` in `app/google-tag.tsx`.

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/admin`.
- Keep install and build aligned with the app-level `vercel.json`.

## Domini operativi: scelta approvata

La decisione [D71](../../.agents/product-definition/decisions.md) prevede `admin.pizzaos.app` per gli operatori e `rider.pizzaos.app` per i rider, entrambi nello stesso progetto e deploy di `apps/admin` per ambiente. Il rider ha un'esperienza mobile dedicata; le applicazioni frontend restano tre.

L'app seleziona ingresso e login dall'host configurato: home operatore su `PIZZAOS_APP_ORIGIN`, home rider su `PIZZAOS_RIDER_ORIGIN`. I percorsi `/operazioni` e `/rider` restano nell'app; sugli host distinti il percorso dell'altra area torna alla home locale. `/accesso` mostra il login dedicato e fissa il ritorno nella propria area, anche in presenza di parametri URL diversi. La navigazione rider mostra solo l'area consegne e il logout.

Il collegamento «Area rider» nel pannello consegne usa l'origine rider passata dalle pagine server alla composizione. In locale senza secondo host conserva `/rider`.

Le pagine verificano la sessione sul server prima di rendere la shell riservata: appartenenza operatore/superadmin per admin, appartenenza rider attiva per rider. Un errore del servizio non concede accesso. Le API continuano a verificare ruoli, sede e assegnazioni a ogni azione. Il proxy del dominio rider inoltra solo autenticazione e API `/v1/pilot/rider/*`; rifiuta le API amministrative. Le mutazioni richiedono Origin uguale all'host corrente, senza fidarsi di header identità o forwarded inviati dal browser. Cookie e logout restano sul rispettivo host.

Configurare entrambe le origini HTTPS esatte nello stesso progetto Vercel e aggiungerle a `PIZZAOS_ALLOWED_ORIGINS` del servizio. Servono due callback Google: `https://admin.pizzaos.app/api/pilot/auth/callback/google` e `https://rider.pizzaos.app/api/pilot/auth/callback/google`. Condividere `PIZZAOS_SERVICE_URL` e `PIZZAOS_PROXY_SECRET` nello stesso ambiente. La modalità demo resta sul dominio admin e non dà accesso al rider reale.

Lasciando vuoto `PIZZAOS_RIDER_ORIGIN`, il solo host configurato mantiene entrambi i percorsi per sviluppo/anteprima; `/accesso?area=rider` conserva il ritorno rider. Nessun dominio di anteprima è autorizzato per wildcard: impostare le origini specifiche dell'ambiente e il relativo backend di test.

Cliente, admin e rider usano lo stesso backend e database all'interno dell'ambiente; test e produzione hanno database e credenziali separati. Stato di domini, DNS e hosting: [architettura del deploy pilota](../../.agents/product-definition/architecture/pilot-deployment.md).

Verifica dei due host: `pnpm exec vitest run tests/operational-domains.test.ts` e `pnpm exec playwright test --config playwright.operational-domains.config.ts` dalla root. Quest'ultima usa un servizio isolato senza account/provider reali e due host `.localhost` sullo stesso processo Next. `PIZZAOS_BUILD_DIRECTORY` permette di isolare gli artefatti Next dai processi di sviluppo già aperti; il test usa `.next-operational-tests`, il default resta `.next`.

## Primo flusso individuale persistente

Il flusso operativo `/operazioni` usa il contratto pubblico `IndividualApi` di `@pizzaos/domain`, fornito dalla composizione attraverso un adapter HTTP same-origin. Le superfici operative sono l'esperienza predefinita della home. Il POC si apre solo con la sessione demo verificata dal servizio; `PIZZAOS_MODE` non seleziona più la modalità.

L'admin operativo condivide con il POC la sidebar, il selettore sede e la struttura della dashboard. **Ordini** mostra la coda persistente della sede con elenco e dettaglio. **Menu** e **Magazzino** gestiscono prodotti e scorte. **Profilo** raccoglie contatti, apertura ordini, fasce orarie e zone di consegna. Il superadmin trova in Profilo anche la creazione sede e l'invito operatore.

Il proxy `/api/pilot/*` raggiunge `services/checkout-api` tramite `PIZZAOS_SERVICE_URL`, `PIZZAOS_PROXY_SECRET` e `PIZZAOS_APP_ORIGIN` server-only. Le credenziali devono corrispondere alla configurazione del servizio. `/accesso` fornisce accesso italiano Google/magic link e logout protetto da CSRF; Auth.js e la persistenza appartengono al servizio. Nessuna identità o integrazione di pagamento simulata è attivabile dal browser nel runtime reale.

La feature `src/features/individual-ordering` espone configurazione tramite form di menu, ricette, ingredienti/scorte, opzioni, allergeni, fasce/capacità e bande di consegna. Il superadmin crea sedi e autorizza email operatori; gli operatori agiscono solo sulla propria sede. La coda gestisce accettazione, attesa cliente, annullamento, preparazione, ritiro/consegna, incasso contanti e ritentativo rimborsi. I contatti email/WhatsApp sono manuali.

La composizione riceve eventi SSE con cursore e usa polling di recupero; i messaggi heartbeat non ricaricano dati né modificano i form. Configurazione completa, migrazioni e dipendenze esterne sono documentate nel README del servizio.

## Demo autenticata

Su `/accesso`, l'email riservata `poc@pizzaos.app` mostra il campo password demo. Abilitare `PIZZAOS_DEMO_PASSWORD` solo nel servizio; nessuna password è predefinita. Dopo accesso la home monta `AdminShell` con dati fittizi, simulazioni e reset, accompagnata da una barra `Modalità demo` con `Esci`. Gli accessi ordinari mantengono Google/magic link e ruoli operativi reali.

`src/composition/session-mode.ts` verifica la sessione con il servizio; il middleware riporta alla home demo chi apre `/operazioni` o `/rider` con quella sessione. Tutte le API operative rifiutano le sessioni demo, anche con URL diretti. Client e admin richiedono login distinti sui rispettivi host. `PIZZAOS_MODE` non abilita il POC.

Verifica dalla root: `pnpm exec playwright test --config playwright.session-demo.config.ts`.
