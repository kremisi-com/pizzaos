import { beforeEach, describe, expect, it } from "vitest";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { ProductDetailScreen } from "../features/customization/components/product-detail-screen";

describe("product detail screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("supports guided step progression with next and back actions", () =>
  {
    renderDom(<ProductDetailScreen productId="product-margherita" />);

    expect(domScreen.getByRole("heading", { name: "Impasto e base" }).textContent).toBe("Impasto e base");

    domFireEvent.click(domScreen.getByRole("button", { name: "Continua" }));
    expect(domScreen.getByRole("heading", { name: "Variante e formato" }).textContent).toBe("Variante e formato");

    domFireEvent.click(domScreen.getByRole("button", { name: "Indietro" }));
    expect(domScreen.getByRole("heading", { name: "Impasto e base" }).textContent).toBe("Impasto e base");
  });

  it("shows allergens and updates total while customizing", () =>
  {
    renderDom(<ProductDetailScreen productId="product-margherita" />);

    expect(domScreen.getByText("Glutine").textContent).toBe("Glutine");
    expect(domScreen.getByText("Lattosio").textContent).toBe("Lattosio");
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("9,00");

    domFireEvent.click(domScreen.getByRole("radio", { name: /Integrale/i }));
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("10,20");

    domFireEvent.click(domScreen.getByRole("button", { name: "Continua" }));
    domFireEvent.click(domScreen.getByRole("button", { name: "Continua" }));
    domFireEvent.click(domScreen.getByRole("button", { name: "Continua" }));
    domFireEvent.click(domScreen.getByRole("checkbox", { name: /Filetti di acciuga/i }));

    expect(domScreen.getByText("Pesce").textContent).toBe("Pesce");
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("11,80");
  });
});
