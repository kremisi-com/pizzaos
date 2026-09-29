# Testing strategy

## Test layers

- Vitest covers package, model, contract, and application behavior.
- React Testing Library covers component and screen behavior through the shared `@pizzaos/testing` helpers.
- Playwright covers critical user flows, including customer ordering and group ordering.
- `scripts/check-architecture.mjs` checks import boundaries and circular dependencies.

## Determinism

Demo seeds, clocks, local persistence, and simulations must be deterministic. Tests should use explicit reset helpers and frozen or injected time rather than relying on wall-clock timing.

## Verification commands

From the repository root:

- `pnpm test`
- `pnpm test:workspaces`
- `pnpm e2e`
- `pnpm architecture:check`
- `pnpm lint`
- `pnpm typecheck`

Use the nearest app, package, or service README for narrower commands while iterating.
