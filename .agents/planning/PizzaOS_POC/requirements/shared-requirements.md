# Shared Requirements

## Overview

This document defines the shared requirements for the PizzaOS Proof of Concept across all three apps:

- `landing`
- `client`
- `admin`

It consolidates the outcomes of the requirements clarification process and sets the non-negotiable constraints that
every implementation stream must respect.

## Product Goals

- Present PizzaOS as a credible, nearly final product brand.
- Impress prospects or investors in a short guided demo.
- Show perceived coverage of the full restaurant operating flow.
- Keep technical complexity low by using mocked data and simulated behavior.

## Success Criteria

- All three apps have equal demo priority.
- The main demo narrative works end-to-end:
  - user discovers PizzaOS on the landing page
  - user orders in the client app
  - restaurant operator manages the order in the admin app
- The admin app also shows simulated analytics and AI insights updates after the order narrative.
- Nearly every feature from the brief is visible in a navigable form.
- The demo is repeatable through explicit reset or reseed behavior.

## Shared Product Constraints

- PizzaOS is presented as one product ecosystem with separate domains.
- The repository must be a `Turborepo` monorepo with three separate Next.js apps.
- Shared packages are required for UI, brand tokens, domain types, mock data, and utilities.
- The POC uses Italian for UI and marketing copy.
- The client app is mobile-first.
- The landing app is strongly responsive.
- The admin app is desktop-first.
- Access is immediate in all apps, with the user already assumed to be logged in.
- The POC optimizes for the happy path but must include selected edge states.

## Shared Technical Constraints

- Frontend only, with no real backend integration.
- Local persistence through `localStorage`.
- Mock APIs and static or seeded data only.
- No real payments.
- No real AI.
- No real GPS tracking.
- No real marketing automation.
- No real external delivery integrations.
- No real app-to-app communication in the POC.
- Admin updates that appear related to client orders must be simulated locally.

## Shared Architecture Requirements

- Use `Next.js` with the App Router for all three apps.
- Use a monorepo layout with `apps/*` and `packages/*`.
- Keep app-specific code inside each app and shared contracts inside packages.
- Organize app code by feature under the route layer.
- Add a root README, one README per app, and one README per shared package.
- The repository structure must remain AI-friendly and easy to scan.

## Shared Frontend Requirements

- Do not use Tailwind CSS.
- Use a hybrid component strategy:
  - accessible headless or primitive-based components
  - internal shared design system
  - app-local composition where visual expression differs
- Maintain one PizzaOS brand core with three surface expressions:
  - landing: editorial premium food
  - client: warm tech premium
  - admin: bold operational SaaS

## Shared Demo Requirements

- Every app must start from a curated demo state.
- Every app must provide an explicit reset or reseed path.
- Each app must feel coherent on its own, even without real cross-app integration.
- Shared domain language must remain consistent across apps.
- CTA behavior from the landing page may mix:
  - navigation to client or admin app
  - modal or form interactions inside the landing page

## Shared Testing Requirements

- Implementation planning must follow a TDD mindset.
- Baseline testing stack:
  - Vitest
  - React Testing Library
  - Playwright
- Each implementation step must produce a working demoable increment.
- Each implementation step must define manual demo criteria.
- Testing must be embedded in each step, not deferred to the end.

## Shared Information Architecture Requirements

- Recommended workspace structure:

```text
apps/
  landing/
  client/
  admin/

packages/
  brand/
  ui/
  domain/
  mock-data/
  testing/
  eslint-config/
  typescript-config/
```

- Each app should expose a clear feature map.
- Shared packages must have small, explicit public APIs.
- Deep imports across packages should be avoided.

## Shared Domain Requirements

- Domain types must be shared across apps where concepts overlap.
- Mock data must support:
  - customer ordering
  - order lifecycle simulation
  - inventory visibility
  - coupon and loyalty views
  - analytics and AI insight cards
  - multi-store admin switching with real dataset differences
- Demo state must be resettable without manual localStorage cleanup.

## Non-Goals

- Production-grade authentication
- Production-grade backend architecture
- Real-time synchronization between apps
- Real billing or accounting flows
- Real delivery platform integrations
- Real predictive AI or machine learning

## Traceability To Clarified Decisions

- Equal priority: Q1
- Separate domains: Q2-Q3
- Visual impact first: Q4
- Nearly everything navigable: Q5, Q14
- Strong PizzaOS branding: Q6
- Demo centered on a single pizzeria scenario: Q7, Q10
- Device priorities: Q8-Q9
- Main demo narrative: Q12
- Shared packages: Q13
- Resettable demo: Q15
- Mixed landing CTA behavior: Q16
- TDD baseline: Q17
- Success criteria: Q18
- Unified brand with surface variants: Q19
- README baseline: Q20
- Hybrid component strategy and no Tailwind: Q21-Q22
- Real multi-store switching in admin: Q23
- Immediate access: Q24
- Happy path plus selected edges: Q25
