# @pizzaos/admin

## Purpose

Admin app for PizzaOS operations and insight-oriented workflows.

## Ownership

This app owns:

- route structure under `app/`
- admin composition and operational UX patterns
- admin feature modules under `src/features`

This app does not own shared package internals or other app surfaces.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: admin route entry
- `src/features/home`: initial admin shell composition
- `src/features/orders`: live orders dashboard, order details, and kitchen/bar routing

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Commands

From repository root:

- `pnpm --filter @pizzaos/admin dev`
- `pnpm --filter @pizzaos/admin build`
- `pnpm --filter @pizzaos/admin lint`
- `pnpm --filter @pizzaos/admin typecheck`
- `pnpm --filter @pizzaos/admin test`
