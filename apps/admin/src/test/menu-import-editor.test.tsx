import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { MenuRecipeFields } from "../features/catalog/components/catalog-form-fields";

const ingredients = [
  { id: "pesto", name: "Pesto di Pra’ senza aglio", stock: null },
  { id: "gialli", name: "Datterini gialli", stock: null },
  { id: "rossi", name: "Datterini rossi", stock: 12 }
];
afterEach(cleanup);
function RecipeEditor() {
  const [recipe, setRecipe] = useState<Record<string, number | null>>({ pesto: null });
  return <><MenuRecipeFields label="Ricetta importata" ingredients={ingredients} recipe={recipe} onChange={setRecipe} />
    <output aria-label="Ricetta salvata">{JSON.stringify(recipe)}</output></>;
}

describe("Ingredienti importati nell’editor", () => {
  it("mantiene il riferimento senza inventare la dose e consente di confermarla", () => {
    render(<RecipeEditor />);
    const dose = screen.getByRole("spinbutton", { name: "Unità di Pesto di Pra’ senza aglio" });
    expect(dose).toHaveValue(null);
    expect(dose).toHaveAttribute("placeholder", "Da verificare");
    fireEvent.change(dose, { target: { value: "3" } });
    expect(screen.getByLabelText("Ricetta salvata")).toHaveTextContent('"pesto":3');
    fireEvent.change(dose, { target: { value: "" } });
    expect(screen.getByLabelText("Ricetta salvata")).toHaveTextContent('"pesto":null');
  });

  it("seleziona dal magazzino ingredienti distinti anche con scorta sconosciuta", () => {
    render(<RecipeEditor />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "gialli" } });
    expect(screen.getByRole("spinbutton", { name: "Unità di Datterini gialli" })).toHaveValue(null);
    expect(screen.getByRole("option", { name: "Datterini rossi" })).toBeVisible();
    expect(screen.getByLabelText("Ricetta salvata")).toHaveTextContent('"gialli":null');
    fireEvent.click(screen.getByRole("button", { name: "Rimuovi Datterini gialli da Ricetta importata" }));
    expect(screen.getByRole("option", { name: "Datterini gialli" })).toBeVisible();
  });
});
