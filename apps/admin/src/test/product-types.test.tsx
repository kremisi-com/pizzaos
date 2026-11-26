import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { MenuDraft } from "@pizzaos/domain";
import { MenuDraftEditor } from "../features/catalog/components/menu-draft-editor";

afterEach(cleanup);
const initial: MenuDraft = { id: "catalogo", name: "Catalogo", sections: [{ id: "s", name: "Proposte", productIds: ["acqua"] }],
  products: [{ id: "acqua", name: "Acqua", description: "", available: true, priceCents: 200, ingredients: {}, allergens: [], options: [] }] };

function setup() {
  const changed = vi.fn();
  function Harness() {
    const [draft, setDraft] = useState(initial);
    return <MenuDraftEditor storeId="sede" draft={draft} ingredients={[]} onChange={next => { changed(next); setDraft(next); }} onUpload={vi.fn()} />;
  }
  render(<Harness />);
  return changed;
}

it.each([["Panino", "sandwich"], ["Prodotto", "product"], ["Box", "box"], ["Menu", "meal"]])("creates %s with its permanent type", (label, type) => {
  const changed = setup();
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi prodotto" }));
  fireEvent.change(screen.getByLabelText("Tipo di prodotto"), { target: { value: type } });
  const draft = changed.mock.lastCall![0] as MenuDraft;
  expect(draft.products.at(-1)?.productType).toBe(type);
  expect(screen.queryByRole("checkbox", { name: "Pizza" })).toBeNull();
  expect(screen.queryByLabelText("Tipo di prodotto")).toBeNull();
  if (label === "Box") expect(screen.getByRole("button", { name: "Aggiungi gruppo di scelte" })).toBeTruthy();
  if (label === "Menu") expect(screen.getByRole("button", { name: "Aggiungi fase" })).toBeTruthy();
});

it("configures Menu phases using catalog products with signed price differences", () => {
  const changed = setup();
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi prodotto" }));
  fireEvent.change(screen.getByLabelText("Tipo di prodotto"), { target: { value: "meal" } });
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi fase" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Acqua" }));
  fireEvent.change(screen.getByLabelText("Variazione Acqua in euro"), { target: { value: "-0.5" } });
  const menu = (changed.mock.lastCall![0] as MenuDraft).products.at(-1)!;
  expect(menu.meal?.steps[0].alternatives).toEqual([{ productId: "acqua", priceCents: -50 }]);
});
