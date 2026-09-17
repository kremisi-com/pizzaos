# Marketing

Owns the operator view for coupons, loyalty configuration, automation cards, and the Dynamic Pricing control. `MarketingManager` receives current settings and reports user actions through callbacks; the local formatting and coupon helpers belong here.

Admin composition owns persisted store data. Automation and price optimization are simulations for the demo, with no external campaign execution or automatic pricing service.

Run `pnpm --filter @pizzaos/admin test` for marketing manager and helper coverage.
