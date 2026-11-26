import { beforeEach, expect, it, vi } from "vitest";
import type { IndividualProduct, IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { OperationalMenu, useMenuPreferences } from "../features/menu";
const product: IndividualProduct = { id: "acqua", name: "Acqua", description: "Naturale", priceCents: 150, available: true, options: [], ingredients: {}, allergens: [] };
function setup(overrides: Partial<IndividualProduct> = {}, acceptingOrders = true) {
  const onAdd = vi.fn();
  const store: IndividualStore = { id: "roma", name: "Roma", latitude: 0, longitude: 0, acceptingOrders,
    deliveryBands: [], ingredients: [], slots: [], products: [{ ...product, ...overrides }] };
  function Menu() {
    const preferences = useMenuPreferences(undefined, undefined);
    return <OperationalMenu store={store} preferences={preferences} onAdd={onAdd} />;
  }
  renderDom(<Menu />);
  return onAdd;
}
beforeEach(cleanupDom);
it("opens a simple product before adding it once with its notes", () => {
  const onAdd = setup();
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi Acqua" }));
  expect(domScreen.getByRole("dialog", { name: "Acqua" })).toBeTruthy();
  expect(onAdd).not.toHaveBeenCalled();
  domFireEvent.change(domScreen.getByLabelText("Note per la cucina"), { target: { value: "Senza ghiaccio" } });
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi" }));
  expect(domScreen.queryByRole("dialog")).toBeNull();
  expect(onAdd).toHaveBeenCalledTimes(1);
  expect(onAdd).toHaveBeenCalledWith({ productId: "acqua", quantity: 1, optionIds: [], notes: "Senza ghiaccio" });
});
it.each([false, true])("blocks the card for unavailable products or closed ordering (%s)", unavailable => {
  const onAdd = setup({ available: !unavailable }, unavailable);
  const button = domScreen.getByRole("button");
  expect((button as HTMLButtonElement).disabled).toBe(true);
  domFireEvent.click(button);
  expect(onAdd).not.toHaveBeenCalled();
});
it("closes the product sheet without adding a line", () => {
  const onAdd = setup();
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi Acqua" }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Chiudi personalizzazione" }));
  expect(domScreen.queryByRole("dialog")).toBeNull();
  expect(onAdd).not.toHaveBeenCalled();
});
