# Catalog management

Owns the operator view for menus and products, including menu settings and product editing. `CatalogManager` receives menus and products and reports saved changes through update callbacks. Product editing derives allergen labels from ingredient contracts.

Admin composition owns the active store dataset and persists accepted updates. Ingredient seed choices come from `@pizzaos/mock-data`; this feature does not own inventory quantities or client menu rendering.

Run `pnpm --filter @pizzaos/admin test` for catalog management coverage.
