# Group order

Owns the locally persisted group roster, participant contributions, shared summary, and group-order screen. The model exposes load, save, line, quantity, and subtotal operations. It reuses cart line types while keeping a separate storage key.

The share link and QR treatment are demo interactions; they do not invite remote participants. The host's checkout is coordinated by the checkout feature. This module does not own the individual cart.

Run `pnpm --filter @pizzaos/client test` for group-order model and screen coverage.
