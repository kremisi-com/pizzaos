import { createInMemoryStorage } from "@pizzaos/testing";
import { describe, expect, it } from "vitest";
import { CLIENT_CART_ID, DEFAULT_GROUP_ORDER_ID, createLocalClientApi } from "../composition/api/local-client-api";

describe("LocalClientApi", () =>
{
  it("derives the customer and active store from the seeded local session", async () =>
  {
    const api = createLocalClientApi({ storage: createInMemoryStorage() });

    const session = await api.getSession();
    const cart = await api.getCart({});

    expect(session.session.customerId).toBe(session.customer.id);
    expect(cart.cart.customerId).toBe(session.customer.id);
    expect(cart.cart.storeId).toBe(session.session.activeStoreId);
  });

  it("persists structured pizza choices instead of encoding them in notes", async () =>
  {
    const storage = createInMemoryStorage();
    const api = createLocalClientApi({ storage, now: () => new Date("2026-03-27T10:30:00.000Z") });
    const catalog = await api.getCatalog({ fulfillment: "delivery" });
    const product = catalog.products.find((candidate) => candidate.id === "product-margherita");

    expect(product).toBeDefined();

    const response = await api.addCartLine({
      cartId: CLIENT_CART_ID,
      productId: "product-margherita",
      quantity: 1,
      notes: "Tagliare in otto",
      customization: {
        doughId: "dough-integrale",
        baseId: "base-bianca",
        variantId: "variant-xl",
        ingredientSelections: [{ ingredientId: "ingredient-fiordilatte", mode: "extra" }],
        extraIds: ["extra-burrata"]
      }
    });

    expect(response.cart.lines[0]).toMatchObject({
      notes: "Tagliare in otto",
      customization: { doughId: "dough-integrale", baseId: "base-bianca", variantId: "variant-xl", extraIds: ["extra-burrata"] }
    });
    expect(response.cart.lines[0]?.unitPrice.amountCents).toBe(1660);
  });

  it("applies coupons and exposes group-order lines through the same local port", async () =>
  {
    const storage = createInMemoryStorage();
    const api = createLocalClientApi({ storage, now: () => new Date("2026-03-27T10:30:00.000Z") });

    await api.addCartLine({ cartId: CLIENT_CART_ID, productId: "product-margherita", quantity: 2 });
    const coupon = await api.applyCoupon({ cartId: CLIENT_CART_ID, couponCode: "BENTORNATO5", referenceIso: "2026-03-27T10:30:00.000Z" });
    const group = await api.addGroupOrderLine({ groupOrderId: DEFAULT_GROUP_ORDER_ID, participantId: "participant-tu", productId: "product-margherita", quantity: 1 });

    expect(coupon).toMatchObject({ status: "applied", discount: { amountCents: 500, currencyCode: "EUR" } });
    expect(group.groupOrder.lines.some((line) => line.participantId === "participant-tu" && line.productId === "product-margherita")).toBe(true);
  });

  it("freezes delivery or pickup details on the order without storing card credentials", async () =>
  {
    const storage = createInMemoryStorage();
    const api = createLocalClientApi({ storage, now: () => new Date("2026-03-27T10:30:00.000Z") });
    const session = await api.getSession();
    await api.addCartLine({ cartId: CLIENT_CART_ID, productId: "product-margherita", quantity: 1 });

    const response = await api.checkout({
      cartId: CLIENT_CART_ID,
      contact: { firstName: "Mario", lastName: "Rossi", email: "mario@example.test", phone: "+39 333 1234567" },
      fulfillment: { method: "delivery", slotId: "slot-2026-03-25T19:10", instructions: { doorbell: "Rossi", floor: "3", note: "Lasciare al portone" } },
      payment: { method: "card", paymentMethodId: "pm_test" },
      tipPercent: 0,
      idempotencyKey: "78f3f56d-4f6f-4cba-b3e9-98cdbf8f5dc8"
    });

    expect(response.order.contact.email).toBe("mario@example.test");
    expect(response.order.fulfillment).toMatchObject({ method: "delivery", instructions: { doorbell: "Rossi" } });
    expect(response.order.customerId).toBe(session.customer.id);
    expect(JSON.stringify(response.order)).not.toContain("cardNumber");
  });

  it("exposes a cursor-compatible live updates endpoint while the POC keeps timers local", async () =>
  {
    const api = createLocalClientApi({ storage: createInMemoryStorage(), now: () => new Date("2026-03-27T10:30:00.000Z") });

    const updates = await api.getLiveUpdates({ cursor: "local-previous" });

    expect(updates.events).toEqual([]);
    expect(updates.nextCursor).toBe("local-2026-03-25T18:42:00.000Z");
    expect(updates.generatedAtIso).toBe("2026-03-27T10:30:00.000Z");
  });
});
