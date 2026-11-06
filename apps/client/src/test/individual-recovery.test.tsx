import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupDom, domFireEvent, domScreen, domWaitFor as waitFor, renderDom } from "@pizzaos/testing";
import type {
  IndividualApi, IndividualCart, IndividualCheckout, IndividualCheckoutResult,
  IndividualOrder, IndividualQuote, IndividualStore
} from "@pizzaos/domain";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";

const PHONE = "3331234567";

function storeFixture(): IndividualStore
{
  return {
    id: "store-recovery", name: "Sede Centro", latitude: 45, longitude: 9,
    acceptingOrders: true, ingredients: [], deliveryBands: [],
    products: [{ id: "pizza", name: "Margherita", description: "Pomodoro e mozzarella",
      priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }],
    slots: [{ id: "slot-evening", startsAt: "2030-11-05T19:00:00.000Z", capacity: 20 }]
  };
}

function copy<T>(value: T): T
{
  return JSON.parse(JSON.stringify(value)) as T;
}

/** The fake preserves service idempotency even when transport loses the response. */
function recoveryApi()
{
  let store = storeFixture();
  let loseCheckoutResponses = false;
  let ordersUnavailable = false;
  const accepted: IndividualOrder[] = [];
  const checkoutInputs: IndividualCheckout[] = [];
  const quoteInputs: IndividualCart[] = [];
  const catalogRequests: string[] = [];
  const attempts = new Map<string, { input: IndividualCheckout; result: IndividualCheckoutResult }>();

  function quote(cart: IndividualCart): IndividualQuote
  {
    const lines = cart.lines.map((line) =>
    {
      const product = store.products.find((item) => item.id === line.productId);
      if (!product?.available)
        throw Object.assign(new Error("Prodotto non disponibile"), { code: "product_unavailable" });
      return { ...copy(line), name: product.name, unitCents: product.priceCents };
    });
    const slot = store.slots.find((item) => item.id === cart.slotId) ?? store.slots[0];
    if (!slot)
      throw Object.assign(new Error("Fascia non disponibile"), { code: "slot_unavailable" });
    const total = lines.reduce((sum, line) => sum + line.quantity * line.unitCents, 0);
    return { fingerprint: JSON.stringify({ cart, lines, slot }), lines,
      subtotalCents: total, deliveryCents: 0, totalCents: total,
      slotId: slot.id, slotStartsAt: slot.startsAt };
  }

  const api: IndividualApi = {
    session: async () => ({ actor: { id: "customer", name: "Andrea", email: "andrea@example.test" }, superadmin: false, storeIds: [] }),
    stores: async () => [copy(store)],
    catalog: async (id) => { catalogRequests.push(id); return copy(store); },
    quote: async (cart) => { quoteInputs.push(copy(cart)); return quote(cart); },
    checkout: async (input) =>
    {
      checkoutInputs.push(copy(input));
      let attempt = attempts.get(input.idempotencyKey);
      if (attempt && JSON.stringify(attempt.input) !== JSON.stringify(input))
        throw Object.assign(new Error("Tentativo già usato con dati diversi"), { code: "idempotency_conflict" });
      if (!attempt)
      {
        const now = "2030-11-05T18:00:00.000Z";
        const order: IndividualOrder = {
          id: `ordine-${accepted.length + 1}`, storeId: store.id, customerId: "customer",
          cart: copy(input.cart), quote: quote(input.cart),
          contact: { name: "Andrea", email: "andrea@example.test", phone: input.phone },
          status: "awaiting_acceptance", payment: "cash_due", method: input.method,
          notes: input.cart.notes, createdAt: now, submittedAt: now,
          acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false,
          unavailableProductIds: [], providerIntentId: null, refundId: null, refundAttempt: 0, revision: 1
        };
        accepted.push(order);
        attempt = { input: copy(input), result: { order } };
        attempts.set(input.idempotencyKey, attempt);
      }
      if (loseCheckoutResponses)
        throw new TypeError("Failed to fetch");
      return copy(attempt.result);
    },
    orders: async () =>
    {
      if (ordersUnavailable) throw new TypeError("Failed to fetch");
      return copy(accepted);
    },
    reconcile: async (id) =>
    {
      const order = accepted.find((item) => item.id === id);
      if (!order) throw new Error("Ordine non trovato");
      return { order: copy(order) };
    },
    action: async () => { throw new Error("Azione non prevista in questa prova"); },
    notes: async () => { throw new Error("Note non previste in questa prova"); },
    saveStore: async (next) => { store = copy(next); return copy(store); },
    invite: async () => undefined,
    events: async (cursor) => ({ cursor, events: [] })
  };
  return {
    api, accepted, checkoutInputs, quoteInputs, catalogRequests,
    loseResponses: (value: boolean) => { loseCheckoutResponses = value; },
    failOrderReads: (value: boolean) => { ordersUnavailable = value; },
    updateCatalog: (next: IndividualStore) => { store = copy(next); }
  };
}

async function addPizzas(quantity: number)
{
  const add = await domScreen.findByRole("button", { name: "Aggiungi Margherita" });
  for (let index = 0; index < quantity; index++) domFireEvent.click(add);
}

