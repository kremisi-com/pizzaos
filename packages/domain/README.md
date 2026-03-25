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
  `LoyaltyState`, `AnalyticsSnapshot`, `AiInsight`
- status constants and unions:
  - `PRODUCT_STATUS`, `ProductStatus`
  - `MENU_STATUS`, `MenuStatus`
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
