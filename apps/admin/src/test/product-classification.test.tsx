import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyPizzaCatalog, resolveMenuComposition, type MenuDraft } from "@pizzaos/domain";
import { MenuDraftEditor } from "../features/catalog/components/menu-draft-editor";

afterEach(cleanup);

function fixture(): MenuDraft {
  return {
    id: "menu", name: "Menu di prova", sections: [{ id: "prodotti", name: "Prodotti", productIds: ["specialita"] }],
    products: [{ id: "specialita", name: "Specialità", description: "Ricetta del giorno", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [], groups: [] }],
    pizzaCatalog: emptyPizzaCatalog()
  };
}

function setup() {
  const changes = vi.fn();
  const inventory = vi.fn();
  function Harness() {
    const [draft, setDraft] = useState(fixture);
    return <MenuDraftEditor draft={draft} storeId="store" ingredients={[]} onChange={(next) => { changes(next); setDraft(next); }} onUpload={vi.fn()} onInventory={inventory} />;
  }
  render(<Harness />);
  return { changes, inventory };
}

describe("classificazione dal menu amministrativo", () => {
  it("crea una nuova pizza vuota dagli standard senza richiedere prima la ricetta generica", () => {
    const initial = fixture();
    initial.products = [];
    initial.sections[0].productIds = [];
    const component = (id: string, ingredients: Record<string, number>) => ({ id, name: id, description: "", priceCents: 0, available: true, ingredients });
    initial.pizzaCatalog = {
      ...emptyPizzaCatalog(),
      doughs: [component("classico", { farina: 2 })], bases: [component("rossa", { pomodoro: 1 })], formats: [component("tonda", {})],
      defaults: { doughId: "classico", baseId: "rossa", formatId: "tonda" }
    };
    const changes = vi.fn();
    function Harness() {
      const [draft, setDraft] = useState(initial);
      return <MenuDraftEditor draft={draft} storeId="store" ingredients={[{ id: "farina", name: "Farina", stock: 100 }, { id: "pomodoro", name: "Pomodoro", stock: 100 }]}
        onChange={(next) => { changes(next); setDraft(next); }} onUpload={vi.fn()} />;
    }
    render(<Harness />);
    fireEvent.change(screen.getAllByRole("combobox", { name: "Aggiungi prodotto" })[0], { target: { value: "pizza" } });
    const resulting = changes.mock.lastCall![0] as MenuDraft;
    const pizza = resulting.products[0];
    expect(pizza.pizza?.kind).toBe("taste");
    expect(resolveMenuComposition(pizza, pizza.pizza!.defaultSelections).recipe).toEqual({ farina: 2 });
    expect(resulting.pizzaCatalog?.bases).toEqual([]);
    expect(screen.queryByRole("checkbox", { name: /^Pizza$/i })).toBeNull();
  });

  it("offre Aggiungi prodotto con tipo vincolante e chiusura della scheda", () => {
    setup();
    fireEvent.change(screen.getAllByRole("combobox", { name: "Aggiungi prodotto" })[0], { target: { value: "product" } });
    expect(screen.queryByRole("checkbox", { name: /^Pizza$/i })).toBeNull();
    const close = screen.getByRole("button", { name: /^Chiudi scheda$/i });
    expect(close.textContent).toBe("\u00d7");
    expect(screen.queryByRole("button", { name: /Aggiungi gruppo di scelte|Organizza le scelte in un gruppo|Aggiungi personalizzazione/i })).toBeNull();
    fireEvent.click(close);
    expect(screen.queryByRole("region", { name: "Modifica prodotto" })).toBeNull();
  });

  it("non offre riclassificazione dei prodotti esistenti e conserva la bozza", () => {
    const { changes } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Modifica Specialit.$/i }));
    expect(screen.queryByRole("checkbox", { name: /^Pizza$/i })).toBeNull();
    expect(screen.queryByLabelText("Tipo di prodotto")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Conferma cambio tipo$/i })).toBeNull();
    expect(changes).not.toHaveBeenCalled();
  });

  it("non mostra la card degli extra comuni nella scheda", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^Modifica Specialit.$/i }));
    expect(screen.queryByRole("region", { name: "Extra comuni dal Magazzino" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Aggiorna extra della bozza" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Aggiungi gruppo di scelte|Organizza le scelte in un gruppo|Aggiungi personalizzazione/i })).toBeNull();
    expect(screen.queryByText("Scelte specifiche del prodotto")).toBeNull();
  });
});
