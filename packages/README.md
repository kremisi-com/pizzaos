# PizzaOS Packages

## Responsibility

`packages/` owns reusable, domain-agnostic capabilities and public contracts shared by applications or services. Packages must not depend on application code or service implementations.

Consumers use public package entry points only; deep imports into another package's `src/` are not allowed.

## Package map

- [`brand`](brand/README.md) — shared brand contracts and surface theme helpers.
- [`ui`](ui/README.md) — reusable UI primitives and shared component interfaces.
- [`domain`](domain/README.md) — shared domain types, status constants, and transport-neutral contracts.
- [`mock-data`](mock-data/README.md) — deterministic seeds, simulation helpers, and demo persistence helpers.
- [`testing`](testing/README.md) — deterministic shared test helpers.
- [`eslint-config`](eslint-config/README.md) — shared ESLint presets.
- [`typescript-config`](typescript-config/README.md) — shared TypeScript presets.

## Ownership rules

- Shared code must remain genuinely domain-agnostic unless the package explicitly owns the public domain contract.
- Business logic must not be moved into a package only to make it reachable from multiple apps.
- `brand` owns the shared visual contract; app-specific composition remains in the owning app.
- `domain` owns contracts and types, not rendering or persistence.
- `mock-data` owns deterministic demo state, not production repositories or route composition.
- Configuration packages remain configuration-only.

## Verification

From the repository root:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:workspaces`
- `pnpm architecture:check`

Read the affected package README before changing its public exports, dependencies, or ownership.
