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
- `app/page.tsx`: admin route entry and section orchestration
- `src/features/home`: shell composition, top-level KPIs, and store reset actions
- `src/features/store-switch`: multi-store selector with deterministic local dataset switching
- `src/features/orders`: live orders dashboard, order details, kitchen/bar routing, and cross-POC narrative alignment (`demoOrderRef` + milestone cliente)
- `src/features/catalog`: menu and product management with editable prezzo/ingredienti and allergeni derivati
- `src/features/inventory`: ingredient-first stock table, operational alerts, and replenishment actions
- `src/features/marketing`: coupon, loyalty, automation cards, and Dynamic Pricing controls
- `src/features/analytics`: "Analytics and AI" surface with animated trend charts, enriched insights, and AI live typing simulation
- `src/features/delivery`: rider assignment and local tracking simulation
- `src/features/integrations`: supported-only placeholder integrations for the POC scope
- `src/features/profile`: profilo ristoratore con piano attivo, cambio piano simulato, e stato fatturazione mock persistito

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

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/admin`.
- Keep install and build aligned with the app-level `vercel.json`.
