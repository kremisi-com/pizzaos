# PizzaOS Applications

## Responsibility

`apps/` owns the three user-facing PizzaOS surfaces: routing, page composition, app-specific UX, and coordination of features within each application.

Each application has its own lifecycle and visual expression. Applications must not import code from sibling applications or from service implementations.

## Surface map

- [`landing`](landing/README.md) — product storytelling, acquisition, and marketing presentation. Read [`landing/AGENTS.md`](landing/AGENTS.md) for local design and editing constraints.
- [`client`](client/README.md) — mobile-first customer ordering. Read [`client/AGENTS.md`](client/AGENTS.md) for ordering invariants and verification.
- [`admin`](admin/README.md) — desktop-first restaurant operations and insights. Read [`admin/AGENTS.md`](admin/AGENTS.md) for operational UX constraints.

## Architecture

- Applications use Next.js App Router.
- `app/` owns route entry points and route-level composition.
- `src/composition/` coordinates app-wide state and feature composition where the app has that boundary.
- `src/features/` owns feature behavior and presentation within the application.
- Shared capabilities and contracts are consumed through public `@pizzaos/*` package entry points.
- App-local styling uses CSS Modules or SCSS Modules. Tailwind CSS is not used.

## State and simulation

Production flows use explicit service contracts and server-owned state. `localStorage` is allowed only for browser-owned state that explicitly requires local persistence.

Demo seeds and simulations remain deterministic and are owned by [`packages/mock-data`](../packages/mock-data/README.md) or the application boundary that coordinates them. Local timers and mock APIs must not hide a missing production boundary. Features that expose local simulation must provide a reset or reseed path when required by the flow.

## Verification

From the repository root:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:workspaces`
- `pnpm architecture:check`
- `pnpm e2e`

Use the relevant app-level commands from the app README when iterating on one surface.
