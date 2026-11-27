import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadStripe } from "@stripe/stripe-js/pure";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import type {
  IndividualApi, IndividualCart, IndividualCheckout, IndividualOrder, IndividualQuote,
  IndividualSession, IndividualStore
} from "@pizzaos/domain";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";

vi.mock("@stripe/stripe-js/pure", () => ({ loadStripe: vi.fn(async () => null) }));

const PHONE = "3331234567";
const store: IndividualStore = {
  id: "checkout-store", name: "Sede Centro", latitude: 45, longitude: 9,
  acceptingOrders: true, timeZone: "Europe/Rome", ingredients: [],
  deliveryBands: [{ upToKm: 10, feeCents: 300, minimumCents: 0 }],
  products: [{ id: "margherita", name: "Margherita", description: "Pomodoro e mozzarella",
    priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }],
  slots: [{ id: "sera", startsAt: "2030-11-27T18:00:00.000Z",
    endsAt: "2030-11-27T18:30:00.000Z", timeZone: "Europe/Rome", capacity: 20 }]
};
const cart: IndividualCart = {
  storeId: store.id, mode: "pickup", slotId: null, notes: "",
  lines: [{ productId: "margherita", quantity: 2, optionIds: [], notes: "" }]
};

function copy<Value>(value: Value): Value
{
  return JSON.parse(JSON.stringify(value)) as Value;
}

function quoteFixture(totalCents = 1900): IndividualQuote
{
  return {
    fingerprint: `preventivo-${totalCents}`, subtotalCents: 1600, deliveryCents: 300,
    totalCents, slotId: "sera", slotStartsAt: "2030-11-27T18:00:00.000Z",
    slotEndsAt: "2030-11-27T18:30:00.000Z", slotTimeZone: "Europe/Rome",
    lines: [{ productId: "margherita", name: "Margherita", quantity: 2,
      unitCents: 800, optionIds: [], notes: "" }]
  };
}

function checkoutFixture(guest = false)
{
  const state = { quote: quoteFixture(), catalog: copy(store), loseResponse: false };
  const actor = { id: "cliente", name: "Andrea", email: "andrea@example.test" };
  const session: IndividualSession = { actor: guest ? null : actor, superadmin: false, storeIds: [] };
  const completed: IndividualOrder[] = [];
  const accepted = new Map<string, IndividualOrder>();
  const quote = vi.fn<IndividualApi["quote"]>(async () => copy(state.quote));
  const checkout = vi.fn(async (input: IndividualCheckout) =>
  {
    let order = accepted.get(input.idempotencyKey);
    if (!order)
    {
      order = {
        id: `ordine-${accepted.size + 1}`, storeId: store.id, customerId: actor.id,
        cart: copy(input.cart), quote: copy(state.quote), method: input.method,
        contact: { ...actor, phone: input.phone }, status: "awaiting_acceptance",
        payment: input.method === "cash" ? "cash_due" : "paid", notes: input.cart.notes,
        createdAt: new Date().toISOString(), submittedAt: new Date().toISOString(),
        acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false,
        unavailableProductIds: [], providerIntentId: null, refundId: null,
        refundAttempt: 0, revision: 1
      };
      accepted.set(input.idempotencyKey, order);
      completed.push(order);
    }
    if (state.loseResponse) throw new TypeError("Connessione interrotta");
    return { order: copy(order) };
  });
  const api: IndividualApi = {
    session: async () => copy(session), stores: async () => [copy(state.catalog)],
    catalog: async () => copy(state.catalog), quote, checkout,
    orders: async () => [],
    reconcile: vi.fn(async () => { throw new Error("Nessun pagamento da riconciliare"); }),
    action: async () => { throw new Error("Azione non prevista"); },
    notes: async () => { throw new Error("Modifica non prevista"); },
    saveStore: async () => { throw new Error("Modifica non prevista"); },
    invite: async () => undefined, events: async (cursor) => ({ cursor, events: [] })
  };
  return { api, state, quote, checkout, completed };
}

async function openCheckout(fake: ReturnType<typeof checkoutFixture>)
{
  window.localStorage.setItem("pizzaos.individual-cart.v1", JSON.stringify({
    version: 1, updatedAt: new Date().toISOString(), cart
  }));
  const result = renderDom(<IndividualOrderingScreen api={fake.api} view="checkout" />);
  await domScreen.findByRole("heading", { name: "Consegna e pagamento" });
  await domWaitFor(() => expect((domScreen.getByRole("button", {
    name: "Verifica disponibilità e totale"
  }) as HTMLButtonElement).disabled).toBe(false));
  return result;
}

function fillPhone()
{
  domFireEvent.change(domScreen.getByLabelText(/Telefono/), { target: { value: PHONE } });
}

async function verify()
{
  domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
  await domScreen.findAllByText("Totale", { exact: true });
  await domScreen.findByRole("button", { name: /Conferma e (invia ordine|paga)/ });
}

