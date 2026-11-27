# Customer orders

Owns customer order presentation. `OperationalOrdersScreen`, exported from `index.ts`, renders the authenticated customer's persistent history and active orders from `IndividualApi`: purchased snapshots, delivery/pickup timeline, payment/refund states, notes, cancellation and payment reconciliation. It never advances an order locally. Composition supplies draft reorder and the existing additions capability; features do not import composition internals.

`/ordina/ordini` reuses the POC header and compact history styles, without GPS tracking, estimated arrival, feedback or a notification centre. Guest, loading, empty, transient failure and expired-session states are explicit. Refresh preserves note drafts and the last successful read; request generations discard stale results.

The separate demo `OrdersScreen` continues to use local orders, notifications, deterministic progression, simulated tracking and feedback. `orders-model` belongs to that demo; it is not used by the persistent screen.

Run `pnpm --filter @pizzaos/client test` for model, demo and persistent screen coverage. Browser acceptance: `pnpm exec playwright test --config playwright.customer-orders.config.ts` from the repository root.
