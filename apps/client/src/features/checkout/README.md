# Checkout

Owns the customer checkout screen and the rules for totals, delivery or pickup slots, contact snapshot, tips, validation, payment attempt identity, and order creation. `checkout-model` exposes the calculation and validation behavior; the screen coordinates cart, group-order, loyalty, menu availability, and client demo state.

The authenticated POC persists a fictional order through app composition. Both card and cash payments are simulated; this checkout never loads Stripe, renders card fields, or calls the operational service. The separate `individual-ordering` feature owns the real Stripe Elements flow. This feature does not own post-order progression or the separate checkout service.

Run `pnpm --filter @pizzaos/client test` for checkout model, screen, and payment-attempt coverage.
