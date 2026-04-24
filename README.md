# PizzaOS Monorepo

PizzaOS is a frontend-only proof of concept built as a Turborepo with three separate Next.js apps:

- `landing`: product storytelling and marketing
- `client`: customer ordering experience
- `admin`: restaurant operations and insights

All three surfaces are part of one ecosystem but remain runtime-independent for demo clarity.

## Workspace Map

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

## Demo Narrative

1. `landing` introduces PizzaOS and its value.
2. `client` shows the ordering flow from the customer perspective.
3. `admin` shows operational and insight workflows using simulated local data.

## Commands

- `pnpm dev`: run all apps in parallel with Turborepo
- `pnpm build`: run workspace builds
- `pnpm lint`: run workspace lint checks
- `pnpm typecheck`: run workspace type checks
- `pnpm test`: run Vitest suites
- `pnpm test:workspaces`: run package and app test scripts through Turbo
- `pnpm e2e`: run Playwright tests

## Vercel Deployment

Deploy each app as a separate Vercel project:

- `client` -> `apps/client`
- `admin` -> `apps/admin`
- `landing` -> `apps/landing`

Use `pnpm install` for install and `pnpm build` for build in each project. The app-level `vercel.json` files keep those commands explicit.

## Ownership Boundaries

- `apps/*`: routing, page composition, and app-specific UX
- `packages/brand`: shared brand contracts and theme utilities
- `packages/ui`: shared reusable UI primitives
- `packages/domain`: shared domain types and helpers
- `packages/mock-data`: deterministic seeds and simulation helpers
- `packages/testing`: shared test helpers
- `packages/eslint-config`: lint config presets
- `packages/typescript-config`: TypeScript config presets

## Import Rules

- Apps can import from shared package public entry points only (for example `@pizzaos/domain`).
- Apps must not import from other apps.
- Shared packages must not import from app code.
- Shared packages should not deep-import internal `src` paths from other packages.

## TypeScript And Next.js Boundaries

- Root `tsconfig.json` defines workspace project references for navigation and editor safety.
- App `tsconfig.json` files define local `@/*` aliases and references to shared packages.
- Every app `next.config.ts` defines `transpilePackages` for shared workspace packages.
