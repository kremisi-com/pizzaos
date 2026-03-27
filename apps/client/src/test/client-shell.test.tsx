import { getThemeClass } from "@pizzaos/brand";
import { createClientSeed } from "@pizzaos/mock-data";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CLIENT_CART_STORAGE_KEY } from "../features/cart/cart-model";
import { CLIENT_FEEDBACK_STORAGE_KEY } from "../features/feedback/feedback-model";
import { ClientShell } from "../features/home/components/client-shell";
import { getClientDemoStateStorageKey } from "../features/home/client-demo-state";
import { CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY } from "../features/orders/orders-model";

describe("client shell", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
  });

  it("mounts with the expected mobile-first entry points", () =>
  {
    const markup = renderToString(createElement(ClientShell));

    expect(markup).toContain(getThemeClass("client"));
    expect(markup).toContain("Bentornato");
    expect(markup).toContain("Riordina ora");
    expect(markup).toContain("Crea la tua pizza");
    expect(markup).toContain("Punti e vantaggi");
    expect(markup).toContain("Segui ordine");
    expect(markup).toContain("Riordino rapido");
    expect(markup).toContain("Ordina come l&#x27;ultima volta");
    expect(markup).toContain("Promo di stagione");
    expect(markup).toContain("Reset demo");
    expect(markup).toContain('href="/menu"');
    expect(markup).toContain('href="/rewards"');
    expect(markup).toContain('href="/orders"');
    expect(markup).toContain('href="/menu?section=section-speciali"');
  });

  it("does not crash when persisted slot values are non-ISO labels", async () =>
  {
    const seed = createClientSeed();
    const persistedSeed = {
      ...seed,
      activeOrders: [
        {
          ...seed.activeOrders[0],
          scheduledSlot: "Oggi, 19:10"
        }
      ]
    };

    window.localStorage.setItem(getClientDemoStateStorageKey(), JSON.stringify(persistedSeed));

    renderDom(<ClientShell />);

    expect(await domScreen.findByText(/Slot previsto Oggi, 19:10/i)).toBeDefined();
  });

  it("clears persisted order notifications and feedback when resetting demo state", async () =>
  {
    window.localStorage.setItem(
      CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "order-notification-1",
          orderId: "order-client-001",
          status: "preparing",
          title: "Ordine in preparazione",
          description: "La cucina ha iniziato la preparazione.",
          createdAtIso: "2026-03-25T18:45:00.000Z",
          isRead: false
        }
      ])
    );
    window.localStorage.setItem(
      CLIENT_FEEDBACK_STORAGE_KEY,
      JSON.stringify({
        entries: [
          {
            orderId: "order-client-001",
            rating: 5,
            comment: "Ottimo",
            submittedAtIso: "2026-03-25T19:50:00.000Z",
            googleReviewRedirectedAtIso: null
          }
        ]
      })
    );

    renderDom(<ClientShell />);

    domFireEvent.click(await domScreen.findByTestId("client-reset-button"));

    expect(window.localStorage.getItem(CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(CLIENT_FEEDBACK_STORAGE_KEY)).toBeNull();
  });

  it("prepares the cart from the order-like-last-time CTA", async () =>
  {
    renderDom(<ClientShell />);

    domFireEvent.click(await domScreen.findByTestId("client-order-like-last-time-button"));

    const persistedCartPayload = window.localStorage.getItem(CLIENT_CART_STORAGE_KEY);

    expect(persistedCartPayload).not.toBeNull();
    expect(await domScreen.findByTestId("client-quick-reorder-notice")).toBeDefined();
  });
});
