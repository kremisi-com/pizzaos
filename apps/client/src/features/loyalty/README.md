# Loyalty and rewards

Owns customer-facing points, tiers, redeemable rewards, coupon presentation and application rules, and subscription messaging. The model exposes the derived reward and coupon behavior; `RewardsScreen` presents the seeded account state.

Checkout consumes coupon and earned-points calculations. App composition owns persistence of the client demo seed. This feature does not implement real billing or marketing automation.

Run `pnpm --filter @pizzaos/client test` for loyalty model and rewards screen coverage.
