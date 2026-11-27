import { beforeEach, expect, it, vi } from "vitest";
import { materializeSandwich, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { OperationalMenu, useMenuPreferences } from "../features/menu";

const kitchenNotice = "Avvertenza cucina salvata nel menu";
const product: IndividualProduct = {
  id: "prodotto", name: "Prodotto", description: "", priceCents: 800, available: true,
  ingredients: { pane: 1 }, foodIngredients: [{ id: "pane", name: "Pane" }],
  allergens: [], food: { contains: ["Glutine"], mayContain: ["Sesamo"] }, options: []
};
const sandwich = materializeSandwich({ ...product, id: "panino", name: "Panino", productType: "sandwich", baseIngredientIds: ["pane"] },
  [{ id: "pane", name: "Pane", stock: null, food: { contains: ["Glutine"], mayContain: ["Sesamo"] } }]);
const meal: IndividualProduct = { ...product, id: "menu", name: "Menu pranzo", productType: "meal",
  meal: { steps: [{ id: "portata", name: "Portata", alternatives: [{ productId: product.id, priceCents: 0 }] }] } };

function Menu({ selected }: { selected: IndividualProduct }) {
  const preferences = useMenuPreferences(undefined, undefined);
  const products = selected === meal ? [product, meal] : [selected];
  const store: IndividualStore = {
    id: "sede", name: "Sede", latitude: 0, longitude: 0, acceptingOrders: true,
    ingredients: [], slots: [], deliveryBands: [], products,
    menu: { id: "menu", name: "Menu", kitchenNotice, sections: [{ id: "prodotti", name: "Prodotti", productIds: [selected.id] }] }
  };
  return <OperationalMenu store={store} preferences={preferences} onAdd={vi.fn()} />;
}

beforeEach(cleanupDom);

it.each([product, sandwich, meal])("nasconde l'avvertenza salvata nel menu e nel dettaglio di $name", selected => {
  renderDom(<Menu selected={selected} />);
  expect(domScreen.queryByText(kitchenNotice)).toBeNull();
  domFireEvent.click(domScreen.getByRole("button", { name: `Aggiungi ${selected.name}` }));
  expect(domScreen.getByRole("dialog", { name: selected.name })).toBeTruthy();
  expect(domScreen.queryByText(kitchenNotice)).toBeNull();
  if (selected === sandwich) {
    expect(domScreen.getByRole("button", { name: "Contiene Glutine" })).toBeTruthy();
    expect(domScreen.getByRole("button", { name: "Può Contenere Sesamo" })).toBeTruthy();
  }
});
