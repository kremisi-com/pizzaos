# @pizzaos/domain

## Purpose

Owns shared domain types and constants used across all PizzaOS surfaces.

## Ownership

This package owns:

- shared domain-level type contracts
- shared domain constants
- deterministic domain helpers for simulation-safe behavior

This package does not own app-specific rendering concerns.

## Public API

Entry point: `@pizzaos/domain`

`src/index.ts` is the stable public entry. The entity and status model lives in `src/model.ts`; client API contracts import that model directly, so the entry point has no internal dependency cycle.

Current exports from `src/index.ts`:

- durable pilot boundary: `IndividualApi` and `Individual*` shapes for store configuration, recipes, cart/quote, checkout, order lifecycle, additional-payment/refund ledger, session, and resumable events. This narrower live contract deliberately excludes unresolved demo capabilities from `ClientApiContract`; apps inject its HTTP implementation through their own composition. It contains no database/provider implementation and no persisted payment secrets.
- `GroupOrderingApi`, `GroupSnapshot`, `GroupParticipant`, `GroupFulfillment`, `GroupQuote` e `GroupCheckout`: port live per raccolta condivisa, revisioni, chiusura e checkout canonico dell'organizzatore. Il riepilogo ospite espone nomi e scelte, senza contatti o capability personali; il trasporto custodisce queste ultime in cookie HttpOnly.

- app shell primitives: `APP_SURFACES`, `AppSurface`, `AppShellSeed`
- shared entity contracts: `Money`, `Product`, `Menu`, `Order`, `StoreProfile`, `InventoryItem`, `Coupon`,
  `LoyaltyState`, `AnalyticsSnapshot`, `AiInsight`, `SlotAvailability`
- identity and checkout contracts: `CustomerProfile`, `DeliveryAddress`, customer/operator demo sessions, and immutable
  order contact and fulfillment snapshots
- client frontend API boundary: `ClientApiContract`, with typed request and response contracts for catalog, cart,
  session, catalog, cart, checkout, orders and reorders, loyalty, rewards, and order tracking. The POC satisfies this boundary through local
  deterministic state; it does not make network calls. `getLiveUpdates` defines a cursor-based, revisioned event
  envelope for order timeline, product/slot availability, and rider tracking. It is transport-neutral (polling, SSE,
  or WebSocket) and carries server-authoritative availability conflicts for production checkout retries.
- status constants and unions:
  - checkout: `OrderStatus` include `pending_payment`; `PaymentAttempt` e `PaymentAttemptStatus` separano l'esito
    pagamento dall'avanzamento operativo dell'ordine
  - `PRODUCT_STATUS`, `ProductStatus`
  - `PREPARATION_MODES`, `PreparationMode`
  - `MENU_STATUS`, `MenuStatus`
  - `SLOT_AVAILABILITY_STATUSES`, `SlotAvailabilityStatus`
  - `ORDER_STATUS`, `OrderStatus`
  - `INVENTORY_STATUS`, `InventoryStatus`
  - `COUPON_STATUS`, `CouponStatus`
  - `AI_INSIGHT_STATUS`, `AiInsightStatus`
- deterministic order simulation helpers:
  - `ORDER_STATUS_TRANSITIONS`
  - `getNextOrderStatuses`
  - `isOrderStatusTransitionAllowed`
  - `progressOrderStatus`

## Import Rules

Pilot extensions are public through this package entry point: `PilotAnalyticsApi` and its calendar/report types describe the five store metrics; `RiderDeliveryApi` exposes minimized own-delivery operations; `DeliveryAdminApi` describes store-operator rider management and assignment. Rider memberships are distinct from operator `IndividualSession.storeIds`. `IndividualStore.timeZone` is optional for compatibility with existing pilot stores and is validated by the owning service.

- Must not import from `apps/*`.
- Should remain low-level and dependency-light.
- Consumers must import from `@pizzaos/domain` only.

`PromotionsApi` owns coupon/program administration and the authenticated own wallet. `PromotionSelection` extends individual carts and group host fulfillment; authoritative `PromotionBreakdown` extends quotes. Browser inputs carry only codes/reward selection, never discounts, points or customer identity.
