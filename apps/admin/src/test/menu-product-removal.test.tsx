import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { MenuDraft } from "@pizzaos/domain";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MenuDraftEditor } from "../features/catalog/components/menu-draft-editor";

afterEach(cleanup);

const initial: MenuDraft = {
  id: "menu", name: "Menu cena",
  sections: [{ id: "pizze", name: "Pizze", productIds: ["margherita", "marinara"] }],
  products: [
    { id: "margherita", name: "Margherita", description: "", priceCents: 700, available: true, allergens: [], ingredients: {}, options: [] },
    { id: "marinara", name: "Marinara", description: "", priceCents: 600, available: true, allergens: [], ingredients: {}, options: [], pairingProductIds: ["margherita"] }
  ]
};

function Editor() {
  const [draft, setDraft] = useState(initial);
  return <><MenuDraftEditor draft={draft} storeId="store" ingredients={[]} onChange={setDraft} onUpload={() => {}} />
    <output aria-label="Bozza">{JSON.stringify(draft)}</output></>;
}

describe("Eliminazione prodotto dal menu", () => {
  it("richiede conferma dall'elenco e consente di annullare senza modificare la bozza", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Elimina Margherita dal menu" }));
    expect(screen.getByLabelText("Bozza")).toHaveTextContent(JSON.stringify(initial));
    expect(screen.getByRole("group", { name: "Eliminare Margherita dal menu?" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Annulla" }));
    expect(screen.queryByRole("button", { name: "Conferma eliminazione prodotto" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bozza")).toHaveTextContent(JSON.stringify(initial));
  });

  it("rimuove prodotto, riferimenti nella sezione e abbinamenti, anche per l'ultimo prodotto", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Elimina Margherita dal menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferma eliminazione prodotto" }));
    const draft: MenuDraft = JSON.parse(screen.getByLabelText("Bozza").textContent ?? "{}");
    expect(draft.products.map(product => product.id)).toEqual(["marinara"]);
    expect(draft.sections[0].productIds).toEqual(["marinara"]);
    expect(draft.products[0].pairingProductIds).toEqual([]);
    expect(screen.queryByRole("button", { name: "Elimina Margherita dal menu" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Elimina Marinara dal menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferma eliminazione prodotto" }));
    const empty: MenuDraft = JSON.parse(screen.getByLabelText("Bozza").textContent ?? "{}");
    expect(empty.products).toEqual([]);
    expect(empty.sections[0].productIds).toEqual([]);
    expect(screen.getByRole("combobox", { name: "Aggiungi prodotto" })).toBeVisible();
  });

  it("richiede conferma anche dalla scheda e la chiude dopo l'eliminazione", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica Margherita" }));
    const editor = screen.getByRole("region", { name: "Modifica prodotto" });
    fireEvent.click(within(editor).getByRole("button", { name: "Rimuovi prodotto dalla bozza" }));
    expect(editor).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Conferma eliminazione prodotto" }));
    expect(screen.queryByRole("region", { name: "Modifica prodotto" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bozza")).not.toHaveTextContent("margherita");
  });
});
