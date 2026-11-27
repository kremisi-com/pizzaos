import { useState } from "react";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { IndividualProduct } from "@pizzaos/domain";
import { MenuMealFields } from "../features/catalog/components/menu-meal-fields";

afterEach(cleanup);

function setup() {
  const changed = vi.fn();
  const products: IndividualProduct[] = ["Acqua", "Margherita", "Cola", "Aranciata", "Marinara", "Birra"].map((name, index) => ({
    id: String(index), name, description: "", available: true, priceCents: 200, ingredients: {}, allergens: [], options: []
  }));
  function Harness() {
    const [product, setProduct] = useState<IndividualProduct>({
      ...products[0], id: "menu", productType: "meal", meal: { steps: [
        { id: "prima", name: "Prima", alternatives: [{ productId: "0", priceCents: -50 }] },
        { id: "seconda", name: "Seconda", alternatives: [] }
      ] }
    });
    return <MenuMealFields product={product} products={products} onChange={change => { changed(change); setProduct(current => ({ ...current, ...change })); }} />;
  }
  const view = render(<Harness />);
  return { changed, phases: Array.from(view.container.querySelectorAll("details")) };
}

it("filters each phase independently and preserves selections and signed prices", () => {
  const { changed, phases } = setup();
  const phase = within(phases[0]);
  fireEvent.change(phase.getByRole("searchbox", { name: "Cerca prodotti" }), { target: { value: "  MARGH  " } });
  expect(phase.queryByRole("checkbox", { name: "Acqua" })).toBeNull();
  expect(within(phases[1]).getAllByRole("checkbox")).toHaveLength(6);
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(phase.getByRole("checkbox", { name: "Margherita" }));
  fireEvent.change(phase.getByLabelText("Variazione Margherita in euro"), { target: { value: "1.5" } });
  fireEvent.change(phase.getByRole("searchbox"), { target: { value: "" } });
  expect((phase.getByRole("checkbox", { name: "Acqua" }) as HTMLInputElement).checked).toBe(true);
  expect((phase.getByLabelText("Variazione Acqua in euro") as HTMLInputElement).value).toBe("-0.5");
  expect(changed.mock.lastCall![0].meal.steps[0].alternatives).toEqual([
    { productId: "0", priceCents: -50 }, { productId: "1", priceCents: 150 }
  ]);
});

it("collapses and reopens a phase without changing its filter or data", () => {
  const { changed, phases } = setup();
  const phase = within(phases[0]);
  fireEvent.change(phase.getByRole("searchbox"), { target: { value: "acqua" } });
  fireEvent.click(phase.getByText("Fase 1"));
  expect(phases[0].open).toBe(false);
  expect(phases[1].open).toBe(true);
  fireEvent.click(phase.getByText("Fase 1"));
  expect(phases[0].open).toBe(true);
  expect((phase.getByRole("searchbox") as HTMLInputElement).value).toBe("acqua");
  expect((phase.getByRole("checkbox", { name: "Acqua" }) as HTMLInputElement).checked).toBe(true);
  expect(changed).not.toHaveBeenCalled();
});

it("shows an empty search result without removing selected products", () => {
  const { changed, phases } = setup();
  const phase = within(phases[0]);
  fireEvent.change(phase.getByRole("searchbox"), { target: { value: "inesistente" } });
  expect(phase.getByRole("status").textContent).toBe("Nessun prodotto trovato.");
  expect(phase.queryAllByRole("checkbox")).toHaveLength(0);
  expect(changed).not.toHaveBeenCalled();
});
