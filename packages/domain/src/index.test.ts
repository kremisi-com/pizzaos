import { describe, expect, test } from "vitest";

import {
  AI_INSIGHT_STATUS,
  APP_SURFACES,
  COUPON_STATUS,
  INVENTORY_STATUS,
  MENU_STATUS,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  PRODUCT_STATUS,
  deriveRoutingStation,
  getNextOrderStatuses,
  isOrderStatusTransitionAllowed,
  progressOrderStatus,
  type AppSurface,
  type Product
} from "./index";

describe("domain contracts", () =>
{
  test("exports app surfaces in stable order", () =>
  {
    expect(APP_SURFACES).toEqual([
      "landing",
      "client",
      "admin"
    ]);

    const appSurface: AppSurface = "client";
    expect(appSurface).toBe("client");
  });

  test("exports deterministic status constants", () =>
  {
    expect(PRODUCT_STATUS).toEqual([
      "available",
      "unavailable",
      "sold_out"
    ]);
    expect(MENU_STATUS).toEqual([
      "draft",
      "scheduled",
      "active",
      "archived"
    ]);
    expect(ORDER_STATUS).toEqual([
      "received",
      "confirmed",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "cancelled"
    ]);
    expect(INVENTORY_STATUS).toEqual([
      "in_stock",
      "low_stock",
      "out_of_stock"
    ]);
    expect(COUPON_STATUS).toEqual([
      "active",
      "inactive",
      "expired"
    ]);
    expect(AI_INSIGHT_STATUS).toEqual([
      "new",
      "acknowledged",
      "dismissed"
    ]);
  });

  test("accepts practical shared product contract", () =>
  {
    const product: Product = {
      id: "product-1",
      sku: "MARGHERITA-001",
      name: "Pizza Margherita",
      description: "Pomodoro, mozzarella e basilico fresco",
      basePrice: {
        amountCents: 1100,
        currencyCode: "EUR"
      },
      status: "available",
      tags: [
        "classica"
      ],
      allergens: [
        {
          code: "gluten",
          label: "Glutine"
        }
      ]
    };

    expect(product.basePrice.amountCents).toBe(1100);
    expect(product.status).toBe("available");
  });
});

describe("order status helpers", () =>
{
  test("returns deterministic next statuses", () =>
  {
    expect(getNextOrderStatuses("received")).toEqual([
      "confirmed",
      "cancelled"
    ]);
    expect(getNextOrderStatuses("ready")).toEqual([
      "out_for_delivery",
      "delivered"
    ]);
  });

  test("validates transition rules", () =>
  {
    expect(isOrderStatusTransitionAllowed("received", "confirmed")).toBe(true);
    expect(isOrderStatusTransitionAllowed("received", "preparing")).toBe(false);
    expect(isOrderStatusTransitionAllowed("delivered", "cancelled")).toBe(false);
  });

  test("progresses using first allowed transition only", () =>
  {
    expect(progressOrderStatus("received")).toBe("confirmed");
    expect(progressOrderStatus("ready")).toBe("out_for_delivery");
  });

  test("keeps terminal statuses unchanged", () =>
  {
    expect(progressOrderStatus("delivered")).toBe("delivered");
    expect(progressOrderStatus("cancelled")).toBe("cancelled");
    expect(ORDER_STATUS_TRANSITIONS.delivered).toHaveLength(0);
    expect(ORDER_STATUS_TRANSITIONS.cancelled).toHaveLength(0);
  });

  describe("deriveRoutingStation", () => {
    test("routes PIZ-* and FOC-* to kitchen", () => {
      const pizza: any = { sku: "PIZ-MARG-01" };
      const focaccia: any = { sku: "FOC-ROSM-08" };
      expect(deriveRoutingStation(pizza)).toBe("kitchen");
      expect(deriveRoutingStation(focaccia)).toBe("kitchen");
    });

    test("routes other items to bar", () => {
      const drink: any = { sku: "DRINK-COKE-01" };
      expect(deriveRoutingStation(drink)).toBe("bar");
    });
  });
});
