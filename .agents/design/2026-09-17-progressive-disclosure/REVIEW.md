# Final architectural review

## Resulting ownership

- `apps/admin/src/composition` owns the admin shell and coordination across operational features. The admin route imports that shell.
- `apps/client/src/composition` owns the client home shell, local API adapter and provider, and app-wide demo persistence. Client routes and feature screens retain their existing observable flows.
- `packages/domain/src/index.ts` is a public re-export entry. `model.ts` owns entity/status definitions and behavior; `client-api-contracts.ts` depends on the model without importing the entry point.
- Landing's single storytelling feature, other shared packages, and the existing checkout service retain their ownership. The root README now includes the service.

## Boundary review

The architecture command scans source imports for cross-app dependencies, package-to-app dependencies, service implementation imports, deep shared-package imports, admin feature-to-composition imports, and circular source dependencies. No checked violation remains. Package public entry points are unchanged. The moves did not change routes, local-storage keys, seed shapes, copy, styling, or simulation timing.

## Remaining trade-offs and documented exceptions

- Client ordering feature screens still import sibling feature models directly. They are a coupled workflow today. Consolidating them would require a separate behavior-covered extraction and was outside this migration's safe structural unit.
- Client screens import the app-level demo-state and API provider contracts. This is an intentional interim dependency on composition while the local POC state model is in use.
- `services/checkout-api` and the payment-related client code already exist despite the original frontend-only POC plan. They were retained unchanged; the root and service READMEs document the deviation.
- `packages/domain/src/model.ts` remains a broad model file. Splitting entities into more conceptual modules may improve future navigation, but no new domain boundary was invented merely to classify types.

## Documentation changed

Updated root, admin, client, domain, and checkout-service READMEs. Added README files at the two new app composition boundaries. The landing and other package READMEs already describe their current ownership.

## Verification

Admin, client, landing, and domain app/package suites pass. `pnpm architecture:check`, repository lint, typecheck, and production build pass. The root test suite is the final aggregate gate. Visual inspection of the live demo was omitted in accordance with `AGENTS.md`; the user provides screenshots for visual review.
