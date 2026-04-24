# @pizzaos/landing

## Purpose

Landing app for PizzaOS product storytelling and primary demo entry.

## Ownership

This app owns:

- route structure under `app/`
- landing-specific page composition
- landing feature modules under `src/features`

This app does not own shared tokens, domain contracts, or reusable cross-app primitives.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: landing route entry
- `src/features/home`: landing shell composition

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Commands

From repository root:

- `pnpm --filter @pizzaos/landing dev`
- `pnpm --filter @pizzaos/landing build`
- `pnpm --filter @pizzaos/landing lint`
- `pnpm --filter @pizzaos/landing typecheck`
- `pnpm --filter @pizzaos/landing test`

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/landing`.
- Keep install and build aligned with the app-level `vercel.json`.
