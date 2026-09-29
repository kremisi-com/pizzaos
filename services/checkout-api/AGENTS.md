# Checkout API Agent Guidelines

## Service invariants

- Keep database access, Stripe clients, credentials, and reconciliation logic server-side.
- Preserve idempotent checkout behavior keyed by customer and `Idempotency-Key`.
- The service remains authoritative for payment attempts and operational checkout status.
- Return only provider-safe payment data. Raw card numbers, CVCs, and secrets must never enter request persistence, shared domain contracts, browser storage, or logs.
- Keep the HTTP boundary explicit and versioned under `/v1`.

## Dependency boundaries

- The service may consume public `@pizzaos/domain` contracts.
- It must not import from `apps/*` or package internals.
- Applications must integrate through the HTTP contract, not service implementation imports.

## Required verification

Run `pnpm typecheck`, `pnpm build`, and `pnpm test` from `services/checkout-api`. When the contract or persistence behavior changes, also run the affected client tests and `pnpm architecture:check` from the repository root.
