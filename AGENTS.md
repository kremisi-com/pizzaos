# AGENTS.md

## Mission

Build the PizzaOS Proof of Concept as a visually strong, frontend-only monorepo with three separate apps:

- `landing`
- `client`
- `admin`

The goal is to impress in demo while keeping implementation lightweight, mock-driven, and easy for humans and AI agents
to navigate.

## Read This First

Before making architectural or feature decisions, read these planning artifacts:

- `.agents/planning/PizzaOS_POC/requirements/shared-requirements.md`
- `.agents/planning/PizzaOS_POC/requirements/landing-requirements.md`
- `.agents/planning/PizzaOS_POC/requirements/client-requirements.md`
- `.agents/planning/PizzaOS_POC/requirements/admin-requirements.md`
- `.agents/planning/PizzaOS_POC/design/detailed-design.md`
- `.agents/planning/PizzaOS_POC/design/landing-design.md`
- `.agents/planning/PizzaOS_POC/design/client-design.md`
- `.agents/planning/PizzaOS_POC/design/admin-design.md`
- `.agents/planning/PizzaOS_POC/implementation/plan.md`
- `.agents/planning/PizzaOS_POC/implementation/landing-plan.md`
- `.agents/planning/PizzaOS_POC/implementation/client-plan.md`
- `.agents/planning/PizzaOS_POC/implementation/admin-plan.md`

If implementation and code diverge from the planning docs, prefer updating the planning docs or explicitly documenting the
reason for the deviation.

## Product Constraints

- All three apps have equal demo priority.
- The apps are part of one PizzaOS ecosystem, but they must remain separate app surfaces.
- The demo narrative is:
  - landing introduces PizzaOS
  - client shows customer ordering
  - admin shows restaurant operations and insights
- The POC is frontend-only:
  - no real backend
  - no real payments
  - no real AI
  - no real GPS tracking
  - no real external integrations
  - no real app-to-app communication
- Admin-side updates that appear to follow client-side orders must be simulated locally in the admin app.
- Every feature from the brief must appear at least in navigable form, even if simulated or placeholder-based.
- Use Italian in product-facing UI and content.
- Never mention the restaurant name from the UX foundation source document anywhere in product code, copy, docs, or mocks.

## Repository Shape

The target repository structure is:

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

Use feature-first organization inside each app under the route layer.

Example:

```text
apps/client/
  app/
  src/
    features/
      menu/
      checkout/
      loyalty/
```

## Ownership Rules

- `apps/*` own routes, page composition, and app-specific UX.
- `packages/brand` owns tokens, themes, and brand-level visual contracts.
- `packages/ui` owns reusable primitives and shared components.
- `packages/domain` owns shared domain models and helpers.
- `packages/mock-data` owns seeds, fixtures, simulation helpers, and reset logic.
- `packages/testing` owns shared test helpers and fixtures.

Do not put app-specific business logic into shared packages unless it is genuinely shared across at least two apps.

Do not make packages depend on apps.

Prefer small public APIs and avoid deep imports across packages.

## Frontend Stack

- `Next.js` App Router for all apps
- `Turborepo` for the monorepo
- `Radix Primitives` for accessibility and behavior
- `vanilla-extract` for shared themes and styling contracts
- `CSS Modules` or `SCSS Modules` for app-local composition

Do not use Tailwind CSS.

## Visual Direction

One brand core, three controlled surface expressions:

- `landing`: editorial premium food
- `client`: warm tech premium
- `admin`: bold operational SaaS

These are theme and composition variants of one system, not three unrelated design systems.

Do not flatten the three apps into one generic visual language.
Do not make them so different that they stop feeling like PizzaOS.

## UX Priorities

### Landing

- Product storytelling first
- Strong hero and CTA hierarchy
- Responsive, but strongest on desktop

### Client

- Mobile-first
- Fast reorder and fast ordering
- Clear availability, pricing, allergens, and slot visibility
- Guided customization without clutter

### Admin

- Desktop-first
- Operational clarity and information density
- Real store switching across distinct datasets
- Strong analytics and AI value story, even if simulated

## State And Simulation Rules

- Persist local state with `localStorage`.
- Every app must have a curated seeded starting state.
- Every app must support explicit demo reset or reseed behavior.
- Simulations should be deterministic enough to test reliably.
- Use mock data and local timers instead of fake network complexity unless a feature explicitly benefits from a mock API
shape.

## Documentation Requirements

Maintain:

- root `README.md`
- one `README.md` per app
- one `README.md` per shared package

README files should explain:

- purpose
- ownership boundaries
- public API or feature map
- how to run or test the area

Do not add feature-level README files unless there is a strong reason.

## Testing And Delivery Rules

Use a TDD mindset.

Baseline stack:

- `Vitest`
- `React Testing Library`
- `Playwright`

For every implementation step:

- add or update tests with the feature, not afterward
- keep the codebase working at the end of the step
- ensure the increment is manually demoable

Do not create long stretches of orphaned code that are not yet wired into the app.

## Coding Expectations

- Keep files and functions small enough to stay readable.
- Prefer clear names over short names.
- Avoid duplication across apps when the logic is truly shared.
- Keep comments rare and useful.
- Use constants for repeated fixed values.
- Keep lines reasonably short.

## Agent Workflow

When working on a task:

1. Read the relevant requirement, design, and implementation-plan documents first.
2. Confirm which app or shared package owns the change.
3. Implement the smallest complete increment that matches the current plan step.
4. Add or update tests in the same change.
5. Verify the step is demoable.
6. Update documentation if public behavior, structure, or commands changed.
7. After everything is done, run a final check that the change matches the plan, tests pass, and the demo works.
8. Mark the task as complete in the implementation plan document, and optionally add a note if there were any deviations or discoveries during implementation that are worth recording for future reference.
9. Run `git status` to confirm only expected files are changed, and the changes are properly staged for commit. If necessary, update the `.gitignore` to avoid accidentally including files that should not be committed.
10. Commit the changes after each task, using the git standard commit message format, providing a clear short title, a thorough description of the changes and referencing any relevant issue or task IDs.

## What Not To Do

- Do not introduce a real backend as part of the POC.
- Do not couple the apps together at runtime.
- Do not add Tailwind.
- Do not bypass the shared brand system with ad hoc global styles.
- Do not bury mock data inside random components.
- Do not use placeholder UIs that cannot be navigated when the plan expects interactive behavior.
- Do not reference the source restaurant brand from the UX input.

## Definition Of Done

A change is done when:

- it matches the relevant planning document
- tests for the new behavior exist and pass
- the increment is demoable
- the appropriate README coverage remains accurate
- the change preserves the AI-friendly repository boundaries
