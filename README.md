# PizzaOS Monorepo

PizzaOS is a Turborepo monorepo with three independently owned product surfaces:

- `landing`: product storytelling and marketing
- `client`: customer ordering
- `admin`: restaurant operations and insights

The applications share brand contracts and reusable packages while keeping separate routes, composition boundaries, and UX expressions. Durable pilot identity, catalog/configuration, individual orders, checkout, payments and restaurant operations belong to `services/checkout-api`.

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

Per maturità, perimetro e prove partire dallo [stato corrente e punto zero](.agents/product-definition/current-state.md). Flussi e casi limite sono nell'[inventario](.agents/product-definition/flow-inventory.md); la [roadmap](.agents/product-definition/roadmap.md) contiene il lavoro residuo. La pianificazione superata è nell'[archivio](.agents/archive/README.md).

## Commands

- `pnpm dev`: run all workspace apps in parallel with Turborepo
- `pnpm build`: run workspace builds
- `pnpm lint`: run workspace lint checks
- `pnpm typecheck`: run workspace type checks
- `pnpm test`: run Vitest suites
- `pnpm test:workspaces`: run package and app test scripts through Turbo
- `pnpm e2e`: run Playwright tests
- `pnpm architecture:check`: check workspace import boundaries and circular dependencies
- `pnpm exec playwright test --config playwright.individual.config.ts`: verify the durable individual ordering flow across client and admin with an isolated test service

## Durable pilot

Customer `/ordina` and restaurant `/operazioni` use the same authoritative checkout service and are the default experience. Both apps expose `/poc` for password-protected demo access; `/accesso` also accepts the dedicated demo account `poc@pizzaos.app`. Demo sessions use local fictional data and simulated payments, and cannot call operational APIs. See [demo access and the operational interfaces](.agents/product-definition/flows/poc-and-interface.md) and [service setup](services/checkout-api/README.md). No stores or operators are automatically seeded in the live runtime: the configured superadmin creates the pilot store and grants operator access through admin.

## Deployment

Deploy each app as a separate Vercel project with its app directory as the root:

- `client` → `apps/client`
- `admin` → `apps/admin`
- `landing` → `apps/landing`

La scelta approvata [D71](.agents/product-definition/decisions.md) assegna `admin.pizzaos.app` agli operatori e `rider.pizzaos.app` ai rider nella stessa applicazione `apps/admin`, sullo stesso progetto e deploy frontend per ambiente. Restano tre applicazioni e tre deploy frontend, con un servizio backend separato. Client, due ingressi operativi e `api.pizzaos.app` sono pubblicati sul pilota test; produzione e test hanno database e credenziali separati. Il 5 novembre 2026 è stato verificato il [percorso online cliente → admin → rider](services/checkout-api/online-client-verification.md), con Stripe Elements, challenge 3DS ed email operative consegnate. Versioni, limiti residui e risorse sono nel [registro online](services/checkout-api/online-deployment.md) e nel [piano del pilota](.agents/product-definition/architecture/pilot-deployment.md).

Service setup and runtime requirements are documented in [`services/checkout-api/README.md`](services/checkout-api/README.md).
