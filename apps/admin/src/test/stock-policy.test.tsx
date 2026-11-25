import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { IndividualStore } from "@pizzaos/domain";
import { StoreConfiguration } from "../features/individual-ordering/components/store-configuration";
import { OperationalCatalog } from "../features/catalog/components/operational-catalog";

afterEach(cleanup);

const store: IndividualStore = {
  id: "store", name: "Sede", address: "Via Roma 1", latitude: 45, longitude: 9, acceptingOrders: true,
  ingredients: [{ id: "ingredient", name: "Pomodoro", stock: 0 }],
  products: [{ id: "product", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: { ingredient: 1 }, options: [] }],
  slots: [{ id: "slot", startsAt: "2030-01-01T19:00:00Z", capacity: 50 }], deliveryBands: [],
};

describe("configurazione e avvisi delle scorte", () => {
  it("il Profilo usa disable come default e applica la scelta soltanto al salvataggio", async () => {
    const onSave = vi.fn(async () => true);
    const onSearchAddress = vi.fn(async () => []);
    render(<StoreConfiguration store={store} isNew={false} section="profile" busy={false} onSearchAddress={onSearchAddress} onSave={onSave} />);
    const selector = screen.getByLabelText("Prodotti con ingredienti esauriti");
    expect((selector as HTMLSelectElement).value).toBe("disable");
    expect(screen.getByRole("option", { name: "Visibili e ordinabili" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Visibili con Esaurito" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Nascosti" })).toBeDefined();
    fireEvent.change(selector, { target: { value: "allow" } });
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Salva configurazione" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ outOfStockBehavior: "allow" }), expect.anything(), undefined));
    expect(onSearchAddress).not.toHaveBeenCalled();
  });

  it("il Profilo mostra la modalità salvata", () => {
    render(<StoreConfiguration store={{ ...store, outOfStockBehavior: "hide" }} isNew={false} section="profile" busy={false} onSearchAddress={async () => []} onSave={async () => true} />);
    expect((screen.getByLabelText("Prodotti con ingredienti esauriti") as HTMLSelectElement).value).toBe("hide");
  });

  it("Magazzino non espone il selettore della policy", () => {
    render(<StoreConfiguration store={store} isNew={false} section="inventory" busy={false} onSearchAddress={async () => []} onSave={async () => true} />);
    expect(screen.queryByLabelText("Prodotti con ingredienti esauriti")).toBeNull();
  });

  it("il Menu operatore avvisa degli ingredienti zero in allow", async () => {
    const draft = { id: "draft", name: "Menu", sections: [{ id: "section", name: "Pizze", productIds: ["product"] }], products: store.products };
    const workspace = { revision: 1, published: draft, drafts: [] };
    const api: ComponentProps<typeof OperationalCatalog>["api"] = {
      workspace: vi.fn(async () => workspace),
      saveDraft: vi.fn(async () => workspace),
      removeDraft: vi.fn(async () => workspace),
      publish: vi.fn(async () => workspace),
      uploadImage: vi.fn(async () => { throw new Error("Caricamento immagini inatteso in questo scenario"); }),
    };
    render(<OperationalCatalog api={api} storeId="store" ingredients={store.ingredients} onPublished={() => undefined} outOfStockBehavior="allow" />);
    await waitFor(() => expect(screen.getAllByRole("alert").some((alert) => alert.textContent?.includes("Pomodoro"))).toBe(true));
  });
});
