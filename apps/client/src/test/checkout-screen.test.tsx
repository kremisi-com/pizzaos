import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom
} from "@pizzaos/testing";
import { createClientSeed } from "@pizzaos/mock-data";
import { CheckoutScreen } from "../features/checkout/components/checkout-screen";
import { CLIENT_CART_STORAGE_KEY } from "../features/cart/cart-model";
import { getClientDemoStateStorageKey } from "../features/home/client-demo-state";

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
    expect(domScreen.getByRole("link", { name: "Segui ordine" })).toBeDefined();
  });

  it("applies coupon and updates total summary", async () =>
  {
    const seed = createClientSeed();
    const persistedSeed = {
      ...seed,
      coupons: [
        {
          ...seed.coupons[0],
          minOrderAmount: {
            amountCents: 1000,
            currencyCode: "EUR" as const
          }
        },
        ...seed.coupons.slice(1)
      ]
    };

    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(persistedSeed));

    renderDom(<CheckoutScreen />);

    domFireEvent.change(domScreen.getByLabelText("Inserisci coupon"), {
      target: {
        value: "BENTORNATO5"
      }
    });
    domFireEvent.click(domScreen.getByTestId("checkout-apply-coupon-button"));

    expect(await domScreen.findByTestId("checkout-coupon-feedback")).toBeDefined();
    expect(domScreen.getByTestId("checkout-coupon-feedback").textContent).toContain("Coupon BENTORNATO5 applicato.");
    expect(domScreen.getByText("Sconto coupon")).toBeDefined();
    expect(domScreen.getByTestId("checkout-total-value").textContent).toBe("7,71 €");
  });

  it("shows invalid coupon message and does not apply discount", async () =>
  {
    renderDom(<CheckoutScreen />);

    domFireEvent.change(domScreen.getByLabelText("Inserisci coupon"), {
      target: {
        value: "CODICENONVALIDO"
      }
    });
    domFireEvent.click(domScreen.getByTestId("checkout-apply-coupon-button"));

    expect(await domScreen.findByTestId("checkout-coupon-feedback")).toBeDefined();
    expect(domScreen.getByTestId("checkout-coupon-feedback").textContent).toContain("Codice coupon non valido.");
    expect(domScreen.queryByText("Sconto coupon")).toBeNull();
  });

  it("renders empty-cart edge state when checkout opens without items", () =>
  {
    window.localStorage.removeItem(CLIENT_CART_STORAGE_KEY);

    renderDom(<CheckoutScreen />);

    expect(domScreen.getByRole("heading", { name: "Checkout" })).toBeDefined();
    expect(domScreen.getByText("Il carrello è vuoto. Aggiungi prodotti per completare un ordine mock.")).toBeDefined();
  });
});
