import { describe, expect, test } from "vitest";

import type {
  ClientApiContract,
  ClientCheckoutRequest,
  ClientTrackingResponse
} from "./client-api-contracts";

describe("client frontend API contracts", () =>
{
  test("models the complete checkout request without exposing card details", () =>
  {
    const request: ClientCheckoutRequest = {
      cartId: "cart-demo-1",
      fulfillment: "delivery",
      slotId: "slot-19-20",
      payment: {
        method: "card",
        cardLastDigits: "1234"
      },
      tipPercent: 5,
      couponCode: "PIZZAOS5"
    };

    expect(request.payment).toEqual({
      method: "card",
      cardLastDigits: "1234"
    });
    expect("cardNumber" in request.payment).toBe(false);
  });

  test("defines a frontend port for catalog, cart, checkout, orders, loyalty, and tracking", () =>
  {
    const api: Pick<ClientApiContract,
      "getCatalog" | "getCart" | "addCartLine" | "checkout" | "listOrders" | "getLoyalty" | "getTracking"
    > = {
      getCatalog: async () => ({ menu: {} as never, products: [], slots: [], generatedAtIso: "2026-01-01T00:00:00.000Z" }),
      getCart: async () => ({ cart: { id: "cart-1", customerId: "customer-1", storeId: "store-1", lines: [], updatedAtIso: "2026-01-01T00:00:00.000Z" } }),
      addCartLine: async () => ({ cart: { id: "cart-1", customerId: "customer-1", storeId: "store-1", lines: [], updatedAtIso: "2026-01-01T00:00:00.000Z" } }),
      checkout: async () => ({ order: {} as never, earnedLoyaltyPoints: 12, loyalty: {} as never }),
      listOrders: async () => ({ orders: [] }),
      getLoyalty: async () => ({ loyalty: {} as never, rewards: [], coupons: [] }),
      getTracking: async () => ({ orderId: "order-1", status: "waiting_for_dispatch", updatedAtIso: "2026-01-01T00:00:00.000Z", rider: null })
    };

    expect(typeof api.checkout).toBe("function");
  });

  test("keeps tracking unavailable until dispatch and exposes the rider position only when active", () =>
  {
    const tracking: ClientTrackingResponse = {
      orderId: "order-1",
      status: "out_for_delivery",
      updatedAtIso: "2026-01-01T00:00:00.000Z",
      rider: {
        id: "rider-1",
        name: "Giulia",
        position: {
          lat: 45.4642,
          lng: 9.19
        }
      }
    };

    expect(tracking.rider?.position.lat).toBe(45.4642);
  });
});
