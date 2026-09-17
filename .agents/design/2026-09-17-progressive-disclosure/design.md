# Progressive disclosure architecture

## Current architecture and ownership

The three Next.js apps own routes and UI. The package layer owns brand, UI primitives, domain contracts, deterministic demo data, and test utilities. `services/checkout-api` is a separate Fastify service already present in the repository. It is included by `pnpm-workspace.yaml` but omitted from the root workspace map and the POC's frontend-only plan. Preserve it and its checkout behavior in this structural migration.

The admin `home` feature currently owns the entire admin shell and imports nine sibling feature implementations. The client `home` feature owns persistence and a shell that coordinate other features, while the app-level `src/api` adapter coordinates multiple feature models. These locations make a reader load a feature that does not own the workflow. Client feature screens also import sibling models directly. This is an existing coupling and is recorded for later extraction; changing those workflows here would enlarge the behavior risk substantially.

The domain public entry also has an internal type-import cycle with `client-api-contracts.ts`. Move the model behind the entry point and have the contract file depend on that model directly.

## Target tree

```text
apps/
  admin/
    app/                       # routes
    src/composition/           # admin shell and cross-feature orchestration
    src/features/              # operational feature UI and local behavior
  client/
    app/                       # routes and provider mounting
    src/composition/           # home shell, local API, and demo state coordination
    src/features/              # customer feature UI and local behavior
  landing/
    app/                       # routes
    src/features/home/         # single landing story
packages/
  brand/ ui/ domain/ mock-data/ testing/  # domain index re-exports an acyclic model and API contracts
  eslint-config/ typescript-config/
services/
  checkout-api/               # existing service, no runtime migration
```

## Dependency rules

- Routes import app composition or the feature that owns their page.
- Composition may depend on feature public behavior and shared package entry points. Features must not depend on composition implementation; the existing client API provider hook is an explicit temporary exception because it is the mounted application port.
- Shared packages depend only on other shared package public entry points, never apps or services. Apps do not import other apps.
- Do not introduce new sibling feature imports. Existing client ordering-flow imports remain a documented migration trade-off; their consolidation requires a separate workflow refactor with dedicated behavior coverage.

## Migration and verification

1. Move admin orchestration out of `home`, retaining its route, state transitions, CSS, and tests.
2. Move the client shell, API adapter, and demo persistence into app composition, retaining imports, storage keys, and tests.
3. Update the nearest READMEs and root map. Add an architecture guard for the new boundaries. Run unit tests, typechecks, and lint. Review import graph and docs.
4. Break the domain public-entry cycle without changing its exports.

The refactor changes no user-facing routes, copy, styling, stored data shape, simulation timing, or service API. The checkout service is an intentional documented exception to the original POC scope, not a new capability of this migration.
