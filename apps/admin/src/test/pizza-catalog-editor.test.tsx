import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { materializePizzaMenu } from "@pizzaos/domain";
import type { MenuDraft, PizzaEntry } from "@pizzaos/domain";
import { MenuDraftEditor } from "../features/catalog/components/menu-draft-editor";

afterEach(cleanup);
const entry: PizzaEntry = {
  id: "simple", name: "Simple", description: "Componi la tua pizza", available: true, priceCents: 600,
  doughIds: ["classico"], baseIds: ["rossa"], formatIds: ["standard"], toppingIds: ["olive"],
  standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "standard"
};
function initial(): MenuDraft {
  const component = (id: string, name: string) => ({ id, name, description: "", priceCents: 0, available: true, ingredients: {} });
  return materializePizzaMenu({ id: "menu", name: "Menu", products: [],
    sections: [{ id: "crea", name: "Crea la tua pizza", productIds: ["simple"] }], pizzaCatalog: {
      doughs: [component("classico", "Classico")], bases: [component("rossa", "Rossa")], formats: [component("standard", "Standard")],
      toppings: [{ ...component("olive", "Olive"), category: "Vegetali" }], tastes: [], formulas: [{ ...entry, offer: "Simple" }]
    } });
}
function Editor() {
  const [draft, setDraft] = useState(initial);
  return <><MenuDraftEditor draft={draft} storeId="roma" ingredients={[]} onChange={setDraft} onUpload={() => undefined} />
    <output aria-label="Bozza corrente">{JSON.stringify(draft)}</output></>;
}
const current = () => JSON.parse(screen.getByLabelText("Bozza corrente").textContent ?? "{}") as MenuDraft;

describe("Catalogo pizza nel pannello", () => {
  it("modifica una formula come voce commerciale e conserva prezzo completo e standard", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica Simple" }));
    const editor = within(screen.getByRole("region", { name: "Modifica formula" }));
    expect(editor.getByText("Questa formula parte senza gusto predefinito.")).toBeVisible();
    fireEvent.change(editor.getByLabelText("Prezzo completo in euro"), { target: { value: "7.5" } });
    fireEvent.change(editor.getByLabelText("Formula sconto extra"), { target: { value: "Wild" } });
    expect(current().pizzaCatalog?.formulas[0]).toMatchObject({ priceCents: 750, offer: "Wild", standardDoughId: "classico" });
    expect(current().products[0]).toMatchObject({ priceCents: 750, extraOffer: { quota: 5, percent: 40 }, pizza: { kind: "formula" } });
  });

  it("duplica e rimuove una formula senza trasformarla in un prodotto generico", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Duplica Simple" }));
    expect(current().pizzaCatalog?.formulas).toHaveLength(2);
    expect(current().products[1].pizza?.kind).toBe("formula");
    expect(current().sections[0].productIds).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Rimuovi formula dalla bozza" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferma eliminazione prodotto" }));
    expect(current().pizzaCatalog?.formulas).toHaveLength(1);
    expect(current().products).toHaveLength(1);
    expect(current().sections[0].productIds).toEqual(["simple"]);
  });
});
