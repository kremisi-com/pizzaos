# @pizzaos/testing

## Purpose

Owns shared test helpers for reusable validation patterns.

## Ownership

This package owns:

- framework-agnostic test helpers
- shared test utility wrappers used across apps and packages

This package does not own app runtime feature logic.

## Public API

Entry point: `@pizzaos/testing`

Current exports from `src/index.ts`:

- `StorageAdapter`
- `InMemoryStorage`
- `createInMemoryStorage(initialData?)`
- `resetStorage(storage)`
- `resetStorageKeys(storage, keys)`
- `renderForTest(element)`
- `withFrozenDateNow(isoTimestamp, callback)`
- `createDeterministicClock(startIso, stepMilliseconds)`

## Import Rules

- Must not import from `apps/*`.
- Keep helpers deterministic and side-effect constrained.
- Consumers must import from `@pizzaos/testing` only.
