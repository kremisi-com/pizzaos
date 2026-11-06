# Pilot analytics

Owns the server-side terminal-order journal and the five approved analytics (D59/D60). The ordering repository is decorated with `withPilotAnalytics` before constructing the ordering service; the analytics service reads the same durable repository.

The journal records a completion/cancellation timestamp and immutable order-value/product snapshots inside the ordering transaction. Existing terminal orders without a journal timestamp are excluded; creation time is never used as a substitute. Refund retries do not move the cancellation date. The repository's rollback and cross-process serialization guarantees remain authoritative.

`createPilotAnalyticsService` authorizes the authenticated actor against the store's operator memberships or configured superadmin emails. A rider-only identity has no operator membership and cannot read the report. The HTTP composition exposes `GET /v1/pilot/stores/:id/analytics?period=...&fromDate=...&throughDate=...`. `PilotAnalyticsError` supplies its stable code and HTTP status (401/403/404/400) for the public error envelope.

Calendar filters use the configured store `timeZone` (IANA), including DST. Legacy pilot stores without that field use `Europe/Rome` for compatibility. Reports contain no customer contact details or payment-provider identifiers.

Focused verification from the repository root:

```powershell
pnpm exec vitest run services/checkout-api/src/analytics/analytics.test.ts
```

Runtime wrapping, HTTP route registration, store-timezone configuration, and admin composition are integration steps owned by the coordinator. Unit checks alone do not verify those paths or a deployment.
