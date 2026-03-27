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
- `app/product/[id]/page.tsx`: product detail route with guided customization flow
- `app/cart/page.tsx`: cart review route with quantity updates and checkout entry
- `app/checkout/page.tsx`: slot, tip, mock payment, and confirmation route
- `app/orders/page.tsx`: order timeline, notifications, tracking, history, quick reorder, and post-delivery feedback route
- `app/rewards/page.tsx`: loyalty, reward, coupon, and subscription overview route
- `src/features/home`: mobile-first home shell, seeded demo state, order-like-last-time prompt, and reset flow
- `src/features/menu`: section browsing, slot visibility, and product availability rendering
- `src/features/customization`: product detail, guided stepper, pricing logic, allergens, and pairings
- `src/features/cart`: cart persistence, quantity management, and cart review UI
- `src/features/checkout`: checkout totals, validation, mock payment, and confirmation flow
- `src/features/orders`: order simulation, timeline, notifications, tracking UI, history, and reorder helpers
- `src/features/feedback`: local feedback persistence, rating helpers, and simulated Google review redirect state
- `src/features/loyalty`: loyalty helpers, coupon validation, rewards UI, and subscription messaging
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
