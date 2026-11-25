import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MENU_ALLERGENS, type IndividualStore } from "@pizzaos/domain";
import { StoreConfiguration } from "../features/individual-ordering/components/store-configuration";

afterEach(cleanup);

function fixture() {
  const store: IndividualStore = {
    id: "sede", name: "Sede", latitude: 41.9, longitude: 12.5, acceptingOrders: true, products: [], slots: [], deliveryBands: [],
    ingredients: [
      { id: "farina", name: "Farina", stock: 10, food: { contains: ["Glutine"], mayContain: ["Senape", "Voce importata"] } },
      { id: "latte", name: "Latte", stock: null }
    ]
  };
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<StoreConfiguration store={store} isNew={false} section="inventory" busy={false} onSearchAddress={vi.fn()} onSave={onSave} />);
  return { store, onSave };
}

function selectValues(select: HTMLSelectElement, values: string[]) {
  for (const option of select.options) option.selected = values.includes(option.value);
  fireEvent.change(select);
}

describe("multiselect allergeni del Magazzino", () => {
  it("mostra la lista statica e conserva selezioni salvate e voci importate", () => {
    fixture();
    const selects = screen.getAllByRole<HTMLSelectElement>("listbox", { name: "Contiene" });
    expect(selects).toHaveLength(2);
    for (const allergen of MENU_ALLERGENS) expect(within(selects[0]).getByRole("option", { name: allergen })).toBeTruthy();
    expect(Array.from(selects[0].selectedOptions, option => option.value)).toEqual(["Glutine"]);
    const traces = screen.getAllByRole<HTMLSelectElement>("listbox", { name: "Può contenere" })[0];
    expect(Array.from(traces.selectedOptions, option => option.value)).toEqual(["Senape", "Voce importata"]);
    expect(selects[1].disabled).toBe(true);
  });

  it("salva più allergeni per ingrediente, sposta le tracce ed elimina una selezione", async () => {
    const { store, onSave } = fixture();
    const contains = screen.getAllByRole<HTMLSelectElement>("listbox", { name: "Contiene" })[0];
    selectValues(contains, ["Glutine", "Senape", "Uova"]);
    selectValues(contains, ["Senape", "Uova"]);
    fireEvent.click(screen.getAllByLabelText("Informazioni allergeni verificate")[1]);
    selectValues(screen.getAllByRole<HTMLSelectElement>("listbox", { name: "Contiene" })[1], ["Latte"]);
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ ingredients: [
      { ...store.ingredients[0], food: { contains: ["Uova", "Senape"], mayContain: ["Voce importata"] } },
      { ...store.ingredients[1], food: { contains: ["Latte"], mayContain: [] } }
    ] }), expect.objectContaining({ id: store.id })));
  });

  it("distingue una dichiarazione vuota dai dati da verificare", async () => {
    const { onSave } = fixture();
    fireEvent.click(screen.getAllByLabelText("Informazioni allergeni verificate")[0]);
    fireEvent.click(screen.getAllByLabelText("Informazioni allergeni verificate")[1]);
    await waitFor(() => expect(onSave.mock.lastCall?.[0].ingredients[1].food).toEqual({ contains: [], mayContain: [] }));
    const saved: IndividualStore = onSave.mock.lastCall![0];
    expect(saved.ingredients[0].food).toBeUndefined();
    expect(saved.ingredients[1].food).toEqual({ contains: [], mayContain: [] });
  });
});
