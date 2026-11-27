import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import { emptyPizzaCatalog, materializePizzaMenu, type IndividualApi, type IndividualCart, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";

const draftKey = "pizzaos.individual-cart.v1";
const pizza: IndividualProduct = { id: "pizza", name: "Margherita", description: "Pomodoro e mozzarella", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] };

function fixture(products: IndividualProduct[] = [pizza]) {
  const store: IndividualStore = {
    id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    ingredients: [], deliveryBands: [], products,
    slots: [{ id: "sera", startsAt: "2030-11-05T19:00:00.000Z", capacity: 20 }]
  };
  const unexpected = async (): Promise<never> => { throw new Error("Operazione non prevista prima del preventivo"); };
  const api: IndividualApi = {
    session: async () => ({ actor: null, superadmin: false, storeIds: [] }),
    stores: async () => [store], catalog: async () => store,
    orders: async () => [], quote: vi.fn(unexpected), checkout: vi.fn(unexpected),
    reconcile: unexpected, action: unexpected, notes: unexpected,
    saveStore: async next => next, invite: async () => undefined,
    events: async cursor => ({ cursor, events: [] })
  };
  return { store, api };
}

function seed(lines: IndividualCart["lines"] = [{ productId: "pizza", quantity: 2, optionIds: [], notes: "" }]) {
  const cart: IndividualCart = { storeId: "roma", mode: "pickup", slotId: null, notes: "", lines };
  window.localStorage.setItem(draftKey, JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), cart }));
}

function persistedCart(): IndividualCart {
  const raw = window.localStorage.getItem(draftKey);
  return raw ? (JSON.parse(raw) as { cart: IndividualCart }).cart : { storeId: "roma", mode: "pickup", slotId: null, notes: "", lines: [] };
}

beforeEach(() => { cleanupDom(); window.localStorage.clear(); });
afterEach(cleanupDom);

