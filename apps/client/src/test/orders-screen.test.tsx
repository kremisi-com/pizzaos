import { createClientSeed } from "@pizzaos/mock-data";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { OrdersScreen } from "../features/orders/components/orders-screen";
import { CLIENT_CART_STORAGE_KEY } from "../features/cart/cart-model";
import { getClientDemoStateStorageKey } from "../features/home/client-demo-state";
import { CLIENT_FEEDBACK_STORAGE_KEY } from "../features/feedback/feedback-model";
import { CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY } from "../features/orders/orders-model";

describe("orders screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders archived orders list without detail or summary cards", async () =>
  {
    const seed = createClientSeed();
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByRole("heading", { name: "Ordini passati" })).toBeDefined();
    expect(domScreen.getByTestId("orders-history-list")).toBeDefined();
    expect(domScreen.getByTestId("orders-reorder-order-client-history-001")).toBeDefined();
    expect(domScreen.getByTestId("orders-reorder-order-client-history-002")).toBeDefined();
    expect(domScreen.getByTestId("orders-reorder-order-client-history-003")).toBeDefined();
    expect(domScreen.queryByTestId("orders-last-time-button")).toBeNull();
    expect(domScreen.queryByText("Nuovo ordine")).toBeNull();
    expect(domScreen.queryByText("Dettagli ordine")).toBeNull();
    expect(domScreen.queryByText("Riepilogo ordine")).toBeNull();
  });

  it("renders multiple archived orders directly in history", async () =>
  {
    const seed = createClientSeed();
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("orders-reorder-order-client-history-002")).toBeDefined();
    expect(domScreen.getByTestId("orders-reorder-order-client-history-003")).toBeDefined();
  });

  it("renders the persisted active order instead of a static tracking mock", async () =>
  {
    const seed = createClientSeed();
    const activeOrder = {
      ...seed.orderHistory[0],
      id: "order-client-mock-12345",
      status: "confirmed" as const,
      lines: [
        {
          ...seed.orderHistory[0].lines[0],
          productId: "product-margherita",
          quantity: 2
        }
      ],
      total: {
        amountCents: 2140,
        currencyCode: "EUR" as const
      }
    };

    window.localStorage.setItem(
      getClientDemoStateStorageKey(),
      JSON.stringify({
        ...seed,
        activeOrders: [activeOrder],
        orderHistory: [activeOrder, ...seed.orderHistory]
      })
    );

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("orders-active-order")).toBeDefined();
    expect(domScreen.getByText("#order-client-mock-12345")).toBeDefined();
    expect(domScreen.getByText("2× Margherita Classica")).toBeDefined();
    expect(domScreen.getByText(/21,40/)).toBeDefined();
  });

  it("renders and persists post-delivery feedback for the delivered order", async () =>
  {
    const seed = createClientSeed();
    const deliveredOrder = seed.orderHistory[0];
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("order-feedback-prompt")).toBeDefined();
    domFireEvent.click(domScreen.getByLabelText("4 stelle"));
    domFireEvent.change(domScreen.getByRole("textbox"), {
      target: { value: "Consegna puntuale e pizza ottima." }
    });
    domFireEvent.click(domScreen.getByTestId("order-feedback-submit"));

    expect(await domScreen.findByTestId("order-feedback-thanks")).toBeDefined();
    const feedbackPayload = window.localStorage.getItem(CLIENT_FEEDBACK_STORAGE_KEY);
    expect(feedbackPayload).toContain(deliveredOrder.id);
    expect(feedbackPayload).toContain('"rating":4');
  });

  it("shows persisted status notifications and can mark them as read", async () =>
  {
    const seed = createClientSeed();
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seed));
    window.localStorage.setItem(CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY, JSON.stringify([
      {
        id: "order-notification-order-client-history-001-delivered",
        orderId: "order-client-history-001",
        status: "delivered",
        title: "Ordine consegnato",
        description: "Consegna completata. Buon appetito.",
        createdAtIso: "2026-03-25T19:15:00.000Z",
        isRead: false
      }
    ]));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("order-notifications")).toBeDefined();
    domFireEvent.click(domScreen.getByRole("button", { name: "Segna come letti" }));
    expect(window.localStorage.getItem(CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY)).toContain('"isRead":true');
  });

  it("prepares the cart from quick reorder on the selected order", async () =>
  {
    const seed = createClientSeed();
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("orders-reorder-order-client-history-001")).toBeDefined();

    domFireEvent.click(domScreen.getByTestId("orders-reorder-order-client-history-001"));

    const persistedCartPayload = window.localStorage.getItem(CLIENT_CART_STORAGE_KEY);
    expect(persistedCartPayload).not.toBeNull();

    const persistedCart = JSON.parse(persistedCartPayload ?? "{}") as {
      readonly items?: readonly {
        readonly productId: string;
      }[];
    };

    expect(persistedCart.items?.[0]?.productId).toBe(seed.orderHistory[0].lines[0]?.productId);
    expect(await domScreen.findByTestId("orders-reorder-cart-link")).toBeDefined();
  });
});
