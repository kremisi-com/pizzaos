import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { OrdersDashboard } from "@/features/orders/components/orders-dashboard";
import type { Order } from "@pizzaos/domain";

const MOCK_ORDERS: Order[] = [
  {
    id: "order-1",
    customerId: "cust-1",
    storeId: "store-1",
    status: "received",
    lines: [
      {
        productId: "product-1234",
        quantity: 2,
        unitPrice: { amountCents: 1000, currencyCode: "EUR" },
        notes: ""
      }
    ],
    subtotal: { amountCents: 2000, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 0, currencyCode: "EUR" },
    total: { amountCents: 2000, currencyCode: "EUR" },
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    scheduledSlot: "19:00"
  },
  {
    id: "order-2",
    customerId: "cust-2",
    storeId: "store-1",
    status: "out_for_delivery",
    lines: [
      {
        productId: "product-5678",
        quantity: 1,
        unitPrice: { amountCents: 1200, currencyCode: "EUR" },
        notes: ""
      }
    ],
    subtotal: { amountCents: 1200, currencyCode: "EUR" },
    discountTotal: { amountCents: 0, currencyCode: "EUR" },
    deliveryFee: { amountCents: 100, currencyCode: "EUR" },
    total: { amountCents: 1300, currencyCode: "EUR" },
    createdAtIso: new Date().toISOString(),
    updatedAtIso: new Date().toISOString(),
    scheduledSlot: "19:20"
  }
];

describe("OrdersDashboard", () => {
  it("renders orders and stats", () => {
    const markup = renderToString(
      createElement(OrdersDashboard, {
        orders: MOCK_ORDERS,
        lastUpdateIso: new Date().toISOString(),
        allProducts: [],
      })
    );

    expect(markup).toContain("Ordini Attivi");
    expect(markup).toContain("In consegna");
    expect(markup).toContain("Totale oggi");
    expect(markup).toContain("Prodotto");
    expect(markup).toContain("1234");
    expect(markup).toContain("2");
    expect(markup).toContain("x");
    expect(markup).toContain("Ricevuto");
  });

  it("renders empty state when no orders", () => {
    const markup = renderToString(
      createElement(OrdersDashboard, {
        orders: [],
        lastUpdateIso: new Date().toISOString(),
        allProducts: [],
      })
    );

    expect(markup).toContain("Nessun ordine trovato");
  });
});
