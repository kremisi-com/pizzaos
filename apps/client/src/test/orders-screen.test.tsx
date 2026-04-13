import { createClientSeed } from "@pizzaos/mock-data";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom
} from "@pizzaos/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { OrdersScreen } from "../features/orders/components/orders-screen";
import { CLIENT_CART_STORAGE_KEY } from "../features/cart/cart-model";
import { getClientDemoStateStorageKey } from "../features/home/client-demo-state";

describe("orders screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("renders archived orders list and opens the first order details", async () =>
  {
    const seed = createClientSeed();
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByRole("heading", { name: "Ordini passati" })).toBeDefined();
    expect(domScreen.getByTestId("orders-history-list")).toBeDefined();
    expect(domScreen.getByTestId("orders-detail-card")).toBeDefined();
    expect(domScreen.getByText("Dettagli ordine")).toBeDefined();
    expect(domScreen.getByText("Riepilogo ordine")).toBeDefined();
    expect(domScreen.getAllByText("order-client-history-001").length).toBeGreaterThan(0);
    expect(domScreen.queryByTestId("orders-last-time-button")).toBeNull();
  });

  it("updates detail panel when selecting another order from history", async () =>
  {
    const seed = createClientSeed();
    const secondArchivedOrder = {
      ...seed.orderHistory[0],
      id: "order-client-history-002",
      createdAtIso: "2026-03-22T18:30:00.000Z",
      updatedAtIso: "2026-03-22T18:58:00.000Z",
      total: {
        ...seed.orderHistory[0].total,
        amountCents: 2150
      }
    };

    const seedWithTwoArchivedOrders = {
      ...seed,
      orderHistory: [
        seed.orderHistory[0],
        secondArchivedOrder
      ]
    };
    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(seedWithTwoArchivedOrders));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("orders-history-select-order-client-history-002")).toBeDefined();

    domFireEvent.click(domScreen.getByTestId("orders-history-select-order-client-history-002"));

    expect(domScreen.getByText("ID ordine:")).toBeDefined();
    expect(domScreen.getAllByText("order-client-history-002").length).toBeGreaterThan(0);
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

    expect(persistedCart.items?.[0]?.productId).toBe("product-capricciosa");
    expect(await domScreen.findByTestId("orders-reorder-cart-link")).toBeDefined();
  });
});
