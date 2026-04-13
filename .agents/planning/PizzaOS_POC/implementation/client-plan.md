# Client App Implementation Plan

## Checklist

- [X] Step 1: Build the client shell, seeded home state, and demo reset flow.
- [X] Step 2: Implement menu browsing with availability and slot visibility.
- [X] Step 3: Implement product detail and pizza customization.
- [X] Step 4: Implement cart, checkout, mock payment, and tip flow.
- [X] Step 5: Implement order status, notifications, and rider tracking.
- [X] Step 6: Implement order history, quick reorder, and "order like last time".
- [X] Step 7: Implement loyalty, rewards, coupons, and subscription UI.
- [X] Step 8: Implement feedback prompts, selected edge states, and end-to-end demo polish.

## Step 1: Build the client shell, seeded home state, and demo reset flow

**Objective**

Establish the mobile-first app shell and the fast-entry home experience for a returning customer.

**Implementation guidance**

- Build the app shell, navigation, and mobile viewport rhythm.
- Load seeded customer state on first visit.
- Surface immediate reorder and "build your pizza" entry points.
- Implement explicit reset or reseed behavior.

**Test requirements**

- Add component tests for the home screen and reorder prompt.
- Add unit tests for seed hydration and reset logic.

**Integration with previous work**

- Uses the shared brand, UI, domain, and mock-data packages established in the shared plan.

**Demo**

- The client app opens directly into a believable logged-in state with visible reorder and new-order paths.

## Step 2: Implement menu browsing with availability and slot visibility

**Objective**

Make the customer understand what can be ordered and when, without ambiguity.

**Implementation guidance**

- Build mobile-first menu browsing by category or section.
- Show available and sold-out products without removing sold-out items.
- Surface raw versus cooked treatment where relevant.
- Show available and sold-out slots in a visually clear way.

**Test requirements**

- Add component tests for product cards, sold-out states, and slot display.
- Add unit tests for availability derivation and slot formatting helpers.

**Integration with previous work**

- Extends the home entry points into a usable menu experience.

**Demo**

- A presenter can open the menu, browse products, and immediately understand product availability and slot pressure.

## Step 3: Implement product detail and pizza customization

**Objective**

Deliver the richest customer interaction in the app without losing clarity.

**Implementation guidance**

- Build the product detail experience.
- Implement dough selection, ingredient customization, variants, extras, allergens, and pairing suggestions.
- Keep total price visible as the configuration changes.
- Prefer a guided step flow rather than a dense all-at-once form.

**Test requirements**

- Add unit tests for pricing logic and customization reducers.
- Add component tests for allergen visibility, step progression, and price updates.

**Integration with previous work**

- Builds directly on the menu layer and creates a ready-to-purchase configured product.

**Demo**

- A presenter can fully customize a pizza, see the price update live, and add it to the cart confidently.

**Implementation note**

- The pizza preview now persists both dough and base selection (`rossa` or `bianca`) and uses those choices to resolve deterministic images from `apps/client/public/images/pizza`.
- The product detail overlay now resolves the topping image from the selected menu product, so `/product/[id]` stays visually aligned with the previous selection.
- The product detail page now includes a free-text "Note per la cucina" field near the bottom of the flow and appends that message to the cart line notes alongside the structured customization summary.

## Step 4: Implement cart, checkout, mock payment, and tip flow

**Objective**

Complete the core order placement journey from configured product to confirmed order.

**Implementation guidance**

- Build the cart review experience.
- Build checkout with slot selection, payment simulation, and tip selection.
- Show confirmation immediately after order placement.

**Test requirements**

- Add unit tests for cart totals, slot selection, and tip application.
- Add component tests for checkout validation and confirmation rendering.
- Add E2E coverage for the main order flow through confirmation.

**Integration with previous work**

- Converts configured products into a complete order and unlocks post-order features.

**Demo**

- A presenter can place a full mock order, including slot choice and tip, and reach a convincing confirmation state.

