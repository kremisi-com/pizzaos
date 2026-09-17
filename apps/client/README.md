# @pizzaos/client

## Purpose

Client app for the PizzaOS mobile-first ordering experience.

## Ownership

This app owns:

- route structure under `app/`
- client-facing composition and interaction flows
- client feature modules under `src/features`
- app-level local API and demo-state coordination under `src/composition`

This app does not own shared package APIs or admin and landing code paths.

The frontend boundary for catalog, cart, checkout, orders, loyalty, and tracking is defined in
`@pizzaos/domain` through `ClientApiContract`. `src/composition/api/local-client-api.ts` is the current deterministic repository:
it adapts the existing mock seeds and local persistence to the contract. A future HTTP repository can replace the
provider implementation without changing feature-facing API calls.

## Aggiornamenti operativi

Nel POC la schermata ordini avanza con timer locali deterministici: è intenzionale e rende la demo ripetibile. Il
confine `ClientApiContract` espone comunque `getLiveUpdates`, con cursore riprendibile ed eventi versionati per stato
ordine, disponibilità prodotto, slot e tracking. In produzione il repository HTTP potrà usare polling, SSE o WebSocket
senza cambiare le feature UI. La timeline, le revisioni e i conflitti di disponibilità sono server-authoritative:
un checkout che trova uno slot o un prodotto non più disponibile riceve un conflitto tipizzato (`slot_unavailable`,
`product_unavailable` o `inventory_changed`) e deve ricaricare il catalogo prima di un nuovo tentativo.

## Feature Map

- `app/layout.tsx`: root metadata and layout shell
- `app/page.tsx`: client route entry
- `app/menu/page.tsx`: menu browsing route with section preselection support
- `app/group-order/page.tsx`: group order locale con contributi personali, riepilogo partecipanti e checkout unico dell'host
- `app/product/[id]/page.tsx`: product detail route with guided customization flow
- `app/cart/page.tsx`: cart review route with quantity updates and checkout entry
- `app/checkout/page.tsx`: contatti per ordine, consegna/ritiro, slot, tip, mock payment, and confirmation route
- `app/orders/page.tsx`: order timeline, notifications, tracking, history, quick reorder, and post-delivery feedback route
- `app/rewards/page.tsx`: loyalty, reward, coupon, and subscription overview route
- `src/composition/client-shell.tsx`: mobile-first home shell, reorder prompt, and reset UI
- [`src/features/menu`](src/features/menu/README.md): menu browsing
- [`src/features/customization`](src/features/customization/README.md): product choices
- [`src/features/cart`](src/features/cart/README.md): individual cart
- [`src/features/group-order`](src/features/group-order/README.md): local group cart
- [`src/features/checkout`](src/features/checkout/README.md): checkout flow
- [`src/features/orders`](src/features/orders/README.md): customer order lifecycle
- [`src/features/feedback`](src/features/feedback/README.md): post-order ratings
- [`src/features/loyalty`](src/features/loyalty/README.md): points and rewards
- `src/features/products`: extended catalog view using menu and cart behavior
- `src/features/navigation`: bottom navigation
- `src/composition/client-demo-state.ts`: local storage hydration and reset helpers
- `src/composition/api/local-client-api.ts`: local `ClientApiContract` repository for catalog, cart, checkout, orders, loyalty,
  coupons, group order, and tracking
- `src/composition/api/client-api-provider.tsx`: contract provider consumed by client UI features

## Pagamenti reali

La carta è raccolta esclusivamente da Stripe Elements. Configurare `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` nel client e
`DATABASE_URL`, `STRIPE_SECRET_KEY`, `CLIENT_ORIGIN` nel servizio `@pizzaos/checkout-api`; nessun segreto Stripe o
numero carta deve essere inserito in `localStorage`, props, contratti di dominio o log. Il backend è la source of truth
per tentativi, idempotenza e conferma operativa.

## Shared Dependencies

- `@pizzaos/brand`
- `@pizzaos/domain`
- `@pizzaos/mock-data`
- `@pizzaos/ui`

## Commands

From repository root:

- `pnpm --filter @pizzaos/client dev`
- `pnpm --filter @pizzaos/client build`
- `pnpm --filter @pizzaos/client lint`
- `pnpm --filter @pizzaos/client typecheck`
- `pnpm --filter @pizzaos/client test`
- `pnpm architecture:check` from the repository root

## Environment

- `NEXT_PUBLIC_CLARITY_PROJECT_ID`: optional Microsoft Clarity project ID. When unset, the Clarity tracking script is not rendered.
- Google tag measurement ID is currently configured as `G-VVZ3HVXHX8` in `app/google-tag.tsx`.

## Vercel

- Create a dedicated Vercel project for this app.
- Set `Root Directory` to `apps/client`.
- Keep install and build aligned with the app-level `vercel.json`.
- Use `GET /api/deploy-probe` on any assigned domain to confirm that a request reaches the client app. A Vercel-level
  403 before this route responds points to project/domain protection or DNS routing outside the app code.
