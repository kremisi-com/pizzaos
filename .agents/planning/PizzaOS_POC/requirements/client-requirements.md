# Client App Requirements

## Overview

The client app is the customer ordering surface of PizzaOS. It is mobile-first, mono-brand in feel, and optimized for
speed, clarity, and repeat usage.

## Primary Outcome

- Let a customer understand the menu, customize a pizza, place a mock order, and feel guided before and after checkout.

## UX Foundation Principles

- Ordering must stay simple even when customization is rich.
- Availability, pricing, and slots must always be clear.
- The app must support recurring customers and encourage reorder.
- The app must feel reliable and reassuring, including for less digital users.

## Personas

- Primary: repeat digital customer who wants speed and reorder.
- Secondary: customization-heavy user who wants control and transparency.
- Tertiary: less digital user transitioning from phone ordering.

## Functional Requirements

### Home And Entry

- Open directly into a curated logged-in demo state.
- Immediately show paths to:
  - reorder
  - start a new order
  - build a custom pizza
- Surface promo or seasonal content without blocking ordering.
- Support "order like last time" as an auto-triggered prompt on open.

### Menu Browsing

- Show products with clear availability.
- Distinguish products or ingredients delivered raw versus cooked where relevant.
- Show sold-out products visually rather than removing them silently.
- Show time slots with visible sold-out treatment.
- Present product cards in a mobile-first browsing pattern.

### Product Detail And Customization

- Support ingredient customization.
- Support dough selection.
- Support variants and extras.
- Show allergens clearly.
- Show price feedback during customization.
- Show suggested pairings such as pizza plus beer.

### Cart And Checkout

- Add items to the cart.
- Review the cart before checkout.
- Select a delivery or pickup slot.
- Support mock payment.
- Support tip selection.
- Show immediate confirmation feedback after order placement.

### Order Lifecycle

- Show order states:
  - in preparation
  - out for delivery
  - delivered
- Show fake tracking on a static map treatment.
- Show in-app notifications for order progress.

### Order History And Reorder

- Show archived orders.
- Support fast reorder.
- Support "order like last time".

### Marketing And Loyalty

- Show points balance UI.
- Show redeemable rewards.
- Support coupon entry and generated coupons.
- Show a pizza subscription plan UI.

### Post-Order Feedback

- Prompt for feedback after delivery.
- If the user gives positive feedback, show a simulated redirect path to Google review behavior.

### Demo State

- Persist state in localStorage.
- Provide explicit demo reset or reseed behavior.

## Non-Functional Requirements

- Mobile-first responsiveness is mandatory.
- Happy-path speed and legibility take priority over maximal edge-case coverage.
- Selected edge states should still be demonstrable.
- The app must feel complete even though data is mocked.

## Edge States

- Sold-out slot
- Sold-out ingredient or product
- Empty cart
- Coupon invalid or not applicable
- No active delivery tracking before dispatch

## Demo Acceptance

- A presenter can place a convincing mock order in a few minutes on a mobile viewport.
- The app demonstrates both quick reorder and deep customization.
- The post-order experience supports the broader PizzaOS value story.
