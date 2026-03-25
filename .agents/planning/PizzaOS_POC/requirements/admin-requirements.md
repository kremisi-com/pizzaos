# Admin App Requirements

## Overview

The admin app is the restaurant operations surface of PizzaOS. It must communicate operational control, automation, and
decision support, while remaining a frontend-only simulation.

## Primary Outcome

- Let a restaurant operator view incoming orders, manage product and inventory states, switch stores, and see simulated
analytics and AI guidance.

## Experience Principles

- Desktop-first and information-dense
- Operationally credible
- Strong hierarchy for urgent tasks
- Clear distinction between current data and future-facing placeholders

## Functional Requirements

### Access And Context

- Open directly into a logged-in demo operator state.
- Provide a multi-store selector.
- Store switching must change visible mock datasets, not just labels.

### Order Dashboard

- Show a real-time-feeling list of orders using local simulation.
- Surface order status clearly.
- Highlight priority where needed.
- Keep kitchen and bar routing visible.

### Order Detail

- Show ordered products.
- Show notes.
- Show priority.
- Support status progression in a simulated way.

### Kitchen And Bar Routing

- Split relevant preparation streams visually.
- Show which items belong to kitchen versus bar handling.

### Menu And Product Management

- Support product creation and editing in mock form.
- Support multiple menu definitions:
  - lunch
  - dinner
  - seasonal
- Support product image upload UI.
- Support mock AI image generation UI.

### Pricing

- Show dynamic pricing capability as an operator-controlled flag.
- Make it clear that automatic optimization is simulated.

### Inventory

- Show ingredient stock.
- Highlight out-of-stock products or ingredients.

### Marketing

- Support coupon creation:
  - fixed amount
  - percentage
- Show simulated automation flows:
  - inactive customer discount
  - post-order discount
  - birthday promotion
- Show loyalty overview.

### Analytics And AI

- Show sales analytics.
- Show top-clicked products.
- Show fake menu heatmap.
- Show static AI suggestions.
- Simulate analytics and AI updates after order activity within the admin app's own local state.

### Delivery

- Show rider assignment simulation.
- Show basic tracking simulation.
- Show Deliveroo integration as placeholder UI only.

## Non-Functional Requirements

- Desktop-first usability is mandatory.
- Mock updates should feel alive but remain deterministic for demo use.
- The app must remain understandable without backend knowledge.

## Edge States

- No active orders
- Store with different stock pressure
- Product marked unavailable
- Placeholder integration panel with non-connected status

## Demo Acceptance

- A presenter can switch stores and see meaningful changes.
- The operator view can tell a strong story about control, automation, and insight generation.
- The app feels like a credible admin product even with simulated data.
