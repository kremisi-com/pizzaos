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
    return <MenuMealFields product={product} products={products} sections={[
      { id: "bevande", name: "Bevande", productIds: ["0", "2", "3", "5"] },
      { id: "pizze", name: "Pizze", productIds: ["1", "4"] },
      { id: "vuota", name: "Vuota", productIds: [] }
    ]} onChange={change => { changed(change); setProduct(current => ({ ...current, ...change })); }} />;
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

it("combines category and name filters independently without changing saved alternatives", () => {
  const { changed, phases } = setup();
  const phase = within(phases[0]);
  const category = phase.getByRole("combobox", { name: "Categoria" });
  expect((category as HTMLSelectElement).value).toBe("");
  expect(within(category).getAllByRole("option").map(option => option.textContent)).toEqual(["Scelta libera", "Bevande", "Pizze", "Vuota"]);
  expect(phase.getAllByRole("checkbox")).toHaveLength(6);
  fireEvent.change(category, { target: { value: "pizze" } });
  expect(phase.getAllByRole("checkbox")).toHaveLength(2);
  expect(phase.queryByRole("checkbox", { name: "Acqua" })).toBeNull();
  expect(within(phases[1]).getAllByRole("checkbox")).toHaveLength(6);
  fireEvent.change(phase.getByRole("searchbox"), { target: { value: "  MARGH  " } });
  expect(phase.getAllByRole("checkbox")).toHaveLength(1);
  expect(phase.getByRole("checkbox", { name: "Margherita" })).toBeTruthy();
  fireEvent.change(category, { target: { value: "bevande" } });
  expect(phase.getByRole("status").textContent).toBe("Nessun prodotto trovato.");
  fireEvent.change(phase.getByRole("searchbox"), { target: { value: "" } });
  fireEvent.change(category, { target: { value: "vuota" } });
  expect(phase.queryAllByRole("checkbox")).toHaveLength(0);
  expect(phase.getByRole("status").textContent).toBe("Nessun prodotto trovato.");
  fireEvent.change(category, { target: { value: "" } });
  expect((phase.getByRole("checkbox", { name: "Acqua" }) as HTMLInputElement).checked).toBe(true);
  expect((phase.getByLabelText("Variazione Acqua in euro") as HTMLInputElement).value).toBe("-0.5");
  expect(changed).not.toHaveBeenCalled();
});

it("keeps category and search attached to the phase when collapsed and reordered", () => {
  const { changed, phases } = setup();
  const phase = within(phases[0]);
  fireEvent.change(phase.getByRole("combobox"), { target: { value: "pizze" } });
  fireEvent.change(phase.getByRole("searchbox"), { target: { value: "margh" } });
  fireEvent.click(phase.getByText("Fase 1"));
  fireEvent.click(phase.getByText("Fase 1"));
  expect((phase.getByRole("combobox") as HTMLSelectElement).value).toBe("pizze");
  expect(changed).not.toHaveBeenCalled();
  fireEvent.click(phase.getByRole("button", { name: "Sposta fase 1 giù" }));
  expect(phase.getByText("Fase 2")).toBeTruthy();
  expect((phase.getByRole("combobox") as HTMLSelectElement).value).toBe("pizze");
  expect((phase.getByRole("searchbox") as HTMLInputElement).value).toBe("margh");
  expect(phase.getAllByRole("checkbox")).toHaveLength(1);
  expect(changed).toHaveBeenCalledTimes(1);
  expect(changed.mock.lastCall![0].meal.steps[1].alternatives).toEqual([{ productId: "0", priceCents: -50 }]);
});
