import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, domWithin, renderDom } from "@pizzaos/testing";
import type { GroupOrderingApi, GroupSnapshot, IndividualApi, IndividualCart, IndividualLine, IndividualOrder, IndividualProduct, IndividualQuote, IndividualStore } from "@pizzaos/domain";
import { MenuLineEditor } from "../features/menu";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";

const store: IndividualStore = { id: "sede", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, ingredients: [], deliveryBands: [],
  slots: [{ id: "sera", startsAt: "2030-11-05T19:00:00Z", capacity: 20 }], products: [
    { id: "pizza", name: "Pizza", description: "", priceCents: 900, available: true, ingredients: {}, allergens: [], options: [] }
  ] };
const obsolete = { productId: "pizza", quantity: 2, optionIds: ["extra-rimosso"], notes: "Ben cotta" };
const cart: IndividualCart = { storeId: store.id, mode: "pickup", slotId: null, notes: "", lines: [obsolete] };
const unexpected = async (): Promise<never> => { throw new Error("Operazione non prevista"); };
function individualPorts(orders: IndividualOrder[] = []): IndividualApi {
  return { session: vi.fn(async () => ({ actor: { id: "alice", name: "Alice", email: "alice@example.test" }, superadmin: false, storeIds: [] })),
    stores: vi.fn(async () => [structuredClone(store)]), catalog: vi.fn(async () => structuredClone(store)), orders: vi.fn(async () => structuredClone(orders)),
    quote: vi.fn(unexpected), checkout: vi.fn(unexpected), reconcile: unexpected, action: unexpected, notes: unexpected, saveStore: unexpected,
    invite: unexpected, events: vi.fn(async cursor => ({ cursor, events: [] })) };
}
beforeEach(() => {
  cleanupDom(); window.localStorage.clear();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(cleanupDom);

describe("recupero personalizzazioni nei flussi persistenti", () => {
  it("mantiene utilizzabile il Menu quando il refresh elimina l'ultima fase aperta", () => {
    const main = { ...store.products[0], id: "portata", name: "Portata" };
    const drink = { ...store.products[0], id: "acqua", name: "Acqua" };
    const meal: IndividualProduct = { ...store.products[0], id: "menu", name: "Menu pranzo", productType: "meal", meal: { steps: [
      { id: "primo", name: "Prima fase", alternatives: [{ productId: main.id, priceCents: 0 }] },
      { id: "secondo", name: "Seconda fase", alternatives: [{ productId: drink.id, priceCents: 0 }] }
    ] } };
    const first = { stepId: "primo", productId: main.id, removedIngredientIds: [], notes: "Ben calda" };
    const line: IndividualLine = { productId: meal.id, quantity: 2, optionIds: [], notes: "Ben cotta", mealSelections: [
      first, { stepId: "secondo", productId: drink.id, removedIngredientIds: [], notes: "Fredda" }
    ] };
    const original = structuredClone(line);
    const save = vi.fn();
    const catalog = { ...store, products: [main, drink, meal] };
    const view = renderDom(<MenuLineEditor store={catalog} product={meal} line={line} avoid={[]} onSave={save} />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Modifica Menu pranzo" }));
    domFireEvent.click(domScreen.getByRole("button", { name: "Avanti" }));
    expect(domScreen.getByRole("group", { name: "Seconda fase" })).toBeTruthy();
    const current: IndividualProduct = { ...meal, meal: { steps: [meal.meal!.steps[0]] } };
    view.rerender(<MenuLineEditor store={{ ...catalog, products: [main, drink, current] }} product={current} line={line} avoid={[]} onSave={save} />);
    expect(domScreen.getByRole("group", { name: "Prima fase" })).toBeTruthy();
    expect((domScreen.getByRole("radio", { name: /Portata/ }) as HTMLInputElement).checked).toBe(true);
    const notices = [...domScreen.queryAllByRole("alert"), ...domScreen.queryAllByRole("status")];
    expect(notices.some(node => /rimo|eliminat|cambiat/i.test(node.textContent ?? ""))).toBe(true);
    expect(save).not.toHaveBeenCalled();
    expect(line).toEqual(original);
    const confirm = domScreen.getByRole("button", { name: "Conferma modifica" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
    domFireEvent.click(confirm);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, notes: "Ben cotta", mealSelections: [first] }));
    expect(line).toEqual(original);
  });

  it.each(["host", "participant"] as const)("corregge solo il proprio contributo %s e invia la revisione corrente", async role => {
    const group: GroupSnapshot = { id: "gruppo", storeId: store.id, status: "open", deadline: "2030-11-05T18:00:00Z", revision: 2,
      role, participantId: "alice", participants: [
        { id: "alice", name: "Alice", host: true, lines: [structuredClone(obsolete)] },
        { id: "marco", name: "Marco", host: false, lines: [{ ...structuredClone(obsolete), notes: "Senza sale" }] }
      ] };
    let current = group;
    const api: GroupOrderingApi = { create: unexpected, join: unexpected, read: vi.fn(async () => structuredClone(current)),
      replaceLines: vi.fn(async (_id, input) => ({ ...current, revision: current.revision + 1,
        participants: current.participants.map(person => person.id === input.participantId ? { ...person, lines: input.lines } : person) })),
      removeParticipant: unexpected, close: unexpected, quote: vi.fn(unexpected), checkout: vi.fn(unexpected), recover: unexpected };
    const individualApi = individualPorts();
    renderDom(<PersistentGroupScreen api={api} individualApi={individualApi} groupId={group.id} pollMs={20} />);
    const own = await domScreen.findByLabelText("Le mie scelte");
    const other = domWithin(await domScreen.findByRole("article", { name: "Marco" }));
    expect(other.queryByRole("button", { name: "Modifica Pizza" })).toBeNull();
    expect(other.queryByRole("textbox")).toBeNull();
    domFireEvent.click(await domWithin(own).findByRole("button", { name: "Modifica Pizza" }));
    expect(api.replaceLines).not.toHaveBeenCalled();
    current = { ...group, revision: 7 };
    const previousReads = vi.mocked(api.read).mock.calls.length;
    await domWaitFor(() => expect(vi.mocked(api.read).mock.calls.length).toBeGreaterThan(previousReads));
    domFireEvent.click(domScreen.getByRole("button", { name: "Conferma modifica" }));
    await domWaitFor(() => expect(api.replaceLines).toHaveBeenCalledWith(group.id, {
      participantId: "alice", revision: 7, lines: [{ ...obsolete, optionIds: [] }]
    }));
    expect(api.replaceLines).toHaveBeenCalledOnce();
    expect(api.quote).not.toHaveBeenCalled();
    expect(api.checkout).not.toHaveBeenCalled();
    expect(group.participants[0].lines[0].optionIds).toEqual(["extra-rimosso"]);
    expect(group.participants[1].lines[0]).toEqual({ ...obsolete, notes: "Senza sale" });
  });

  it("riordina uno snapshot storico senza modificarlo, corregge il nuovo carrello e lo rivalida", async () => {
    const historicalQuote: IndividualQuote = { fingerprint: "prezzo-storico", subtotalCents: 1800, deliveryCents: 0, totalCents: 1800,
      slotId: "sera", slotStartsAt: store.slots[0].startsAt,
      lines: [{ ...structuredClone(obsolete), name: "Pizza", unitCents: 900 }] };
    const order: IndividualOrder = { id: "ordine-storico", storeId: store.id, customerId: "alice", cart: structuredClone(cart), quote: historicalQuote,
      contact: { name: "Alice", email: "alice@example.test", phone: "3331234567" }, status: "completed", payment: "cash_paid", method: "cash", notes: "",
      createdAt: "2026-11-01T18:00:00Z", submittedAt: "2026-11-01T18:00:00Z", acceptanceDeadline: null, reservationExpiresAt: null,
      reservationReleased: true, unavailableProductIds: [], providerIntentId: null, refundId: null, refundAttempt: 0, revision: 4 };
    const original = structuredClone(order);
    const api = individualPorts([order]);
    vi.mocked(api.quote).mockImplementation(async next => {
      if (next.lines.some(line => line.optionIds.length || line.selections?.length)) throw Object.assign(new Error("Scelte obsolete"), { code: "customization_changed" });
      return { ...historicalQuote, fingerprint: "preventivo-corrente", lines: next.lines.map(line => ({ ...line, name: "Pizza", unitCents: 900 })) };
    });
    renderDom(<IndividualOrderingScreen api={api} />);
    domFireEvent.click(await domScreen.findByRole("button", { name: /riordina|ordina di nuovo|ripeti ordine/i }));
    domFireEvent.click(await domScreen.findByRole("button", { name: "Modifica Pizza" }));
    expect(api.quote).not.toHaveBeenCalled();
    expect(order).toEqual(original);
    domFireEvent.click(domScreen.getByRole("button", { name: "Conferma modifica" }));
    domFireEvent.click(domScreen.getByRole("link", { name: "Vai a consegna e pagamento" }));
    domFireEvent.change(domScreen.getByLabelText(/Telefono per l['’]ordine/), { target: { value: "3331234567" } });
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await domWaitFor(() => expect(api.quote).toHaveBeenCalledWith(expect.objectContaining({ lines: [{ ...obsolete, optionIds: [] }] })));
    await domScreen.findByRole("button", { name: "Conferma e invia ordine" });
    expect(api.checkout).not.toHaveBeenCalled();
    expect(order).toEqual(original);
    expect(order.quote.fingerprint).toBe("prezzo-storico");
  });
});
