import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { IndividualProduct } from "@pizzaos/domain";
import { hasMenuProductChoices, MenuProductChoices } from "../features/catalog/components/menu-product-form";

afterEach(cleanup);

it("rimuove i controlli del precedente metodo e conserva le altre scelte e i dati salvati", () => {
  const product: IndividualProduct = {
    id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true, ingredients: {}, allergens: [],
    groups: [
      { id: "dough", name: "Scegli l’impasto", kind: "dough", min: 1, max: 1, optionIds: ["classico"] },
      { id: "pizza", name: " Scegli la pizza ", kind: "recipe", min: 1, max: 1, optionIds: ["rossa"] },
      { id: "other", name: "Altra scelta", kind: "selection", min: 0, max: 1, optionIds: ["altra"] }
    ],
    options: ["classico", "rossa", "altra"].map(id => ({ id, name: id, priceCents: 0, ingredients: {} }))
  };
  const onChange = vi.fn();
  render(<MenuProductChoices product={product} ingredients={[]} onChange={onChange} />);
  expect(screen.queryByText("Scegli l’impasto")).toBeNull();
  expect(screen.queryByText("Scegli la pizza")).toBeNull();
  fireEvent.change(screen.getByLabelText("Nome gruppo"), { target: { value: "Contorno" } });
  expect(onChange.mock.lastCall![0].groups).toEqual([
    product.groups![0], product.groups![1], { ...product.groups![2], name: "Contorno" }
  ]);
  expect(hasMenuProductChoices({ ...product, groups: product.groups!.slice(0, 2) })).toBe(false);
  expect(hasMenuProductChoices({ ...product, groups: undefined })).toBe(true);
});
