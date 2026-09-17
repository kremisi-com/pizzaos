# Customer orders

Owns order history, the status timeline, deterministic local progression, notifications, tracking presentation, and reorder behavior. `orders-model` exposes simulation and notification operations; `OrdersScreen` presents active and archived orders.

The client demo state stores orders, while notifications have their own local storage key. Reorder writes to the cart, and post-delivery feedback uses the feedback module. Tracking is simulated locally; this feature does not communicate with the admin app.

Run `pnpm --filter @pizzaos/client test` for order model and screen coverage.
