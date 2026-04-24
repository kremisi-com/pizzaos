# @pizzaos/mock-data

## Purpose

Owns deterministic seed factories and mock simulation utilities.

## Ownership

This package owns:

- seed factories for app demo starting states
- shared mock helpers used by app surfaces
- deterministic reset and reseed persistence helpers
- deterministic order simulation stepping helpers

This package does not own rendering or app route composition.

## Public API

Entry point: `@pizzaos/mock-data`

Current exports from `src/index.ts`:

- seed factories:
  - `createLandingSeed()`
  - `createClientSeed()`
  - `createAdminSeed(storeId?)`
- client seed browse state includes deterministic `slots` plus visible sold-out and preparation-mode products
- storage and recovery helpers:
  - `getDemoStateStorageKey(appId)`
  - `loadDemoState(appId, options?)`
  - `recoverPersistedDemoState(appId, persistedState, options?)`
  - `reseedDemoState(appId, options?)`
  - `resetDemoState(appId, options?)`
- deterministic simulation:
  - `advanceOrderSimulation(state, now)`
- constants:
  - `ADMIN_STORE_IDS`
  - `SUPPORTED_ORDER_STATUSES`

## Import Rules

- May import shared domain contracts from `@pizzaos/domain`.
- Must not import from `apps/*`.
- Consumers must import from `@pizzaos/mock-data` only.
