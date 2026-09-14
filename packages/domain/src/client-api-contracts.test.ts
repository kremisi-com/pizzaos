import { describe, expect, test } from "vitest";

import type {
  ClientApiContract,
  ClientApplyCouponRequest,
  ClientAvailabilityConflict,
  ClientCheckoutRequest,
  ClientLiveUpdatesResponse,
  ClientProductCustomization,
  ClientTrackingResponse
} from "./client-api-contracts";

describe("client frontend API contracts", () =>
{
  test("models the complete checkout request without exposing card details", () =>
  {
    const request: ClientCheckoutRequest = {
      cartId: "cart-demo-1",
      contact: { firstName: "Mario", lastName: "Rossi", email: "mario@example.test", phone: "+39 333 1234567" },
      fulfillment: { method: "delivery", slotId: "slot-19-20", instructions: { doorbell: "Rossi", floor: "3", note: "" } },
      payment: {
        method: "card",
        paymentMethodId: "pm_test"
      },
      tipPercent: 5,
      couponCode: "PIZZAOS5",
      idempotencyKey: "78f3f56d-4f6f-4cba-b3e9-98cdbf8f5dc8"
    };

    expect(request.payment).toEqual({
      method: "card",
      paymentMethodId: "pm_test"
    });
    expect("cardNumber" in request.payment).toBe(false);
    expect(request.fulfillment.method).toBe("delivery");
  });

  test("defines a frontend port for catalog, cart, checkout, orders, loyalty, and tracking", () =>
  {
    const api: Pick<ClientApiContract,
      "getSession" | "getCatalog" | "getCart" | "addCartLine" | "checkout" | "getCheckoutStatus" | "listOrders" | "getLoyalty" | "getTracking" | "getLiveUpdates"
    > = {
      getSession: async () => ({ session: {} as never, customer: {} as never }),
      getCatalog: async () => ({ menu: {} as never, products: [], slots: [], generatedAtIso: "2026-01-01T00:00:00.000Z" }),
      getCart: async () => ({ cart: { id: "cart-1", customerId: "customer-1", storeId: "store-1", lines: [], updatedAtIso: "2026-01-01T00:00:00.000Z" } }),
      addCartLine: async () => ({ cart: { id: "cart-1", customerId: "customer-1", storeId: "store-1", lines: [], updatedAtIso: "2026-01-01T00:00:00.000Z" } }),
      checkout: async () => ({ order: {} as never, payment: {} as never, earnedLoyaltyPoints: 12, loyalty: {} as never }),
      getCheckoutStatus: async () => ({ order: {} as never, payment: {} as never, earnedLoyaltyPoints: 12, loyalty: {} as never }),
      listOrders: async () => ({ orders: [] }),
      getLoyalty: async () => ({ loyalty: {} as never, rewards: [], coupons: [] }),
      getTracking: async () => ({ orderId: "order-1", status: "waiting_for_dispatch", updatedAtIso: "2026-01-01T00:00:00.000Z", rider: null }),
      getLiveUpdates: async () => ({ events: [], nextCursor: "cursor-1", generatedAtIso: "2026-01-01T00:00:00.000Z" })
    };

    expect(typeof api.getSession).toBe("function");
    expect(typeof api.checkout).toBe("function");
  });

  test("models customization, coupons, and group orders as typed API operations", () =>
  {
    const customization: ClientProductCustomization = {
      doughId: "dough-integrale",
      baseId: "base-bianca",
      variantId: "variant-xl",
      ingredientSelections: [{ ingredientId: "ingredient-fiordilatte", mode: "extra" }],
      extraIds: ["extra-burrata"]
    };
    const coupon: ClientApplyCouponRequest = { cartId: "cart-1", couponCode: "PIZZAOS5", referenceIso: "2026-03-27T10:30:00.000Z" };

    expect(customization.extraIds).toEqual(["extra-burrata"]);
    expect(coupon.couponCode).toBe("PIZZAOS5");
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

  test("models revisioned order, stock, slot, and tracking updates with a resumable cursor", () =>
  {
    const updates: ClientLiveUpdatesResponse = {
      nextCursor: "stream-42",
      generatedAtIso: "2026-03-27T10:31:00.000Z",
      events: [
        {
          type: "product_availability_updated",
          eventId: "event-stock-1",
          revision: 7,
          occurredAtIso: "2026-03-27T10:30:30.000Z",
          productId: "product-margherita",
          status: "sold_out"
        },
        {
          type: "slot_availability_updated",
          eventId: "event-slot-1",
          revision: 8,
          occurredAtIso: "2026-03-27T10:30:45.000Z",
          slot: { slotId: "slot-19-20", label: "19:00–20:00", status: "sold_out", etaMinutes: 45 }
        }
      ]
    };

    expect(updates.events.map((event) => event.revision)).toEqual([7, 8]);
    expect(updates.nextCursor).toBe("stream-42");
  });

  test("makes stale product and slot availability a typed, recoverable conflict", () =>
  {
    const conflict: ClientAvailabilityConflict = {
      code: "inventory_changed",
      message: "La disponibilità è cambiata durante il checkout.",
      affectedProductIds: ["product-margherita"],
      affectedSlotId: "slot-19-20",
      availabilityRevision: 9
    };

    expect(conflict.availabilityRevision).toBe(9);
  });
});
