import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { OrderDetails } from "@/features/orders/components/order-details";
import type { Order, Product } from "@pizzaos/domain";

const MOCK_ORDER: Order = {
  id: "order-1",
  customerId: "cust-1",
  storeId: "store-1",
  status: "received",
  lines: [
    {
      productId: "PIZ-MARG",
      quantity: 2,
      unitPrice: { amountCents: 1000, currencyCode: "EUR" },
      notes: "Extra cheese"
    },
    {
        productId: "DRINK-COKE",
        quantity: 1,
        unitPrice: { amountCents: 300, currencyCode: "EUR" },
        notes: ""
      }
  ],
  subtotal: { amountCents: 2300, currencyCode: "EUR" },
  discountTotal: { amountCents: 0, currencyCode: "EUR" },
  deliveryFee: { amountCents: 0, currencyCode: "EUR" },
  total: { amountCents: 2300, currencyCode: "EUR" },
  createdAtIso: new Date().toISOString(),
  updatedAtIso: new Date().toISOString(),
  scheduledSlot: "19:00"
};

const MOCK_PRODUCTS: Product[] = [
    {
        id: "PIZ-MARG",
        sku: "PIZ-MARG",
        name: "Margherita",
        description: "",
        basePrice: { amountCents: 1000, currencyCode: "EUR" },
        status: "available",
        tags: [],
        allergens: []
    },
    {
        id: "DRINK-COKE",
        sku: "DRINK-COKE",
        name: "Coca Cola",
        description: "",
        basePrice: { amountCents: 300, currencyCode: "EUR" },
        status: "available",
        tags: [],
        allergens: []
    }
];

describe("OrderDetails", () => {
  it("renders order details and stations", () => {
    const markup = renderToString(
      createElement(OrderDetails, {
        order: MOCK_ORDER,
        allProducts: MOCK_PRODUCTS,
        onStatusUpdate: vi.fn(),
        onClose: vi.fn(),
      })
    );

    expect(markup).toContain("Ordine #");
    expect(markup).toContain("RDER-1");
    expect(markup).toContain("Ricevuto");
    expect(markup).toContain("Cucina");
    expect(markup).toContain("Margherita");
    expect(markup).toContain("Extra cheese");
    expect(markup).toContain("Bar");
    expect(markup).toContain("Coca Cola");
    expect(markup).toContain("Conferma Ordine");
  });
});
