# @pizzaos/brand

## Purpose

Owns shared PizzaOS visual contracts and app-surface theme helpers.

## Ownership

This package owns:

- cross-app brand-level theme contracts
- surface theme selection helpers

This package does not own app-specific layout or feature composition.

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
