import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { DeliveryManager } from "@/features/delivery/components/delivery-manager";
import type { Order, Rider } from "@pizzaos/domain";

const MOCK_RIDERS: Rider[] = [
  { id: "r1", name: "Rider 1", status: "available", location: { lat: 45.4642, lng: 9.1900 } },
  { id: "r2", name: "Rider 2", status: "busy", location: { lat: 45.4643, lng: 9.1901 } }
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
  },
  {
    id: "o2",
    storeId: "s1",
    customerId: "c2",
    status: "received",
    lines: [],
    subtotal: { amountCents: 0, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 0, currencyCode: "EUR" },
    total: { amountCents: 0, currencyCode: "EUR" },
    scheduledSlot: "19:30",
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString()
  },
  {
    id: "o3",
    storeId: "s1",
    customerId: "c3",
    status: "delivered",
    riderId: "r1",
    lines: [],
    subtotal: { amountCents: 0, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 0, currencyCode: "EUR" },
    total: { amountCents: 0, currencyCode: "EUR" },
    scheduledSlot: "18:00",
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString()
  }
];

describe("DeliveryManager", () => {
  it("renders stats, map and delivery lists", () => {
    const markup = renderToString(
      createElement(DeliveryManager, {
        riders: MOCK_RIDERS,
        orders: MOCK_ORDERS
      })
    );

    expect(markup).toContain("Rider Disponibili");
    expect(markup).toContain("In Consegna");
    expect(markup).toContain("Richieste");
    
    // Map markers
    expect(markup).toContain("Mappa consegne");
    expect(markup).toContain("Rider 1");
    expect(markup).toContain("Rider 2");

    // Lists
    expect(markup).toContain("Richieste Recenti");
    expect(markup).toContain("In Consegna");
    expect(markup).toContain("Completate");

    // Order items
    expect(markup).toContain("#<!-- -->" + MOCK_ORDERS[0].id.slice(-6).toUpperCase());
    expect(markup).toContain("#<!-- -->" + MOCK_ORDERS[1].id.slice(-6).toUpperCase());
    expect(markup).toContain("#<!-- -->" + MOCK_ORDERS[2].id.slice(-6).toUpperCase());

    expect(markup).toContain("Rider 1");
    expect(markup).toContain("Rider 2");
  });
});
