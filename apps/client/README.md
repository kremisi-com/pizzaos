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
- `src/features/home`: initial client shell composition

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
