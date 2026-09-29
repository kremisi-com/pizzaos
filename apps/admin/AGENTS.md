# Admin Agent Guidelines

## Product role

`admin` owns restaurant operations, configuration, analytics, and operational insights.

## UX priorities

Design desktop-first. Prioritize operational clarity, useful information density, fast navigation, store switching, analytics, order monitoring, and AI-assisted insights.

Use the bold operational SaaS expression of the shared PizzaOS brand. Favor clarity and performance over decorative presentation.

## Local constraints

- Product-facing UI and copy remain Italian.
- `src/composition` owns active-store selection, app-wide demo state, deterministic simulation, persistence, and coordination between admin features.
- Feature modules render supplied state and request changes through their public interfaces; they must not import admin composition internals.
- Keep admin code independent from `landing`, `client`, and service implementation files.
- Local operational simulations must remain deterministic and visibly resettable where the feature requires it; they must not be presented as live external integrations.

## Required verification

Run the admin lint, typecheck, test, and build commands from [`admin/README.md`](README.md), plus `pnpm architecture:check` for boundary changes.
