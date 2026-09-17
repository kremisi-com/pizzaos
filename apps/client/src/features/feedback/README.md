# Order feedback

Owns persisted ratings and comments associated with customer orders. The model exposes load, save, clear, submit, and lookup operations, plus the state used for the simulated Google review redirect prompt.

The orders screen decides when to offer feedback; this module owns its data and eligibility rules. It does not submit reviews to an external service. Feedback has a separate local storage key from the order seed.

Run `pnpm --filter @pizzaos/client test` for feedback model coverage.
