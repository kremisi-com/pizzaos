import { createClientSeed } from "@pizzaos/mock-data";
import { describe, expect, it } from "vitest";
import {
  createMockOrder,
  deriveCheckoutTotals,
  deriveTipAmountCents,
  resolveSlotSelection,
  validateCheckoutInput
} from "../features/checkout/checkout-model";
import type { CartItem } from "../features/cart/cart-model";

const CART_ITEMS: readonly CartItem[] = [
  {
    id: "cart-item-1",
    productId: "product-margherita",
    productName: "Margherita Classica",
    unitPriceCents: 1000,
    quantity: 2,
    notes: "Impasto: Integrale"
  },
  {
    id: "cart-item-2",
    productId: "product-4-formaggi",
    productName: "Quattro Formaggi",
    unitPriceCents: 1450,
    quantity: 1,
    notes: "Formato: XL"
  }
];

describe("checkout model", () =>
{
  it("computes cart totals and tip amount from configured checkout values", () =>
  {
    const totals = deriveCheckoutTotals(CART_ITEMS, {
      tipPercent: 10
    });

    expect(deriveTipAmountCents(3450, 10)).toBe(345);
    expect(totals).toEqual({
      subtotalCents: 3450,
      discountCents: 0,
      tipCents: 345,
      deliveryFeeCents: 200,
      totalCents: 3995
    });
  });

  it("resolves slot selection and rejects sold-out slot on validation", () =>
  {
    const seed = createClientSeed();
    const selectableSlotId = resolveSlotSelection(seed.slots, "slot-2026-03-25T19:10");
    const fallbackSlotId = resolveSlotSelection(seed.slots, "slot-2026-03-25T19:50");
    const validationErrors = validateCheckoutInput({
      items: CART_ITEMS,
      slots: seed.slots,
      selectedSlotId: "slot-2026-03-25T19:50",
      paymentMethod: "card",
      cardholderName: "Mario Rossi",
      cardLastDigits: "1234"
    });

    expect(selectableSlotId).toBe("slot-2026-03-25T19:10");
    expect(fallbackSlotId).toBe("slot-2026-03-25T19:10");
    expect(validationErrors.selectedSlotId).toBe("Seleziona uno slot disponibile per continuare.");
  });

  it("creates mock orders with slot identifier for downstream formatting", () =>
  {
    const order = createMockOrder({
      storeId: "store-roma-centro",
      customerId: "customer-client-demo",
      items: CART_ITEMS,
      selectedSlotId: "slot-2026-03-25T19:10",
      totals: {
        subtotalCents: 3450,
        discountCents: 0,
        tipCents: 345,
        deliveryFeeCents: 200,
        totalCents: 3995
      },
      createdAtIso: "2026-03-27T10:30:00.000Z"
    });

    expect(order.scheduledSlot).toBe("slot-2026-03-25T19:10");
  });
});
