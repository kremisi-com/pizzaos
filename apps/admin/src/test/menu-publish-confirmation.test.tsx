import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { emptyPizzaCatalog, syncPizzaInventory } from "@pizzaos/domain";
import type { IndividualIngredient, MenuAdminApi, MenuDraft, MenuWorkspace } from "@pizzaos/domain";
import { OperationalCatalog } from "../features/catalog/components/operational-catalog";

// JSDOM does not implement the native dialog lifecycle.
const dialogMethods = Object.getOwnPropertyDescriptors(HTMLDialogElement.prototype);
beforeAll(() => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } }
  });
});
afterEach(cleanup);
afterAll(() => {
  for (const name of ["showModal", "close"]) {
    if (dialogMethods[name]) Object.defineProperty(HTMLDialogElement.prototype, name, dialogMethods[name]);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name);
  }
});

async function setup(options: { draft?: MenuDraft; ingredients?: IndividualIngredient[]; loadIngredients?: (id: string) => Promise<readonly IndividualIngredient[]>; waitReview?: boolean } = {}) {
  const draft: MenuDraft = options.draft ?? { id: "draft", name: "Bozza", sections: [], products: [] };
  const workspace: MenuWorkspace = { revision: 1, published: { ...draft, id: "published" }, drafts: [draft] };
  const api: MenuAdminApi = {
    workspace: vi.fn().mockResolvedValue(workspace), saveDraft: vi.fn().mockImplementation(async (_id, _revision, saved: MenuDraft) => ({ ...workspace, revision: 2, drafts: [saved] })),
    publish: vi.fn().mockResolvedValue({ ...workspace, revision: 2, published: draft, drafts: [] }),
    removeDraft: vi.fn(), uploadImage: vi.fn()
  };
  const onPublished = vi.fn();
  render(<OperationalCatalog api={api} storeId="store" ingredients={options.ingredients ?? []} loadIngredients={options.loadIngredients} onPublished={onPublished} />);
  fireEvent.change(await screen.findByRole("combobox", { name: "Menu da modificare" }), { target: { value: "draft" } });
  const trigger = screen.getByRole("button", { name: "Pubblica menu" });
  trigger.focus();
  fireEvent.click(trigger);
  if (options.waitReview !== false) await waitFor(() => expect(screen.getByRole("button", { name: "Conferma pubblicazione" })).toBeEnabled());
  return { api, onPublished, trigger, dialog: screen.getByRole("dialog", { name: "Pubblicare Bozza?" }) };
}