**Implementation note**

- Cart line items now persist removed base ingredients as structured metadata and render them in cart review as `Senza: ...`, separate from dough/base/format notes.

## Step 5: Implement order status, notifications, and rider tracking

**Objective**

Make the post-order experience feel alive and trustworthy.

**Implementation guidance**

- Implement order timeline states from preparation to delivered.
- Add in-app notifications for major state changes.
- Show rider tracking only when the order reaches a relevant state.
- Use deterministic fake movement or position snapshots for the map card.

**Test requirements**

- Add unit tests for order state progression and notification generation.
- Add component tests for timeline and tracking visibility.

**Integration with previous work**

- Builds on the placed order from checkout and creates the post-order demo story.

**Demo**

- After checkout, the order advances through visible states and eventually shows a fake rider tracking experience.

## Step 6: Implement order history, quick reorder, and "order like last time"

**Objective**

Support the repeat-customer narrative that is central to PizzaOS.

**Implementation guidance**

- Build order history and archived orders.
- Add quick reorder actions from history.
- Add the "order like last time" behavior on app open or via a prominent entry point.

**Test requirements**

- Add unit tests for order cloning and reorder helpers.
- Add component tests for history rendering and reorder CTA behavior.
- Add E2E coverage for a reorder-driven path.

**Integration with previous work**

- Reuses the checkout and order creation flow rather than duplicating purchase logic.

**Demo**

- A presenter can reopen the app and demonstrate fast repeat ordering with minimal steps.

**Implementation note**

- The `orders` route no longer renders the hero CTA `Ordina come l'ultima volta`; repeat ordering remains available from the home prompt and each order detail card via `Riordina veloce`.

## Step 7: Implement loyalty, rewards, coupons, and subscription UI

**Objective**

Show the retention and monetization layer of the customer product.

**Implementation guidance**

- Build points overview and redeemable rewards.
- Add coupon entry and generated coupon presentation.
- Add a subscription plan UI such as monthly pizza plan messaging.
- Keep these features connected to the main order story rather than feeling isolated.

**Test requirements**

- Add unit tests for coupon application and loyalty point presentation helpers.
- Add component tests for rewards, coupon states, and subscription card rendering.

**Integration with previous work**

- Extends the existing customer account and checkout journey with retention features.

**Demo**

- A presenter can show loyalty balance, apply a coupon, and explain the subscription concept without breaking the flow.

## Step 8: Implement feedback prompts, selected edge states, and end-to-end demo polish

**Objective**

Finish the client app as a polished, demo-ready mobile product.

**Implementation guidance**

- Add post-delivery feedback prompt and simulated Google review redirect behavior.
- Implement selected edge states:
  - empty cart
  - sold-out slot
  - invalid coupon
  - no tracking before dispatch
- Refine transitions, spacing, copy, and reset behavior.

**Test requirements**

- Add E2E coverage for the full happy path and at least one selected edge-state path.

**Implementation note**

- The cart summary footer was refined into a full-width bottom band without the previous outlined card, keeping the checkout CTA more contemporary and visually aligned with the mobile-first client polish goals.
- Add component tests for feedback and empty or invalid states.

**Integration with previous work**

- Completes the app by connecting the end of the order journey back into retention and trust loops.

**Demo**

- The client app is ready for a full walkthrough from first open to feedback, with credible edge cases available when
needed.

**Implementation note**

- Menu-level dough and base selection cards keep a light surface even when selected; selection is communicated through
  the check marker, accent border, and elevation so labels stay legible in the mobile customization teaser.
- The menu header now uses a dedicated group emoji CTA that routes to `/group-order`, matching the existing "Ordina con
  i tuoi amici" narrative from the client home and avoiding a dead-end demo link.
- The `/group-order` hub now presents a shared-cart narrative with inline QR placeholder, copy-link CTA, and QR
  visibility toggle so the group-order demo reads as self-serve ordering from each guest's phone.
