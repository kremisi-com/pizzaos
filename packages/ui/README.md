# @pizzaos/ui

## Purpose

Owns reusable UI primitives shared across PizzaOS apps.

## Ownership

This package owns:

- reusable cross-app presentational primitives
- API-stable component interfaces for shared use

This package does not own app-specific workflows.

## Public API

Entry point: `@pizzaos/ui`

Current exports from `src/index.tsx`:

- `ShellCard`
- `Button`
- `Input`
- `Dialog`
- `Card`
- `Tabs`
- `Toast`
- `Badge`
- `DataList`
- `Table`
- `StatusIndicator`

## Import Rules

- Must not import from any `apps/*` path.
- May depend on platform libraries and shared package public APIs.
- Consumers must import from `@pizzaos/ui` only, never `@pizzaos/ui/src/*`.
