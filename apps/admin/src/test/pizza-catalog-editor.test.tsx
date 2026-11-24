import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { materializePizzaMenu } from "@pizzaos/domain";
import type { IndividualIngredient, MenuDraft, PizzaEntry } from "@pizzaos/domain";
import { MenuDraftEditor } from "../features/catalog/components/menu-draft-editor";
import { PizzaTastePanel } from "../features/catalog/components/menu-pizza-panels";

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
function Editor({ initialDraft, ingredients = [] }: { initialDraft?: MenuDraft; ingredients?: IndividualIngredient[] }) {
  const [draft, setDraft] = useState(initialDraft ?? initial);
  return <><MenuDraftEditor draft={draft} storeId="roma" ingredients={ingredients} onChange={setDraft} onUpload={() => undefined} />
    <output aria-label="Bozza corrente">{JSON.stringify(draft)}</output></>;
}
const current = () => JSON.parse(screen.getByLabelText("Bozza corrente").textContent ?? "{}") as MenuDraft;

describe("Catalogo pizza nel pannello", () => {
  it("mantiene operative le opzioni avanzate senza duplicare la scheda pizza o alterare le scelte salvate", () => {
    const candidate = initial();
    candidate.pizzaCatalog!.tastes = [{ ...entry, id: "margherita", name: "Margherita", imageId: "foto",
      includedToppingIds: ["olive"], previewImages: [{ doughId: "classico", baseId: "rossa", imagePath: "/pizza.png" }] }];
    candidate.pizzaCatalog!.toppings[0].ingredients = { olive: 1 };
    candidate.sections[0].productIds.push("margherita");
    const onUpload = vi.fn(), onRemove = vi.fn(), onClose = vi.fn();
    function Panel() {
      const [draft, setDraft] = useState(materializePizzaMenu(candidate));
      return <><PizzaTastePanel draft={draft} taste={draft.pizzaCatalog!.tastes[0]}
        ingredients={[{ id: "olive", name: "Olive", stock: 30 }]} onChange={setDraft}
        onUpload={onUpload} onRemove={onRemove} onClose={onClose} />
        <output aria-label="Bozza corrente">{JSON.stringify(draft)}</output></>;
    }
    render(<Panel />);
    fireEvent.click(screen.getByText("Foto e altre opzioni"));
    const editor = within(screen.getByRole("region", { name: "Modifica pizza" }));
    expect(editor.getAllByRole("heading", { name: "Margherita" })).toHaveLength(1);
    expect(editor.getAllByLabelText("Descrizione")).toHaveLength(1);
    expect(editor.queryByRole("region", { name: "Modifica gusto" })).toBeNull();
    for (const label of ["Nome gusto", "Prezzo completo in euro", "Sezione"]) expect(editor.queryByLabelText(label)).toBeNull();
    expect(editor.queryByText("Anteprima pizza come nel PoC")).toBeNull();
    for (const name of ["Impasti", "Basi", "Formati", "Topping consentiti e ingredienti inclusi"]) {
      expect(editor.queryByRole("group", { name })).toBeNull();
    }
    expect(editor.queryByLabelText("Unità di Olive")).toBeNull();
    fireEvent.click(editor.getByLabelText("Disponibile per l’ordinazione"));
    fireEvent.click(within(editor.getByRole("group", { name: "Abbinamenti consigliati" })).getByLabelText("Simple"));
    const file = new File(["foto"], "pizza.png", { type: "image/png" });
    fireEvent.change(editor.getByLabelText("Foto"), { target: { files: [file] } });
    expect(onUpload).toHaveBeenCalledWith(file);
    fireEvent.click(editor.getByRole("button", { name: "Rimuovi foto" }));
    expect(editor.queryByRole("button", { name: "Salva pizza" })).toBeNull();
    const taste = current().pizzaCatalog!.tastes[0];
    expect(taste).toMatchObject({ available: false, pairingProductIds: ["simple"],
      doughIds: entry.doughIds, baseIds: entry.baseIds, formatIds: entry.formatIds, toppingIds: entry.toppingIds,
      includedToppingIds: ["olive"], previewImages: candidate.pizzaCatalog!.tastes[0].previewImages });
    expect(taste.imageId).toBeUndefined();
    expect(current().pizzaCatalog!.toppings[0].ingredients).toEqual({ olive: 1 });
    expect(current().sections).toEqual(candidate.sections);
    fireEvent.click(editor.getByRole("button", { name: "Rimuovi gusto dalla bozza" }));
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disattiva e riattiva Pizza custom mantenendo combinazioni e riferimenti", () => {
    render(<Editor />);
    const before = structuredClone(current());
    fireEvent.click(screen.getByRole("switch", { name: "Pizza custom" }));
    expect(current().pizzaCatalog?.customEnabled).toBe(false);
    expect(current().pizzaCatalog?.formulas).toHaveLength(1);
    expect(current().pizzaCatalog?.formulas[0]).toMatchObject({ id: "simple", name: "Simple", priceCents: 600, toppingIds: [],
      standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "standard" });
    expect(current().sections).toEqual(before.sections);
    expect(current().products.some(({ pizza }) => pizza?.kind === "formula")).toBe(false);
    fireEvent.click(screen.getByRole("switch", { name: "Pizza custom" }));
    expect(current().pizzaCatalog?.customEnabled).toBe(true);
    expect(current().products.find(({ id }) => id === "simple")?.pizza?.kind).toBe("formula");
    expect(current().products.find(({ id }) => id === "simple")?.extraOffer).toEqual(before.products[0].extraOffer);
  });

  it("cambia standard comuni conservando il prezzo commerciale della combinazione", () => {
    const candidate = initial();
    candidate.pizzaCatalog!.doughs.push({ id: "integrale", name: "Integrale", description: "", priceCents: 120, available: true, ingredients: {} });
    render(<Editor initialDraft={candidate} />);
    fireEvent.click(screen.getByRole("button", { name: /Impasti, basi e formati/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Integrale standard" }));
    expect(current().pizzaCatalog?.defaults?.doughId).toBe("integrale");
    expect(current().pizzaCatalog?.formulas[0]).toMatchObject({ priceCents: 600, standardDoughId: "integrale", doughIds: ["classico", "integrale"] });
    expect(current().products.find(({ id }) => id === "simple")).toMatchObject({ priceCents: 600 });
    expect(screen.queryByRole("button", { name: "Salva configurazione" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Chiudi configurazione" })[0]);
    expect(current().pizzaCatalog?.defaults?.doughId).toBe("integrale");
    expect(screen.queryByRole("region", { name: "Impasti, basi e formati" })).toBeNull();
  });

  it("modifica nome e regola libera senza scegliere preset né configurare ingredienti nella card", () => {
    render(<Editor />);
    fireEvent.change(screen.getByLabelText("Nome combinazione"), { target: { value: "La mia pizza" } });
    fireEvent.change(within(screen.getByRole("region", { name: "Pizza custom" })).getByLabelText("Descrizione"), { target: { value: "La combinazione della casa" } });
    fireEvent.change(screen.getByLabelText("Prezzo base in euro"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Numero di extra scontati"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Sconto sugli extra %"), { target: { value: "40" } });
    expect(current().pizzaCatalog?.formulas[0]).toMatchObject({ name: "La mia pizza", description: "La combinazione della casa", priceCents: 900, extraOffer: { quota: 2, percent: 40 } });
    expect(current().products[0]).toMatchObject({ name: "La mia pizza", description: "La combinazione della casa", priceCents: 900, extraOffer: { quota: 2, percent: 40 }, pizza: { kind: "formula" } });
    expect(screen.queryByLabelText("Formula sconto extra")).toBeNull();
  });

  it("mostra ingredienti della base senza aggiungere una seconda porzione al gusto", () => {
    const candidate = initial();
    candidate.pizzaCatalog!.bases[0].ingredients = { farina: 2 };
    candidate.pizzaCatalog!.formulas = [];
    candidate.pizzaCatalog!.tastes = [{ ...entry, id: "margherita", name: "Margherita", includedToppingIds: [] }];
    candidate.sections[0].productIds = ["margherita"];
    const ingredients: IndividualIngredient[] = [{ id: "farina", name: "Farina", stock: 30 }, { id: "olive", name: "Olive", stock: 30 }];
    render(<Editor initialDraft={materializePizzaMenu(candidate)} ingredients={ingredients} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifica Margherita" }));
    const editor = within(screen.getByRole("region", { name: "Modifica pizza" }));
    fireEvent.click(editor.getByRole("button", { name: "Seleziona ingredienti" }));
    const baseIngredient = editor.getByRole("checkbox", { name: /Farina.*Già nella base/ });
    expect(baseIngredient).toBeDisabled();
    fireEvent.click(editor.getByRole("checkbox", { name: "Olive" }));
    expect(current().pizzaCatalog!.tastes[0].includedToppingIds).toHaveLength(1);
    expect(current().pizzaCatalog!.toppings.find(item => Object.hasOwn(item.ingredients, "olive"))?.ingredients).toEqual({ olive: 1 });
    expect(current().pizzaCatalog!.toppings.some(({ ingredients: recipe }) => Object.hasOwn(recipe, "farina"))).toBe(false);
  });

  it("duplica e rimuove una formula senza trasformarla in un prodotto generico", () => {
    render(<Editor />);
    fireEvent.click(screen.getByRole("button", { name: "Duplica Simple" }));
    expect(current().pizzaCatalog?.formulas).toHaveLength(2);
    expect(current().products[1].pizza?.kind).toBe("formula");
    expect(current().sections[0].productIds).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Elimina combinazione" }));
    fireEvent.click(screen.getByRole("button", { name: "Conferma eliminazione prodotto" }));
    expect(current().pizzaCatalog?.formulas).toHaveLength(1);
    expect(current().products).toHaveLength(1);
    expect(current().sections[0].productIds).toEqual([current().pizzaCatalog!.formulas[0].id]);
    expect(current().products[0].pizza?.kind).toBe("formula");
  });
});
