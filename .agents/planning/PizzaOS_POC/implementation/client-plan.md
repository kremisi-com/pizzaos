# Client App Implementation Plan

## Checklist

- [ ] Step 1: Build the client shell, seeded home state, and demo reset flow.
- [ ] Step 2: Implement menu browsing with availability and slot visibility.
- [ ] Step 3: Implement product detail and pizza customization.
- [ ] Step 4: Implement cart, checkout, mock payment, and tip flow.
- [ ] Step 5: Implement order status, notifications, and rider tracking.
- [ ] Step 6: Implement order history, quick reorder, and "order like last time".
- [ ] Step 7: Implement loyalty, rewards, coupons, and subscription UI.
- [ ] Step 8: Implement feedback prompts, selected edge states, and end-to-end demo polish.

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
- Add component tests for feedback and empty or invalid states.

**Integration with previous work**

- Completes the app by connecting the end of the order journey back into retention and trust loops.

**Demo**

- The client app is ready for a full walkthrough from first open to feedback, with credible edge cases available when
needed.
