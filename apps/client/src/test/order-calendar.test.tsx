import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import type { IndividualApi, IndividualCart, IndividualQuote, IndividualStore } from "@pizzaos/domain";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";

const timeZone = "Europe/Rome";
const current = { id: "current", startsAt: "2026-11-23T18:00:00.000Z", endsAt: "2026-11-23T19:00:00.000Z", timeZone, capacity: 1 };
const later = { id: "later", startsAt: "2026-11-23T19:00:00.000Z", endsAt: "2026-11-23T20:00:00.000Z", timeZone, capacity: 5 };
const currentLabel = /19:00\s*[–—-]\s*20:00/;
const laterLabel = /20:00\s*[–—-]\s*21:00/;
const pizza = { id: "pizza", name: "Margherita", description: "Pomodoro e mozzarella", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] };

function calendarApi(capacity: number) {
  const store: IndividualStore = {
    id: "sede-centro", name: "Sede Centro", latitude: 45, longitude: 9, timeZone, acceptingOrders: true,
    ingredients: [], products: [pizza], deliveryBands: [], slots: [{ ...current, capacity }, later],
  };
  const copyStore = () => ({ ...store, slots: store.slots.map((slot) => ({ ...slot })) });
  const unavailable = async (): Promise<never> => { throw new Error("Operazione imprevista nel test"); };
  const quote = vi.fn(async (cart: IndividualCart): Promise<IndividualQuote> => {
    const slot = cart.slotId ? store.slots.find((item) => item.id === cart.slotId) : store.slots.find((item) => item.capacity > 0);
    if (!slot?.capacity) throw Object.assign(new Error("Fascia non disponibile"), { code: "slot_unavailable" });
    const lines = cart.lines.map((line) => ({ ...line, name: pizza.name, unitCents: pizza.priceCents }));
    const totalCents = lines.reduce((total, line) => total + line.unitCents * line.quantity, 0);
    return {
      fingerprint: `fascia-${slot.id}`, lines, subtotalCents: totalCents, deliveryCents: 0, totalCents,
      slotId: slot.id, slotStartsAt: slot.startsAt, slotEndsAt: slot.endsAt, slotTimeZone: slot.timeZone,
    };
  });
  const checkout = vi.fn<IndividualApi["checkout"]>(async () => {
    store.slots = [{ ...current, capacity: 0 }, later];
    throw Object.assign(new Error("Fascia non disponibile"), { code: "slot_unavailable" });
  });
  const api: IndividualApi = {
    session: async () => ({ actor: { id: "alice", name: "Alice", email: "alice@example.test" }, superadmin: false, storeIds: [] }),
    stores: async () => [copyStore()], catalog: async () => copyStore(), quote, checkout, orders: async () => [],
    reconcile: unavailable, action: unavailable, notes: unavailable, saveStore: unavailable, invite: unavailable,
    events: async (cursor) => ({ cursor, events: [] }),
  };
  return { api, quote, checkout };
}

async function addPizza() {
  domFireEvent.click(await domScreen.findByRole("button", { name: "Aggiungi Margherita" }));
}

function chooseOption(option: HTMLOptionElement) {
  expect(option.disabled).toBe(false);
  expect(option.closest("select")).toBeInstanceOf(HTMLSelectElement);
  domFireEvent.change(option.closest("select")!, { target: { value: option.value } });
}

function verifyTotal() {
  domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
}

describe("fasce orarie dell’ordine individuale", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.setSystemTime(new Date("2026-11-23T18:15:00.000Z"));
  });

  afterEach(() => {
    cleanupDom();
    vi.useRealTimers();
  });

  it("lascia visibile la fascia al completo e mostra nel riepilogo quella disponibile per Appena possibile", async () => {
    const f = calendarApi(0);
    renderDom(<IndividualOrderingScreen api={f.api} />);
    const full = await domScreen.findByRole<HTMLOptionElement>("option", { name: /19:00.*20:00.*Al completo/i });
    expect(full.disabled).toBe(true);
    const available = domScreen.getByRole<HTMLOptionElement>("option", { name: laterLabel });
    expect(available.disabled).toBe(false);
    chooseOption(domScreen.getByRole<HTMLOptionElement>("option", { name: /Appena possibile/i }));
    await addPizza();
    verifyTotal();
    await domScreen.findByRole("heading", { name: "Riepilogo da confermare" });
    expect(await domScreen.findByText(laterLabel, { selector: ":not(option)" })).toBeDefined();
    expect(f.quote).toHaveBeenLastCalledWith(expect.objectContaining({ slotId: null }));
  });

  it("conserva il carrello quando il cliente cambia fascia dopo un conflitto sull’ultimo posto", async () => {
    const f = calendarApi(1);
    renderDom(<IndividualOrderingScreen api={f.api} />);
    const inProgress = await domScreen.findByRole<HTMLOptionElement>("option", { name: currentLabel });
    chooseOption(inProgress);
    await addPizza();
    await addPizza();
    domFireEvent.change(domScreen.getByLabelText(/Telefono per l['’]ordine/), { target: { value: "3331234567" } });
    domFireEvent.change(domScreen.getByLabelText("Come paghi?"), { target: { value: "cash" } });
    verifyTotal();
    await domScreen.findByText(currentLabel, { selector: ":not(option)" });
    const submit = await domScreen.findByRole<HTMLButtonElement>("button", { name: "Conferma e invia ordine" });
    await domWaitFor(() => expect(submit.disabled).toBe(false));
    domFireEvent.click(submit);

    const full = await domScreen.findByRole<HTMLOptionElement>("option", { name: /19:00.*20:00.*Al completo/i });
    expect(full.disabled).toBe(true);
    expect(f.checkout).toHaveBeenCalledTimes(1);
    chooseOption(domScreen.getByRole<HTMLOptionElement>("option", { name: laterLabel }));
    verifyTotal();
    await domScreen.findByText(laterLabel, { selector: ":not(option)" });
    expect(f.quote).toHaveBeenLastCalledWith(expect.objectContaining({ slotId: later.id, lines: expect.arrayContaining([expect.objectContaining({ productId: pizza.id, quantity: 2 })]) }));
  });
});
