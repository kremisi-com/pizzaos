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
import { addGroupOrderItem, CLIENT_GROUP_ORDER_STORAGE_KEY } from "../features/group-order/group-order-model";
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

    expect(domScreen.queryByText("Roma Centro")).toBeNull();

    domFireEvent.click(domScreen.getByTestId("checkout-submit-button"));

    expect(domScreen.getByText("Il pagamento sicuro non è ancora pronto.").textContent).toBe(
      "Il pagamento sicuro non è ancora pronto."
    );
  });

  it("renders order confirmation after successful mock payment", async () =>
  {
    renderDom(<CheckoutScreen />);

    domFireEvent.click(domScreen.getByLabelText("Contanti alla consegna"));
    domFireEvent.click(domScreen.getByTestId("checkout-submit-button"));

    const confirmationTitle = await domScreen.findByRole("heading", { name: "Il tuo ordine è confermato" });

    expect(confirmationTitle.textContent).toBe("Il tuo ordine è confermato");
    expect(domScreen.getByText(/Preparazione confermata per lo slot/i)).toBeDefined();
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

    await domScreen.findByTestId("checkout-coupon-feedback");
    await Promise.resolve();
    expect(domScreen.getByTestId("checkout-coupon-feedback")).toBeDefined();
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

  it("uses the seeded delivery address and captures order-specific instructions", () =>
  {
    renderDom(<CheckoutScreen />);

    expect(domScreen.getByText(/Via dei Fori Imperiali 12/)).toBeDefined();
    domFireEvent.change(domScreen.getByLabelText("Citofono"), { target: { value: "Rossi" } });
    domFireEvent.change(domScreen.getByLabelText("Piano"), { target: { value: "3" } });

    expect((domScreen.getByLabelText("Citofono") as HTMLInputElement).value).toBe("Rossi");
    expect((domScreen.getByLabelText("Piano") as HTMLInputElement).value).toBe("3");
  });

  it("removes delivery data and its fee when pickup is selected", () =>
  {
    renderDom(<CheckoutScreen />);

    domFireEvent.click(domScreen.getByLabelText("Ritiro in pizzeria"));

    expect(domScreen.queryByLabelText("Citofono")).toBeNull();
    expect(domScreen.queryByText("Consegna")).toBeNull();
    expect(domScreen.getByText(/nessun costo di consegna/i)).toBeDefined();
  });

  it("uses the shared cart for a single group checkout and clears only group state", async () =>
  {
    addGroupOrderItem({ productId: "product-margherita", productName: "Margherita Classica", unitPriceCents: 900 }, window.localStorage);
    renderDom(<CheckoutScreen isGroupOrder />);
    domFireEvent.click(domScreen.getByLabelText("Contanti alla consegna"));
    domFireEvent.click(domScreen.getByTestId("checkout-submit-button"));
    expect(await domScreen.findByRole("heading", { name: "Il tuo ordine è confermato" })).toBeDefined();
    expect(window.localStorage.getItem(CLIENT_GROUP_ORDER_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(CLIENT_CART_STORAGE_KEY)).toBe(CART_STATE_PAYLOAD);
  });
});
