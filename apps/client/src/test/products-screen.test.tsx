import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanupDom,
  domScreen,
  renderDom,
} from "@pizzaos/testing";
import { ProductsScreen } from "../features/products/components/products-screen";

describe("products screen", () => {
  beforeEach(() => {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders the extended sections with the new mock products", () => {
    renderDom(<ProductsScreen />);

    const productButtons = domScreen.getAllByRole("button", { name: /Aggiungi .+ al carrello/ });

    expect(
      domScreen.getByRole("heading", { name: "Stuzzicherie, Dolci & Bevande" }).textContent,
    ).toBe("Stuzzicherie, Dolci & Bevande");
    expect(productButtons.length).toBeGreaterThan(20);
    expect(domScreen.getByText("Montanarine Classiche").textContent).toBe(
      "Montanarine Classiche",
    );
    expect(domScreen.getByText("Delizia al Limone").textContent).toBe(
      "Delizia al Limone",
    );
    expect(domScreen.getByText("Chinotto Bio").textContent).toBe(
      "Chinotto Bio",
    );
    expect(
      domScreen.getByRole("button", { name: "Aggiungi Spritz Analcolico Agrumato al carrello" }),
    ).toBeDefined();
    expect(domScreen.getByText("Esaurito").textContent).toBe("Esaurito");
  });
});
