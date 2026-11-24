import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { MenuRecipeFields } from "../features/catalog/components/catalog-form-fields";

afterEach(cleanup);

function Editor() {
  const [recipe, setRecipe] = useState<Record<string, number | null>>({ pomodoro: 3, mancante: null });
  return <><MenuRecipeFields label="Ricetta base" ingredients={[
    { id: "pomodoro", name: "Pomodoro", stock: 10 },
    { id: "olive", name: "Olive", stock: null }
  ]} recipe={recipe} onChange={setRecipe} singleUnit />
    <output aria-label="Ricetta salvata">{JSON.stringify(recipe)}</output></>;
}

it("seleziona più ingredienti ricercabili con una sola unità, senza duplicati", () => {
  render(<Editor />);
  expect(screen.queryByRole("spinbutton")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Seleziona ingredienti per Ricetta base" }));
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "OLI" } });
  expect(screen.queryByRole("checkbox", { name: "Pomodoro" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Olive" }));
  expect(screen.getByLabelText("Ricetta salvata")).toHaveTextContent('{"pomodoro":1,"mancante":null,"olive":1}');
  fireEvent.click(screen.getByRole("checkbox", { name: "Olive" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Olive" }));
  expect(screen.getByLabelText("Ricetta salvata")).toHaveTextContent('{"pomodoro":1,"mancante":null,"olive":1}');
  fireEvent.click(screen.getByRole("button", { name: "Rimuovi Ingrediente da verificare da Ricetta base" }));
  expect(screen.getByLabelText("Ricetta salvata")).toHaveTextContent('{"pomodoro":1,"olive":1}');
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inesistente" } });
  expect(screen.getByText("Nessun ingrediente corrisponde alla ricerca.")).toBeVisible();
});

it("mostra lo stato vuoto quando il Magazzino non contiene ingredienti", () => {
  render(<MenuRecipeFields label="Ricetta base" ingredients={[]} recipe={{}} onChange={() => undefined} singleUnit />);
  fireEvent.click(screen.getByRole("button", { name: "Seleziona ingredienti per Ricetta base" }));
  expect(screen.getByText("Aggiungi prima gli ingredienti in Magazzino.")).toBeVisible();
});
