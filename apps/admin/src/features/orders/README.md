# Operational orders

Owns the admin order queue and detail view, including status, priority, kitchen or bar routing, rider context, and `demoOrderRef` visibility. `OrdersDashboard` accepts orders and products and reports status changes through its callback.

Admin composition owns the active store, deterministic arrival simulation, persistence, and status mutation. This feature renders the supplied store dataset and requests changes; it does not read client-app state.

Run `pnpm --filter @pizzaos/admin test` for dashboard, detail, and shell integration coverage.
