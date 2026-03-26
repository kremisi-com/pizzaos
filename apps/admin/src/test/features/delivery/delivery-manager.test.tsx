import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DeliveryManager } from "@/features/delivery/components/delivery-manager";
import type { Order, Rider } from "@pizzaos/domain";

const MOCK_RIDERS: Rider[] = [
  { id: "r1", name: "Rider 1", status: "available" },
  { id: "r2", name: "Rider 2", status: "busy" }
];

const MOCK_ORDERS: Order[] = [
  {
    id: "o1",
    storeId: "s1",
    customerId: "c1",
    status: "out_for_delivery",
    riderId: "r2",
    lines: [],
    subtotal: { amountCents: 0, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 0, currencyCode: "EUR" },
    total: { amountCents: 0, currencyCode: "EUR" },
    scheduledSlot: "19:00",
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString()
  }
];

describe("DeliveryManager", () => {
  it("renders stats and lists", () => {
    const markup = renderToString(
      createElement(DeliveryManager, {
        riders: MOCK_RIDERS,
        orders: MOCK_ORDERS
      })
    );

    expect(markup).toContain("Rider Disponibili");
    expect(markup).toContain("1");
    expect(markup).toContain("Rider 1");
    expect(markup).toContain("Rider 2");
    expect(markup).toContain("Consegne in corso");
    expect(markup).toContain("Ordine #");
    expect(markup).toContain("Assegnato a: <strong>Rider 2</strong>");
  });
});
