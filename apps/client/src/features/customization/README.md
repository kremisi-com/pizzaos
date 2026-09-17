# Product customization

Owns the guided pizza choices, price breakdown, allergen presentation, pairing suggestions, and product detail screen. The customization model exposes the selection state, reducer, and derived prices used by the client journey.

The menu supplies product availability. Cart and group order own persisted lines after a choice is added; the client API adapter coordinates those writes. Ingredient and product contracts come from `@pizzaos/domain`.

Run `pnpm --filter @pizzaos/client test` for customization model and product detail coverage.
