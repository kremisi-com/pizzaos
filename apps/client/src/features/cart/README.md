# Cart

Owns the individual customer's persisted cart lines and cart review screen. `cart-model` exposes load, save, add, quantity, remove, and clear operations; the screen also consumes the client API port.

Group orders keep separate state. Checkout owns slot selection, payment, and order confirmation. This cart's storage key and line shape are part of the current demo-state contract, so changes need persistence and reorder coverage.

Run `pnpm --filter @pizzaos/client test` for cart model, screen, and local API coverage.
