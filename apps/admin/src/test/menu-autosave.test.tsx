import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MenuAdminApi, MenuDraft, MenuWorkspace } from "@pizzaos/domain";
import { AdminToastContext } from "../features/notifications";
import { OperationalCatalog } from "../features/catalog/components/operational-catalog";

afterEach(cleanup);

function setup() {
  const draft: MenuDraft = { id: "draft", name: "Bozza", sections: [{ id: "section", name: "Piatti", productIds: ["product"] }],
    products: [{ id: "product", name: "Bibita", description: "", priceCents: 300, available: true, allergens: [], ingredients: {}, options: [] }] };
  const workspace: MenuWorkspace = { revision: 1, published: { ...draft, id: "published", name: "Pubblicato" }, drafts: [draft] };
  const saveDraft = vi.fn<MenuAdminApi["saveDraft"]>().mockImplementation(async (_store, revision, next) => ({ ...workspace, revision: revision + 1, drafts: [next] }));
  const api: MenuAdminApi = { workspace: vi.fn().mockResolvedValue(workspace), saveDraft,
    publish: vi.fn().mockResolvedValue(workspace), removeDraft: vi.fn().mockResolvedValue(workspace), uploadImage: vi.fn() };
  const showToast = vi.fn();
  render(<AdminToastContext.Provider value={{ showToast }}><OperationalCatalog api={api} storeId="store" ingredients={[]} onPublished={vi.fn()} /></AdminToastContext.Provider>);
  return { api, saveDraft, workspace, showToast };
}

async function openDraft() {
  fireEvent.change(await screen.findByRole("combobox", { name: "Menu da modificare" }), { target: { value: "draft" } });
}

describe("salvataggio automatico menu", () => {
  it("aggiunge impasti e formati e salva i nomi soltanto al blur", async () => {
    const { saveDraft, showToast } = setup();
    await openDraft();
    fireEvent.click(screen.getByRole("button", { name: /Impasti e formati/ }));
    for (const singular of ["impasto", "formato"]) {
      fireEvent.click(screen.getByRole("button", { name: `+ Aggiungi ${singular}` }));
      await waitFor(() => expect(screen.getByText("Bozza salvata")).toBeInTheDocument());
      const previous = saveDraft.mock.calls.length;
      showToast.mockClear();
      const input = screen.getByLabelText(`Nome ${singular}`);
      fireEvent.change(input, { target: { value: "C" } });
      fireEvent.change(input, { target: { value: "Classico" } });
      expect(saveDraft).toHaveBeenCalledTimes(previous);
      expect(showToast).not.toHaveBeenCalled();
      fireEvent.blur(input);
      await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(previous + 1));
      await waitFor(() => expect(showToast).toHaveBeenCalledWith("Bozza salvata.", "success"));
      expect(input).toHaveValue("Classico");
      expect(screen.queryByRole("alert")).toBeNull();
    }
    expect(saveDraft.mock.calls.at(-1)?.[2].pizzaCatalog?.doughs[0].name).toBe("Classico");
  });

  it("salva alla perdita del focus del prodotto senza pubblicare né chiudere la scheda", async () => {
    const { api, saveDraft, showToast } = setup();
    await openDraft();
    fireEvent.click(screen.getByRole("button", { name: "Modifica Bibita" }));
    expect(screen.queryByRole("button", { name: /Salva bozza|Salva prodotto|Salva pizza/ })).toBeNull();
    fireEvent.change(screen.getByLabelText(/^Nome prodotto/), { target: { value: "Aranciata" } });
    fireEvent.change(screen.getByLabelText(/^Nome prodotto/), { target: { value: "Aranciata rossa" } });
    expect(saveDraft).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    fireEvent.blur(screen.getByLabelText(/^Nome prodotto/));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(showToast).toHaveBeenCalledWith("Bozza salvata.", "success");
    expect(saveDraft.mock.calls[0][2].products[0].name).toBe("Aranciata rossa");
    await waitFor(() => expect(screen.getByRole("button", { name: "Pubblica menu" })).not.toBeDisabled());
    expect(screen.getByLabelText(/^Nome prodotto/)).toHaveValue("Aranciata rossa");
    expect(api.publish).not.toHaveBeenCalled();
  });

  it("mantiene editabili i campi e salva le modifiche successive con la revisione aggiornata", async () => {
    const { saveDraft, workspace } = setup();
    let resolveSave!: (value: MenuWorkspace) => void;
    saveDraft.mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    await openDraft();
    fireEvent.change(screen.getByLabelText("Nome menu"), { target: { value: "Prima modifica" } });
    fireEvent.blur(screen.getByLabelText("Nome menu"));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Nome menu")).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nome menu"), { target: { value: "Ultima modifica" } });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pubblica menu" })).toBeDisabled();
    resolveSave({ ...workspace, revision: 2, drafts: [saveDraft.mock.calls[0][2]] });
    await waitFor(() => expect(screen.getByText("Modifiche da salvare")).toBeInTheDocument());
    expect(saveDraft).toHaveBeenCalledTimes(1);
    fireEvent.blur(screen.getByLabelText("Nome menu"));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(saveDraft.mock.calls[1]).toEqual(["store", 2, expect.objectContaining({ name: "Ultima modifica" })]);
    await waitFor(() => expect(screen.getByRole("button", { name: "Pubblica menu" })).not.toBeDisabled());
    expect(screen.getByLabelText("Nome menu")).toHaveValue("Ultima modifica");
  });

  it("conserva i dati dopo un errore, evita retry continui e consente di riprovare", async () => {
    const { saveDraft } = setup();
    saveDraft.mockRejectedValueOnce(new Error("Connessione non disponibile"));
    await openDraft();
    fireEvent.change(screen.getByLabelText("Nome menu"), { target: { value: "Da conservare" } });
    fireEvent.blur(screen.getByLabelText("Nome menu"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connessione non disponibile");
    expect(screen.getByLabelText("Nome menu")).toHaveValue("Da conservare");
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Pubblica menu" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Riprova salvataggio" }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
