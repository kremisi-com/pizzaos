# @pizzaos/client

## Purpose

Client app for the PizzaOS mobile-first ordering experience.

## Ownership

This app owns:

- route structure under `app/`
- client-facing composition and interaction flows
- client feature modules under `src/features`

This app does not own shared package APIs or admin and landing code paths.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: client route entry
- `app/menu/page.tsx`: menu browsing route with section preselection support
- `src/features/home`: mobile-first home shell, seeded demo state, and reset flow
- `src/features/menu`: section browsing, slot visibility, and product availability rendering
- `src/features/home/client-demo-state.ts`: local storage hydration and reset helpers

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Commands

From repository root:

- `pnpm --filter @pizzaos/client dev`
- `pnpm --filter @pizzaos/client build`
- `pnpm --filter @pizzaos/client lint`
- `pnpm --filter @pizzaos/client typecheck`
- `pnpm --filter @pizzaos/client test`
