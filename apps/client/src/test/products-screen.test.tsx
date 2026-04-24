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

    const productLinks = document.querySelectorAll('a[href^="/product/"]');

    expect(
      domScreen.getByRole("heading", { name: "Stuzzicherie, Dolci & Bevande" }).textContent,
    ).toBe("Stuzzicherie, Dolci & Bevande");
    expect(productLinks).toHaveLength(27);
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
      domScreen.getByRole("link", { name: /Spritz Analcolico Agrumato/i }).getAttribute("href"),
    ).toBe("/product/product-spritz-analcolico-agrumato");
    expect(domScreen.getByText("Esaurito").textContent).toBe("Esaurito");
  });
});
