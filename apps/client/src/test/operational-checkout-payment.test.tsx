import type { ReactNode } from "react";
import type { CardElementProps } from "@stripe/react-stripe-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import type {
  IndividualApi, IndividualCart, IndividualCheckout, IndividualOrder, IndividualQuote, IndividualStore
} from "@pizzaos/domain";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";

const provider = vi.hoisted(() =>
{
  const confirmCardPayment = vi.fn(async () => ({ paymentIntent: { id: "pi_checkout", status: "succeeded" } }));
  const card = { id: "card_checkout" };
  return { confirmCardPayment, card, stripe: { confirmCardPayment }, elements: { getElement: () => card } };
});

vi.mock("@stripe/stripe-js/pure", () => ({ loadStripe: vi.fn(async () => ({})) }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({ children }: { children: ReactNode }) => children,
  CardElement: ({ onChange }: CardElementProps) => <button type="button" onClick={() => onChange?.({
    elementType: "card", brand: "visa", empty: false, complete: true, error: undefined, value: { postalCode: "00100" }
  })}>Inserisci carta di prova</button>,
  useStripe: () => provider.stripe,
  useElements: () => provider.elements
}));

const CLIENT_SECRET = "pi_checkout_secret_test";
const PHONE = "3331234567";
const actor = { id: "cliente-carta", name: "Andrea", email: "andrea@example.test" };
const store: IndividualStore = {
  id: "sede-carta", name: "Sede Centro", latitude: 45, longitude: 9,
  acceptingOrders: true, timeZone: "Europe/Rome", ingredients: [], deliveryBands: [],
  products: [{ id: "margherita", name: "Margherita", description: "Pomodoro e mozzarella",
    priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }],
  slots: [{ id: "sera", startsAt: "2030-11-27T18:00:00.000Z",
    endsAt: "2030-11-27T18:30:00.000Z", timeZone: "Europe/Rome", capacity: 20 }]
};
const cart: IndividualCart = {
  storeId: store.id, mode: "pickup", slotId: null, notes: "",
  lines: [{ productId: "margherita", quantity: 2, optionIds: [], notes: "" }]
};
const quote: IndividualQuote = {
  fingerprint: "preventivo-carta", subtotalCents: 1600, deliveryCents: 0, totalCents: 1600,
  slotId: "sera", slotStartsAt: "2030-11-27T18:00:00.000Z", slotTimeZone: "Europe/Rome",
  lines: [{ productId: "margherita", name: "Margherita", quantity: 2,
    unitCents: 800, optionIds: [], notes: "" }]
};

function copy<Value>(value: Value): Value
{
  return JSON.parse(JSON.stringify(value)) as Value;
}

function paymentFixture(recoverExisting: boolean)
{
  const order: IndividualOrder = {
    id: "ordine-carta", storeId: store.id, customerId: actor.id,
    cart: copy(cart), quote: copy(quote), method: "card",
    contact: { name: actor.name, email: actor.email, phone: PHONE },
    status: "pending_payment", payment: "requires_action", notes: "",
    createdAt: new Date().toISOString(), submittedAt: null, acceptanceDeadline: null,
    reservationExpiresAt: "2030-11-27T18:30:00.000Z", reservationReleased: false,
    unavailableProductIds: [], providerIntentId: "pi_checkout", refundId: null,
    refundAttempt: 0, revision: 1
  };
  const state = { confirmed: false };
  function currentOrder(): IndividualOrder
  {
    return state.confirmed ? { ...copy(order), payment: "paid", status: "awaiting_acceptance",
      submittedAt: new Date().toISOString(), revision: 2 } : copy(order);
  }
  provider.confirmCardPayment.mockImplementation(async () =>
  {
    state.confirmed = true;
    return { paymentIntent: { id: "pi_checkout", status: "succeeded" } };
  });
  const checkout = vi.fn<IndividualApi["checkout"]>(async () => ({ order: copy(order), clientSecret: CLIENT_SECRET }));
  const reconcile = vi.fn<IndividualApi["reconcile"]>(async () => ({
    order: currentOrder(),
    ...(state.confirmed ? {} : { clientSecret: CLIENT_SECRET })
  }));
  const orders = vi.fn<IndividualApi["orders"]>(async () => recoverExisting ? [currentOrder()] : []);
  const api: IndividualApi = {
    session: async () => ({ actor, superadmin: false, storeIds: [] }),
    stores: async () => [copy(store)], catalog: async () => copy(store),
    quote: vi.fn(async () => copy(quote)), checkout, reconcile, orders,
    action: async () => { throw new Error("Azione non prevista"); },
    notes: async () => { throw new Error("Modifica non prevista"); },
    saveStore: async () => { throw new Error("Modifica non prevista"); },
    invite: async () => undefined, events: async (cursor) => ({ cursor, events: [] })
  };
  return { api, checkout, reconcile, orders };
}

