# Checkout

Owns the customer checkout screen and the rules for totals, delivery or pickup slots, contact snapshot, tips, validation, payment attempt identity, and order creation. `checkout-model` exposes the calculation and validation behavior; the screen coordinates cart, group-order, loyalty, menu availability, and client demo state.

The local demo flow persists an order through app composition. Card fields are rendered through Stripe Elements when configured; raw card data must not enter demo storage or domain contracts. This feature does not own post-order progression or the separate checkout service.

Run `pnpm --filter @pizzaos/client test` for checkout model, screen, and payment-attempt coverage.
