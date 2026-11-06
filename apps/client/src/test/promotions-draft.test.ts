import { describe, expect, it } from "vitest";
import type { IndividualCart, IndividualCheckout } from "@pizzaos/domain";
import { copyIndividualCart, isIndividualCart, readIndividualDraft, writeIndividualDraft } from "../features/individual-ordering/draft";
import { createCheckoutAttempt, readCheckoutAttempt, writeCheckoutAttempt } from "../features/individual-ordering/checkout-attempt";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); }, values };
}
const cart: IndividualCart = { storeId: "store-a", lines: [{ productId: "a", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "", benefits: { couponCodes: ["VENTI", "DIECI"], redeemReward: true } };

describe("draft e tentativo promozioni", () => {
  it("ricarica selezione preservando ordine coupon e copiando strutture senza saldo o breakdown", () => {
    const saved = storage();
    const now = new Date("2030-01-01T12:00:00.000Z");
    const tampered = { ...cart, balancePoints: 99999, promotions: { discountCents: 777 } };
    writeIndividualDraft(saved, tampered, now);
    const recovered = readIndividualDraft(saved, now);
    expect(recovered).toEqual(cart);
    const copied = copyIndividualCart(cart);
    expect(copied).toEqual(cart);
    expect(copied.benefits).not.toBe(cart.benefits);
    expect(copied.benefits?.couponCodes).not.toBe(cart.benefits?.couponCodes);
    expect([...saved.values.values()].join()).not.toContain("balancePoints");
    expect([...saved.values.values()].join()).not.toContain("discountCents");
  });

  it.each([{ couponCodes: [1], redeemReward: true }, { couponCodes: [], redeemReward: "true" }, { couponCodes: [], redeemReward: true, balancePoints: 9 }, { couponCodes: "PIZZA", redeemReward: false }])("rifiuta selezione draft malformata %j", benefits => {
    expect(isIndividualCart({ ...cart, benefits })).toBe(false);
  });

  it("refresh di un tentativo incerto preserva input e chiave originali con benefici", () => {
    const saved = storage();
    const input: IndividualCheckout = { cart, fingerprint: "server-frozen", phone: "+393331234567", method: "card", idempotencyKey: "original-checkout-key" };
    writeCheckoutAttempt(saved, createCheckoutAttempt("alice", input));
    const recovered = readCheckoutAttempt(saved);
    expect(recovered?.input).toEqual(input);
    expect(recovered?.key).toBe("original-checkout-key");
    cart.benefits?.couponCodes.push("CHANGED_LATER");
    expect(recovered?.input?.cart.benefits?.couponCodes).toEqual(["VENTI", "DIECI"]);
    cart.benefits?.couponCodes.pop();
  });
});

