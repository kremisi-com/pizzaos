import type { IndividualApi, IndividualOrder, IndividualSession } from "@pizzaos/domain";
import {
  cleanupDom as cleanup, domFireEvent as fireEvent, domScreen as screen,
  domWaitFor as waitFor, renderDom as render
} from "@pizzaos/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { OperationalOrdersScreen } from "../features/orders";

const authenticated: IndividualSession = {
  actor: { id: "customer", name: "Andrea", email: "andrea@example.test" }, superadmin: false, storeIds: []
};

function orderFixture(overrides: Partial<IndividualOrder> = {}): IndividualOrder {
  return {
    id: "ordine-storico", storeId: "sede", customerId: "customer",
    cart: { storeId: "sede", mode: "pickup", slotId: "fascia-acquistata", notes: "Citofono interno",
      lines: [{ productId: "pizza", quantity: 2, optionIds: ["extra"], notes: "Ben cotta" }] },
    quote: { fingerprint: "snapshot", subtotalCents: 1700, deliveryCents: 0, totalCents: 1700,
      slotId: "fascia-acquistata", slotStartsAt: "2026-11-26T19:00:00Z",
      lines: [{ productId: "pizza", name: "Pizza acquistata", quantity: 2, unitCents: 850, optionIds: ["extra"], notes: "Ben cotta" }] },
    contact: { name: "Andrea", email: "andrea@example.test", phone: "3331234567" },
    status: "completed", payment: "paid", method: "card", notes: "Citofono interno",
    createdAt: "2026-11-26T18:00:00Z", submittedAt: "2026-11-26T18:01:00Z",
    acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false,
    unavailableProductIds: [], providerIntentId: "pi_existing", refundId: null, refundAttempt: 0, revision: 1,
    ...overrides
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

function ports(orders: IndividualOrder[] = []) {
  const unexpected = async (): Promise<never> => { throw new Error("Port non previsto dalla pagina ordini"); };
  const api: IndividualApi = {
    session: vi.fn(async () => authenticated), orders: vi.fn(async () => orders),
    stores: vi.fn(async () => []), catalog: vi.fn(unexpected), quote: vi.fn(unexpected), checkout: vi.fn(unexpected),
    reconcile: vi.fn(unexpected), action: vi.fn(unexpected), notes: vi.fn(unexpected),
    saveStore: vi.fn(unexpected), invite: vi.fn(unexpected), events: vi.fn(async cursor => ({ cursor, events: [] }))
  };
  const onReorder = vi.fn<(order: IndividualOrder) => Promise<void>>(async () => undefined);
  return { api, onReorder };
}

function cannotClick(button: HTMLElement | null) {
  return button === null || (button as HTMLButtonElement).disabled;
}

beforeEach(() => { cleanup(); window.localStorage.clear(); window.history.replaceState(null, "", "/ordina/ordini"); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("pagina ordini operativa: contratto pubblico", () => {
  it("mostra l'accesso all'ospite senza leggere ordini riservati", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    vi.mocked(api.session).mockResolvedValue({ actor: null, superadmin: false, storeIds: [] });
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    expect(await screen.findByRole("link", { name: "Accedi" })).toBeTruthy();
    expect(api.orders).not.toHaveBeenCalled();
    expect(screen.queryByText(/Pizza acquistata/)).toBeNull();
  });

  it("espone caricamento e stato vuoto per l'account autenticato", async () => {
    const { api, onReorder } = ports();
    const reading = deferred<IndividualOrder[]>();
    vi.mocked(api.orders).mockReturnValue(reading.promise);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    expect(await screen.findByText(/caricamento|caricando/i)).toBeTruthy();
    reading.resolve([]);
    expect(await screen.findByText(/nessun ordine|non hai.*ordini/i)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ordini passati" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /home/i })).toBeTruthy();
    expect(api.orders).toHaveBeenCalledWith();
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("riprova una lettura iniziale fallita", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    vi.mocked(api.orders).mockRejectedValueOnce(new Error("Connessione non disponibile"));
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    fireEvent.click(await screen.findByRole("button", { name: /riprova/i }));
    expect(await screen.findAllByText(/Pizza acquistata/)).toBeTruthy();
    expect(api.orders).toHaveBeenCalledTimes(2);
  });

  it("mostra prodotti, quantità, note e importo acquistati senza leggere il catalogo corrente", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    expect(await screen.findAllByText(/Pizza acquistata/)).toBeTruthy();
    expect(screen.getAllByText(/17,00/)).toBeTruthy();
    expect(screen.getAllByText(/Ben cotta/)).toBeTruthy();
    expect(document.body.textContent).toMatch(/2/);
    expect(api.catalog).not.toHaveBeenCalled();
    expect(api.quote).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /conferma e invia ordine/i })).toBeNull();
  });

  it("mantiene raggiungibili più ordini attivi insieme allo storico", async () => {
    const { api, onReorder } = ports([
      orderFixture({ id: "attivo-primo", status: "awaiting_acceptance" }),
      orderFixture({ id: "attivo-secondo", status: "preparing" }), orderFixture()
    ]);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    await screen.findAllByText(/attivo-primo/);
    expect(screen.getAllByText(/attivo-secondo/)).toBeTruthy();
    expect(screen.getAllByText(/ordine-storico/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Riordina" })).toHaveLength(1);
  });

  it("rilegge gli ordini su aggiornamento manuale e refreshVersion", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    const page = render(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={0} />);
    await screen.findAllByText(/Pizza acquistata/);
    fireEvent.click(screen.getByRole("button", { name: /aggiorna/i }));
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(2));
    page.rerender(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={1} />);
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(3));
    for (const args of vi.mocked(api.orders).mock.calls) expect(args).toEqual([]);
  });

  it("conserva l'elenco visibile quando un aggiornamento fallisce", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    const page = render(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={0} />);
    await screen.findAllByText(/Pizza acquistata/);
    vi.mocked(api.orders).mockRejectedValueOnce(new Error("Aggiornamento non disponibile"));
    page.rerender(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={1} />);
    await screen.findByRole("button", { name: /riprova/i });
    expect(screen.getAllByText(/Pizza acquistata/)).toBeTruthy();
  });

  it("non permette a una lettura obsoleta di sovrascrivere la successiva", async () => {
    const { api, onReorder } = ports();
    const oldRead = deferred<IndividualOrder[]>();
    const freshRead = deferred<IndividualOrder[]>();
    vi.mocked(api.orders).mockReturnValueOnce(oldRead.promise).mockReturnValueOnce(freshRead.promise);
    const page = render(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={0} />);
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(1));
    page.rerender(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={1} />);
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(2));
    freshRead.resolve([orderFixture({ id: "risposta-nuova" })]);
    await screen.findAllByText(/risposta-nuova/);
    oldRead.resolve([orderFixture({ id: "risposta-obsoleta" })]);
    await oldRead.promise;
    await waitFor(() => expect(screen.queryByText(/risposta-obsoleta/)).toBeNull());
    expect(screen.getAllByText(/risposta-nuova/)).toBeTruthy();
  });

  it("rimuove i dati riservati dopo revoca della sessione", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    const page = render(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={0} />);
    await screen.findAllByText(/Pizza acquistata/);
    vi.mocked(api.orders).mockRejectedValue(Object.assign(new Error("Sessione scaduta"), { code: "unauthorized" }));
    page.rerender(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={1} />);
    await screen.findByRole("link", { name: "Accedi" });
    expect(screen.queryByText(/Pizza acquistata/)).toBeNull();
    expect(screen.queryByText(/ordine-storico/)).toBeNull();
  });

  it("preserva la bozza note durante un aggiornamento e salva tramite API", async () => {
    const order = orderFixture({ status: "accepted" });
    const { api, onReorder } = ports([order]);
    vi.mocked(api.notes).mockResolvedValue({ ...order, notes: "Note ancora da salvare", revision: 2 });
    const page = render(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={0} />);
    const notes = await screen.findByRole("textbox", { name: /note/i });
    fireEvent.change(notes, { target: { value: "Note ancora da salvare" } });
    page.rerender(<OperationalOrdersScreen api={api} onReorder={onReorder} refreshVersion={1} />);
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("textbox", { name: /note/i })).toHaveProperty("value", "Note ancora da salvare");
    fireEvent.click(screen.getByRole("button", { name: /(?:salva|aggiorna).*note/i }));
    await waitFor(() => expect(api.notes).toHaveBeenCalledWith(order.id, "Note ancora da salvare"));
  });

  it("conserva le note confermate durante la rilettura e dopo una risposta con revisione precedente", async () => {
    const previous = orderFixture({ status: "accepted", revision: 1 });
    const confirmed: IndividualOrder = { ...previous, notes: "Note confermate dal servizio", revision: 2 };
    const { api, onReorder } = ports([previous]);
    const rereading = deferred<IndividualOrder[]>();
    const saving = deferred<IndividualOrder>();
    vi.mocked(api.orders).mockResolvedValueOnce([previous]).mockReturnValue(rereading.promise);
    vi.mocked(api.notes).mockReturnValue(saving.promise);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    fireEvent.change(await screen.findByRole("textbox", { name: /note/i }), {
      target: { value: confirmed.notes }
    });
    fireEvent.click(screen.getByRole("button", { name: /(?:salva|aggiorna).*note/i }));
    await waitFor(() => expect(api.notes).toHaveBeenCalledWith(previous.id, confirmed.notes));

    await act(async () => { saving.resolve(confirmed); });
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("textbox", { name: /note/i })).toHaveProperty("value", confirmed.notes);

    await act(async () => { rereading.resolve([previous]); });
    expect(screen.getByRole("textbox", { name: /note/i })).toHaveProperty("value", confirmed.notes);
  });

  it.each([
    ["pending_payment", true, false], ["awaiting_acceptance", true, true], ["awaiting_customer", true, true],
    ["accepted", true, false], ["preparing", false, false], ["ready", false, false],
    ["out_for_delivery", false, false], ["completed", false, false], ["cancelled", false, false]
  ] as const)("rispetta i permessi cliente nello stato %s", async (status, editable, cancellable) => {
    const { api, onReorder } = ports([orderFixture({ status, payment: status === "pending_payment" ? "processing" : "paid" })]);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    await screen.findAllByText(/ordine-storico/);
    const notes = screen.queryByRole("textbox", { name: /note/i });
    if (editable) expect(notes).toBeTruthy();
    else expect(notes === null || (notes as HTMLTextAreaElement).disabled || (notes as HTMLTextAreaElement).readOnly).toBe(true);
    const cancel = screen.queryByRole("button", { name: "Annulla ordine" });
    expect(cannotClick(cancel)).toBe(!cancellable);
  });

  it("aspetta la risposta server all'annullamento e mostra il conflitto senza successo ottimistico", async () => {
    const { api, onReorder } = ports([orderFixture({ status: "awaiting_acceptance" })]);
    const result = deferred<IndividualOrder>();
    vi.mocked(api.action).mockReturnValue(result.promise);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    fireEvent.click(await screen.findByRole("button", { name: "Annulla ordine" }));
    await waitFor(() => expect(api.action).toHaveBeenCalledWith("ordine-storico", { action: "cancel" }));
    expect(screen.getAllByText(/In attesa del ristorante/i)).toBeTruthy();
    result.reject(Object.assign(new Error("Ordine già accettato"), { code: "invalid_transition" }));
    await screen.findByText(/Ordine già accettato/);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("riconcilia un solo pagamento senza aprire un nuovo checkout", async () => {
    const pending = orderFixture({ id: "pagamento-da-verificare", status: "pending_payment", payment: "processing" });
    const { api, onReorder } = ports([pending]);
    const confirmed: IndividualOrder = { ...pending, status: "awaiting_acceptance", payment: "paid" };
    vi.mocked(api.reconcile).mockImplementation(async () => {
      vi.mocked(api.orders).mockResolvedValue([confirmed]);
      return { order: confirmed };
    });
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica pagamento" }));
    await waitFor(() => expect(api.reconcile).toHaveBeenCalledWith(pending.id));
    expect(await screen.findAllByText(/In attesa del ristorante/i)).toBeTruthy();
    expect(api.checkout).not.toHaveBeenCalled();
    expect(api.quote).not.toHaveBeenCalled();
  });

  it("porta al recupero del pagamento esistente con l'ordine nel frammento", async () => {
    const { api, onReorder } = ports([orderFixture({ id: "pagamento-esistente", status: "pending_payment", payment: "requires_action" })]);
    window.history.replaceState(null, "", "/ordina/ordini#ordine-pagamento-esistente");
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    const resume = await screen.findByRole("link", { name: "Completa pagamento esistente" });
    expect(resume.getAttribute("href")).toBe("/ordina/checkout#ordine-pagamento-esistente");
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it.each([
    ["processing", /elaborazione|verifica|corso/i], ["requires_action", /completa il pagamento sicuro/i],
    ["refund_pending", /rimborso.*(?:attesa|corso)|attesa.*rimborso/i],
    ["refund_failed", /il rimborso richiede un intervento del ristorante/i], ["refunded", /rimborsato|rimborso completato/i]
  ] as const)("rende esplicito lo stato pagamento %s", async (payment, label) => {
    const { api, onReorder } = ports([orderFixture({ payment, status: payment === "processing" || payment === "requires_action" ? "pending_payment" : "cancelled" })]);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    await screen.findAllByText(/ordine-storico/);
    expect(document.body.textContent).toMatch(label);
  });

  it("passa al capability aggiunte l'ordine server e un callback di rilettura", async () => {
    const order = orderFixture({ status: "awaiting_acceptance" });
    const { api, onReorder } = ports([order]);
    const additions = vi.fn((received: IndividualOrder, onChanged: () => Promise<void>) =>
      <button onClick={() => { void onChanged(); }}>Aggiorna aggiunte {received.id}</button>);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} renderAdditions={additions} />);
    fireEvent.click(await screen.findByRole("button", { name: "Aggiorna aggiunte ordine-storico" }));
    expect(additions.mock.calls[0][0]).toEqual(order);
    await waitFor(() => expect(api.orders).toHaveBeenCalledTimes(2));
  });

  it.each([
    ["completed", "paid"], ["cancelled", "refunded"], ["pending_payment", "failed"]
  ] as const)("riordina un ordine archiviato %s/%s solo tramite callback", async (status, payment) => {
    const order = orderFixture({ status, payment, unavailableProductIds: ["non-disponibile"] });
    const { api, onReorder } = ports([order]);
    const saving = deferred<void>();
    onReorder.mockReturnValue(saving.promise);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    fireEvent.click(await screen.findByRole("button", { name: "Riordina" }));
    await waitFor(() => expect(onReorder).toHaveBeenCalledWith(order));
    expect(screen.queryByRole("link", { name: "Vai al carrello" })).toBeNull();
    saving.resolve();
    const cart = await screen.findByRole("link", { name: "Vai al carrello" });
    expect(cart.getAttribute("href")).toBe("/ordina/carrello");
    expect(api.quote).not.toHaveBeenCalled();
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("mostra il fallimento salvataggio senza dichiarare il carrello pronto", async () => {
    const { api, onReorder } = ports([orderFixture()]);
    onReorder.mockRejectedValue(new Error("Impossibile salvare il carrello"));
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    fireEvent.click(await screen.findByRole("button", { name: "Riordina" }));
    await screen.findByText(/Impossibile salvare il carrello/);
    expect(screen.queryByRole("link", { name: "Vai al carrello" })).toBeNull();
    expect(screen.getAllByText(/Pizza acquistata/)).toBeTruthy();
  });

  it.each(["processing", "requires_action"] as const)("blocca il riordino mentre esiste un pagamento %s", async payment => {
    const { api, onReorder } = ports([orderFixture(), orderFixture({ id: "incerto", status: "pending_payment", payment })]);
    render(<OperationalOrdersScreen api={api} onReorder={onReorder} />);
    await screen.findAllByText(/ordine-storico/);
    const reorder = screen.queryByRole("button", { name: "Riordina" });
    expect(cannotClick(reorder)).toBe(true);
    if (reorder) fireEvent.click(reorder);
    expect(onReorder).not.toHaveBeenCalled();
    expect(api.checkout).not.toHaveBeenCalled();
  });
});
