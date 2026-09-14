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

Current exports from `src/index.ts`:

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

- Must not import from `apps/*`.
- Should remain low-level and dependency-light.
- Consumers must import from `@pizzaos/domain` only.
