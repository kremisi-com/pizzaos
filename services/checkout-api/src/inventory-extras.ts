import { materializeSandwich, productType, syncPizzaInventory, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";

/** Warehouse extras are current configuration; pizza recipes remain the published snapshot. */
export function inventoryExtraProducts(store: IndividualStore): IndividualProduct[] {
  const configured = store.ingredients.filter(item => item.extra?.enabled && item.extra.priceCents !== null);
  const products = store.menu?.pizzaCatalog ? syncPizzaInventory({ ...store.menu, products: store.products }, configured).products : store.products;
  return products.map(product => productType(product) === "sandwich"
    ? materializeSandwich(product, store.ingredients.map(item => ({ ...item, extra: item.extra && { ...item.extra,
      enabled: item.extra.enabled && item.extra.priceCents !== null } })))
    : { ...product, productType: productType(product) });
}
