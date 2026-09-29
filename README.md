# PizzaOS Monorepo

PizzaOS is a Turborepo monorepo with three independently owned product surfaces:

- `landing`: product storytelling and marketing
- `client`: customer ordering
- `admin`: restaurant operations and insights

The applications share brand contracts and reusable packages while keeping separate routes, composition boundaries, and UX expressions. Server-side checkout and payment behavior belongs to `services/checkout-api`.

## Repository map

```text
AGENTS.md
apps/
  README.md
  landing/README.md + AGENTS.md
  client/README.md + AGENTS.md
  admin/README.md + AGENTS.md
packages/
  README.md
  <package>/README.md
services/
  README.md
  checkout-api/README.md + AGENTS.md
docs/
  architecture/ownership.md
  frontend/conventions.md
  frontend/design-system.md
  testing/strategy.md
```

## Reading the repository

Start from the nearest README for the module being changed and read its local `AGENTS.md` when present. Load child documentation only when directly relevant. The root [`AGENTS.md`](AGENTS.md) is the global context router; [`docs/`](docs/) contains cross-cutting guidance.

## Commands

- `pnpm dev`: run all workspace apps in parallel with Turborepo
- `pnpm build`: run workspace builds
- `pnpm lint`: run workspace lint checks
- `pnpm typecheck`: run workspace type checks
- `pnpm test`: run Vitest suites
- `pnpm test:workspaces`: run package and app test scripts through Turbo
- `pnpm e2e`: run Playwright tests
- `pnpm architecture:check`: check workspace import boundaries and circular dependencies

## Deployment

Deploy each app as a separate Vercel project with its app directory as the root:

- `client` → `apps/client`
- `admin` → `apps/admin`
- `landing` → `apps/landing`

Service setup and runtime requirements are documented in [`services/checkout-api/README.md`](services/checkout-api/README.md).
