import { afterEach, describe, expect, it, vi } from "vitest";
import type { GroupOrderingApi, GroupSnapshot, IndividualApi, IndividualOrder, IndividualStore } from "@pizzaos/domain";
import { cleanupDom as cleanup, renderDom as render, domScreen as screen, domFireEvent as fireEvent, domWaitFor as waitFor, domWithin as within } from "@pizzaos/testing";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";
import { createGroupOrderingApi } from "../composition/api/group-ordering-api";

const stripe = vi.hoisted(() => ({ confirm: vi.fn<(secret: string) => Promise<void>>(async () => {}), unmount: vi.fn() }));
vi.mock("../features/individual-ordering", async importOriginal => {
  const actual = await importOriginal<typeof import("../features/individual-ordering")>();
  const React = await import("react");
  function FakeStripe({ onReady }: { onReady: (confirm: ((secret: string) => Promise<void>) | null) => void }) {
    React.useEffect(() => { onReady(stripe.confirm); return () => { stripe.unmount(); onReady(null); }; }, [onReady]);
    return <div aria-label="Dati carta sicuri" />;
  }
  return { ...actual, IndividualStripeFields: FakeStripe };
});
const store: IndividualStore = { id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, ingredients: [], deliveryBands: [],
  slots: [{ id: "slot", startsAt: "2030-11-05T19:00:00Z", capacity: 20 }],
  products: [{ id: "pizza", name: "Pizza", description: "Pomodoro", priceCents: 800, available: true, ingredients: {}, allergens: ["glutine"], options: [{ id: "olive", name: "Olive", priceCents: 100, ingredients: {} }] }] };
const initial: GroupSnapshot = { id: "group", storeId: "store", status: "open", revision: 2, inviteToken: "invitation-secret",
  participants: [{ id: "alice", name: "Alice", host: true, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" }] },
    { id: "marco", name: "Marco", host: false, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Senza sale" }] }],
  role: "host", participantId: "alice" };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); stripe.confirm.mockClear(); stripe.unmount.mockClear(); window.history.replaceState(null, "", "/"); });

function ports(group: GroupSnapshot = initial) {
  let current = structuredClone(group);
  const unexpected = async (): Promise<never> => { throw new Error("Unexpected public port call"); };
  const individualApi: IndividualApi = { session: vi.fn(async () => ({ actor: { id: "alice", name: "Alice", email: "alice@example.test" }, superadmin: false, storeIds: [] })),
    stores: vi.fn(async () => [store]), catalog: vi.fn(async () => store), quote: unexpected, checkout: unexpected, orders: vi.fn(async () => []), reconcile: unexpected,
    action: unexpected, notes: unexpected, saveStore: unexpected, invite: unexpected, events: vi.fn(async () => ({ cursor: 0, events: [] })) };
  const api: GroupOrderingApi = {
    context: vi.fn(async () => ({ activeId: current.id, groups: [current] })), activate: vi.fn(async (_storeId, activeId) => ({ activeId, groups: [current] })),
    create: vi.fn(async () => current), read: vi.fn(async () => current), join: vi.fn(async () => current),
    rename: vi.fn(async (_id, input) => { current = { ...current, revision: current.revision + 1, participants: current.participants.map(person => person.id === current.participantId ? { ...person, name: input.name } : person) }; return current; }),
    replaceLines: vi.fn(async (_id, input) => { current = { ...current, revision: current.revision + 1, participants: current.participants.map(person => person.id === input.participantId ? { ...person, lines: input.lines } : person) }; return current; }),
    removeParticipant: vi.fn(async () => current), close: vi.fn(async () => { current = { ...current, status: "closed", revision: current.revision + 1 }; return current; }),
    quote: vi.fn(async () => ({ revision: current.revision, prepaidCents: 800, remainingCents: 800,
      quote: { fingerprint: "server-quote", subtotalCents: 1600, deliveryCents: 0, totalCents: 1600, slotId: "slot", slotStartsAt: "2030-11-05T19:00:00Z",
        lines: [{ productId: "pizza", name: "Pizza", quantity: 2, unitCents: 800, optionIds: [], notes: "Per Alice e Marco" }] } })),
    checkout: vi.fn(unexpected), recover: vi.fn(unexpected),
    payShare: vi.fn(async () => ({ group: current, payment: { id: "share", participantId: "alice", amountCents: 800, status: "requires_action" as const }, clientSecret: "transient-only" })),
    reconcileShare: vi.fn(async () => ({ group: current, payment: { id: "share", participantId: "alice", amountCents: 800, status: "paid" as const } })),
    refundShare: vi.fn(async () => current)
  };
  return { api, individualApi };
}

