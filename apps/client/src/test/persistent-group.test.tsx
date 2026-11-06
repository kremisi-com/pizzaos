import { cleanupDom as cleanup, domFireEvent as fireEvent, renderDom as render, domScreen as screen, domWaitFor as waitFor, domWithin as within } from "@pizzaos/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GroupOrderingApi, GroupSnapshot, IndividualApi, IndividualStore } from "@pizzaos/domain";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";
import { createGroupOrderingApi } from "../composition/api/group-ordering-api";

const store: IndividualStore = { id: "store", name: "Sede centro", latitude: 45, longitude: 9, acceptingOrders: true, ingredients: [], deliveryBands: [], slots: [{ id: "slot", startsAt: "2030-11-05T19:00:00Z", capacity: 20 }], products: [{ id: "pizza", name: "Pizza", description: "Pomodoro", priceCents: 800, available: true, ingredients: {}, allergens: ["glutine"], options: [] }] };
const initial: GroupSnapshot = { id: "group", storeId: "store", deadline: "2030-11-05T18:00:00Z", status: "open", revision: 2, participants: [{ id: "alice", name: "Alice", host: true, lines: [] }, { id: "marco", name: "Marco", host: false, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" }] }, { id: "giulia", name: "Giulia", host: false, lines: [] }], role: "participant", participantId: "giulia" };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function ports(group: GroupSnapshot = initial) {
  const unexpected = async (): Promise<never> => { throw new Error("Unexpected public port call"); };
  const individualApi: IndividualApi = { session: vi.fn(async () => ({ actor: { id: "alice", name: "Alice", email: "alice@example.test" }, superadmin: false, storeIds: [] })), stores: vi.fn(async () => [store]), catalog: vi.fn(async () => store), quote: unexpected, checkout: unexpected, orders: vi.fn(async () => []), reconcile: unexpected, action: unexpected, notes: unexpected, saveStore: unexpected, invite: unexpected, events: vi.fn(async () => ({ cursor: 0, events: [] })) };
  const api: GroupOrderingApi = { create: vi.fn(async () => ({ ...group, role: "host" as const, participantId: "alice", inviteToken: "invitation-secret" })), read: vi.fn(async () => group), join: vi.fn(async () => ({ ...group, role: "participant" as const, participantId: "giulia" })), replaceLines: vi.fn(async () => group), removeParticipant: vi.fn(async () => group), close: vi.fn(async () => ({ ...group, status: "closed" as const, revision: group.revision + 1 })), quote: vi.fn(async () => ({ revision: group.revision, quote: { fingerprint: "server-quote", subtotalCents: 800, deliveryCents: 0, totalCents: 800, slotId: "slot", slotStartsAt: "2030-11-05T19:00:00Z", lines: [{ productId: "pizza", name: "Pizza", quantity: 1, unitCents: 800, optionIds: [], notes: "Per Marco · Ben cotta" }] } })), checkout: vi.fn(unexpected), recover: vi.fn(unexpected) };
  return { api, individualApi };
}

describe("persistent group server-backed screen", () => {
  it("creates a group through the public API and shows a recoverable fragment invitation", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} />);
    await screen.findByRole("button", { name: "Crea gruppo" });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Alice" } });
    fireEvent.change(screen.getByLabelText("Scadenza raccolta"), { target: { value: "2030-11-05T18:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Crea gruppo" }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith(expect.objectContaining({ storeId: "store", name: "Alice" })));
    await waitFor(() => expect(screen.getByLabelText("Link invito")).toHaveProperty("value", expect.stringContaining("/ordina/gruppo/group#invito=invitation-secret")));
  });

  it("lets a visitor join without an account using only invitation and name", async () => {
    const { api, individualApi } = ports({ ...initial, role: "visitor", participantId: null });
    vi.mocked(individualApi.session).mockResolvedValue({ actor: null, superadmin: false, storeIds: [] });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" inviteToken="invitation-secret" />);
    const join = await screen.findByRole("button", { name: "Entra nel gruppo" });
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Giulia" } }); fireEvent.click(join);
    await waitFor(() => expect(api.join).toHaveBeenCalledWith("group", { inviteToken: "invitation-secret", name: "Giulia" }));
    expect(screen.queryByRole("button", { name: "Chiudi raccolta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Verifica totale gruppo" })).toBeNull();
  });

  it("restores personal identity from the API after refresh and provides no edits for another participant", async () => {
    const { api, individualApi } = ports();
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    const marco = await screen.findByRole("article", { name: "Marco" });
    expect(within(marco).getByText(/Ben cotta/)).toBeTruthy();
    expect(within(marco).queryByRole("spinbutton")).toBeNull(); expect(within(marco).queryByRole("button")).toBeNull();
    expect(await screen.findByLabelText("Le mie scelte")).toBeTruthy();
    expect(api.read).toHaveBeenCalledWith("group", undefined);
    expect(api.replaceLines).not.toHaveBeenCalled();
  });

  it("renders a closed guest collection without active editing or checkout actions", async () => {
    const { api, individualApi } = ports({ ...initial, status: "closed" });
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    await screen.findByRole("article", { name: "Marco" });
    for (const name of ["Salva le mie scelte", "Chiudi raccolta", "Verifica totale gruppo", "Conferma ordine di gruppo"]) {
      const button = screen.queryByRole("button", { name }); if (button) expect(button).toHaveProperty("disabled", true);
    }
    expect(api.replaceLines).not.toHaveBeenCalled(); expect(api.checkout).not.toHaveBeenCalled();
  });

  it("keeps unsaved personal quantity and notes when polling refreshes the shared roster", async () => {
    const group = { ...initial, participants: initial.participants.map((person) => person.id === "giulia" ? { ...person, lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "Iniziale" }] } : person) };
    const { api, individualApi } = ports(group);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" pollMs={20} />);
    const editor = await screen.findByLabelText("Le mie scelte");
    const quantity = within(editor).getByRole("spinbutton"); const notes = within(editor).getByRole("textbox");
    fireEvent.change(quantity, { target: { value: "3" } }); fireEvent.change(notes, { target: { value: "Senza sale" } });
    vi.mocked(api.read).mockResolvedValue({ ...group, revision: 3 });
    await waitFor(() => expect(vi.mocked(api.read).mock.calls.length).toBeGreaterThan(1));
    expect(quantity).toHaveProperty("value", "3"); expect(notes).toHaveProperty("value", "Senza sale");
    fireEvent.click(screen.getByRole("button", { name: "Salva le mie scelte" }));
    await waitFor(() => expect(api.replaceLines).toHaveBeenCalledWith("group", { participantId: "giulia", revision: 3, lines: [{ productId: "pizza", quantity: 3, optionIds: [], notes: "Senza sale" }] }));
  });

  it("invalidates a confirmed total when polling observes a new revision", async () => {
    const group = { ...initial, role: "host" as const, participantId: "alice", status: "closed" as const, inviteToken: "invitation-secret" };
    const { api, individualApi } = ports(group);
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" pollMs={20} />);
    fireEvent.click(await screen.findByRole("button", { name: "Verifica totale gruppo" }));
    await waitFor(() => expect(api.quote).toHaveBeenCalled());
    await screen.findByRole("button", { name: "Conferma ordine di gruppo" });
    vi.mocked(api.read).mockResolvedValue({ ...group, revision: 3 });
    await waitFor(() => expect(vi.mocked(api.read).mock.calls.length).toBeGreaterThan(1));
    await waitFor(() => { const button = screen.queryByRole("button", { name: "Conferma ordine di gruppo" }); if (button) expect(button).toHaveProperty("disabled", true); });
    expect(api.checkout).not.toHaveBeenCalled();
  });

  it("recovers the frozen server attempt after reload instead of creating another checkout", async () => {
    const { api, individualApi } = ports({ ...initial, status: "closed", role: "host", participantId: "alice", checkoutPending: true });
    vi.mocked(api.recover).mockRejectedValueOnce(Object.assign(new Error("Pagamento ancora in verifica"), { code: "payment_unresolved" }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" />);
    fireEvent.click(await screen.findByRole("button", { name: "Recupera tentativo gruppo" }));
    await waitFor(() => expect(api.recover).toHaveBeenCalledWith("group")); expect(api.checkout).not.toHaveBeenCalled();
  });

  it("reloads state after revision conflict without claiming a successful change", async () => {
    const { api, individualApi } = ports({ ...initial, role: "host", participantId: "alice" });
    vi.mocked(api.close).mockRejectedValueOnce(Object.assign(new Error("Il gruppo è cambiato. Ricarica."), { code: "revision_conflict" }));
    render(<PersistentGroupScreen api={api} individualApi={individualApi} groupId="group" pollMs={60000} />);
    fireEvent.click(await screen.findByRole("button", { name: "Chiudi raccolta" }));
    await waitFor(() => expect(api.close).toHaveBeenCalled());
    await waitFor(() => expect(vi.mocked(api.read).mock.calls.length).toBeGreaterThan(1));
    expect(api.checkout).not.toHaveBeenCalled();
  });
});

describe("group browser HTTP adapter", () => {
  it("uses same-origin cookies and no-store for every request without browser capability storage", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(initial), { status: 200, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetcher);
    const localWrite = vi.spyOn(Storage.prototype, "setItem");
    const api = createGroupOrderingApi();
    await api.read("group", "invitation-secret"); await api.join("group", { inviteToken: "invitation-secret", name: "Giulia" });
    await api.replaceLines("group", { participantId: "giulia", revision: 2, lines: [] }); await api.recover("group");
    for (const call of fetcher.mock.calls) expect(call[1]).toMatchObject({ credentials: "same-origin", cache: "no-store" });
    expect(localWrite).not.toHaveBeenCalled();
    expect(fetcher.mock.calls[0][0]).toContain("/groups/group?inviteToken=invitation-secret");
    expect(fetcher.mock.calls[3][1]).toMatchObject({ method: "POST", body: "{}" });
  });
});
