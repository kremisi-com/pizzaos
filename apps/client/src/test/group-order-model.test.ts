import { beforeEach, describe, expect, it } from "vitest";
import { addGroupOrderItem, clearGroupOrderState, CLIENT_GROUP_ORDER_STORAGE_KEY, deriveGroupOrderSubtotalCents, GROUP_ORDER_CURRENT_PARTICIPANT_ID, loadGroupOrderState, removeGroupOrderItem, setGroupOrderItemQuantity } from "../features/group-order/group-order-model";

describe("group order model", () =>
{
  beforeEach(() => window.localStorage.clear());

  it("persists the personal contribution separately from the standard cart", () =>
  {
    const added = addGroupOrderItem({ productId: "product-margherita", productName: "Margherita Classica", unitPriceCents: 900 }, window.localStorage);
    const personalItem = added.items.find((item) => item.participantId === GROUP_ORDER_CURRENT_PARTICIPANT_ID);
    expect(personalItem).toBeDefined();
    expect(deriveGroupOrderSubtotalCents(added.items, GROUP_ORDER_CURRENT_PARTICIPANT_ID)).toBe(900);
    expect(window.localStorage.getItem("pizzaos:client:cart-state:v1")).toBeNull();
    expect(loadGroupOrderState(window.localStorage).items).toHaveLength(7);
  });

  it("changes quantity, removes personal items, and clears the persisted group state", () =>
  {
    const added = addGroupOrderItem({ productId: "product-margherita", productName: "Margherita Classica", unitPriceCents: 900 }, window.localStorage);
    const personalItem = added.items.find((item) => item.participantId === GROUP_ORDER_CURRENT_PARTICIPANT_ID);
    if (!personalItem) throw new Error("Expected a personal contribution");
    expect(setGroupOrderItemQuantity(personalItem.id, 2, window.localStorage).items.find((item) => item.id === personalItem.id)?.quantity).toBe(2);
    expect(removeGroupOrderItem(personalItem.id, window.localStorage).items.some((item) => item.id === personalItem.id)).toBe(false);
    clearGroupOrderState(window.localStorage);
    expect(window.localStorage.getItem(CLIENT_GROUP_ORDER_STORAGE_KEY)).toBeNull();
  });
});
