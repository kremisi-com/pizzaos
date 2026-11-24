import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { MenuDraft, PizzaComponent } from "@pizzaos/domain";
import { PizzaSettingsPanel } from "../features/catalog/components/menu-pizza-panels";

afterEach(cleanup);
const component = (id: string, name: string): PizzaComponent => ({ id, name, description: "", available: true, priceCents: 0, ingredients: {} });
function candidate(): MenuDraft {
  return { id: "menu", name: "Menu", products: [], sections: [], pizzaCatalog: {
    inventoryMode: "dough-format", bases: [], toppings: [], tastes: [], formulas: [],
    doughs: [{ ...component("classico", "Classico"), inventoryIngredientId: "panetto-classico" }],
    formats: [{ ...component("tonda", "Tonda"), doughQuantity: 2 }],
    defaults: { doughId: "classico", baseId: "", formatId: "tonda" },
  } };
}
function Panel() {
  const [draft, setDraft] = useState(candidate);
  return <><PizzaSettingsPanel draft={draft} ingredients={[
    { id: "panetto-classico", name: "Panetto classico", stock: 20 },
    { id: "panetto-integrale", name: "Panetto integrale", stock: 20 },
    { id: "pomodoro", name: "Pomodoro", stock: 20 },
  ]} onChange={setDraft} onClose={() => undefined} />
    <output aria-label="Bozza corrente">{JSON.stringify(draft)}</output></>;
}
const current = () => JSON.parse(screen.getByLabelText("Bozza corrente").textContent ?? "{}") as MenuDraft;

describe("configurazione semplificata impasti e formati", () => {
  it("presenta associazione e quantità senza basi, ricette o testi rimossi", () => {
    render(<Panel />);
    expect(screen.getByRole("heading", { name: "Impasti e formati" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Basi" })).toBeNull();
    expect(screen.queryByText("Ricette e dosi dal Magazzino")).toBeNull();
    expect(screen.queryByText("Imposta lo standard e aggiungi le alternative che offri.")).toBeNull();
    expect(screen.queryByText("Lo standard è incluso nel prezzo della pizza. Le alternative applicano il supplemento indicato.")).toBeNull();
    expect(screen.getByLabelText("Quantità impasto Tonda")).toHaveValue(2);
    fireEvent.change(screen.getByLabelText("Quantità impasto Tonda"), { target: { value: "3" } });
    expect(current().pizzaCatalog?.formats[0].doughQuantity).toBe(3);
    fireEvent.change(screen.getByLabelText("Quantità impasto Tonda"), { target: { value: "" } });
    expect(current().pizzaCatalog?.formats[0].doughQuantity).toBeNull();
  });

  it("filtra il Magazzino e sostituisce l'unica associazione dell'impasto", () => {
    render(<Panel />);
    fireEvent.click(screen.getByRole("button", { name: "Elemento di magazzino Classico" }));
    fireEvent.change(screen.getByLabelText("Cerca elemento di magazzino Classico"), { target: { value: "INTEGRALE" } });
    expect(screen.queryByRole("button", { name: "Pomodoro" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Panetto integrale" }));
    const dough = current().pizzaCatalog!.doughs[0];
    expect(dough.inventoryIngredientId).toBe("panetto-integrale");
    expect(dough.ingredients).toEqual({});
    expect(current().pizzaCatalog?.inventoryMode).toBe("dough-format");
    expect(current().pizzaCatalog?.formats[0].doughQuantity).toBe(2);
  });
});
