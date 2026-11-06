# Pilot analytics panel

Owns the Italian presentation of the five approved metrics for the selected store: completed orders, sales including delivery, average completed-order value, cancellations, and product quantities. Values come exclusively from the injected `PilotAnalyticsApi` port; authorization and calculation stay in the owning service.

The composition supplies the selected store and `createPilotAnalyticsApi()` from its API module. The adapter calls the same-origin `/api/pilot/v1/pilot/stores/:id/analytics` proxy with credentials and cache disabled. The panel supports today, last 7/30 days, and inclusive custom dates, with loading, empty, retry, and stale-response handling. It does not use the existing mock analytics, AI text, or export controls.

Focused verification from the repository root:

```powershell
pnpm exec vitest run apps/admin/src/test/pilot-analytics.test.tsx
```
