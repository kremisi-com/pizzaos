# @pizzaos/domain

## Purpose

Owns shared domain types and constants used across all PizzaOS surfaces.

## Ownership

This package owns:

- shared domain-level type contracts
- shared domain constants

This package does not own app-specific rendering concerns.

## Public API

Entry point: `@pizzaos/domain`

Current exports from `src/index.ts`:

- `APP_SURFACES`
- `AppSurface`
- `AppShellSeed`

## Import Rules

- Must not import from `apps/*`.
- Should remain low-level and dependency-light.
- Consumers must import from `@pizzaos/domain` only.
