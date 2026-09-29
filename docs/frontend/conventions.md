# Frontend conventions

## Stack

- Next.js App Router for applications.
- Turborepo for workspace orchestration.
- Radix Primitives for accessible behavior where needed.
- `@pizzaos/brand` and vanilla-extract contracts for shared themes and tokens.
- CSS Modules or SCSS Modules for app-local composition.
- Tailwind CSS is not used.

## Composition

Routes belong to the owning app. Reusable UI belongs in `@pizzaos/ui` only when it is genuinely app-agnostic. Cross-feature coordination belongs to the app composition boundary, not to a shared utility container.

Use `@/` for app-local imports where configured and public `@pizzaos/*` entry points for workspace packages. Never deep-import package `src/` files.

## Product language and state

Product-facing copy is Italian. Production state follows service contracts and server ownership. Browser persistence is reserved for explicitly browser-owned state; deterministic demo data belongs to `@pizzaos/mock-data` or the owning app boundary.
