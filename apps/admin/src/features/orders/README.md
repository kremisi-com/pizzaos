# Operational orders

Owns the admin order queue and detail views. The demo `OrdersDashboard` displays its supplied orders and reports status changes through its callback. `OperationalOrders` reuses the table and detail layout with persistent orders, actual contact and payment data, and the actions supported by the live service.

Admin composition owns the active store and the source of each dataset. Both views render their supplied orders and request changes through callbacks.

Run `pnpm --filter @pizzaos/admin test` for dashboard, detail, and shell integration coverage.
