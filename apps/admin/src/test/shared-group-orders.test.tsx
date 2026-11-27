import { afterEach, describe, expect, it, vi } from "vitest";
import type { GroupOperationalOrder, GroupSharePayment, IndividualOrder, IndividualProduct } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import { OperationalGroupOrders, OperationalGroupPayments, OperationalOrders } from "../features/orders";

// These UI assertions use only the approved observable requirements and public DTOs.
afterEach(cleanupDom);

const products: IndividualProduct[] = [{
  id: "pizza", name: "Pizza Margherita", description: "", priceCents: 800,
  available: true, allergens: [], ingredients: {}, options: [],
}];
type RefundHandler = (groupId: string, paymentId?: string, cashReturned?: boolean) => Promise<void>;
const paid: GroupSharePayment = { id: "share-giulia", participantId: "giulia", amountCents: 1600, status: "paid" };
function group(payment: GroupSharePayment = paid): GroupOperationalOrder {
  return {
    id: "group-1", storeId: "store-1", revision: 1, status: "open", payments: [payment],
    participants: [
      { id: "host", name: "Andrea", host: true, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "" }] },
      { id: "giulia", name: "Giulia", host: false, lines: [{ productId: "pizza", quantity: 2, optionIds: [], notes: "Ben cotte" }], payment },
    ],
  };
}

function canonicalOrder(): IndividualOrder {
  return {
    id: "order-1", storeId: "store-1", customerId: "host", revision: 1,
    cart: { storeId: "store-1", mode: "pickup", slotId: "evening", notes: "", lines: [{ productId: "pizza", quantity: 3, optionIds: [], notes: "" }] },
    quote: { fingerprint: "quote", subtotalCents: 2400, deliveryCents: 0, totalCents: 2400, slotId: "evening", slotStartsAt: "2026-11-27T20:00:00.000Z", lines: [{ productId: "pizza", name: "Pizza Margherita", quantity: 3, unitCents: 800, optionIds: [], notes: "" }] },
    contact: { name: "Andrea", email: "host@example.test", phone: "3331234567" },
    status: "pending_payment", payment: "requires_action", method: "card", notes: "",
    createdAt: "2026-11-27T18:00:00.000Z", submittedAt: null, acceptanceDeadline: null,
    reservationExpiresAt: "2026-11-27T18:15:00.000Z", reservationReleased: false,
    unavailableProductIds: [], providerIntentId: "provider-1", refundId: null, refundAttempt: 0,
    settlement: { groupId: "group-1", prepaidCents: 1600, remainingCents: 800, paidCents: 1600, cashDueCents: 0, refundedCents: 0, refundPendingCents: 0, refundFailedCents: 0 },
  };
}

