import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IndividualApi, IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, domWaitFor, renderDom } from "@pizzaos/testing";
import { IndividualOperationsShell } from "../composition/individual-operations-shell";
import { AdminToastProvider } from "../composition/admin-toast";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("../composition/api/individual-api", () => ({ createIndividualApi: create }));

function fixture() {
  let current: IndividualStore = {
    id: "roma", name: "Roma", address: "Via Roma 10", latitude: 41.9, longitude: 12.5,
    configurationRevision: "original", acceptingOrders: true,
    ingredients: [{ id: "farina", name: "Farina", stock: 10 }], products: [], slots: [], deliveryBands: []
  };
  const unexpected = async (): Promise<never> => { throw new Error("Operazione imprevista"); };
  const saveStore = vi.fn<IndividualApi["saveStore"]>(async input => {
    current = { ...input, configurationRevision: "saved" };
    return structuredClone(current);
  });
  const api: IndividualApi = {
    session: async () => ({ actor: { id: "staff", name: "Operatore", email: "staff@example.test" }, superadmin: false, storeIds: ["roma"] }),
    stores: async () => [structuredClone(current)], catalog: async () => structuredClone(current),
    orders: async () => [], events: async () => ({ cursor: 0, events: [] }), saveStore,
    quote: unexpected, checkout: unexpected, reconcile: unexpected, action: unexpected, notes: unexpected, invite: unexpected
  };
  create.mockReturnValue(api);
  renderDom(<AdminToastProvider><IndividualOperationsShell /></AdminToastProvider>);
  return { saveStore, change: (change: Partial<IndividualStore>) => { current = { ...current, ...change }; } };
}

beforeEach(() => { window.localStorage.clear(); window.history.replaceState(null, "", "/operazioni/profilo"); });
afterEach(() => { cleanupDom(); vi.clearAllMocks(); });

describe("salvataggio configurazione dalla bozza operatore", () => {
  it("salva il Magazzino più volte senza rimontare i campi e conserva gli aggiornamenti indipendenti", async () => {
    window.history.replaceState(null, "", "/operazioni/magazzino");
    const f = fixture();
    const stock = await domScreen.findByLabelText<HTMLInputElement>("Scorta Farina");
    expect(domScreen.queryByRole("button", { name: "Salva configurazione" })).toBeNull();
    domFireEvent.change(stock, { target: { value: "12" } });
    domFireEvent.blur(stock);
    await domWaitFor(() => expect(f.saveStore).toHaveBeenCalledTimes(1));
    await domScreen.findByText("Configurazione salvata.");
    f.change({ contactPhone: "0612345", configurationRevision: "remote" });
    domFireEvent.change(stock, { target: { value: "15" } });
    domFireEvent.blur(stock);
    await domWaitFor(() => expect(f.saveStore).toHaveBeenCalledTimes(2));
    expect(f.saveStore.mock.lastCall?.[0]).toMatchObject({
      contactPhone: "0612345", configurationRevision: "remote", ingredients: [{ stock: 15 }]
    });
    expect(domScreen.getByLabelText("Scorta Farina")).toBe(stock);
    expect(stock.value).toBe("15");
  });

  it("invia la revisione della rilettura e conserva i campi indipendenti modificati altrove", async () => {
    const f = fixture();
    const name = await domScreen.findByLabelText("Nome sede");
    domFireEvent.change(name, { target: { value: "Roma Centro" } });
    f.change({ configurationRevision: "remote", contactPhone: "0612345" });
    domFireEvent.blur(name);
    await domWaitFor(() => expect(f.saveStore).toHaveBeenCalledWith(expect.objectContaining({
      name: "Roma Centro", contactPhone: "0612345", configurationRevision: "remote"
    }), undefined));
    await domScreen.findByText("Configurazione salvata.");
    domFireEvent.change(name, { target: { value: "Roma Centro aggiornata" } });
    domFireEvent.blur(name);
    await domWaitFor(() => expect(f.saveStore).toHaveBeenCalledTimes(2));
    expect(f.saveStore.mock.lastCall?.[0]).toMatchObject({ name: "Roma Centro aggiornata", contactPhone: "0612345" });
    expect(domScreen.getByLabelText("Nome sede")).toBe(name);
  });

  it("mantiene la bozza quando il servizio rileva una modifica dopo la rilettura, senza ritentare", async () => {
    const f = fixture();
    const name = await domScreen.findByLabelText<HTMLInputElement>("Nome sede");
    domFireEvent.change(name, { target: { value: "Bozza locale" } });
    f.saveStore.mockRejectedValueOnce(Object.assign(new Error("La configurazione è cambiata. Ricarica la sede e ripeti la modifica."), { code: "revision_conflict" }));
    domFireEvent.blur(name);
    await domScreen.findByText("La configurazione è cambiata. Ricarica la sede e ripeti la modifica.");
    expect(name.value).toBe("Bozza locale");
    expect(f.saveStore).toHaveBeenCalledTimes(1);
    expect(domScreen.queryByText("Configurazione salvata.")).toBeNull();
  });
});
