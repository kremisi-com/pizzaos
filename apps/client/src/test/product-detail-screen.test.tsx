import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom,
} from "@pizzaos/testing";
import { ProductDetailScreen } from "../features/customization/components/product-detail-screen";

describe("product detail screen", () => {
  beforeEach(() => {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders the pizza generator preview and customization sections", () => {
    renderDom(<ProductDetailScreen productId="product-margherita" />);

    expect(
      domScreen
        .getByRole("img", { name: "Anteprima pizza Margherita Classica" })
        .getAttribute("src"),
    ).toBe("/images/pizza/rossa-classica.png");
    expect(
      document.querySelector('[src="/images/topping/margherita.png"]'),
    ).not.toBeNull();
    expect(
      domScreen.getByRole("heading", { name: "Impasto" }).textContent,
    ).toBe("Impasto");
    expect(domScreen.getByRole("heading", { name: "Base" }).textContent).toBe(
      "Base",
    );
    expect(
      domScreen.getByRole("heading", { name: "Formato" }).textContent,
    ).toBe("Formato");
    expect(
      domScreen.getByRole("heading", { name: "Ingredienti" }).textContent,
    ).toBe("Ingredienti");
    expect(domScreen.getByRole("heading", { name: "Extra" }).textContent).toBe(
      "Extra",
    );

    domFireEvent.click(
      domScreen.getByRole("heading", { name: "Extra" }).closest("button") as HTMLButtonElement,
    );

    expect(domScreen.getByRole("heading", { name: "Vegetali" }).textContent).toBe(
      "Vegetali",
    );
    expect(domScreen.getByRole("heading", { name: "Carne" }).textContent).toBe(
      "Carne",
    );
    expect(domScreen.getByRole("heading", { name: "Pesce" }).textContent).toBe(
      "Pesce",
    );
    expect(
      domScreen.getByRole("heading", { name: "Latticini" }).textContent,
    ).toBe("Latticini");
    expect(
      domScreen.getByRole("heading", { name: "Salse e finiture" }).textContent,
    ).toBe("Salse e finiture");
    expect(domScreen.getByText("Funghi trifolati").textContent).toBe(
      "Funghi trifolati",
    );
    expect(domScreen.getByText("Spianata piccante").textContent).toBe(
      "Spianata piccante",
    );
  });

  it("shows allergens, updates the ingredient toggles, and switches the preview image", () => {
    renderDom(<ProductDetailScreen productId="product-margherita" />);

    domFireEvent.click(
      domScreen.getByRole("button", { name: "Informazioni ingredienti e allergeni" }),
    );
    expect(domScreen.getByText("Glutine").textContent).toBe("Glutine");
    expect(domScreen.getByText("Lattosio").textContent).toBe("Lattosio");
    domFireEvent.click(domScreen.getByRole("button", { name: "Chiudi" }));
    expect(
      domScreen.getByTestId("customization-total-value").textContent,
    ).toContain("9,00");

    domFireEvent.click(domScreen.getByRole("radio", { name: /Integrale/i }));
    expect(
      domScreen.getByTestId("customization-total-value").textContent,
    ).toContain("10,20");

    domFireEvent.click(domScreen.getByRole("button", { name: /Base/i }));
    domFireEvent.click(domScreen.getByRole("radio", { name: /Bianca/i }));

    expect(
      domScreen
        .getByRole("img", { name: "Anteprima pizza Margherita Classica" })
        .getAttribute("src"),
    ).toBe("/images/pizza/bianca-integrale.png");

    domFireEvent.click(domScreen.getByRole("heading", { name: "Ingredienti" }).closest("button") as HTMLButtonElement);
    domFireEvent.click(
      domScreen.getByRole("button", { name: "Fiordilatte incluso" }),
    );

    expect(
      domScreen.getByRole("button", { name: "Fiordilatte escluso" }).getAttribute("aria-pressed"),
    ).toBe("false");
    expect(domScreen.getByText("Senza Fiordilatte").textContent).toBe(
      "Senza Fiordilatte",
    );

    expect(
      domScreen.getByTestId("customization-total-value").textContent,
    ).toContain("10,20");
  });

  it("renders the topping for the requested product", () => {
    renderDom(<ProductDetailScreen productId="product-tonno-cipolla" />);

    expect(
      document.querySelector('[src="/images/topping/tonno.png"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[src="/images/topping/vegetariana.png"]'),
    ).toBeNull();
  });
});
