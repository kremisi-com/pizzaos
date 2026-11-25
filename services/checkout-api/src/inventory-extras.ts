import { syncPizzaInventory, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";

/** Warehouse extras are current configuration; pizza recipes remain the published snapshot. */
export function inventoryExtraProducts(store: IndividualStore): IndividualProduct[] {
  if (!store.menu?.pizzaCatalog) return store.products;
  const configured = store.ingredients.filter(item => item.extra?.enabled && item.extra.priceCents !== null && item.extra.dose !== null);
  return syncPizzaInventory({ ...store.menu, products: store.products }, configured).products;
}
