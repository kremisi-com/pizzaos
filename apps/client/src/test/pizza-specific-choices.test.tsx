import { type ComponentProps } from "react";
import { cleanupDom as cleanup, domFireEvent as fireEvent, renderDom as render, domScreen as screen } from "@pizzaos/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPizzaCatalog, materializePizzaMenu, resolveMenuComposition, type MenuDraft } from "@pizzaos/domain";
import { LivePizzaEditor } from "../features/customization/components/live-pizza-editor";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(cleanup);

function setup() {
  const component = (id: string, ingredients: Record<string, number>) => ({ id, name: id, description: "", priceCents: 0, available: true, ingredients });
  const draft: MenuDraft = {
    id: "menu", name: "Menu", sections: [{ id: "pizze", name: "Pizze", productIds: ["specialita"] }], products: [],
    pizzaCatalog: {
      ...emptyPizzaCatalog(),
      doughs: [component("classico", { farina: 2 })], bases: [component("rossa", { pomodoro: 1 })], formats: [component("tonda", {})],
      defaults: { doughId: "classico", baseId: "rossa", formatId: "tonda" },
      tastes: [{
        id: "specialita", name: "Specialità", description: "Pizza con scelte specifiche", priceCents: 800, available: true,
        standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [], includedToppingIds: [],
        customizations: {
          options: [{ id: "salsa", name: "Salsa piccante", priceCents: 70, ingredients: { peperoncino: 1 }, removesIngredientIds: ["pomodoro"] }],
          groups: [{ id: "salse", name: "Salse speciali", kind: "selection", min: 1, max: 2, allowRepeat: true, optionIds: ["salsa"] }]
        }
      }]
    }
  };
  const menu = materializePizzaMenu(draft);
  const product = menu.products.find((entry) => entry.pizza?.sourceId === "specialita")!;
  const store: ComponentProps<typeof LivePizzaEditor>["store"] = {
    id: "store", name: "Ristorante", latitude: 45, longitude: 9, acceptingOrders: true, deliveryBands: [], slots: [], products: menu.products, menu,
    ingredients: [
      { id: "farina", name: "Farina", stock: 100 }, { id: "pomodoro", name: "Pomodoro", stock: 100 }, { id: "peperoncino", name: "Peperoncino", stock: 100 }
    ]
  };
  const onSave = vi.fn();
  render(<LivePizzaEditor store={store} product={product} disabled={false} avoid={[]} onClose={vi.fn()} onSave={onSave} />);
  return { onSave, product };
}

describe("scelte specifiche della pizza nel dettaglio cliente", () => {
  it("presenta il gruppo obbligatorio conservato con prezzo e blocca il salvataggio senza scelta", () => {
    const { onSave } = setup();
    expect(screen.getByText("Salse speciali")).toBeTruthy();
    expect(screen.getByText(/Salsa piccante/)).toBeTruthy();
    expect(screen.getByText(/0[,.]70/)).toBeTruthy();
    const save = screen.getByRole("button", { name: /aggiungi al carrello|salva/i });
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("mantiene ripetizioni, massimo, prezzo e rimozioni della scelta specifica", () => {
    const { onSave, product } = setup();
    expect(screen.getByText("Salse speciali")).toBeTruthy();
    const choose = () => screen.getByRole("button", { name: /^Aggiungi Salsa piccante$/i });
    fireEvent.click(choose());
    fireEvent.click(choose());
    fireEvent.click(choose());
    fireEvent.click(screen.getByRole("button", { name: /aggiungi al carrello|salva/i }));
    expect(onSave).toHaveBeenCalledOnce();
    const line = onSave.mock.lastCall![0] as { selections: { optionId: string; quantity: number }[] };
    expect(line.selections.find((selection) => selection.optionId === "salsa")).toEqual({ optionId: "salsa", quantity: 2 });
    const resolved = resolveMenuComposition(product, line.selections);
    expect(resolved.valid).toBe(true);
    expect(resolved.unitCents).toBe(940);
    expect(resolved.recipe).toEqual({ farina: 2, peperoncino: 2 });
  });
});
