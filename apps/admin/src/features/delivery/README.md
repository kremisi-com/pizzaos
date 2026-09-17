# Delivery operations

Owns the admin rider and delivery overview, including order groups, rider availability, and the mock map. `DeliveryManager` renders the riders and orders supplied by the active store dataset.

Admin composition owns store switching and order state. The map is a static local treatment; this feature does not use live GPS or an external delivery provider.

Run `pnpm --filter @pizzaos/admin test` for delivery view coverage.
