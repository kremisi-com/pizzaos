# Ownership and dependency boundaries

PizzaOS is organized by conceptual ownership and lifecycle.

| Area | Owns | Must not own |
| --- | --- | --- |
| `apps/` | Routes, page composition, app-specific UX, and within-app coordination | Sibling app code or service implementations |
| `packages/` | Reusable domain-agnostic capabilities and public contracts | Application behavior or service persistence |
| `services/` | Server capabilities, persistence, payments, and external integrations | App rendering or browser state |

## Dependency direction

Applications consume package public APIs and explicit service boundaries. Packages remain independent from applications and service implementations. Sibling modules collaborate through their lowest meaningful common owner or through an explicit public contract.

## Coordination points

- App-level `src/composition` coordinates features that belong to the same app.
- `@pizzaos/domain` owns shared contracts and transport-neutral types.
- `@pizzaos/brand` owns shared visual contracts; surface-specific composition remains in each app.
- `@pizzaos/mock-data` owns deterministic demo seeds and simulations.
- `services/checkout-api` owns payment attempts, checkout persistence, and idempotency.

The repository architecture check is implemented by `scripts/check-architecture.mjs` and is part of the root verification workflow.
