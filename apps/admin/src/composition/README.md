# Admin composition

This module owns the admin application shell and coordination between operational features. `AdminShell` is the route-facing public component. It loads and persists the deterministic admin seed, handles store switching and simulation, and composes feature screens. Operational feature behavior and UI remain in `src/features`; shared data contracts remain in packages.

The shell is used by `app/page.tsx`. Verify it with `pnpm --filter @pizzaos/admin test` and `pnpm --filter @pizzaos/admin typecheck`.
