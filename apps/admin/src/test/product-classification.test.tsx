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
    fireEvent.click(screen.getByRole("button", { name: /^Aggiungi prodotto$/i }));
    const added = changes.mock.lastCall![0] as MenuDraft;
    const id = added.products[0].id;
    expect(added.products[0].ingredients).toEqual({});
    fireEvent.click(screen.getByRole("checkbox", { name: /^Pizza$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Conferma cambio tipo$/i }));
    const resulting = changes.mock.lastCall![0] as MenuDraft;
    const pizza = resulting.products.find((product) => product.id === id)!;
    expect(pizza.pizza?.kind).toBe("taste");
    expect(resolveMenuComposition(pizza, pizza.pizza!.defaultSelections).recipe).toEqual({ farina: 2, pomodoro: 1 });
    expect((screen.getByRole("checkbox", { name: /^Pizza$/i }) as HTMLInputElement).checked).toBe(true);
  });

  it("offre Aggiungi prodotto e apre una scheda con Pizza disattivata", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^Aggiungi prodotto$/i }));
    expect((screen.getByRole("checkbox", { name: /^Pizza$/i }) as HTMLInputElement).checked).toBe(false);
    const checkbox = screen.getByRole("checkbox", { name: /^Pizza$/i });
    const close = screen.getByRole("button", { name: /^Chiudi scheda$/i });
    expect(close.textContent).toBe("×");
    expect(close.parentElement?.contains(checkbox)).toBe(true);
    expect(checkbox.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByText(/Prodotto normale/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Aggiungi gruppo di scelte|Organizza le scelte in un gruppo|Aggiungi personalizzazione/i })).toBeNull();
    fireEvent.click(close);
    expect(screen.queryByRole("region", { name: "Modifica prodotto" })).toBeNull();
  });

  it("annullare il cambio tipo conserva integralmente la bozza", () => {
    const { changes } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Modifica Specialità$/i }));
    const callsBefore = changes.mock.calls.length;
    fireEvent.click(screen.getByRole("checkbox", { name: /^Pizza$/i }));
    expect(screen.getByRole("button", { name: /^Conferma cambio tipo$/i })).toBeTruthy();
    expect(changes).toHaveBeenCalledTimes(callsBefore);
    fireEvent.click(screen.getByRole("button", { name: /^Annulla cambio tipo$/i }));
    expect(changes).toHaveBeenCalledTimes(callsBefore);
    expect((screen.getByRole("checkbox", { name: /^Pizza$/i }) as HTMLInputElement).checked).toBe(false);
  });

  it("conferma esplicitamente il cambio e mostra extra comuni e apertura Magazzino", () => {
    const { changes, inventory } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Modifica Specialità$/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Pizza$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Conferma cambio tipo$/i }));
    expect(changes).toHaveBeenCalled();
    const resulting = changes.mock.lastCall![0] as MenuDraft;
    expect(resulting.products.find((product) => product.id === "specialita")).toMatchObject({ name: "Specialità", description: "Ricetta del giorno", priceCents: 800, pizza: { kind: "taste" } });
    expect(resulting.sections).toEqual(fixture().sections);
    expect((screen.getByRole("checkbox", { name: /^Pizza$/i }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/Extra comuni dal Magazzino/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Aggiungi gruppo di scelte|Organizza le scelte in un gruppo|Aggiungi personalizzazione/i })).toBeNull();
    expect(screen.queryByText("Scelte specifiche del prodotto")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Apri Magazzino$/i }));
    expect(inventory).toHaveBeenCalledOnce();
  });
});
