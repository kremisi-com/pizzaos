import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom
} from "@pizzaos/testing";
import { CheckoutScreen } from "../features/checkout/components/checkout-screen";
import { CLIENT_CART_STORAGE_KEY } from "../features/cart/cart-model";

const CART_STATE_PAYLOAD = JSON.stringify({
  items: [
    {
      id: "cart-item-test-1",
      productId: "product-margherita",
      productName: "Margherita Classica",
      unitPriceCents: 1020,
      quantity: 1,
      notes: "Impasto: Integrale · Formato: Classica 32 cm"
    }
  ]
});

describe("checkout screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
    window.localStorage.setItem(CLIENT_CART_STORAGE_KEY, CART_STATE_PAYLOAD);
  });

  afterEach(() =>
  {
    vi.useRealTimers();
  });

  it("shows checkout validation errors when payment fields are invalid", () =>
  {
    renderDom(<CheckoutScreen />);

    domFireEvent.click(domScreen.getByTestId("checkout-submit-button"));

    expect(domScreen.getByText("Inserisci il nome intestatario della carta.").textContent).toBe(
      "Inserisci il nome intestatario della carta."
    );
    expect(domScreen.getByText("Inserisci le ultime 4 cifre della carta.").textContent).toBe(
      "Inserisci le ultime 4 cifre della carta."
    );
  });

  it("renders order confirmation after successful mock payment", async () =>
  {
    renderDom(<CheckoutScreen />);

    domFireEvent.change(domScreen.getByLabelText("Intestatario carta"), {
      target: {
        value: "Mario Rossi"
      }
    });
    domFireEvent.change(domScreen.getByLabelText("Ultime 4 cifre"), {
      target: {
        value: "1234"
      }
    });
    domFireEvent.click(domScreen.getByTestId("checkout-submit-button"));

    const confirmationTitle = await domScreen.findByRole("heading", { name: "Ordine confermato" });

    expect(confirmationTitle.textContent).toBe("Ordine confermato");
    expect(domScreen.getByText(/Pagamento mock completato/i).textContent).toContain("Pagamento mock completato");
  });
});
