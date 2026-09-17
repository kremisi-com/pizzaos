# Analytics and AI presentation

Owns the admin analytics view, trend presentation, and simulated AI text. `AnalyticsManager` consumes a snapshot, insights, and products. The analytics helpers derive chart points and typing text for the visible demo.

Admin composition and mock data own store-specific values and their local simulation. This feature does not call an AI model or analytics backend.

Run `pnpm --filter @pizzaos/admin test` for analytics manager and helper coverage.
