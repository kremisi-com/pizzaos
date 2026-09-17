# Client composition

This module owns the client home shell, app-wide demo state, and the local implementation of `ClientApiContract`. `client-shell.tsx` coordinates the home, reorder, and reset flow. `client-demo-state.ts` exposes load, save, reset, and storage-key helpers. `api/local-client-api.ts` exposes the deterministic adapter; `api/client-api-provider.tsx` mounts it for the customer UI.

Feature screens may use the provider and demo-state contract. The existing ordering flow also contains direct imports between feature models; those remain coupled until a dedicated workflow refactor. Verify this module with `pnpm --filter @pizzaos/client test` and `pnpm --filter @pizzaos/client typecheck`.
