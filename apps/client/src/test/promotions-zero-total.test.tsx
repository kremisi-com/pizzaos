import { afterEach, describe, expect, it, vi } from "vitest";
import type { GroupOrderingApi, GroupSnapshot, IndividualApi, IndividualCart, IndividualOrder, IndividualQuote, IndividualStore } from "@pizzaos/domain";
import { cleanupDom, renderDom, domScreen as screen, domFireEvent as fireEvent, domWaitFor as waitFor } from "@pizzaos/testing";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";

const actor = { id: "alice", email: "alice@example.test", name: "Alice" };
const store: IndividualStore = { id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, deliveryBands: [], ingredients: [], products: [{ id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }], slots: [{ id: "slot", startsAt: "2030-01-01T12:30:00.000Z", capacity: 100 }] };
const cart: IndividualCart = { storeId: "store", lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "" };
const quote: IndividualQuote = { fingerprint: "zero-server", subtotalCents: 0, deliveryCents: 0, totalCents: 0, slotId: "slot", slotStartsAt: "2030-01-01T12:30:00.000Z", lines: [{ ...cart.lines[0]!, name: "Pizza", unitCents: 800 }], promotions: { originalSubtotalCents: 800, discountCents: 800, netSubtotalCents: 0, coupons: [{ id: "coupon", code: "TUTTO", discountCents: 800 }], rewardDiscountCents: 0, redeemedPoints: 0, pointsPerEuro: 1, lines: [{ productId: "pizza", grossCents: 800, discountCents: 800, netCents: 0 }] } };
const order: IndividualOrder = { id: "order-zero", storeId: "store", customerId: actor.id, cart, quote, contact: { name: actor.name, email: actor.email, phone: "+393331234567" }, status: "awaiting_acceptance", payment: "paid", method: "card", notes: "", createdAt: "2030-01-01T12:00:00.000Z", submittedAt: "2030-01-01T12:00:00.000Z", acceptanceDeadline: "2030-01-01T12:05:00.000Z", reservationExpiresAt: null, reservationReleased: false, unavailableProductIds: [], providerIntentId: null, refundId: null, refundAttempt: 0, revision: 1 };
function api(): IndividualApi {
  return { session: vi.fn().mockResolvedValue({ actor, superadmin: false, storeIds: [] }), stores: vi.fn().mockResolvedValue([store]), catalog: vi.fn().mockResolvedValue(store), quote: vi.fn().mockResolvedValue(quote), checkout: vi.fn().mockResolvedValue({ order }), orders: vi.fn().mockResolvedValue([]), reconcile: vi.fn().mockResolvedValue({ order }), action: vi.fn().mockResolvedValue(order), notes: vi.fn().mockResolvedValue(order), saveStore: vi.fn().mockResolvedValue(store), invite: vi.fn(), events: vi.fn().mockResolvedValue({ cursor: 0, events: [] }) };
}
afterEach(() => { cleanupDom(); window.localStorage.clear(); });

describe("conferma esplicita carta a totale zero senza Stripe", () => {
  it("individuale conferma una sola volta method card senza chiave né Elements", async () => {
    const service = api();
    renderDom(<IndividualOrderingScreen api={service} />);
    fireEvent.click(await screen.findByRole("button", { name: "Aggiungi Pizza" }));
    fireEvent.click(screen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await screen.findByLabelText("Telefono per l'ordine");
    fireEvent.change(screen.getByLabelText("Telefono per l'ordine"), { target: { value: "+393331234567" } });
    fireEvent.change(screen.getByLabelText("Come paghi?"), { target: { value: "card" } });
    expect(service.checkout).not.toHaveBeenCalled();
    const confirm = await screen.findByRole("button", { name: /Conferma e paga/ });
    expect(confirm.hasAttribute("disabled")).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(service.checkout).toHaveBeenCalledTimes(1));
    expect(service.checkout).toHaveBeenCalledWith(expect.objectContaining({ method: "card", fingerprint: quote.fingerprint }));
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("host gruppo conferma una sola volta carta senza chiave né Elements", async () => {
    const individual = api();
    const group: GroupSnapshot = { id: "group", storeId: "store", deadline: "2030-01-01T12:00:00.000Z", status: "closed", revision: 3, participants: [{ id: "host", name: "Alice", host: true, lines: cart.lines }], role: "host", participantId: "host" };
    const service: GroupOrderingApi = { create: vi.fn().mockResolvedValue(group), read: vi.fn().mockResolvedValue(group), join: vi.fn(), replaceLines: vi.fn().mockResolvedValue(group), removeParticipant: vi.fn().mockResolvedValue(group), close: vi.fn().mockResolvedValue(group), quote: vi.fn().mockResolvedValue({ revision: 3, quote }), checkout: vi.fn().mockResolvedValue({ order }), recover: vi.fn().mockResolvedValue({ order }) };
    renderDom(<PersistentGroupScreen api={service} individualApi={individual} groupId="group" pollMs={60000} />);
    await screen.findByLabelText("Come paghi?");
    fireEvent.change(screen.getByLabelText("Come paghi?"), { target: { value: "card" } });
    fireEvent.change(screen.getByLabelText("Telefono per l'ordine"), { target: { value: "+393331234567" } });
    fireEvent.click(screen.getByRole("button", { name: /Verifica/ }));
    const confirm = await screen.findByRole("button", { name: "Conferma ordine di gruppo" });
    expect(service.checkout).not.toHaveBeenCalled();
    expect(confirm.hasAttribute("disabled")).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(service.checkout).toHaveBeenCalledTimes(1));
    expect(service.checkout).toHaveBeenCalledWith("group", expect.objectContaining({ method: "card", fingerprint: quote.fingerprint }));
    expect(document.querySelector("iframe")).toBeNull();
  });
});

