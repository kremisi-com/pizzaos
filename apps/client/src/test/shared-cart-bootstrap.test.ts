import { afterEach, describe, expect, it, vi } from "vitest";
import type { GroupOrderingApi, GroupSnapshot, IndividualApi, IndividualCart, IndividualStore } from "@pizzaos/domain";
import { openSharedCart, readSharedCartStoreId, suspendSharedCart } from "../composition/shared-cart-bootstrap";
import { readIndividualDraft, writeIndividualDraft } from "../features/individual-ordering/draft";

const store: IndividualStore = { id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, ingredients: [], products: [], slots: [], deliveryBands: [] };
const cart: IndividualCart = { storeId: "store", mode: "delivery", slotId: "evening", notes: "Citofono 3", address: { text: "Via Roma 1", latitude: 45, longitude: 9 }, benefits: { couponCodes: ["CENA"], redeemReward: false },
  lines: [{ productId: "pizza", quantity: 2, optionIds: ["olive"], notes: "Ben cotta", selections: [{ optionId: "basil", quantity: 2 }] }] };
const group: GroupSnapshot = { id: "group", storeId: "store", role: "host", participantId: "host", revision: 1, status: "open", inviteToken: "invitation", participants: [{ id: "host", name: "Basilico Allegro", host: true, lines: cart.lines }] };
const unexpected = async (): Promise<never> => { throw new Error("Unexpected call"); };
function ports() {
  const individualApi: IndividualApi = { stores: vi.fn(async () => [store]), session: unexpected, catalog: unexpected, quote: unexpected, checkout: unexpected, orders: unexpected,
    reconcile: unexpected, action: unexpected, notes: unexpected, saveStore: unexpected, invite: unexpected, events: unexpected };
  const api: GroupOrderingApi = { context: vi.fn(async () => ({ activeId: null, groups: [] })), activate: vi.fn(async (_storeId, activeId) => ({ activeId, groups: [group] })),
    create: vi.fn(async () => group), read: vi.fn(async () => group), join: vi.fn(async groupId => ({ ...group, id: groupId, role: "participant" as const, participantId: "guest" })),
    rename: unexpected, replaceLines: unexpected, removeParticipant: unexpected, close: unexpected, quote: unexpected, checkout: unexpected, recover: unexpected,
    payShare: unexpected, reconcileShare: unexpected, refundShare: unexpected };
  return { api, individualApi };
}
afterEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });

