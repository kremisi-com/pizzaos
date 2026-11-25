# Landing App Requirements

## Overview

The landing app sells PizzaOS as a product, not as a technical demo. It must persuade a prospect, explain the value
proposition clearly, and route the viewer into the demo surfaces.

## Primary Outcome

- Make PizzaOS feel credible, differentiated, and visually polished within the first screen and scroll.

## Audience

- Prospects evaluating restaurant software
- Investors or stakeholders watching a short demo
- Restaurant owners who need to understand the product quickly

## Experience Principles

- Editorial and visually memorable
- Product-focused, not feature-dump driven
- Strong storytelling with clear value hierarchy
- Responsive, with excellent desktop presentation and solid mobile behavior

## Functional Requirements

### Core Messaging

- Present a clear value proposition for PizzaOS as an all-in-one platform for ordering, marketing, and analytics.
- Reinforce differentiation:
  - no commission positioning
  - customer ownership
  - native automation
  - data-driven decision making

### Hero Section

- Display the main value proposition in Italian.
- Include at least two CTAs:
  - one demo-driving CTA that routes to another app
  - one CTA that triggers an in-page modal or form

### Product Story Sections

- Include an "advanced ordering" section covering:
  - pizza customization
  - intelligent reorder
  - dynamic menu and availability
  - collaborative ordering as a future-facing ecosystem story
- Include a marketing automation section covering:
  - inactivity discount
  - post-order retention
  - birthday engagement
  - loyalty and subscriptions
- Include a delivery and tracking section.
- Include an analytics and AI section.
- Include a restaurant operations section.
- Include an ecosystem section for out-of-scope capabilities.
- Include a differentiation section.

### Demo CTA Behavior

- Support direct navigation to the client app.
- Support direct navigation to the admin app.
- Support at least one modal or form interaction on the landing page.
- Make the CTA hierarchy obvious and demo-friendly.

### Content Requirements

- Use Italian throughout the page.
- Use generic PizzaOS branding only.
- Do not reference any source restaurant brand from the UX foundation input.

### Visual Requirements

- Use the shared PizzaOS brand core with the landing-specific editorial expression.
- Maintain strong visual contrast between storytelling blocks.
- Use layouts and motion that feel premium without becoming ornamental noise.

### Responsiveness

- Desktop is the strongest presentation target.
- Mobile and tablet layouts must remain polished and readable.
- CTA visibility and section comprehension must survive on smaller screens.

## Non-Functional Requirements

- Fast enough to demo comfortably.
- No dependency on backend services.
- All dynamic content can be mocked or static.
- Accessibility should be reasonable for headings, CTA focus, and content structure.

## Edge States

- Form submission success or fake request confirmation
- CTA disabled or alternate state when a route is intentionally non-primary
- Scroll-safe layouts on small screens

## Demo Acceptance

- A presenter can explain the product and open the client or admin demo from the landing page.
- A viewer understands both current POC scope and future ecosystem scope.