describe("contratto della vista carrello individuale", () => {
  it("mostra il draft e il subtotale stimato senza catalogo né preventivo implicito", async () => {
    const { api } = fixture();
    seed();
    renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    await domScreen.findByRole("button", { name: "Aumenta quantità Margherita" });
    expect(domScreen.getAllByText("Margherita").length).toBeGreaterThan(0);
    expect(domScreen.getAllByText(/16,00\s*€/).length).toBeGreaterThanOrEqual(2);
    expect(domScreen.getByText(/subtotale/i)).toBeTruthy();
    expect(domScreen.getByText(/totale stimato/i)).toBeTruthy();
    expect(domScreen.queryByRole("button", { name: "Aggiungi Margherita" })).toBeNull();
    expect(domScreen.queryByRole("region", { name: "Consegna e pagamento" })).toBeNull();
    expect(domScreen.getByRole("link", { name: /Vai al checkout/ }).getAttribute("href")).toBe("/ordina/checkout");
    expect(api.quote).not.toHaveBeenCalled();
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("aggiorna quantità e prezzo, conserva le modifiche al reload e rimuove diminuendo da uno", async () => {
    const { api } = fixture();
    seed();
    const page = renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    domFireEvent.click(await domScreen.findByRole("button", { name: "Aumenta quantità Margherita" }));
    await domWaitFor(() => expect(persistedCart().lines[0].quantity).toBe(3));
    expect(domScreen.getAllByText(/24,00\s*€/).length).toBeGreaterThanOrEqual(2);
    page.unmount();
    renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    await domScreen.findByRole("button", { name: "Diminuisci quantità Margherita" });
    expect(domScreen.getAllByText(/24,00\s*€/).length).toBeGreaterThanOrEqual(2);
    for (let index = 0; index < 3; index++) domFireEvent.click(domScreen.getByRole("button", { name: "Diminuisci quantità Margherita" }));
    await domWaitFor(() => expect(persistedCart().lines).toEqual([]));
    expect(domScreen.getByRole("link", { name: /Sfoglia il menu/ }).getAttribute("href")).toBe("/ordina#il-menu");
    expect(domScreen.queryByRole("link", { name: /Vai al checkout/ })).toBeNull();
  });

  it.each(["Rimuovi", "Svuota carrello"])("%s svuota il draft e impedisce il checkout", async action => {
    const { api } = fixture();
    seed();
    renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    await domScreen.findByRole("button", { name: "Aumenta quantità Margherita" });
    domFireEvent.click(domScreen.getByRole("button", { name: new RegExp(`^${action}(?: Margherita)?$`, "i") }));
    await domWaitFor(() => expect(persistedCart().lines).toEqual([]));
    expect(domScreen.getByRole("link", { name: /Sfoglia il menu/ })).toBeTruthy();
    expect(domScreen.queryByRole("link", { name: /Vai al checkout/ })).toBeNull();
    expect(domScreen.queryByRole("button", { name: /Vai al checkout/ })).toBeNull();
  });

  it("conserva note e scelte di un prodotto non disponibile, consentendone la rimozione", async () => {
    const { api } = fixture([{ ...pizza, available: false, options: [{ id: "olive", name: "Olive", priceCents: 100, ingredients: {} }] }]);
    seed([{ productId: "pizza", quantity: 1, optionIds: ["olive"], notes: "Ben cotta" }]);
    renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    await domScreen.findByText(/non disponibile|esaurito/i);
    expect((domScreen.getByLabelText("Note per Margherita") as HTMLInputElement).value).toBe("Ben cotta");
    expect(domScreen.getAllByText(/Olive/).length).toBeGreaterThan(0);
    domFireEvent.click(domScreen.getByRole("button", { name: /^Rimuovi(?: Margherita)?$/i }));
    await domWaitFor(() => expect(persistedCart().lines).toEqual([]));
  });

  it("include scelte ripetute nel prezzo di un prodotto Menu", async () => {
    const product: IndividualProduct = { ...pizza, id: "box", name: "Menu", priceCents: 500,
      groups: [{ id: "scelte", name: "Scelte", kind: "selection", min: 0, max: 3, allowRepeat: true, optionIds: ["olive"] }],
      options: [{ id: "olive", name: "Olive", priceCents: 100, ingredients: {} }] };
    const { api } = fixture([product]);
    seed([{ productId: "box", quantity: 2, optionIds: [], selections: [{ optionId: "olive", quantity: 2 }], notes: "" }]);
    renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    await domScreen.findByRole("button", { name: "Aumenta quantità Menu" });
    expect(domScreen.getAllByText(/14,00\s*€/).length).toBeGreaterThanOrEqual(2);
  });

  it("include il sovrapprezzo dell'impasto nella stima Pizza", async () => {
    const component = (id: string, name: string, priceCents = 0) => ({ id, name, description: "", priceCents, available: true, ingredients: {} });
    const catalog = emptyPizzaCatalog();
    catalog.doughs = [component("classico", "Classico"), component("integrale", "Integrale", 120)];
    catalog.bases = [component("rossa", "Rossa")];
    catalog.formats = [component("tonda", "Tonda")];
    catalog.tastes = [{ id: "pizza", name: "Margherita", description: "", priceCents: 800, available: true,
      standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda",
      doughIds: ["classico", "integrale"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [], includedToppingIds: [] }];
    const menu = materializePizzaMenu({ id: "menu", name: "Menu", sections: [], products: [], pizzaCatalog: catalog });
    const { api, store } = fixture(menu.products);
    store.menu = menu;
    seed([{ productId: "pizza", kind: "pizza_taste", quantity: 2, optionIds: [], notes: "", selections: [
      { optionId: "dough:integrale", quantity: 1 }, { optionId: "base:rossa", quantity: 1 }, { optionId: "format:tonda", quantity: 1 }
    ] }]);
    renderDom(<IndividualOrderingScreen api={api} view="cart" />);
    await domScreen.findByRole("button", { name: "Aumenta quantità Margherita" });
    expect(domScreen.getAllByText(/18,40\s*€/).length).toBeGreaterThanOrEqual(2);
  });

  it("apre direttamente consegna e pagamento con lo stesso draft nella vista checkout", async () => {
    const { api } = fixture();
    api.session = async () => ({ actor: { id: "alice", name: "Alice", email: "alice@example.test" }, superadmin: false, storeIds: [] });
    seed();
    renderDom(<IndividualOrderingScreen api={api} view="checkout" />);
    await domScreen.findByRole("region", { name: "Consegna e pagamento" });
    await domScreen.findByLabelText("Come paghi?");
    expect(domScreen.queryByRole("heading", { name: "I tuoi ordini" })).toBeNull();
    expect(domScreen.queryByRole("button", { name: "Aggiorna ordini" })).toBeNull();
    expect(domScreen.getByLabelText("Modalità")).toBeTruthy();
    expect(domScreen.queryByRole("button", { name: "Aggiungi Margherita" })).toBeNull();
    expect(domScreen.getByRole("link", { name: /Menu$/ }).getAttribute("href")).toBe("/ordina#il-menu");
    expect(persistedCart().lines[0].quantity).toBe(2);
    expect(api.checkout).not.toHaveBeenCalled();
  });
});
