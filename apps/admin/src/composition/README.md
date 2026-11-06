# Admin composition

This module owns the admin application shell and coordination between operational features. `AdminFrame` shares the POC sidebar, store selector placement and layout between the demo `AdminShell` and the live `IndividualOperationsShell`. Only `AdminShell` loads and persists the deterministic demo seed and runs the simulation. Operational feature behavior and UI remain in `src/features`; shared data contracts remain in packages.

`operational-host` resolves the exact server-configured admin/rider origins. `operational-page` and `operational-access` guard route rendering using authoritative service sessions without caching identity. Live routes compose `IndividualOperationsShell` or `RiderShell`; `AdminShell` remains the service-authorized demo. The same-origin proxy selects the validated host origin and restricts the rider host to auth and rider endpoints. See the [app README](../../README.md) for environment setup and domain verification.

Verify with `pnpm --filter @pizzaos/admin test`, `pnpm --filter @pizzaos/admin typecheck`, and the two-host acceptance commands in the app README.

`IndividualOperationsShell` possiede la selezione sede, la coda condivisa da Dashboard, Ordini e Consegne, e gli aggiornamenti. La Dashboard usa la griglia del POC con ordini, vendite e rider della sede. `PilotOperationalPanels` collega le voci Marketing, Analytics & AI, Consegne e Integrazioni agli strumenti persistenti. Marketing riceve il catalogo della sede dalla composizione e usa il port `PromotionsApi`.

«Email operative» si trova in Integrazioni e riceve `OperationalEmailApi` da `api/operational-email-api.ts`. È una lettura del servizio, con polling e aggiornamento operativo. Menu, Magazzino e Profilo espongono le rispettive sezioni della configurazione persistente della sede.

`session-mode.ts` verifies demo sessions through the service. The home mounts `AdminShell` only in demo; ordinary access keeps the operational entry point. The root layout identifies the demo and offers logout; middleware prevents that session from opening persistent operations or rider routes. No operational adapter is mounted by the demo shell. See the app README for configuration and end-to-end verification.
