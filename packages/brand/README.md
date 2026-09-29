# @pizzaos/brand

## Purpose

Owns shared PizzaOS visual contracts and app-surface theme helpers.

## Ownership

This package owns:

- cross-app brand-level theme contracts
- surface theme selection helpers

This package does not own app-specific layout or feature composition.

## Design system role

PizzaOS has one shared brand core with three controlled surface expressions:

- `landing`: editorial premium food
- `client`: warm tech premium
- `admin`: bold operational SaaS

The package owns the shared theme contracts and token mapping. Surface-specific layout, copy, UX priorities, and composition remain owned by the corresponding application. See [`docs/frontend/design-system.md`](../../docs/frontend/design-system.md) for the cross-surface design model.

## Public API

Entry point: `@pizzaos/brand`

Current exports from `src/index.ts`:

- `SURFACE_THEME_CLASS`
- `SURFACE_THEME_TOKENS`
- `getThemeClass(surface: AppSurface): string`
- `getSurfaceThemeTokens(surface: AppSurface): SurfaceThemeTokens`
- `getThemeStyleVariables(surface: AppSurface): Record<\`--pizzaos-${string}\`, string>`

## Import Rules

- Allowed to import from `@pizzaos/domain` public API.
- Must not import from any `apps/*` path.
- Consumers must import from `@pizzaos/brand` only, never `@pizzaos/brand/src/*`.
