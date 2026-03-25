# @pizzaos/mock-data

## Purpose

Owns deterministic seed factories and mock simulation utilities.

## Ownership

This package owns:

- seed factories for app demo starting states
- shared mock helpers used by app surfaces

This package does not own rendering or app route composition.

## Public API

Entry point: `@pizzaos/mock-data`

Current exports from `src/index.ts`:

- `createLandingSeed()`
- `createClientSeed()`
- `createAdminSeed()`

## Import Rules

- May import shared domain contracts from `@pizzaos/domain`.
- Must not import from `apps/*`.
- Consumers must import from `@pizzaos/mock-data` only.
