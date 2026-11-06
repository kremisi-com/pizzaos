# Pilot delivery operations

Owns rider-only memberships, manual assignments, failure reports, minimized rider views, and the transaction-local rider progress guard. Operator memberships remain in the canonical ordering service and are never created by a rider invitation.

`createDeliveryService` uses the existing `OrderingRepository`; its optional `delivery` state is persisted with canonical orders. The `progress` gateway must use the actual rider identity and recheck `isRiderProgressAllowed` within the same transaction that applies dispatch/completion. The canonical service retains responsibility for stock, cash settlement, and all cancellation/refund behavior.

The service must be exposed through dedicated authenticated rider endpoints. Those endpoints return `RiderDelivery`, never `IndividualOrder`. Generic operator/customer routes must not gain rider access as a side effect of the progress guard.

Design and integration checklist: [rider SDD](../../../../../.agents/design/2026-11-05-rider-deliveries/design.md).

From the repository root, run `pnpm exec vitest run services/checkout-api/src/delivery/delivery-service.test.ts`, then checkout-api typecheck/build and integration checks after runtime wiring is complete.