describe("carrello condiviso persistente", () => {
  it("mostra subito la pagina richiesta con QR e link, senza form, menu o checkout", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    await screen.findByRole("img", { name: "QR code per entrare nel gruppo" });
    expect(screen.getByRole("heading", { level: 1, name: "Ordine di gruppo" })).toBeTruthy();
    expect(screen.getByText("Pensa solo a cosa vuoi mangiare, mentre i tuoi amici scelgono.")).toBeTruthy();
    expect(screen.getByLabelText("Link invito")).toHaveProperty("value", expect.stringContaining("/ordina/gruppo/group#invito=invitation-secret"));
    expect(screen.queryByLabelText("Nome", { exact: true })).toBeNull();
    expect(screen.queryByText(/raccolta/i)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Il menu" })).toBeNull();
    expect(screen.queryByLabelText("Come paghi?")).toBeNull();
    expect(api.create).not.toHaveBeenCalled();
  });

  it("espande le persone per leggere scelte e note senza editor nella pagina invito", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    const participant = await screen.findByText("Marco");
    fireEvent.click(participant.closest("summary")!);
    const details = participant.closest("details");
    expect(details?.open).toBe(true);
    expect(within(details!).getByText("Senza sale")).toBeTruthy();
    expect(within(details!).queryByRole("textbox")).toBeNull();
    expect(within(details!).queryByRole("button")).toBeNull();
  });

  it("usa la condivisione nativa senza copiare il link", async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {});
    const copy = vi.fn<(text: string) => Promise<void>>(async () => {});
    vi.stubGlobal("navigator", { share, clipboard: { writeText: copy } });
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    fireEvent.click(await screen.findByRole("button", { name: "Condividi link" }));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ title: "Ordine di gruppo", url: expect.stringContaining("#invito=invitation-secret") })));
    expect(copy).not.toHaveBeenCalled();
  });

  it("copia il link quando la condivisione nativa non è disponibile", async () => {
    const copy = vi.fn<(text: string) => Promise<void>>(async () => {});
    vi.stubGlobal("navigator", { clipboard: { writeText: copy } });
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    fireEvent.click(await screen.findByRole("button", { name: "Condividi link" }));
    await screen.findByText("Link copiato");
    expect(copy).toHaveBeenCalledWith(expect.stringContaining("#invito=invitation-secret"));
  });

  it("permette al creatore di modificare interamente una scelta altrui non pagata", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    fireEvent.click((await screen.findByText("Marco")).closest("summary")!);
    const person = within(screen.getByLabelText("Marco"));
    expect(person.getByRole("button", { name: "Modifica Pizza" })).toBeTruthy();
    const note = person.getByRole("textbox");
    fireEvent.change(note, { target: { value: "Con basilico" } }); fireEvent.blur(note);
    await waitFor(() => expect(api.replaceLines).toHaveBeenCalledWith("group", { participantId: "marco", revision: 2, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Con basilico" }] }));
  });

  it("non offre modifiche alle scelte altrui per un partecipante", async () => {
    const { api, individualApi } = ports({ ...initial, role: "participant" });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    fireEvent.click((await screen.findByText("Marco")).closest("summary")!);
    const person = within(screen.getByLabelText("Marco"));
    expect(person.queryByRole("textbox")).toBeNull(); expect(person.queryByRole("button")).toBeNull();
  });

  it("conserva le note locali durante il polling e salva con la revisione più recente", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" pollMs={20} />);
    const note = await screen.findByLabelText("Note per Pizza di Alice");
    fireEvent.change(note, { target: { value: "Appena scritta" } });
    vi.mocked(api.read).mockResolvedValue({ ...initial, revision: 7, participants: initial.participants.map(person => person.id === "alice" ? { ...person, lines: person.lines.map(line => ({ ...line, notes: "Altro dispositivo" })) } : person) });
    await waitFor(() => expect(vi.mocked(api.read).mock.calls.length).toBeGreaterThan(1));
    expect(note).toHaveProperty("value", "Appena scritta");
    fireEvent.blur(note);
    await waitFor(() => expect(api.replaceLines).toHaveBeenCalledWith("group", expect.objectContaining({ revision: 7, participantId: "alice", lines: [expect.objectContaining({ notes: "Appena scritta" })] })));
  });

  it("blocca le quote pagate e mostra lo snapshot anche se il prodotto è stato rinominato", async () => {
    const paid: GroupSnapshot = { ...initial, participants: [{ ...initial.participants[0], payment: { id: "share", participantId: "alice", amountCents: 700, status: "paid", canRefund: true },
      quotedLines: [{ productId: "pizza", name: "Pizza storica", quantity: 1, unitCents: 700, optionIds: [], notes: "" }] }, initial.participants[1]] };
    const { api, individualApi } = ports(paid);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    const own = await screen.findByLabelText("Le mie scelte");
    expect(within(own).getByText("1 × Pizza storica")).toBeTruthy();
    expect(within(own).queryByRole("button", { name: "Modifica Pizza" })).toBeNull();
    expect(within(own).queryByLabelText("Note per Pizza di Alice")).toBeNull();
    fireEvent.click(within(own).getByRole("button", { name: "Rimborsa la mia quota" }));
    await waitFor(() => expect(api.refundShare).toHaveBeenCalledWith("group", expect.objectContaining({ paymentId: "share" })));
    expect(api.replaceLines).not.toHaveBeenCalled();
  });

  it("richiede l’accesso per pagare ma lascia comporre all’ospite", async () => {
    const { api, individualApi } = ports();
    vi.mocked(individualApi.session).mockResolvedValue({ actor: null, superadmin: false, storeIds: [] });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    expect(await screen.findByRole("link", { name: "Accedi per pagare la tua quota" })).toHaveProperty("href", expect.stringContaining("ritorno="));
    expect(screen.getByRole("button", { name: "Aumenta quantità Pizza di Alice" })).toBeTruthy();
    expect(api.payShare).not.toHaveBeenCalled();
  });

  it("recupera una sessione temporaneamente indisponibile senza fingere un ospite o perdere il gruppo", async () => {
    const { api, individualApi } = ports();
    vi.mocked(individualApi.session).mockRejectedValueOnce(Object.assign(new Error("Sessione temporaneamente indisponibile"), { code: "service_unavailable" }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    const retry = await screen.findByRole("button", { name: "Riprova accesso" });
    expect(screen.queryByRole("link", { name: "Accedi per confermare l’ordine" })).toBeNull();
    expect(api.checkout).not.toHaveBeenCalled();
    fireEvent.click(retry);
    await screen.findByLabelText("Telefono per l'ordine");
    expect(individualApi.session).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Verifica totale gruppo" }));
    await screen.findByLabelText("Riepilogo da confermare");
    expect(api.quote).toHaveBeenCalledWith("group", expect.objectContaining({ revision: 2 }));
    expect(api.replaceLines).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });

  it("non addebita un prezzo aumentato senza una seconda conferma esplicita", async () => {
    const invited: GroupSnapshot = { ...initial, role: "participant" };
    const { api, individualApi } = ports(invited);
    vi.mocked(api.payShare).mockResolvedValue({ group: invited, payment: { id: "share", participantId: "alice", amountCents: 950, status: "requires_action" }, clientSecret: "price-changed-secret" });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    fireEvent.click(await screen.findByRole("button", { name: "Paga la mia quota" }));
    fireEvent.click(await screen.findByRole("button", { name: "Conferma pagamento quota" }));
    await within(screen.getByRole("complementary")).findByText(/Il prezzo aggiornato della tua quota/);
    expect(stripe.confirm).not.toHaveBeenCalled();
    expect(within(screen.getByRole("complementary")).getAllByText(/9,50\s*€/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Conferma pagamento quota · 9,50/ }));
    await waitFor(() => expect(stripe.confirm).toHaveBeenCalledWith("price-changed-secret"));
  });

  it("paga la quota confermata e riconcilia l’esito attraverso il servizio", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    fireEvent.click(await screen.findByRole("button", { name: "Paga la mia quota" }));
    fireEvent.click(await screen.findByRole("button", { name: "Conferma pagamento quota" }));
    await waitFor(() => expect(api.reconcileShare).toHaveBeenCalledWith("group", "share"));
    expect(stripe.confirm).toHaveBeenCalledWith("transient-only");
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("mantiene gli Elements montati mentre la conferma carta o 3DS è in corso", async () => {
    const { api, individualApi } = ports();
    const payment = { id: "share", participantId: "alice", amountCents: 800, status: "requires_action" as const };
    const processing = { ...initial, participants: initial.participants.map(person => person.id === "alice" ? { ...person, payment } : person) };
    vi.mocked(api.payShare).mockResolvedValue({ group: processing, payment, clientSecret: "3ds-secret" });
    let finish = () => {};
    stripe.confirm.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    fireEvent.click(await screen.findByRole("button", { name: "Paga la mia quota" }));
    fireEvent.click(await screen.findByRole("button", { name: "Conferma pagamento quota" }));
    await waitFor(() => expect(stripe.confirm).toHaveBeenCalledWith("3ds-secret"));
    expect(stripe.unmount).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Conferma pagamento quota" })).toHaveProperty("disabled", true);
    finish();
    await waitFor(() => expect(api.reconcileShare).toHaveBeenCalledWith("group", "share"));
  });

  it("mostra il residuo del creatore distinto dal totale e dagli anticipi", async () => {
    const { api, individualApi } = ports({ ...initial, status: "closed" });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    const summary = await screen.findByLabelText("Riepilogo da confermare");
    expect(within(summary).getByText("Quote già pagate:")).toBeTruthy();
    expect(within(summary).getByText("Da pagare")).toBeTruthy();
    expect(within(summary).getAllByText("8,00 €")).toHaveLength(2);
    expect(within(summary).getAllByText("16,00 €").length).toBeGreaterThan(0);
  });

  it("mantiene gli Elements e blocca nuovi invii durante il 3DS del checkout finale", async () => {
    const { api, individualApi } = ports();
    const quoted = await api.quote("group", { revision: 2, fulfillment: { mode: "pickup", slotId: null, notes: "" } });
    vi.mocked(api.quote).mockClear();
    const order: IndividualOrder = { id: "group-order", storeId: "store", customerId: "alice",
      cart: { storeId: "store", mode: "pickup", slotId: "slot", notes: "", lines: initial.participants.flatMap(person => person.lines) },
      quote: quoted.quote, contact: { name: "Alice", email: "alice@example.test", phone: "3331234567" },
      status: "pending_payment", payment: "requires_action", method: "card", notes: "",
      createdAt: "2030-11-05T18:00:00Z", submittedAt: null, acceptanceDeadline: null,
      reservationExpiresAt: null, reservationReleased: false, unavailableProductIds: [], providerIntentId: "pi-group",
      refundId: null, refundAttempt: 0, revision: 1 };
    vi.mocked(api.checkout).mockResolvedValue({ order, clientSecret: "group-3ds-secret" });
    const paid = { order: { ...order, status: "awaiting_acceptance" as const, payment: "paid" as const } };
    vi.mocked(api.recover).mockResolvedValue(paid);
    const reconcile = vi.spyOn(individualApi, "reconcile").mockResolvedValue(paid);
    const individualCheckout = vi.spyOn(individualApi, "checkout");
    let finish = () => {};
    stripe.confirm.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" pollMs={20} />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    await screen.findByLabelText("Riepilogo da confermare");
    fireEvent.change(screen.getByLabelText("Telefono per l'ordine"), { target: { value: "3331234567" } });
    fireEvent.click(screen.getByRole("radio", { name: "Carta" }));
    const confirm = screen.getByRole("button", { name: "Conferma ordine di gruppo" });
    fireEvent.click(confirm);
    await waitFor(() => expect(stripe.confirm).toHaveBeenCalledWith("group-3ds-secret"));
    expect(stripe.unmount).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Dati carta sicuri")).toBeTruthy();
    expect(confirm).toHaveProperty("disabled", true);
    fireEvent.click(confirm);
    expect(api.checkout).toHaveBeenCalledTimes(1);
    expect(individualCheckout).not.toHaveBeenCalled();
    finish();
    await waitFor(() => expect(vi.mocked(api.recover).mock.calls.length + reconcile.mock.calls.length).toBeGreaterThan(0));
    expect(api.checkout).toHaveBeenCalledTimes(1);
  });

  it("apre il checkout senza chiudere le scelte degli amici", async () => {
    const { api, individualApi } = ports(initial);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    await screen.findByLabelText("Telefono per l'ordine");
    fireEvent.click(screen.getByRole("button", { name: "Verifica totale gruppo" }));
    await screen.findByLabelText("Riepilogo da confermare");
    expect(api.close).not.toHaveBeenCalled();
    expect(api.quote).toHaveBeenCalledWith("group", expect.objectContaining({ revision: 2 }));
  });

  it("invalida il totale quando il polling osserva una revisione nuova", async () => {
    const closed = { ...initial, status: "closed" as const };
    const { api, individualApi } = ports(closed);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" pollMs={20} />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    await screen.findByLabelText("Riepilogo da confermare");
    vi.mocked(api.read).mockResolvedValue({ ...closed, revision: 8 });
    await waitFor(() => expect(screen.queryByLabelText("Riepilogo da confermare")).toBeNull());
    const dock = screen.getByRole("complementary");
    expect(within(dock).queryByRole("button", { name: "Conferma ordine di gruppo" })).toBeNull();
    fireEvent.click(within(dock).getByRole("button", { name: "Verifica totale gruppo" }));
    await waitFor(() => expect(api.quote).toHaveBeenLastCalledWith("group", expect.objectContaining({ revision: 8 })));
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("recupera il tentativo server senza avviare un nuovo checkout", async () => {
    const { api, individualApi } = ports({ ...initial, status: "closed", checkoutPending: true });
    vi.mocked(api.recover).mockRejectedValue(Object.assign(new Error("Pagamento in verifica"), { code: "payment_unresolved" }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    fireEvent.click(await screen.findByRole("button", { name: "Recupera tentativo gruppo" }));
    await waitFor(() => expect(api.recover).toHaveBeenCalledWith("group"));
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("richiede accesso al creatore ospite prima di recuperare un checkout già pendente", async () => {
    const { api, individualApi } = ports({ ...initial, checkoutPending: true });
    vi.mocked(individualApi.session).mockResolvedValue({ actor: null, superadmin: false, storeIds: [] });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    const access = await screen.findByRole("link", { name: "Accedi per confermare l’ordine" });
    expect(access).toHaveProperty("href", expect.stringContaining("ritorno=%2Fordina%2Fcheckout"));
    expect(within(screen.getByRole("complementary")).getByRole("link", { name: "Accedi per confermare l’ordine" })).toBe(access);
    expect(screen.queryByRole("button", { name: "Recupera tentativo gruppo" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Conferma ordine di gruppo" })).toBeNull();
    expect(api.checkout).not.toHaveBeenCalled();
    expect(api.recover).not.toHaveBeenCalled();
    expect(api.quote).not.toHaveBeenCalled();
  });

  it("conserva il tentativo pendente quando la sessione fallisce e lo recupera dopo Riprova accesso", async () => {
    const { api, individualApi } = ports({ ...initial, checkoutPending: true });
    vi.mocked(individualApi.session).mockRejectedValueOnce(new Error("Sessione temporaneamente indisponibile"));
    vi.mocked(api.recover).mockRejectedValue(Object.assign(new Error("Pagamento in verifica"), { code: "payment_unresolved" }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    const retry = await screen.findByRole("button", { name: "Riprova accesso" });
    expect(screen.queryByRole("link", { name: "Accedi per confermare l’ordine" })).toBeNull();
    const prematureRecovery = screen.queryByRole("button", { name: "Recupera tentativo gruppo" });
    expect(prematureRecovery === null || (prematureRecovery instanceof HTMLButtonElement && prematureRecovery.disabled)).toBe(true);
    expect(api.recover).not.toHaveBeenCalled();
    fireEvent.click(retry);
    fireEvent.click(await screen.findByRole("button", { name: "Recupera tentativo gruppo" }));
    await waitFor(() => expect(api.recover).toHaveBeenCalledWith("group"));
    expect(individualApi.session).toHaveBeenCalledTimes(2);
    expect(api.checkout).not.toHaveBeenCalled();
    expect(api.quote).not.toHaveBeenCalled();
  });

  it("attende la sessione prima di proporre accesso o recupero per un checkout pendente", async () => {
    const pending: GroupSnapshot = { ...initial, checkoutPending: true };
    const { api, individualApi } = ports(pending);
    let finish: (() => void) | undefined;
    vi.mocked(individualApi.session).mockImplementationOnce(() => new Promise(resolve => {
      finish = () => resolve({ actor: null, superadmin: false, storeIds: [] });
    }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" initialGroup={pending} view="checkout" />);
    await waitFor(() => expect(individualApi.session).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("link", { name: "Accedi per confermare l’ordine" })).toBeNull();
    const prematureRecovery = screen.queryByRole("button", { name: "Recupera tentativo gruppo" });
    expect(prematureRecovery === null || (prematureRecovery instanceof HTMLButtonElement && prematureRecovery.disabled)).toBe(true);
    expect(api.checkout).not.toHaveBeenCalled();
    expect(api.recover).not.toHaveBeenCalled();
    if (!finish) throw new Error("Lettura sessione non avviata");
    finish();
    await screen.findByRole("link", { name: "Accedi per confermare l’ordine" });
    expect(api.checkout).not.toHaveBeenCalled();
    expect(api.recover).not.toHaveBeenCalled();
  });

  it("non chiama Stripe per un residuo zero e richiede una conferma autenticata", async () => {
    const { api, individualApi } = ports({ ...initial, status: "closed" });
    vi.mocked(api.quote).mockResolvedValue({ revision: 2, prepaidCents: 1600, remainingCents: 0,
      quote: { fingerprint: "all-paid", subtotalCents: 1600, deliveryCents: 0, totalCents: 1600, slotId: "slot", slotStartsAt: store.slots[0].startsAt, lines: [] } });
    let finish: (() => void) | undefined;
    vi.mocked(api.checkout).mockImplementationOnce(() => new Promise((_resolve, reject) => {
      finish = () => reject(new Error("esito simulato"));
    }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    await screen.findByLabelText("Riepilogo da confermare");
    fireEvent.change(screen.getByLabelText("Telefono per l'ordine"), { target: { value: "3331234567" } });
    fireEvent.click(screen.getByRole("radio", { name: "Carta" }));
    const confirm = screen.getByRole("button", { name: "Conferma ordine di gruppo" });
    fireEvent.click(confirm);
    await waitFor(() => expect(api.checkout).toHaveBeenCalledWith("group", expect.objectContaining({ method: "card", fingerprint: "all-paid" })));
    expect(screen.queryByLabelText("Dati carta sicuri")).toBeNull();
    expect(confirm).toHaveProperty("disabled", true);
    fireEvent.click(confirm);
    expect(api.checkout).toHaveBeenCalledTimes(1);
    expect(stripe.confirm).not.toHaveBeenCalled();
    if (!finish) throw new Error("Conferma ordine non avviata");
    finish();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "esito simulato");
    expect(screen.queryByLabelText("Dati carta sicuri")).toBeNull();
    expect(stripe.confirm).not.toHaveBeenCalled();
  });
  it("offre il checkout nel riepilogo fisso del creatore senza richiedere un anticipo", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    const dock = await screen.findByRole("complementary");
    expect(within(dock).getByRole("link", { name: "Vai al checkout →" })).toHaveProperty("href", expect.stringContaining("/ordina/checkout"));
    expect(within(dock).getAllByText(/16,00\s*€/).length).toBeGreaterThan(0);
    expect(within(dock).getAllByText(/stimat/i).length).toBeGreaterThan(0);
    expect(within(dock).queryByRole("button", { name: "Paga la mia quota" })).toBeNull();
    expect(screen.getByRole("button", { name: "Paga la mia quota" })).toBeTruthy();
    expect(api.payShare).not.toHaveBeenCalled();
    expect(api.quote).not.toHaveBeenCalled();
  });

  it("mantiene il checkout del creatore anche quando tutte le quote sono pagate", async () => {
    const paid: GroupSnapshot = { ...initial, participants: initial.participants.map(person => ({ ...person,
      payment: { id: `share-${person.id}`, participantId: person.id, amountCents: 800, status: "paid" },
      quotedLines: [{ productId: "pizza", name: "Pizza", quantity: 1, unitCents: 800, optionIds: [], notes: "" }]
    })) };
    const { api, individualApi } = ports(paid);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    const dock = await screen.findByRole("complementary");
    expect(within(dock).getByRole("link", { name: "Vai al checkout →" })).toBeTruthy();
    expect(within(dock).getAllByText(/0,00\s*€/).length).toBeGreaterThan(0);
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("riserva il riepilogo fisso dell’invitato alla propria quota senza checkout finale", async () => {
    const { api, individualApi } = ports({ ...initial, role: "participant" });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    const dock = await screen.findByRole("complementary");
    expect(within(dock).getByRole("button", { name: "Paga la mia quota" })).toBeTruthy();
    expect(within(dock).getAllByText(/8,00\s*€/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Vai al checkout →" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Conferma ordine di gruppo" })).toBeNull();
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("espone modalità e pagamento con radio visibili e selezione esclusiva", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    const pickup = await screen.findByRole("radio", { name: "Ritiro in pizzeria" });
    const delivery = screen.getByRole("radio", { name: "Consegna a domicilio" });
    expect(pickup).toHaveProperty("checked", true);
    fireEvent.click(delivery);
    expect(delivery).toHaveProperty("checked", true);
    expect(pickup).toHaveProperty("checked", false);
    const verify = within(screen.getByRole("complementary")).getByRole("button", { name: "Verifica totale gruppo" });
    expect(verify).toHaveProperty("disabled", true);
    fireEvent.click(pickup);
    const cash = screen.getByRole("radio", { name: "Contanti al ritiro o alla consegna" });
    const card = screen.getByRole("radio", { name: "Carta" });
    fireEvent.click(card);
    expect(card).toHaveProperty("checked", true);
    expect(cash).toHaveProperty("checked", false);
    fireEvent.click(cash);
    expect(cash).toHaveProperty("checked", true);
    expect(card).toHaveProperty("checked", false);
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("porta il focus al totale verificato e spiega il telefono necessario prima di confermare", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    const summary = await screen.findByRole("region", { name: "Riepilogo da confermare" });
    await waitFor(() => expect(document.activeElement).toBe(summary));
    const dock = screen.getByRole("complementary");
    const confirm = within(dock).getByRole("button", { name: "Conferma ordine di gruppo" });
    expect(confirm).toHaveProperty("disabled", true);
    expect(within(dock).getAllByText(/telefono/i).some(node => /inserisci|necessario|richiesto|completa/i.test(node.textContent ?? ""))).toBe(true);
    fireEvent.click(confirm);
    expect(api.checkout).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Telefono per l'ordine"), { target: { value: "3331234567" } });
    expect(confirm).toHaveProperty("disabled", false);
  });

  it("blocca l’anticipo carta sotto cinquanta centesimi", async () => {
    const { api, individualApi } = ports({ ...initial, role: "participant" });
    vi.mocked(individualApi.catalog).mockResolvedValue({ ...store, products: [{ ...store.products[0], priceCents: 30 }] });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    const dock = await screen.findByRole("complementary");
    const pay = within(dock).queryByRole("button", { name: "Paga la mia quota" });
    expect(pay === null || (pay instanceof HTMLButtonElement && pay.disabled)).toBe(true);
    expect(within(dock).getAllByText(/0,50|50 centesimi/).length).toBeGreaterThan(0);
    expect(api.payShare).not.toHaveBeenCalled();
  });

  it("richiede contanti per il residuo confermato di trenta centesimi", async () => {
    const { api, individualApi } = ports();
    const quoted = await api.quote("group", { revision: 2, fulfillment: { mode: "pickup", slotId: null, notes: "" } });
    vi.mocked(api.quote).mockClear().mockResolvedValue({ ...quoted, prepaidCents: 1570, remainingCents: 30 });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="checkout" />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    await screen.findByLabelText("Riepilogo da confermare");
    fireEvent.change(screen.getByLabelText("Telefono per l'ordine"), { target: { value: "3331234567" } });
    fireEvent.click(screen.getByRole("radio", { name: "Carta" }));
    const confirm = within(screen.getByRole("complementary")).getByRole("button", { name: "Conferma ordine di gruppo" });
    expect(confirm).toHaveProperty("disabled", true);
    expect(within(screen.getByRole("complementary")).getAllByText(/contanti/i).length).toBeGreaterThan(0);
    fireEvent.click(confirm);
    expect(api.checkout).not.toHaveBeenCalled();
    expect(stripe.confirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "Contanti al ritiro o alla consegna" }));
    expect(confirm).toHaveProperty("disabled", false);
  });

  it("limita la quantità a cento e rimuove la riga portandola a zero", async () => {
    const capped = { ...initial, participants: initial.participants.map(person => person.id === "alice" ? {
      ...person, lines: [{ ...person.lines[0], quantity: 100 }]
    } : person) };
    const { api, individualApi } = ports(capped);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" view="cart" />);
    const increase = await screen.findByRole("button", { name: "Aumenta quantità Pizza di Alice" });
    expect(increase).toHaveProperty("disabled", true);
    fireEvent.click(increase);
    expect(api.replaceLines).not.toHaveBeenCalled();
    cleanup();
    const fresh = ports(initial);
    render(<PersistentGroupScreen api={fresh.api} individualApi={fresh.individualApi} groupId="group" view="cart" />);
    fireEvent.click(await screen.findByRole("button", { name: "Diminuisci quantità Pizza di Alice" }));
    await waitFor(() => expect(fresh.api.replaceLines).toHaveBeenCalledWith("group", expect.objectContaining({ participantId: "alice", lines: [] })));
  });
});

describe("group browser HTTP adapter", () => {
  it("usa solo cookie same-origin no-store per contesto, pagamenti e rimborsi", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(initial), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const api = createGroupOrderingApi();
    await api.context("store"); await api.activate("store", "group");
    await api.join("group", { inviteToken: "invitation-secret", lines: [] });
    await api.payShare("group", { revision: 2, idempotencyKey: "pay" });
    await api.reconcileShare("group", "payment/id"); await api.refundShare("group", { paymentId: "payment/id", idempotencyKey: "refund" });
    for (const call of fetcher.mock.calls) expect(call[1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
    expect(writes).not.toHaveBeenCalled();
    expect(fetcher.mock.calls[0][0]).toContain("/groups/context?storeId=store");
    expect(fetcher.mock.calls[4][0]).toContain("/payments/payment%2Fid/reconcile");
  });

  it("propaga errori strutturati senza dichiarare successo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: "forbidden", message: "Non autorizzato" }), { status: 403 })));
    await expect(createGroupOrderingApi().refundShare("group", { paymentId: "other", idempotencyKey: "refund" })).rejects.toMatchObject({ code: "forbidden" });
  });
});
