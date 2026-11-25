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

function openIngredient(index: number) {
  const summary = screen.getAllByText("Allergeni", { selector: "summary" })[index];
  fireEvent.click(summary);
  summary.parentElement!.setAttribute("open", "");
  return within(summary.parentElement!);
}

function openSelect(ingredient: ReturnType<typeof openIngredient>, title: string) {
  fireEvent.click(ingredient.getByRole("button", { name: `Seleziona allergeni: ${title}` }));
  return within(ingredient.getByRole("group", { name: title }));
}

describe("multiselect allergeni del Magazzino", () => {
  it("parte chiuso senza conferma e conserva selezioni e voci importate", () => {
    fixture();
    for (const summary of screen.getAllByText("Allergeni", { selector: "summary" })) {
      expect(summary.parentElement!.hasAttribute("open")).toBe(false);
    }
    expect(screen.queryByLabelText("Informazioni allergeni verificate")).toBeNull();
    const ingredient = openIngredient(0);
    const contains = openSelect(ingredient, "Contiene");
    for (const allergen of MENU_ALLERGENS) expect(contains.getByRole("checkbox", { name: allergen })).toBeTruthy();
    expect((contains.getByLabelText("Glutine") as HTMLInputElement).checked).toBe(true);
    const traces = openSelect(ingredient, "Può contenere");
    expect((traces.getByLabelText("Senape") as HTMLInputElement).checked).toBe(true);
    expect((traces.getByLabelText("Voce importata") as HTMLInputElement).checked).toBe(true);
  });

  it("filtra entrambe le liste senza salvare o perdere selezioni e ripristina il focus con Escape", () => {
    const { onSave } = fixture();
    const ingredient = openIngredient(0);
    for (const title of ["Contiene", "Può contenere"]) {
      const select = openSelect(ingredient, title);
      const search = select.getByRole("searchbox");
      fireEvent.change(search, { target: { value: "inesistente" } });
      expect(select.queryAllByRole("checkbox")).toHaveLength(0);
      fireEvent.blur(search);
      expect(onSave).not.toHaveBeenCalled();
      fireEvent.change(search, { target: { value: " glut " } });
      expect(select.getAllByRole("checkbox")).toHaveLength(1);
      fireEvent.keyDown(search, { key: "Escape" });
      expect(document.activeElement).toBe(select.getByRole("button", { name: `Seleziona allergeni: ${title}` }));
    }
    expect(ingredient.getByRole("button", { name: "Rimuovi Glutine da Contiene" })).toBeTruthy();
  });

  it("salva più allergeni, sposta tra liste in entrambe le direzioni e rimuove tramite chip", async () => {
    const { store, onSave } = fixture();
    const ingredient = openIngredient(0);
    const contains = openSelect(ingredient, "Contiene");
    fireEvent.click(contains.getByLabelText("Senape"));
    fireEvent.click(contains.getByLabelText("Uova"));
    fireEvent.click(contains.getByRole("button", { name: "Rimuovi Glutine da Contiene" }));
    const traces = openSelect(ingredient, "Può contenere");
    fireEvent.click(traces.getByLabelText("Uova"));
    const second = openSelect(openIngredient(1), "Contiene");
    fireEvent.click(second.getByLabelText("Latte"));
    await waitFor(() => expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ ingredients: [
      { ...store.ingredients[0], food: { contains: ["Senape"], mayContain: ["Voce importata", "Uova"] } },
      { ...store.ingredients[1], food: { contains: ["Latte"], mayContain: [] } }
    ] }), expect.objectContaining({ id: store.id })));
  });

  it("salva liste vuote verificate di default anche senza aprire la sezione", async () => {
    const { onSave } = fixture();
    expect(onSave).not.toHaveBeenCalled();
    const stock = screen.getByLabelText("Scorta Latte");
    fireEvent.change(stock, { target: { value: "5" } });
    fireEvent.blur(stock);
    await waitFor(() => expect(onSave.mock.lastCall?.[0].ingredients[1].food).toEqual({ contains: [], mayContain: [] }));
  });
});
