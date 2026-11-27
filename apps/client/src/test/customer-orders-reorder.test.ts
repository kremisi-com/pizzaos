import type { IndividualOrder } from "@pizzaos/domain";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { reorderCustomerOrder } from "../composition/reorder-customer-order";

function purchased(): IndividualOrder {
  return {
    id: "storico", storeId: "roma", customerId: "alice", status: "completed", method: "cash", payment: "cash_paid", notes: "Citofono aggiornato",
    cart: { storeId: "roma", mode: "pickup", slotId: "vecchia-fascia", notes: "Note precedenti", benefits: { couponCodes: ["SCADUTO"], redeemReward: true }, lines: [
      { productId: "pizza", quantity: 2, optionIds: ["extra"], notes: "Ben cotta", selections: [{ optionId: "extra", quantity: 1 }] },
      { productId: "rimossa", quantity: 1, optionIds: [], notes: "" }
    ] },
    quote: { fingerprint: "vecchio", totalCents: 1700, subtotalCents: 1700, deliveryCents: 0, slotId: "vecchia-fascia", slotStartsAt: "2026-11-26T19:00:00Z", lines: [] },
    contact: { name: "Alice", email: "alice@example.test", phone: "3331234567" }, createdAt: "2026-11-26T18:00:00Z", submittedAt: null,
    acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: true, unavailableProductIds: ["rimossa"], providerIntentId: null,
    refundId: null, refundAttempt: 0, revision: 1
  };
}
const draftKey = "pizzaos.individual-cart.v1";
beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("riordino nel carrello operativo", () => {
  it("ricrea soltanto composizione acquistata, senza fascia e benefici precedenti", async () => {
    const order = purchased();
    const before = structuredClone(order);
    const api = { orders: vi.fn(async () => [order]) };
    await reorderCustomerOrder(api, window.localStorage, order);
    const stored = JSON.parse(window.localStorage.getItem(draftKey) ?? "null") as { cart: IndividualOrder["cart"] };
    expect(stored.cart).toEqual({ ...order.cart, lines: [order.cart.lines[0]], slotId: null, notes: order.notes, benefits: undefined });
    expect(order).toEqual(before);
    expect(window.localStorage.getItem(draftKey)).not.toContain(order.contact.phone);
    expect(api.orders).toHaveBeenCalledWith();
  });
  it("non sovrascrive il draft quando c'è un tentativo checkout persistito", async () => {
    window.localStorage.setItem(draftKey, "draft-esistente");
    window.localStorage.setItem("pizzaos.individual-checkout.v1", JSON.stringify({ key: "retry-originale" }));
    const api = { orders: vi.fn(async () => []) };
    await expect(reorderCustomerOrder(api, window.localStorage, purchased())).rejects.toThrow(/tentativo/);
    expect(window.localStorage.getItem(draftKey)).toBe("draft-esistente");
    expect(api.orders).not.toHaveBeenCalled();
  });
  it.each(["requires_action", "processing"] as const)("rilegge e blocca il pagamento %s prima di scrivere", async payment => {
    window.localStorage.setItem(draftKey, "draft-esistente");
    const api = { orders: vi.fn(async () => [{ ...purchased(), id: "incerto", status: "pending_payment" as const, payment }]) };
    await expect(reorderCustomerOrder(api, window.localStorage, purchased())).rejects.toThrow(/pagamento/);
    expect(window.localStorage.getItem(draftKey)).toBe("draft-esistente");
  });
  it("conserva il draft se lo storage rifiuta il salvataggio", async () => {
    window.localStorage.setItem(draftKey, "draft-esistente");
    const unavailable = { getItem: (key: string) => window.localStorage.getItem(key), setItem: () => { throw new Error("Storage non disponibile"); } };
    await expect(reorderCustomerOrder({ orders: async () => [] }, unavailable, purchased())).rejects.toThrow(/Storage/);
    expect(window.localStorage.getItem(draftKey)).toBe("draft-esistente");
  });
  it("rifiuta un tentativo iniziato durante la rilettura server", async () => {
    const api = { orders: async () => {
      window.localStorage.setItem("pizzaos.individual-checkout.v1", JSON.stringify({ key: "iniziato-durante-lettura" }));
      return [];
    } };
    await expect(reorderCustomerOrder(api, window.localStorage, purchased())).rejects.toThrow(/tentativo/);
    expect(window.localStorage.getItem(draftKey)).toBeNull();
  });
});
