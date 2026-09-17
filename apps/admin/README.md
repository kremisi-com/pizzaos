# @pizzaos/admin

## Purpose

Admin app for PizzaOS operations and insight-oriented workflows.

## Ownership

This app owns:

- route structure under `app/`
- admin composition and operational UX patterns
- admin feature modules under `src/features`
- application coordination under `src/composition`

This app does not own shared package internals or other app surfaces.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: admin route entry
- `src/composition/admin-shell.tsx`: shell composition, top-level KPIs, marketing opportunity cards, store reset, and coordination of operational features
- `src/features/store-switch`: multi-store selector with deterministic local dataset switching
- [`src/features/orders`](src/features/orders/README.md): operational orders
- [`src/features/catalog`](src/features/catalog/README.md): menu and product editing
- [`src/features/inventory`](src/features/inventory/README.md): ingredient stock
- [`src/features/marketing`](src/features/marketing/README.md): coupons and growth controls
- [`src/features/analytics`](src/features/analytics/README.md): analytics and AI presentation
- [`src/features/delivery`](src/features/delivery/README.md): delivery overview
- `src/features/integrations`: supported-only placeholder integrations for the POC scope
- [`src/features/profile`](src/features/profile/README.md): operator profile and mock billing

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
- `pnpm architecture:check` from the repository root

## Environment

- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: optional Microsoft Clarity project ID. When unset, the Clarity tracking script is not rendered.
- Google tag measurement ID is currently configured as `G-CSKKSEV8MG` in `app/google-tag.tsx`.

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/admin`.
- Keep install and build aligned with the app-level `vercel.json`.