describe("shared-group operational UI public contract", () => {
  it("shows the first paid group as still in progress, its people and choices, without preparation actions", () => {
    renderDom(<OperationalGroupOrders groups={[group()]} products={products} busy={false} onRefund={async () => undefined} />);
    expect(domScreen.getByText("Ordine di gruppo ancora in corso")).toBeTruthy();
    expect(domScreen.getByText("Andrea")).toBeTruthy();
    expect(domScreen.getByText("Giulia")).toBeTruthy();
    expect(domScreen.getAllByText(/Pizza Margherita/).length).toBeGreaterThan(0);
    expect(domScreen.getByText(/Ben cotte/)).toBeTruthy();
    expect(domScreen.queryByRole("button", { name: /accetta|prepara|preparazione/i })).toBeNull();
  });

  it("sends a full refund for the selected share to the group and payment IDs", async () => {
    const onRefund = vi.fn<RefundHandler>(async () => undefined);
    renderDom(<OperationalGroupOrders groups={[group()]} products={products} busy={false} onRefund={onRefund} />);
    domFireEvent.click(domScreen.getByRole("button", { name: /rimborsa.*Giulia/i }));
    await domWaitFor(() => expect(onRefund).toHaveBeenCalledTimes(1));
    expect(onRefund.mock.calls[0].slice(0, 2)).toEqual(["group-1", "share-giulia"]);
  });

  it("requests an entire-order refund without selecting an individual payment", async () => {
    const onRefund = vi.fn<RefundHandler>(async () => undefined);
    renderDom(<OperationalGroupPayments group={{ ...group(), status: "submitted", orderId: "order-1" }} busy={false} onRefund={onRefund} />);
    domFireEvent.click(domScreen.getByRole("button", { name: /rimborsa ordine/i }));
    await domWaitFor(() => expect(onRefund).toHaveBeenCalledTimes(1));
    expect(onRefund.mock.calls[0][0]).toBe("group-1");
    expect(onRefund.mock.calls[0][1]).toBeUndefined();
  });

  it.each(["processing", "requires_action", "failed", "refund_pending", "refunded"] as const)("does not allow another refund for a %s share", status => {
    renderDom(<OperationalGroupOrders groups={[group({ ...paid, status })]} products={products} busy={false} onRefund={async () => undefined} />);
    expect(domScreen.queryByRole("button", { name: /rimborsa|riprova.*rimborso/i })).toBeNull();
  });

  it("allows retry of a failed refund for exactly that payment", async () => {
    const onRefund = vi.fn<RefundHandler>(async () => undefined);
    renderDom(<OperationalGroupOrders groups={[group({ ...paid, status: "refund_failed" })]} products={products} busy={false} onRefund={onRefund} />);
    domFireEvent.click(domScreen.getByRole("button", { name: /rimborso.*Giulia/i }));
    await domWaitFor(() => expect(onRefund).toHaveBeenCalledTimes(1));
    expect(onRefund.mock.calls[0].slice(0, 2)).toEqual(["group-1", "share-giulia"]);
  });

  it("prevents duplicate refund requests while an operation is busy", () => {
    renderDom(<OperationalGroupOrders groups={[group()]} products={products} busy={true} onRefund={async () => undefined} />);
    expect(domScreen.getByRole("button", { name: /rimborsa.*Giulia/i }).hasAttribute("disabled")).toBe(true);
  });

  it("does not render a submitted group as an ongoing draft", () => {
    renderDom(<OperationalGroupOrders groups={[{ ...group(), status: "submitted", orderId: "order-1" }]} products={products} busy={false} onRefund={async () => undefined} />);
    expect(domScreen.queryByText("Ordine di gruppo ancora in corso")).toBeNull();
    expect(domScreen.queryByText("Giulia")).toBeNull();
  });

  it("retains per-share refund controls on submitted operational orders", async () => {
    const onRefund = vi.fn<RefundHandler>(async () => undefined);
    renderDom(<OperationalGroupPayments group={{ ...group(), status: "submitted", orderId: "order-1" }} busy={false} onRefund={onRefund} />);
    expect(domScreen.getByText(/Giulia/)).toBeTruthy();
    domFireEvent.click(domScreen.getByRole("button", { name: /rimborsa.*Giulia/i }));
    await domWaitFor(() => expect(onRefund).toHaveBeenCalledTimes(1));
    expect(onRefund.mock.calls[0].slice(0, 2)).toEqual(["group-1", "share-giulia"]);
    expect(domScreen.queryByText("Ordine di gruppo ancora in corso")).toBeNull();
  });

  it("shows one ongoing group while final card authentication is pending, then one normal order after submission", () => {
    const order = canonicalOrder();
    const props = { products, busy: false, onRefresh: async () => undefined, onAction: async () => undefined, onRefund: async () => undefined };
    const view = renderDom(<OperationalOrders {...props} orders={[order]} groups={[{ ...group(), orderId: order.id }]} />);
    expect(domScreen.getAllByText("Ordine di gruppo ancora in corso")).toHaveLength(1);
    expect(domScreen.queryByRole("button", { name: /apri ordine/i })).toBeNull();
    expect(domScreen.queryByRole("button", { name: /accetta|prepara/i })).toBeNull();
    view.rerender(<OperationalOrders {...props} orders={[{ ...order, status: "awaiting_acceptance", payment: "paid", submittedAt: "2026-11-27T18:05:00.000Z" }]} groups={[{ ...group(), status: "submitted", orderId: order.id }]} />);
    expect(domScreen.queryByText("Ordine di gruppo ancora in corso")).toBeNull();
    expect(domScreen.getAllByRole("button", { name: /apri ordine/i })).toHaveLength(1);
    expect(domScreen.getByRole("button", { name: /rimborsa.*Giulia/i })).toBeTruthy();
  });

  it("requires explicit cash restitution before sending a cash-share refund", async () => {
    const onRefund = vi.fn<RefundHandler>(async () => undefined);
    renderDom(<OperationalGroupPayments group={{ ...group({ ...paid, method: "cash" }), status: "submitted", orderId: "order-1" }} busy={false} onRefund={onRefund} />);
    const refund = domScreen.getByRole("button", { name: /rimborsa.*Giulia/i });
    expect(refund.hasAttribute("disabled")).toBe(true);
    const returned = domScreen.getByRole("checkbox", { name: /contanti/i });
    domFireEvent.click(returned);
    expect(refund.hasAttribute("disabled")).toBe(false);
    domFireEvent.click(refund);
    await domWaitFor(() => expect(onRefund).toHaveBeenCalledWith("group-1", "share-giulia", true));
  });
});
