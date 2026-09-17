# Inventory

Owns the operator's ingredient stock view, shortage indicators, and replenishment action. `InventoryManager` receives inventory and ingredient records and reports an item update through a callback.

Admin composition owns the selected store dataset and persists stock changes. Product editing belongs to catalog; this feature presents stock state and does not change product definitions.

Run `pnpm --filter @pizzaos/admin test` for inventory management coverage.
