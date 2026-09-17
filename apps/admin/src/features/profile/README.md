# Operator profile

Owns the store profile and simulated billing-plan view. `ProfileManager` receives the active store identity and keeps its billing demo state in a store-specific local storage entry.

The store selector and authorized store set belong to admin composition and mock data. Plan changes do not create real subscriptions, charges, or invoices.

Run `pnpm --filter @pizzaos/admin test` for profile and plan-change coverage.
