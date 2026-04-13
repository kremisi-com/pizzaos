import { beforeEach, describe, expect, it } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom
} from "@pizzaos/testing";
import { CartScreen } from "../features/cart/components/cart-screen";
import { CLIENT_CART_STORAGE_KEY } from "../features/cart/cart-model";

const CART_STATE_PAYLOAD = JSON.stringify({
  items: [
    {
      id: "cart-item-test-1",
      productId: "product-margherita",
      productName: "Margherita Classica",
      unitPriceCents: 1020,
      quantity: 2,
      notes: "Impasto: Integrale · Formato: Classica 32 cm"
    }
  ]
});

describe("cart screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders the cart summary and checkout action for populated carts", () =>
  {
    window.localStorage.setItem(CLIENT_CART_STORAGE_KEY, CART_STATE_PAYLOAD);

    renderDom(<CartScreen />);

    expect(domScreen.getByRole("heading", { name: "Carrello" })).toBeDefined();
    expect(domScreen.getByRole("heading", { name: "Riepilogo ordine" })).toBeDefined();
    expect(
      domScreen.getByText((content) => content.includes("22,40"))
    ).toBeDefined();
    expect(domScreen.getByTestId("cart-checkout-link").textContent).toContain("Vai al checkout");
  });

  it("returns to the empty state after clearing the cart", () =>
  {
    window.localStorage.setItem(CLIENT_CART_STORAGE_KEY, CART_STATE_PAYLOAD);

    renderDom(<CartScreen />);

    domFireEvent.click(domScreen.getByRole("button", { name: "Svuota carrello" }));

    expect(domScreen.getByText("Carrello vuoto")).toBeDefined();
    expect(domScreen.queryByRole("heading", { name: "Riepilogo ordine" })).toBeNull();
  });
});
