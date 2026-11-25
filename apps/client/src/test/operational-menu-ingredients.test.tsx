import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IndividualProduct, IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domScreen, renderDom } from "@pizzaos/testing";
import { OperationalMenu, useMenuPreferences } from "../features/menu";

function Menu({ product }: { product: IndividualProduct }) {
  const preferences = useMenuPreferences(undefined, undefined);
  const store: IndividualStore = {
    id: "sede", name: "Sede", latitude: 0, longitude: 0, acceptingOrders: true,
    deliveryBands: [], ingredients: [], slots: [], products: [product],
    menu: { id: "menu", name: "Menu", sections: [{ id: "pizze", name: "Pizze", productIds: [product.id] }] }
  };
  return <OperationalMenu store={store} preferences={preferences} onAdd={vi.fn()} />;
}

beforeEach(cleanupDom);

describe("ingredients in menu cards", () => {
  it("shows ingredient names immediately below the description without food warnings", () => {
    renderDom(<Menu product={{
      id: "pizza", name: "Margherita", description: "La classica", priceCents: 700, available: true,
      options: [], allergens: [], ingredients: { pomodoro: 1, mozzarella: 1 },
      foodIngredients: [{ id: "pomodoro", name: "Pomodoro" }, { id: "mozzarella", name: "Mozzarella" }],
      food: { contains: ["Latte"], mayContain: ["Soia"] }
    }} />);
    const ingredients = domScreen.getByText("Pomodoro, Mozzarella", { exact: true });
    expect(domScreen.getByText("La classica").nextElementSibling).toBe(ingredients);
    const card = ingredients.closest("article")!;
    expect(card.textContent).not.toMatch(/verificare|Contiene:|Può contenere:|Ingredienti:/);
  });

  it("omits the ingredient row when the product has no ingredients", () => {
    renderDom(<Menu product={{ id: "acqua", name: "Acqua", description: "Naturale", priceCents: 150, available: true, options: [], ingredients: {}, allergens: [] }} />);
    const card = domScreen.getByRole("heading", { name: "Acqua" }).closest("article")!;
    expect([...card.querySelectorAll("p")].map(node => node.textContent)).toEqual(["Naturale"]);
  });

  it("shows ingredients below the name when the description is absent", () => {
    renderDom(<Menu product={{
      id: "pizza", name: "Rossa", description: "", priceCents: 500, available: true, options: [], allergens: [],
      ingredients: { pomodoro: 1 }, foodIngredients: [{ id: "pomodoro", name: "Pomodoro" }]
    }} />);
    expect(domScreen.getByRole("heading", { name: "Rossa" }).nextElementSibling).toBe(domScreen.getByText("Pomodoro", { exact: true }));
  });
});
