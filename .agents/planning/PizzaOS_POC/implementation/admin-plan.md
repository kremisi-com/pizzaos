# Admin App Implementation Plan

## Checklist

- [x] Step 1: Build the admin shell, seeded operator state, store switching, and reset flow.
- [ ] Step 2: Implement the live-feeling orders dashboard.
- [ ] Step 3: Implement order detail and kitchen or bar routing views.
- [ ] Step 4: Implement menu and product management with multi-menu support.
- [ ] Step 5: Implement dynamic pricing controls and inventory visibility.
- [ ] Step 6: Implement marketing tools, coupon creation, and loyalty overview.
- [ ] Step 7: Implement analytics, heatmap, AI insights, and local simulated update loops.
- [ ] Step 8: Implement delivery simulation, integration placeholders, and end-to-end admin polish.

## Step 1: Build the admin shell, seeded operator state, store switching, and reset flow

**Objective**

Create the desktop-first operational shell and the base multi-store context.

**Implementation guidance**

- Build the app shell, sidebar or top navigation, and dense dashboard layout primitives.
- Load a default seeded store.
- Implement the store switcher so changing store loads a different dataset.
- Add explicit reset or reseed behavior.

**Test requirements**

- Add unit tests for store switching and reset behavior.
- Add component tests for the shell and switcher rendering.

**Integration with previous work**

- Uses the shared platform and creates the context all later admin features depend on.

**Demo**

- The admin app opens into a credible operator dashboard and visibly changes context when the store is switched.

## Step 2: Implement the live-feeling orders dashboard

**Objective**

Make the admin surface feel operationally active as soon as it loads.

**Implementation guidance**

- Build the orders board or list with status grouping as appropriate.
- Simulate incoming updates or refresh behavior locally.
- Surface priority and status clearly.

**Test requirements**

- Add unit tests for queue derivation and simulated update logic.
- Add component tests for order rows, status badges, and empty states.

**Integration with previous work**

- Extends the shell with the most important operator workflow.

**Demo**

- A presenter can open the admin dashboard and show orders appearing active and organized without backend connectivity.

## Step 3: Implement order detail and kitchen or bar routing views

**Objective**

Show that PizzaOS helps the restaurant process orders operationally, not just display them.

**Implementation guidance**

- Add order detail with products, notes, and priority.
- Add kitchen and bar separation based on item type.
- Allow local simulated status progression.

**Test requirements**

- Add unit tests for routing derivation between kitchen and bar.
- Add component tests for order detail rendering and status update interactions.

**Integration with previous work**

- Builds on the orders board and gives it operational depth.

**Demo**

- A presenter can open an order, explain its routing, and move it through a believable preparation flow.

## Step 4: Implement menu and product management with multi-menu support

**Objective**

Demonstrate control over the offer structure, not just order handling.

**Implementation guidance**

- Build CRUD-like mock forms for products.
- Support multiple menus such as lunch, dinner, and seasonal.
- Add product image upload UI and mock AI image generation UI.
- Keep edits local and demo-safe.

**Test requirements**

- Add component tests for product forms, menu switching, and mock image actions.
- Add unit tests for menu view-model helpers.

**Integration with previous work**

- Connects the operational dashboard to catalog management and future merchandising control.

**Demo**

- A presenter can edit a product, switch menus, and show both upload and AI image generation placeholders.

## Step 5: Implement dynamic pricing controls and inventory visibility

**Objective**

Show operational optimization and stock awareness as part of the admin value story.

**Implementation guidance**

- Add a dynamic pricing toggle or configuration card.
- Add inventory tables or cards with low-stock and unavailable states.
- Visually connect stock pressure to product availability where useful.

**Test requirements**

- Add unit tests for pricing flag state and inventory alert derivation.
- Add component tests for low-stock, unavailable, and toggle states.

**Integration with previous work**

- Reuses menu and product concepts while adding business optimization visibility.

**Demo**

- A presenter can show inventory pressure and explain how dynamic pricing is enabled in the product vision.

## Step 6: Implement marketing tools, coupon creation, and loyalty overview

**Objective**

Bring retention and promotional control into the operator story.

**Implementation guidance**

- Build coupon creation for fixed or percentage discounts.
- Build automation cards for inactivity, post-order, and birthday triggers.
- Add a loyalty overview panel.

**Test requirements**

- Add unit tests for coupon form helpers and automation rule formatting.
- Add component tests for marketing cards and coupon creation states.

**Integration with previous work**

- Completes the operational story beyond kitchen and inventory into customer growth tooling.

**Demo**

- A presenter can create a coupon and explain how PizzaOS handles retention scenarios from the admin side.

## Step 7: Implement analytics, heatmap, AI insights, and local simulated update loops

**Objective**

Deliver the strongest post-order value moment in the admin app.

**Implementation guidance**

- Build analytics overview cards and top-clicked product summaries.
- Add a fake heatmap visualization.
- Add static AI suggestion cards.
- Simulate local updates to analytics and insights based on admin-side order events.

**Test requirements**

- Add unit tests for analytics delta calculations and insight selection logic.
- Add component tests for chart, heatmap, and AI suggestion rendering.
- Add E2E coverage for the scenario where admin data visibly changes after simulated order progression.

**Integration with previous work**

- Uses order, inventory, and marketing context to make the admin app feel intelligent and outcomes-oriented.

**Demo**

- A presenter can show that after order activity, the dashboard and AI panels react in a way that reinforces the PizzaOS
story.

## Step 8: Implement delivery simulation, integration placeholders, and end-to-end admin polish

**Objective**

Finish the admin app with the final operational and ecosystem signals needed for demo completeness.

**Implementation guidance**

- Build rider assignment and basic tracking simulation.
- Add the Deliveroo placeholder integration panel.
- Refine empty states, copy, spacing, motion, and reset behavior.
- Ensure all major admin sections feel connected within one coherent shell.

**Test requirements**

- Add Playwright coverage for store switch, orders dashboard, analytics, and delivery placeholder visibility.
- Add component tests for placeholder and no-data states.

**Integration with previous work**

- Finalizes the operational suite and completes the admin demo surface.

**Demo**

- The admin app is ready for a full walkthrough covering orders, menus, inventory, marketing, analytics, AI, and
delivery.
