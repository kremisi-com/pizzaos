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
  fireEvent.change(screen.getByRole("combobox", { name: "Aggiungi prodotto" }), { target: { value: type } });
  const draft = changed.mock.lastCall![0] as MenuDraft;
  expect(draft.products.at(-1)?.productType).toBe(type);
  expect(screen.queryByRole("checkbox", { name: "Pizza" })).toBeNull();
  expect(screen.queryByLabelText("Tipo di prodotto")).toBeNull();
  if (label === "Box") expect(screen.getByRole("button", { name: "Aggiungi gruppo di scelte" })).toBeTruthy();
  if (label === "Menu") expect(screen.getByRole("button", { name: "Aggiungi fase" })).toBeTruthy();
});

it("configures Menu phases using catalog products with signed price differences", () => {
  const changed = setup();
  fireEvent.change(screen.getByRole("combobox", { name: "Aggiungi prodotto" }), { target: { value: "meal" } });
  fireEvent.click(screen.getByRole("button", { name: "Aggiungi fase" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Acqua" }));
  fireEvent.change(screen.getByLabelText("Variazione Acqua in euro"), { target: { value: "-0.5" } });
  const menu = (changed.mock.lastCall![0] as MenuDraft).products.at(-1)!;
  expect(menu.meal?.steps[0].alternatives).toEqual([{ productId: "acqua", priceCents: -50 }]);
});

it("keeps the selection ready for consecutive additions of the same type", () => {
  const changed = setup();
  const select = screen.getByRole("combobox", { name: "Aggiungi prodotto" }) as HTMLSelectElement;
  expect(select.value).toBe("");
  expect(changed).not.toHaveBeenCalled();
  expect(Array.from(select.options).filter(option => !option.disabled).map(option => option.text)).toEqual(["Pizza", "Panino", "Prodotto", "Box", "Menu"]);
  fireEvent.change(select, { target: { value: "sandwich" } });
  expect(select.value).toBe("");
  fireEvent.change(select, { target: { value: "sandwich" } });
  expect(select.value).toBe("");
  const draft = changed.mock.lastCall![0] as MenuDraft;
  const sandwiches = draft.products.filter(product => product.productType === "sandwich");
  expect(sandwiches).toHaveLength(2);
  expect(sandwiches[0].id).not.toBe(sandwiches[1].id);
});
