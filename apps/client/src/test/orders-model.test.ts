import { createClientSeed } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import {
  advanceClientOrderState,
  deriveTrackingSnapshot,
  mergeOrderNotifications,
  type ClientOrderNotification
} from "../features/orders/orders-model";

describe("orders model", () =>
{
  it("progresses active order status and keeps order history aligned", () =>
  {
    const seed = createClientSeed();
    const startingOrderId = seed.activeOrders[0].id;
    const result = advanceClientOrderState(
      seed,
      []
    );

    expect(result.seed.activeOrders[0]?.status).toBe("preparing");
    expect(result.seed.orderHistory.find((order) => order.id === startingOrderId)?.status).toBe("preparing");
  });

  it("deduplicates notifications by id", () =>
  {
    const notifications: readonly ClientOrderNotification[] = [
      {
        id: "order-notification-order-1-preparing",
        orderId: "order-1",
        status: "preparing",
        title: "Ordine in preparazione",
        description: "La cucina ha iniziato la preparazione.",
        createdAtIso: "2026-03-25T18:45:00.000Z",
        isRead: false
      }
    ];
    const merged = mergeOrderNotifications(notifications, notifications);

    expect(merged).toHaveLength(1);
  });

  it("derives tracking visibility rules from order status", () =>
  {
    const seed = createClientSeed();
    const order = seed.activeOrders[0];

    const hiddenSnapshot = deriveTrackingSnapshot({
      ...order,
      status: "preparing"
    });
    const activeSnapshot = deriveTrackingSnapshot({
      ...order,
      status: "out_for_delivery"
    });
    const deliveredSnapshot = deriveTrackingSnapshot({
      ...order,
      status: "delivered"
    });

    expect(hiddenSnapshot?.visibility).toBe("hidden");
    expect(activeSnapshot?.visibility).toBe("active");
    expect(deliveredSnapshot?.visibility).toBe("delivered");
  });
});