async function verifyAndSubmit()
{
  domFireEvent.change(domScreen.getByLabelText(/Telefono per l['’]ordine/), { target: { value: PHONE } });
  domFireEvent.change(domScreen.getByLabelText("Come paghi?"), { target: { value: "cash" } });
  domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
  const submit = await domScreen.findByRole("button", { name: "Conferma e invia ordine" });
  await waitFor(() => expect((submit as HTMLButtonElement).disabled).toBe(false));
  domFireEvent.click(submit);
}

describe("individual ordering recovery and live catalog contract", () =>
{
  beforeEach(() => { cleanupDom(); window.localStorage.clear(); });
  afterEach(() => cleanupDom());

  it("recovers a cash order whose response was lost and allows a different cart after reload", async () =>
  {
    const fake = recoveryApi();
    fake.loseResponses(true);
    const firstPage = renderDom(<IndividualOrderingScreen api={fake.api} />);
    await addPizzas(1);
    await verifyAndSubmit();
    await waitFor(() => expect(fake.accepted).toHaveLength(1));
    firstPage.unmount();

    fake.loseResponses(false);
    renderDom(<IndividualOrderingScreen api={fake.api} />);
    await domScreen.findAllByText(/ordine-1/);
    const recover = domScreen.queryByRole("button", { name: /recupera|riprova.*(?:tentativo|ordine)/i });
    if (recover) domFireEvent.click(recover);
    await domScreen.findByRole("button", { name: "Aggiungi Margherita" });
    await waitFor(() => expect((domScreen.getByRole("button", { name: "Aggiungi Margherita" }) as HTMLButtonElement).disabled).toBe(false));
    const quantity = domScreen.queryByRole("spinbutton", { name: "Quantità Margherita" });
    if (quantity) domFireEvent.change(quantity, { target: { value: "2" } });
    else await addPizzas(2);
    await verifyAndSubmit();

    await waitFor(() => expect(fake.accepted).toHaveLength(2));
    expect(fake.accepted.map((order) => order.cart.lines.reduce((sum, line) => sum + line.quantity, 0))).toEqual([1, 2]);
    await domScreen.findAllByText(/ordine-2/);
    expect(domScreen.getAllByText(/ordine-1/).length).toBeGreaterThan(0);
  });

  it("retries the original input across reload while the result remains unknowable", async () =>
  {
    const fake = recoveryApi();
    fake.loseResponses(true);
    const firstPage = renderDom(<IndividualOrderingScreen api={fake.api} />);
    await addPizzas(1);
    fake.failOrderReads(true);
    await verifyAndSubmit();
    await waitFor(() => expect(fake.checkoutInputs).toHaveLength(1));
    firstPage.unmount();

    renderDom(<IndividualOrderingScreen api={fake.api} />);
    await domScreen.findByRole("button", { name: "Aggiungi Margherita" });
    // An edited draft must not silently replace the input of an uncertain attempt.
    domFireEvent.change(domScreen.getByRole("spinbutton", { name: "Quantità Margherita" }), { target: { value: "2" } });
    const retry = domScreen.queryByRole("button", { name: /recupera|riprova.*(?:tentativo|ordine)/i });
    if (retry) domFireEvent.click(retry);
    else await verifyAndSubmit();

    await waitFor(() => expect(fake.checkoutInputs.length).toBeGreaterThanOrEqual(2));
    for (const input of fake.checkoutInputs) expect(input).toEqual(fake.checkoutInputs[0]);
    expect(fake.accepted).toHaveLength(1);
  });

  it("refreshes price, availability and slots, retains the cart and requires a fresh quote", async () =>
  {
    const fake = recoveryApi();
    const page = renderDom(<IndividualOrderingScreen api={fake.api} refreshVersion={0} />);
    await addPizzas(2);
    domFireEvent.change(domScreen.getByLabelText(/Telefono per l['’]ordine/), { target: { value: PHONE } });
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await waitFor(() => expect((domScreen.getByRole("button", { name: "Conferma e invia ordine" }) as HTMLButtonElement).disabled).toBe(false));
    const previousSlot = domScreen.getByRole("option", { name: /05\/11\/30/ }).textContent;
    const previousReads = fake.catalogRequests.length;
    const next = storeFixture();
    next.products[0] = { ...next.products[0], priceCents: 900, available: false };
    next.slots = [{ id: "slot-late", startsAt: "2030-11-05T20:00:00.000Z", capacity: 10 }];
    fake.updateCatalog(next);
    page.rerender(<IndividualOrderingScreen api={fake.api} refreshVersion={1} />);

    await waitFor(() => expect(fake.catalogRequests.length).toBeGreaterThan(previousReads));
    await domScreen.findByText(/Non disponibile/i);
    expect(domScreen.getByText(/9,00\s*€/)).toBeDefined();
    const unavailableAdd = domScreen.queryByRole("button", { name: "Aggiungi Margherita" });
    expect(unavailableAdd === null || (unavailableAdd as HTMLButtonElement).disabled).toBe(true);
    const submit = domScreen.queryByRole("button", { name: "Conferma e invia ordine" });
    expect(submit === null || (submit as HTMLButtonElement).disabled).toBe(true);
    expect(domScreen.queryByRole("option", { name: previousSlot ?? "fascia precedente" })).toBeNull();
    expect(domScreen.getByRole("option", { name: /05\/11\/30/ })).toBeDefined();
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await waitFor(() => expect(fake.quoteInputs).toHaveLength(2));
    expect(fake.quoteInputs[1].lines).toEqual([{ productId: "pizza", quantity: 2, optionIds: [], notes: "" }]);
    expect(fake.checkoutInputs).toHaveLength(0);
  });
});
