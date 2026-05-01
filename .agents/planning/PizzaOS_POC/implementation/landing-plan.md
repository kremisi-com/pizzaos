# Landing App Implementation Plan

## Checklist

- [x] Step 1: Build the landing shell, content model, and responsive layout foundation.
- [x] Step 2: Implement the hero section and primary CTA behaviors.
- [x] Step 3: Implement the advanced ordering and marketing story sections.
- [x] Step 4: Implement delivery, analytics, operations, ecosystem, and differentiation sections.
- [x] Step 5: Add motion, responsive polish, form states, and landing smoke coverage.

## Step 1: Build the landing shell, content model, and responsive layout foundation

**Objective**

Create the root landing experience structure using the shared PizzaOS brand with the landing-specific visual expression.

**Implementation guidance**

- Build the top-level layout, section rhythm, and shared editorial page shell.
- Add a typed section content configuration that can drive repeated narrative blocks.
- Use app-local composition styles for the landing-specific visual language.

**Test requirements**

- Add component tests for the root layout and section rendering from config.
- Add responsive snapshot or structural tests for primary breakpoints.

**Integration with previous work**

- Builds directly on the shared monorepo, brand, and UI layers.

**Demo**

- The landing page loads with a polished shell and a complete scrollable information architecture, even before all CTA
behavior is wired.

## Step 2: Implement the hero section and primary CTA behaviors

**Objective**

Make the first screen persuasive and usable as the entry point to the wider demo ecosystem.

**Implementation guidance**

- Implement the Italian value proposition and CTA hierarchy.
- Wire one CTA to open the client demo.
- Wire one CTA to open the admin demo.
- Implement at least one modal or form interaction for demo request or lead capture.

**Test requirements**

- Add component tests for CTA rendering, focus handling, and modal open or close behavior.
- Add E2E coverage for CTA navigation and modal submission flow.

**Integration with previous work**

- Reuses the landing shell and shared button, dialog, and form primitives.

**Demo**

- A presenter can start from the hero, open a demo request modal, and jump to either the client or admin surface.

## Step 3: Implement the advanced ordering and marketing story sections

**Objective**

Cover the most commercially persuasive customer-facing product pillars.

**Implementation guidance**

- Build the advanced ordering section with customization, reorder, availability, and collaborative ordering future story.
- Build the marketing automation section with loyalty, subscriptions, and automation examples.
- Use strong editorial layouts and visual contrast between blocks.

**Test requirements**

- Add component tests for section content rendering and CTA presence.
- Add checks for section navigation anchors or intra-page links if implemented.

**Integration with previous work**

- Builds on the content configuration and uses shared visual primitives without forcing shared page composition.

**Demo**

- A viewer can scroll the landing page and quickly understand both the customer ordering value and the retention value.

## Step 4: Implement delivery, analytics, operations, ecosystem, and differentiation sections

**Objective**

Complete the product story so the landing page covers the full PizzaOS value proposition.

**Implementation guidance**

- Add sections for delivery and tracking, analytics and AI, restaurant operations, broader ecosystem, and differentiation.
- Clearly separate current POC capabilities from ecosystem or future-facing capabilities.
- Keep the narrative product-centric rather than technical.

**Test requirements**

- Add section-level rendering tests and presence checks for key differentiator copy.
- Add regression coverage for any icons, cards, or comparison blocks used repeatedly.

**Integration with previous work**

- Completes the core content map and aligns the landing page with the client and admin product story.

**Demo**

- The landing page now covers the complete commercial narrative without obvious gaps.

**Implementation note**

- Added the supplied complete-platform design as a coded third landing section, immediately after the challenge section, while keeping it owned by `apps/landing`.
- Added the supplied feature-difference screen as a coded fourth landing section, immediately after the complete-platform section, with four navigable feature cards and a CTA into the existing ordering story.

## Step 5: Add motion, responsive polish, form states, and landing smoke coverage

**Objective**

Polish the landing app into a demo-ready marketing surface.

**Implementation guidance**

- Add meaningful entrance motion, section transitions, and CTA emphasis.
- Refine mobile and tablet behavior without losing desktop presence.
- Add success and failure states for the modal or form interaction.
- Tighten typography, spacing, and visual pacing.

**Test requirements**

- Add Playwright smoke tests for the full landing load, primary CTA interactions, and mobile viewport rendering.
- Add targeted tests for form success and validation states.

**Integration with previous work**

- Finalizes the landing app as the front door into the broader PizzaOS demo.

**Demo**

- The landing page is presentation-ready on desktop and still convincing on smaller screens, with working CTA paths and
clean interaction states.
