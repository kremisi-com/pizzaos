import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { IndividualProduct } from "@pizzaos/domain";
import { MenuPairingSelect } from "../features/catalog/components/menu-pairing-select";

afterEach(cleanup);
const products: IndividualProduct[] = ["Pizza", "Birre speciali", "Sacher", "Cheesecake"].map((name, index) => ({
  id: String(index), name, description: "", priceCents: 500, available: true, ingredients: {}, allergens: [], options: []
}));

it("filtra i prodotti mantenendo selezioni multiple, rimozione e navigazione da tastiera", () => {
  function Editor() {
    const [ids, setIds] = useState(["2"]);
    return <><MenuPairingSelect productId="0" products={products} selectedIds={ids} onChange={setIds} />
      <output aria-label="Abbinamenti salvati">{JSON.stringify(ids)}</output></>;
  }
  render(<Editor />);
  const trigger = screen.getByRole("button", { name: "Seleziona abbinamenti consigliati" });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  expect(screen.queryByRole("checkbox", { name: "Pizza" })).toBeNull();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: " BIRRE " } });
  expect(screen.queryByRole("checkbox", { name: "Sacher" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Birre speciali" }));
  expect(screen.getByLabelText("Abbinamenti salvati")).toHaveTextContent('["2","1"]');
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "cheese" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Cheesecake" }));
  fireEvent.click(screen.getByRole("button", { name: "Rimuovi Sacher dagli abbinamenti" }));
  expect(screen.getByLabelText("Abbinamenti salvati")).toHaveTextContent('["1","3"]');
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "inesistente" } });
  expect(screen.getByText("Nessun prodotto corrisponde alla ricerca.")).toBeVisible();
  fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });
  expect(screen.getByRole("checkbox", { name: "Birre speciali" })).toBeChecked();
  fireEvent.click(screen.getByRole("checkbox", { name: "Birre speciali" }));
  expect(screen.getByLabelText("Abbinamenti salvati")).toHaveTextContent('["3"]');
});

it("gestisce il menu senza altri prodotti e permette di rimuovere riferimenti mancanti", () => {
  const onChange = vi.fn();
  render(<MenuPairingSelect productId="0" products={products.slice(0, 1)} selectedIds={["mancante"]} onChange={onChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Seleziona abbinamenti consigliati" }));
  expect(screen.getByText("Aggiungi altri prodotti al menu per proporre abbinamenti.")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Rimuovi Prodotto non disponibile dagli abbinamenti" }));
  expect(onChange).toHaveBeenCalledWith([]);
});