describe("trasferimento del carrello condiviso", () => {
  it("prepara prima la sessione privata e trasferisce tutte le scelte senza nome o scadenza", async () => {
    const { api, individualApi } = ports();
    writeIndividualDraft(localStorage, cart);
    await openSharedCart(api, individualApi);
    expect(api.context).toHaveBeenCalledWith("store");
    expect(api.create).toHaveBeenCalledWith({ storeId: "store", lines: cart.lines, fulfillment: { mode: "delivery", slotId: "evening", notes: "Citofono 3", address: cart.address, benefits: cart.benefits }, idempotencyKey: expect.any(String) });
    expect(vi.mocked(api.context).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(api.create).mock.invocationCallOrder[0]);
    expect(api.activate).toHaveBeenCalledWith("store", "group");
    expect(readIndividualDraft(localStorage)).toBeNull();
  });

  it("deduplica due aperture contemporanee", async () => {
    const { api, individualApi } = ports();
    writeIndividualDraft(localStorage, cart);
    const first = openSharedCart(api, individualApi);
    const second = openSharedCart(api, individualApi);
    expect(second).toBe(first);
    await Promise.all([first, second]);
    expect(api.create).toHaveBeenCalledOnce();
  });

  it("riprende la creazione già committata con risposta persa e riconosce il trasferimento", async () => {
    const { api, individualApi } = ports();
    writeIndividualDraft(localStorage, cart);
    vi.mocked(api.create).mockRejectedValueOnce(new Error("Risposta persa"));
    await expect(openSharedCart(api, individualApi)).rejects.toThrow("Risposta persa");
    expect(readIndividualDraft(localStorage)).toEqual(cart);
    vi.mocked(api.context).mockResolvedValue({ activeId: "group", groups: [group] });
    await openSharedCart(api, individualApi);
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.create).mock.calls[1][0]).toEqual(vi.mocked(api.create).mock.calls[0][0]);
    expect(readIndividualDraft(localStorage)).toBeNull();
  });

  it("ritenta la richiesta originale senza cancellare nuove modifiche locali", async () => {
    const { api, individualApi } = ports();
    writeIndividualDraft(localStorage, cart);
    vi.mocked(api.create).mockRejectedValueOnce(new Error("Risposta persa"));
    await expect(openSharedCart(api, individualApi)).rejects.toThrow();
    const updated = { ...cart, lines: [{ ...cart.lines[0], quantity: 3 }] };
    writeIndividualDraft(localStorage, updated);
    vi.mocked(api.context).mockResolvedValue({ activeId: "group", groups: [group] });
    await openSharedCart(api, individualApi);
    expect(vi.mocked(api.create).mock.calls[1][0].lines).toEqual(cart.lines);
    expect(readIndividualDraft(localStorage)).toEqual(updated);
  });

  it("ritenta il join originale dopo una risposta persa anche se risulta già partecipante", async () => {
    const { api, individualApi } = ports();
    const visitor: GroupSnapshot = { ...group, id: "invited", role: "visitor", participantId: null };
    writeIndividualDraft(localStorage, cart);
    vi.mocked(api.read).mockResolvedValue(visitor);
    vi.mocked(api.join).mockRejectedValueOnce(new Error("Join committato, risposta persa"));
    await expect(openSharedCart(api, individualApi, "invited", "invitation")).rejects.toThrow();
    vi.mocked(api.read).mockResolvedValue({ ...visitor, role: "participant", participantId: "guest" });
    await openSharedCart(api, individualApi, "invited", "invitation");
    expect(api.join).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.join).mock.calls[1]).toEqual(vi.mocked(api.join).mock.calls[0]);
    expect(readIndividualDraft(localStorage)).toBeNull();
  });

  it("conserva il carrello di un’altra sede entrando in un invito", async () => {
    const { api, individualApi } = ports();
    const other = { ...cart, storeId: "other" };
    writeIndividualDraft(localStorage, other);
    vi.mocked(api.read).mockResolvedValue({ ...group, id: "other-invite", role: "visitor", participantId: null });
    await openSharedCart(api, individualApi, "other-invite", "invitation");
    expect(api.join).toHaveBeenCalledWith("other-invite", expect.objectContaining({ lines: [] }));
    expect(readIndividualDraft(localStorage)).toEqual(other);
  });

  it("recupera il gruppo attivo senza creare o trasferire un nuovo carrello", async () => {
    const { api, individualApi } = ports();
    vi.mocked(api.context).mockResolvedValue({ activeId: "group", groups: [group] });
    writeIndividualDraft(localStorage, cart);
    expect(await openSharedCart(api, individualApi)).toEqual(group);
    expect(api.create).not.toHaveBeenCalled();
    expect(readIndividualDraft(localStorage)).toEqual(cart);
  });

  it("conserva la sede corrente dopo aver trasferito e rimosso il draft", async () => {
    const { api, individualApi } = ports();
    const otherGroup: GroupSnapshot = { ...group, storeId: "other" };
    vi.mocked(individualApi.stores).mockResolvedValue([store, { ...store, id: "other" }]);
    vi.mocked(api.create).mockResolvedValue(otherGroup);
    writeIndividualDraft(localStorage, { ...cart, storeId: "other" });
    await openSharedCart(api, individualApi);
    expect(readIndividualDraft(localStorage)).toBeNull();
    expect(readSharedCartStoreId()).toBe("other");
    vi.mocked(api.context).mockResolvedValue({ activeId: "group", groups: [otherGroup] });
    await openSharedCart(api, individualApi);
    expect(api.context).toHaveBeenLastCalledWith("other");
    expect(api.create).toHaveBeenCalledOnce();
  });

  it("torna all’individuale della stessa sede senza eliminare il gruppo né un altro draft", async () => {
    const { api } = ports();
    await suspendSharedCart(api, { ...group, storeId: "other" });
    expect(api.activate).toHaveBeenCalledWith("other", null);
    expect(readIndividualDraft(localStorage)).toMatchObject({ storeId: "other", lines: [] });
    writeIndividualDraft(localStorage, cart);
    await suspendSharedCart(api, { ...group, storeId: "other" });
    expect(readIndividualDraft(localStorage)).toEqual(cart);
  });
});
