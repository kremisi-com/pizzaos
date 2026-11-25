import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { MenuAdminApi, MenuDraft, MenuWorkspace } from "@pizzaos/domain";
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

async function setup() {
  const draft: MenuDraft = { id: "draft", name: "Bozza", sections: [], products: [] };
  const workspace: MenuWorkspace = { revision: 1, published: { ...draft, id: "published" }, drafts: [draft] };
  const api: MenuAdminApi = {
    workspace: vi.fn().mockResolvedValue(workspace), saveDraft: vi.fn(),
    publish: vi.fn().mockResolvedValue({ ...workspace, revision: 2, published: draft, drafts: [] }),
    removeDraft: vi.fn(), uploadImage: vi.fn()
  };
  const onPublished = vi.fn();
  render(<OperationalCatalog api={api} storeId="store" ingredients={[]} onPublished={onPublished} />);
  fireEvent.change(await screen.findByRole("combobox", { name: "Menu da modificare" }), { target: { value: "draft" } });
  const trigger = screen.getByRole("button", { name: "Pubblica menu" });
  trigger.focus();
  fireEvent.click(trigger);
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
