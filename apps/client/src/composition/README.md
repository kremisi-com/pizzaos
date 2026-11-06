# Client composition

This module owns the client home shell, app-wide demo state, and the local implementation of `ClientApiContract`. `client-shell.tsx` coordinates the home, reorder, and reset flow. `client-demo-state.ts` exposes load, save, reset, and storage-key helpers. `api/local-client-api.ts` exposes the deterministic adapter; `api/client-api-provider.tsx` mounts it for the customer UI.

Feature screens may use the provider and demo-state contract. The existing ordering flow also contains direct imports between feature models; those remain coupled until a dedicated workflow refactor. Verify this module with `pnpm --filter @pizzaos/client test` and `pnpm --filter @pizzaos/client typecheck`.

`session-mode.ts` selects the POC only after service verification of the origin-bound demo session. The root layout mounts the local API provider only in demo, exposes its banner/logout and selects the matching navigation. Middleware protects legacy POC routes; the default home uses the persistent ordering composition. Real and demo carts keep separate storage contracts. Access configuration and browser acceptance commands are in the app README.

`group-ordering-shell.tsx` monta la raccolta live `/ordina/gruppo` con i port HTTP `GroupOrderingApi` e `IndividualApi`. Legge l'invito dal frammento URL; il trasporto same-origin inoltra i cookie personali HttpOnly senza esporre capability al JavaScript. Roster, scadenza, quote e tentativo checkout restano autorevoli nel servizio. La schermata gruppo effettua polling revisionato e usa il checkout individuale canonico, distinto dal precedente POC locale.

Le shell live individuale e gruppo forniscono anche `PromotionsApi` tramite `api/promotions-api.ts`; il saldo proprio arriva dal servizio, la selezione commerciale passa nel carrello/fulfillment e il riepilogo usa il breakdown canonico. Il repository locale demo non viene montato nel percorso promozioni persistente.