function confirmButton(): HTMLButtonElement
{
  const button = domScreen.getByRole("button", { name: /Conferma e (invia ordine|paga)/ });
  if (!(button instanceof HTMLButtonElement)) throw new Error("Conferma non disponibile");
  return button;
}

describe("checkout operativo: contratto pubblico di consegna e pagamento", () =>
{
  beforeEach(() => { cleanupDom(); window.localStorage.clear(); vi.clearAllMocks(); });
  afterEach(() => cleanupDom());

  it("distingue la stima prodotti dal totale autorevole senza creare ordini durante la verifica", async () =>
  {
    const fake = checkoutFixture();
    await openCheckout(fake);
    expect(domScreen.getByRole("heading", { name: "Consegna e pagamento", level: 1 })).toBeTruthy();
    expect(domScreen.getByRole("link", { name: "← Carrello" })).toBeTruthy();
    expect(domScreen.getByRole("link", { name: "Menu" })).toBeTruthy();
    expect(domScreen.getByText("Totale stimato")).toBeTruthy();
    expect(domScreen.getAllByText(/16,00\s*€/).length).toBeGreaterThan(0);
    expect(fake.quote).not.toHaveBeenCalled();
    await verify();
    expect(domScreen.queryByText("Totale stimato")).toBeNull();
    expect(domScreen.getAllByText(/19,00\s*€/).length).toBeGreaterThan(0);
    expect(fake.quote).toHaveBeenCalledWith(cart);
    expect(fake.checkout).not.toHaveBeenCalled();
  });

  it("espone modalità e pagamento come radio con stato selezionato", async () =>
  {
    await openCheckout(checkoutFixture());
    const pickup = domScreen.getByRole("radio", { name: "Ritiro in pizzeria" });
    const delivery = domScreen.getByRole("radio", { name: "Consegna a domicilio" });
    const cash = domScreen.getByRole("radio", { name: "Contanti al ritiro o alla consegna" });
    const card = domScreen.getByRole("radio", { name: "Carta" });
    expect((pickup as HTMLInputElement).checked).toBe(true);
    domFireEvent.click(delivery);
    expect((delivery as HTMLInputElement).checked).toBe(true);
    expect((pickup as HTMLInputElement).checked).toBe(false);
    domFireEvent.click(cash);
    expect((cash as HTMLInputElement).checked).toBe(true);
    domFireEvent.click(card);
    expect((card as HTMLInputElement).checked).toBe(true);
    expect((cash as HTMLInputElement).checked).toBe(false);
  });

  it("richiede un indirizzo per verificare una consegna a domicilio", async () =>
  {
    const fake = checkoutFixture();
    await openCheckout(fake);
    domFireEvent.click(domScreen.getByRole("radio", { name: "Consegna a domicilio" }));
    const button = domScreen.getByRole("button", { name: "Verifica disponibilità e totale" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(domScreen.getAllByText(/indirizzo/i).length).toBeGreaterThan(0);
    domFireEvent.click(button);
    expect(fake.quote).not.toHaveBeenCalled();
  });

  it("consente al guest di verificare ma gli propone accesso per completare l'ordine", async () =>
  {
    const fake = checkoutFixture(true);
    await openCheckout(fake);
    expect(domScreen.getByText("Accedi per completare l'ordine")).toBeTruthy();
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await domWaitFor(() => expect(fake.quote).toHaveBeenCalledTimes(1));
    await domWaitFor(() => expect(domScreen.getAllByText(/19,00\s*€/).length).toBeGreaterThan(0));
    expect(domScreen.getByText("Accedi per completare l'ordine")).toBeTruthy();
    expect(domScreen.queryByRole("button", { name: /Conferma e (invia ordine|paga)/ })).toBeNull();
    expect(fake.checkout).not.toHaveBeenCalled();
  });

  it("spiega il telefono mancante e blocca la conferma finché non è compilato", async () =>
  {
    const fake = checkoutFixture();
    await openCheckout(fake);
    await verify();
    expect(confirmButton().disabled).toBe(true);
    expect(domScreen.getAllByText(/telefono/i).some((node) =>
      /inserisci|necessario|richiesto|completa/i.test(node.textContent ?? ""))).toBe(true);
    domFireEvent.click(confirmButton());
    expect(fake.checkout).not.toHaveBeenCalled();
    fillPhone();
    expect(confirmButton().disabled).toBe(false);
  });

  it("mostra la verifica in corso e porta il focus sul riepilogo ricevuto", async () =>
  {
    const fake = checkoutFixture();
    let resolveQuote: ((value: IndividualQuote) => void) | undefined;
    fake.quote.mockImplementationOnce(() => new Promise<IndividualQuote>((resolve) => { resolveQuote = resolve; }));
    await openCheckout(fake);
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await domWaitFor(() => expect(fake.quote).toHaveBeenCalledTimes(1));
    expect(domScreen.getAllByText(/verifica in corso|verificando/i).length).toBeGreaterThan(0);
    if (!resolveQuote) throw new Error("Richiesta di verifica non avviata");
    resolveQuote(quoteFixture());
    await domScreen.findAllByText("Totale", { exact: true });
    await domScreen.findByRole("button", { name: /Conferma e (invia ordine|paga)/ });
    await domWaitFor(() => {
      expect(document.activeElement).toBe(domScreen.getByRole("region", { name: /riepilogo/i }));
    });
  });

  it("invalida il preventivo quando cambiano le note e richiede una nuova verifica", async () =>
  {
    const fake = checkoutFixture();
    await openCheckout(fake);
    fillPhone();
    await verify();
    domFireEvent.change(domScreen.getByRole("textbox", { name: /note/i }), { target: { value: "Citofonare" } });
    const confirm = domScreen.queryByRole("button", { name: /Conferma e (invia ordine|paga)/ });
    expect(confirm === null || (confirm instanceof HTMLButtonElement && confirm.disabled)).toBe(true);
    expect(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" })).toBeTruthy();
    expect(domScreen.getAllByText(/nuova verifica|verifica nuovamente|verifica di nuovo|preventivo.*(aggiorn|invalid|scad)|modific.*verifica/i).length).toBeGreaterThan(0);
    await verify();
    expect(fake.quote).toHaveBeenLastCalledWith({ ...cart, notes: "Citofonare" });
    expect(fake.checkout).not.toHaveBeenCalled();
  });

  it("comunica l'errore del preventivo senza abilitare l'invio", async () =>
  {
    const fake = checkoutFixture();
    fake.quote.mockRejectedValueOnce(Object.assign(
      new Error("Servizio preventivi temporaneamente non disponibile"), { code: "service_unavailable" }
    ));
    await openCheckout(fake);
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await domScreen.findAllByText(/non disponibile|riprova|problema|impossibile|non.*(verific|riusc)/i);
    const confirm = domScreen.queryByRole("button", { name: /Conferma e (invia ordine|paga)/ });
    expect(confirm === null || (confirm instanceof HTMLButtonElement && confirm.disabled)).toBe(true);
    expect(fake.checkout).not.toHaveBeenCalled();
    expect((domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each(["cash", "card"] as const)("invia %s senza Stripe quando il totale verificato lo consente", async (method) =>
  {
    const fake = checkoutFixture();
    if (method === "card") fake.state.quote = quoteFixture(0);
    await openCheckout(fake);
    domFireEvent.click(domScreen.getByRole("radio", { name: "Contanti al ritiro o alla consegna" }));
    fillPhone();
    await verify();
    if (method === "card") domFireEvent.click(domScreen.getByRole("radio", { name: "Carta" }));
    const submit = domScreen.getByRole("button", { name: /Conferma e (invia ordine|paga)/ });
    domFireEvent.click(submit);
    await domWaitFor(() => expect(fake.checkout).toHaveBeenCalledTimes(1));
    expect(fake.checkout.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      cart, method, phone: PHONE, fingerprint: fake.state.quote.fingerprint,
      idempotencyKey: expect.any(String)
    }));
    await domScreen.findByRole("link", { name: "Segui l'ordine" });
    expect(loadStripe).not.toHaveBeenCalled();
    expect(domScreen.queryByRole("button", { name: "Aggiorna ordini" })).toBeNull();
    expect(domScreen.queryByRole("heading", { name: "I tuoi ordini" })).toBeNull();
  });

  it("dopo un esito incerto blocca nuovi invii e recupera la richiesta originale", async () =>
  {
    const fake = checkoutFixture();
    fake.state.loseResponse = true;
    await openCheckout(fake);
    domFireEvent.click(domScreen.getByRole("radio", { name: "Contanti al ritiro o alla consegna" }));
    fillPhone();
    await verify();
    domFireEvent.click(domScreen.getByRole("button", { name: "Conferma e invia ordine" }));
    const recover = await domScreen.findByRole("button", { name: "Recupera tentativo ordine" });
    expect(fake.checkout).toHaveBeenCalledTimes(1);
    const original = copy(fake.checkout.mock.calls[0]?.[0]);
    const confirm = domScreen.queryByRole("button", { name: /Conferma e (invia ordine|paga)/ });
    expect(confirm === null || (confirm instanceof HTMLButtonElement && confirm.disabled)).toBe(true);
    fake.state.loseResponse = false;
    domFireEvent.click(recover);
    await domScreen.findByRole("link", { name: "Segui l'ordine" });
    expect(fake.checkout).toHaveBeenCalledTimes(2);
    expect(fake.checkout.mock.calls[1]?.[0]).toEqual(original);
    expect(fake.completed).toHaveLength(1);
  });
});