function seedDraft(empty: boolean)
{
  window.localStorage.setItem("pizzaos.individual-cart.v1", JSON.stringify({
    version: 1, updatedAt: new Date().toISOString(), cart: { ...cart, lines: empty ? [] : cart.lines }
  }));
}

async function confirmProviderPayment()
{
  const card = await domScreen.findByRole("button", { name: "Inserisci carta di prova" });
  domFireEvent.click(card);
  const paymentAction = /Conferma pagamento|Completa pagamento|Conferma e paga|Riprendi pagamento|^Paga(?:\s|$)/i;
  await domWaitFor(() =>
  {
    const confirm = domScreen.queryByRole("button", { name: paymentAction });
    expect(provider.confirmCardPayment.mock.calls.length === 1 ||
      (confirm instanceof HTMLButtonElement && !confirm.disabled)).toBe(true);
  });
  if (provider.confirmCardPayment.mock.calls.length === 0)
    domFireEvent.click(domScreen.getByRole("button", { name: paymentAction }));
  await domWaitFor(() => expect(provider.confirmCardPayment).toHaveBeenCalledTimes(1));
}

describe("checkout operativo: pagamento carta e recupero", () =>
{
  beforeEach(() =>
  {
    cleanupDom();
    window.localStorage.clear();
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "pk_test_checkout");
  });
  afterEach(() => { cleanupDom(); vi.unstubAllEnvs(); });

  it("conferma la carta con il clientSecret dell'unico ordine creato e riconcilia il pagamento", async () =>
  {
    const fake = paymentFixture(false);
    seedDraft(false);
    renderDom(<IndividualOrderingScreen api={fake.api} view="checkout" />);
    await domWaitFor(() => expect((domScreen.getByRole("button", {
      name: "Verifica disponibilità e totale"
    }) as HTMLButtonElement).disabled).toBe(false));
    domFireEvent.change(domScreen.getByLabelText(/Telefono/), { target: { value: PHONE } });
    domFireEvent.click(domScreen.getByRole("radio", { name: "Carta" }));
    domFireEvent.click(domScreen.getByRole("button", { name: "Verifica disponibilità e totale" }));
    await domScreen.findByRole("button", { name: /Conferma e paga.*16,00/ });
    await confirmProviderPayment();
    expect(provider.confirmCardPayment).toHaveBeenCalledWith(CLIENT_SECRET, expect.objectContaining({
      payment_method: expect.objectContaining({ card: provider.card })
    }));
    await domScreen.findByRole("link", { name: "Segui l'ordine" });
    expect(fake.checkout).toHaveBeenCalledTimes(1);
    expect(fake.checkout.mock.calls[0]?.[0]).toEqual(expect.objectContaining<Partial<IndividualCheckout>>({
      cart, method: "card", phone: PHONE, fingerprint: quote.fingerprint
    }));
    expect(fake.reconcile).toHaveBeenCalledWith("ordine-carta");
  });

  it("recupera e paga l'ordine pendente anche a carrello vuoto senza creare un altro ordine", async () =>
  {
    const fake = paymentFixture(true);
    seedDraft(true);
    renderDom(<IndividualOrderingScreen api={fake.api} view="checkout" />);
    await domWaitFor(() => expect(fake.orders).toHaveBeenCalled());
    const recover = await domScreen.findByRole("button", { name: /Completa pagamento esistente|Riprendi pagamento|Recupera pagamento/i });
    domFireEvent.click(recover);
    await confirmProviderPayment();
    expect(provider.confirmCardPayment).toHaveBeenCalledWith(CLIENT_SECRET, expect.objectContaining({
      payment_method: expect.objectContaining({ card: provider.card })
    }));
    await domScreen.findByRole("link", { name: "Segui l'ordine" });
    expect(fake.reconcile).toHaveBeenCalledWith("ordine-carta");
    expect(fake.checkout).not.toHaveBeenCalled();
  });
});