describe("conferma pubblicazione menu", () => {
  it.each(["Annulla", "Escape"])("apre un modal e chiude con %s senza pubblicare", async action => {
    const { api, dialog, trigger } = await setup();
    expect(dialog).toHaveAttribute("open");
    expect(dialog).toHaveAccessibleDescription("Questo menu diventerà visibile ai clienti della sede.");
    expect(api.publish).not.toHaveBeenCalled();
    if (action === "Annulla") fireEvent.click(within(dialog).getByRole("button", { name: "Annulla" }));
    else fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(api.publish).not.toHaveBeenCalled();
  });

  it("pubblica solo alla conferma e blocca invii ripetuti durante la richiesta", async () => {
    const { api, dialog, onPublished } = await setup();
    let finish!: (value: MenuWorkspace) => void;
    vi.mocked(api.publish).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const confirm = within(dialog).getByRole("button", { name: "Conferma pubblicazione" });
    fireEvent.click(confirm);
    expect(api.publish).toHaveBeenCalledWith("store", 1, "draft");
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(dialog).toHaveAttribute("open");
    expect(api.publish).toHaveBeenCalledTimes(1);
    finish({ revision: 2, published: { id: "draft", name: "Bozza", sections: [], products: [] }, drafts: [] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onPublished).toHaveBeenCalledTimes(1);
  });

  it("mantiene il modal aperto e mostra l'errore al suo interno per riprovare", async () => {
    const { api, dialog, onPublished } = await setup();
    vi.mocked(api.publish).mockRejectedValueOnce(new Error("Connessione non disponibile"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Connessione non disponibile");
    expect(onPublished).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onPublished).toHaveBeenCalledTimes(1);
  });
});

const olive: IndividualIngredient = { id: "olive", name: "Olive", stock: 10,
  extra: { enabled: true, priceCents: 100, dose: 1 }, food: { contains: [], mayContain: [] } };
const mushroom: IndividualIngredient = { ...olive, id: "funghi", name: "Funghi" };
function pizzaDraft() {
  return syncPizzaInventory({ id: "draft", name: "Bozza", sections: [], products: [], pizzaCatalog: emptyPizzaCatalog() }, [olive, mushroom]);
}

describe("pubblicazione con extra aggiornati", () => {
  it("attende il Magazzino corrente e permette di riprovare una lettura fallita", async () => {
    const loadIngredients = vi.fn().mockRejectedValueOnce(new Error("Magazzino non disponibile")).mockResolvedValue([olive]);
    const { api, dialog } = await setup({ draft: pizzaDraft(), loadIngredients, waitReview: false });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Magazzino non disponibile");
    expect(within(dialog).getByRole("button", { name: "Conferma pubblicazione" })).toBeDisabled();
    expect(api.saveDraft).not.toHaveBeenCalled();
    expect(api.publish).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Ricontrolla modifiche" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Conferma pubblicazione" })).toBeEnabled());
    expect(loadIngredients).toHaveBeenCalledTimes(2);
  });

  it("mostra aggiunte, rimozioni, prezzo, dose e allergeni dal Magazzino corrente e salva solo alla conferma", async () => {
    const changed = { ...olive, name: "Olive nere", extra: { enabled: true, priceCents: 150, dose: 2 }, food: { contains: ["Latte"], mayContain: ["Soia"] } };
    const latest = [changed, { ...mushroom, id: "mais", name: "Mais" }];
    const loadIngredients = vi.fn().mockResolvedValue(latest);
    const draft = pizzaDraft();
    const { api, dialog, onPublished } = await setup({ draft, ingredients: [olive, mushroom], loadIngredients });
    expect(loadIngredients).toHaveBeenCalledWith("store");
    const changes = within(dialog).getByRole("region", { name: "Modifiche agli extra" });
    expect(changes).toHaveTextContent("Olive → Olive nere");
    expect(changes).toHaveTextContent("1,50");
    expect(changes).toHaveTextContent("Dose 2");
    expect(changes).toHaveTextContent("Contiene: Latte");
    expect(changes).toHaveTextContent("Può contenere: Soia");
    expect(changes).toHaveTextContent("Funghi: rimosso dagli extra");
    expect(changes).toHaveTextContent("Mais: aggiunto");
    expect(api.saveDraft).not.toHaveBeenCalled();
    expect(api.publish).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
    expect(api.saveDraft).toHaveBeenCalledWith("store", 1, syncPizzaInventory(draft, latest));
    expect(api.publish).toHaveBeenCalledWith("store", 2, "draft");
  });

  it("annulla senza salvare gli extra né pubblicare", async () => {
    const { api, dialog } = await setup({ draft: pizzaDraft(), ingredients: [] });
    fireEvent.click(within(dialog).getByRole("button", { name: "Annulla" }));
    expect(api.saveDraft).not.toHaveBeenCalled();
    expect(api.publish).not.toHaveBeenCalled();
  });

  it("non salva nuovamente una bozza con firma corrente quando cambiano solo le scorte", async () => {
    const { api, dialog } = await setup({ draft: pizzaDraft(), ingredients: [{ ...olive, stock: 0 }, mushroom] });
    expect(within(dialog).queryByRole("region", { name: "Modifiche agli extra" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith("store", 1, "draft"));
    expect(api.saveDraft).not.toHaveBeenCalled();
  });

  it("non pubblica se il salvataggio fallisce e permette di riprovare", async () => {
    const { api, dialog } = await setup({ draft: pizzaDraft(), ingredients: [] });
    vi.mocked(api.saveDraft).mockRejectedValueOnce(new Error("Connessione non disponibile"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Connessione non disponibile");
    expect(api.publish).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    await waitFor(() => expect(api.publish).toHaveBeenCalledWith("store", 2, "draft"));
  });

  it("richiede un nuovo controllo se il servizio salva extra diversi da quelli confermati", async () => {
    const { api, dialog } = await setup({ draft: pizzaDraft(), ingredients: [] });
    vi.mocked(api.saveDraft).mockResolvedValueOnce({ revision: 2, published: pizzaDraft(), drafts: [pizzaDraft()] });
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Gli extra sono cambiati durante la conferma");
    expect(api.publish).not.toHaveBeenCalled();
    expect(within(dialog).getByRole("button", { name: "Conferma pubblicazione" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Ricontrolla modifiche" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Conferma pubblicazione" })).toBeEnabled());
    expect(within(dialog).getByRole("region", { name: "Modifiche agli extra" })).toBeInTheDocument();
  });

  it("conserva il blocco del servizio per dati incompleti e ritenta con la revisione salvata", async () => {
    const { api, dialog, onPublished } = await setup({ draft: pizzaDraft(), ingredients: [{ ...olive, extra: { enabled: true, priceCents: null, dose: null } }] });
    vi.mocked(api.publish).mockRejectedValueOnce(new Error("«Olive»: verifica prezzo e dose extra nel Magazzino prima di pubblicare."));
    expect(within(dialog).getByRole("region", { name: "Modifiche agli extra" })).toHaveTextContent("Prezzo da verificare · Dose da verificare");
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("verifica prezzo e dose");
    expect(onPublished).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Conferma pubblicazione" }));
    await waitFor(() => expect(onPublished).toHaveBeenCalledOnce());
    expect(api.saveDraft).toHaveBeenCalledTimes(1);
    expect(api.publish).toHaveBeenLastCalledWith("store", 2, "draft");
  });
});
