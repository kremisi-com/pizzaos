import { createClientSeed } from "@pizzaos/mock-data";
import {
  cleanupDom,
  domFireEvent,
  domScreen,
  renderDom
} from "@pizzaos/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OrdersScreen } from "../features/orders/components/orders-screen";
import { getClientDemoStateStorageKey } from "../features/home/client-demo-state";
import { CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY } from "../features/orders/orders-model";

describe("orders screen", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  afterEach(() =>
  {
    vi.useRealTimers();
  });

  it("renders timeline and keeps tracking hidden before dispatch", async () =>
  {
    const seed = createClientSeed();
    const persistedSeed = {
      ...seed,
      activeOrders: [
        {
          ...seed.activeOrders[0],
          status: "preparing" as const
        }
      ],
      orderHistory: [
        {
          ...seed.activeOrders[0],
          status: "preparing" as const
        },
        ...seed.orderHistory
      ]
    };

    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(persistedSeed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByRole("heading", { name: "Stato ordine" })).toBeDefined();
    expect(domScreen.getByTestId("orders-timeline")).toBeDefined();
    expect(domScreen.getByTestId("tracking-hidden").textContent).toContain("Tracking disponibile");
  });

  it("shows tracking when order is out for delivery", async () =>
  {
    const seed = createClientSeed();
    const persistedSeed = {
      ...seed,
      activeOrders: [
        {
          ...seed.activeOrders[0],
          status: "out_for_delivery" as const
        }
      ],
      orderHistory: [
        {
          ...seed.activeOrders[0],
          status: "out_for_delivery" as const
        },
        ...seed.orderHistory
      ]
    };

    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(persistedSeed));

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByTestId("tracking-visible")).toBeDefined();
    expect(domScreen.getByTestId("tracking-visible").textContent).toContain("Tracking rider attivo");
  });

  it("marks all notifications as read", async () =>
  {
    const seed = createClientSeed();
    const persistedSeed = {
      ...seed,
      activeOrders: [
        {
          ...seed.activeOrders[0],
          status: "preparing" as const
        }
      ],
      orderHistory: [
        {
          ...seed.activeOrders[0],
          status: "preparing" as const
        },
        ...seed.orderHistory
      ]
    };

    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(persistedSeed));
    window.localStorage.setItem(
      CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "order-notification-order-client-001-preparing",
          orderId: "order-client-001",
          status: "preparing",
          title: "Ordine in preparazione",
          description: "La cucina ha iniziato la preparazione.",
          createdAtIso: "2026-03-25T18:45:00.000Z",
          isRead: false
        }
      ])
    );

    renderDom(<OrdersScreen />);

    expect(await domScreen.findByText("1 notifiche non lette")).toBeDefined();

    domFireEvent.click(domScreen.getByTestId("orders-mark-read-button"));

    expect(await domScreen.findByText("Tutte le notifiche sono lette")).toBeDefined();
  });
});
