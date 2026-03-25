# Shared Implementation Plan

## Checklist

- [ ] Step 1: Bootstrap the Turborepo workspace and shared toolchain.
- [ ] Step 2: Establish repository documentation and package boundaries.
- [ ] Step 3: Build the shared brand package and surface themes.
- [ ] Step 4: Implement shared domain models, mock data seeds, and reset logic.
- [ ] Step 5: Build shared UI primitives and shared testing utilities.
- [ ] Step 6: Wire the three app shells to the shared platform and verify cross-workspace quality gates.

## Step 1: Bootstrap the Turborepo workspace and shared toolchain

**Objective**

Create the monorepo foundation for `apps/landing`, `apps/client`, `apps/admin`, and the required shared packages.

**Implementation guidance**

- Set up root workspace files for Turborepo and the package manager.
- Create the three Next.js App Router apps.
- Create empty shared packages for `brand`, `ui`, `domain`, `mock-data`, `testing`, plus config packages.
- Define root scripts for dev, build, lint, typecheck, test, and e2e.

**Test requirements**

- Add workspace smoke tests or script checks proving all packages resolve correctly.
- Add a root validation run for lint, typecheck, and test commands, even if test suites are initially minimal.

**Integration with previous work**

- This step creates the skeleton all later shared and app-specific work will plug into.

**Demo**

- A presenter can run the monorepo, start each app independently, and see a minimal shell page for landing, client, and admin.

## Step 2: Establish repository documentation and package boundaries

**Objective**

Make the repository AI-friendly and implementation-safe before feature growth begins.

**Implementation guidance**

- Add the root README with workspace map, commands, and demo narrative.
- Add one README for each app and each shared package.
- Document public APIs and import rules for shared packages.
- Configure path aliases, TypeScript references, and any `transpilePackages` usage needed by the apps.

**Test requirements**

- Add a lightweight validation that README and package entry files exist where expected.
- Add import boundary tests or static checks where practical.

**Integration with previous work**

- Builds directly on the bootstrapped monorepo and prevents package sprawl before features land.

**Demo**

- A new contributor or agent can inspect the root README and package READMEs and understand where to add code without
guessing.

## Step 3: Build the shared brand package and surface themes

**Objective**

Create the shared PizzaOS brand core and the three surface expressions for landing, client, and admin.

**Implementation guidance**

- Implement token contracts for color, type, spacing, radius, motion, and elevation.
- Add theme variants for the landing, client, and admin surfaces.
- Expose a small API for applying the correct theme class or variables in each app.
- Keep app-specific layout composition out of the shared package.

**Test requirements**

- Add unit tests for theme exports and theme selection helpers.
- Add component or render tests proving each app can mount with its theme without runtime errors.

**Integration with previous work**

- This step gives visual consistency to the otherwise empty app shells and becomes the base for the shared UI layer.

**Demo**

- Each app shell renders with its own visual expression while still clearly belonging to the same PizzaOS ecosystem.

## Step 4: Implement shared domain models, mock data seeds, and reset logic

**Objective**

Create the shared data backbone that powers all simulated experiences.

**Implementation guidance**

- Define shared domain types for products, menus, orders, stores, inventory, coupons, loyalty, analytics, and AI insights.
- Create deterministic seed factories for landing, client, and admin.
- Add multi-store admin datasets with real differences.
- Implement reset or reseed helpers for each app.
- Keep time-based simulation helpers deterministic for tests.

**Test requirements**

- Unit test domain helpers, seed factories, and reset behavior.
- Add tests proving store switching changes datasets and that corrupted or missing persisted data can recover.

**Integration with previous work**

- This step powers every app-specific feature plan and removes the need to duplicate mock definitions across apps.

**Demo**

- Each app can load believable seeded content, mutate local state, and reset back to the curated starting point.

## Step 5: Build shared UI primitives and shared testing utilities

**Objective**

Create the reusable UI and testing layer that speeds up the app-specific work.

**Implementation guidance**

- Implement a base set of accessible primitives and PizzaOS-flavored wrappers.
- Focus on components used across multiple apps:
  - buttons
  - inputs
  - dialogs
  - cards
  - tabs
  - toasts
  - badges
  - tables or lists
  - status indicators
- Add a shared testing package with render helpers, storage reset helpers, and time control utilities.

**Test requirements**

- Add component tests for each shared primitive family.
- Add tests for shared testing helpers so app suites can depend on them confidently.

**Integration with previous work**

- Consumes brand tokens and domain contracts, and prepares stable building blocks for the app-specific plans.

**Demo**

- Designers and developers can preview a small shared component library styled for PizzaOS and ready to be reused by all
three apps.

## Step 6: Wire the three app shells to the shared platform and verify cross-workspace quality gates

**Objective**

Ensure all three apps can consume the shared platform cleanly before deeper feature work begins.

**Implementation guidance**

- Connect each app shell to shared brand, UI, domain, and mock-data packages.
- Set up app-level providers, layout scaffolding, and demo reset entry points.
- Configure workspace-level lint, typecheck, unit, and e2e scripts for ongoing development.

**Test requirements**

- Add smoke tests that mount each app shell using shared packages.
- Add Playwright smoke coverage for each app root route.

**Integration with previous work**

- Completes the shared platform and creates a safe launchpad for the landing, client, and admin implementation streams.

**Demo**

- A presenter can open all three apps, confirm theme separation, confirm seeded state, and use reset controls successfully.
