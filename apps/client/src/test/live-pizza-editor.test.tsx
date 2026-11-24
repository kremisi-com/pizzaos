import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPizzaCatalog, materializePizzaMenu, type IndividualProduct, type IndividualStore, type PizzaComponent, type PizzaEntry } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { LivePizzaEditor } from "../features/customization";

function fixture() {
  const component = (id: string, name: string, priceCents = 0): PizzaComponent => ({
    id, name, description: "", priceCents, available: true, ingredients: {}
  });
  const standard: PizzaEntry = {
    id: "margherita", name: "Margherita", description: "Pomodoro e mozzarella", priceCents: 600, available: true,
    standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "standard",
    doughIds: ["classico", "integrale"], baseIds: ["rossa", "bianca"], formatIds: ["standard"], toppingIds: ["mozzarella", "basilico"]
  };
  const catalog = emptyPizzaCatalog();
  catalog.doughs = [component("classico", "Classico"), component("integrale", "Integrale", 120)];
  catalog.bases = [{ ...component("rossa", "Rossa"), imagePath: "/images/pizza/rossa-classica.png" }, component("bianca", "Bianca")];
  catalog.formats = [component("standard", "Classica 32 cm")];
  catalog.toppings = [
    { ...component("mozzarella", "Mozzarella", 200), category: "Latticini", ingredients: { latte: 1 } },
    { ...component("basilico", "Basilico", 100), category: "Vegetali", ingredients: { basilico: 1 } }
  ];
  catalog.tastes = [{ ...standard, includedToppingIds: ["mozzarella"], toppingImagePath: "/images/topping/margherita.png",
    previewImages: [{ doughId: "integrale", baseId: "rossa", imagePath: "/images/pizza/rossa-integrale.png" }] }];
  catalog.formulas = [{ ...standard, id: "wild", name: "Wild", offer: "Wild" }];
  const menu = materializePizzaMenu({ id: "menu", name: "Menu", sections: [], products: [], pizzaCatalog: catalog });
  const store: IndividualStore = { id: "store", name: "Sede", latitude: 0, longitude: 0, acceptingOrders: true,
    deliveryBands: [], ingredients: [], products: menu.products, slots: [], menu };
  return { store, taste: menu.products.find(product => product.id === "margherita") as IndividualProduct,
    formula: menu.products.find(product => product.id === "wild") as IndividualProduct };
}

beforeEach(() => {
  cleanupDom();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value() { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value() { this.removeAttribute("open"); } });
});

describe("persistent pizza editor using the PoC presentation", () => {
  it("keeps the PoC sections and standard selections and saves a typed taste line", () => {
    const { store, taste } = fixture();
    const save = vi.fn();
    renderDom(<LivePizzaEditor store={store} product={taste} disabled={false} avoid={[]} onClose={vi.fn()} onSave={save} />);
    expect(domScreen.getByRole("dialog", { name: "Margherita" }).parentElement).toBe(document.body);
    for (const name of ["Impasto", "Base", "Formato", "Ingredienti", "Extra", "Note per la cucina"]) {
      expect(domScreen.getByRole("heading", { name }).textContent).toBe(name);
    }
    expect(domScreen.getByRole("img", { name: "Anteprima pizza Margherita" }).getAttribute("src")).toBe("/images/pizza/rossa-classica.png");
    domFireEvent.click(domScreen.getByRole("heading", { name: "Impasto" }).closest("button") as HTMLButtonElement);
    domFireEvent.click(domScreen.getByRole("radio", { name: /Integrale/ }));
    expect(domScreen.getByRole("img", { name: "Anteprima pizza Margherita" }).getAttribute("src")).toBe("/images/pizza/rossa-integrale.png");
    expect(document.querySelector('[src="/images/topping/margherita.png"]')).not.toBeNull();
    domFireEvent.change(domScreen.getByLabelText("Messaggio opzionale"), { target: { value: "Ben cotta" } });
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("7,20");
    domFireEvent.click(domScreen.getByRole("button", { name: /Aggiungi al carrello/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ productId: taste.id, kind: "pizza_taste", notes: "Ben cotta",
      selections: expect.arrayContaining([{ optionId: "dough:integrale", quantity: 1 }]) }));
  });

  it("removes included toppings without changing price, and extra restores that topping", () => {
    const { store, taste } = fixture();
    const save = vi.fn();
    renderDom(<LivePizzaEditor store={store} product={taste} disabled={false} avoid={[]} onClose={vi.fn()} onSave={save} />);
    domFireEvent.click(domScreen.getByRole("heading", { name: "Ingredienti" }).closest("button") as HTMLButtonElement);
    domFireEvent.click(domScreen.getByRole("button", { name: "Mozzarella incluso" }));
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("6,00");
    domFireEvent.click(domScreen.getByRole("button", { name: "Mozzarella extra" }));
    expect(domScreen.getAllByRole("button", { name: "Mozzarella incluso" }).every(button => button.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("8,00");
    domFireEvent.click(domScreen.getByRole("button", { name: /Aggiungi al carrello/ }));
    expect(save.mock.calls[0][0].selections).toContainEqual({ optionId: "extra:mozzarella", quantity: 1 });
    expect(save.mock.calls[0][0].selections).not.toContainEqual({ optionId: "remove:mozzarella", quantity: 1 });
  });

  it("starts a formula without taste and discounts repeated extra units", () => {
    const { store, formula } = fixture();
    const save = vi.fn();
    renderDom(<LivePizzaEditor store={store} product={formula} disabled={false} avoid={[]} onClose={vi.fn()} onSave={save} />);
    domFireEvent.click(domScreen.getByRole("heading", { name: "Ingredienti" }).closest("button") as HTMLButtonElement);
    expect(domScreen.getByText("Nessun ingrediente del gusto predefinito.")).toBeTruthy();
    domFireEvent.click(domScreen.getByRole("heading", { name: "Extra" }).closest("button") as HTMLButtonElement);
    domFireEvent.click(domScreen.getByRole("heading", { name: "Latticini" }).closest("button") as HTMLButtonElement);
    domFireEvent.click(domScreen.getByRole("button", { name: "Mozzarella escluso" }));
    domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi Mozzarella" }));
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("8,40");
    domFireEvent.click(domScreen.getByRole("button", { name: /Aggiungi al carrello/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ kind: "pizza_formula",
      selections: expect.arrayContaining([{ optionId: "extra:mozzarella", quantity: 2 }]) }));
  });

  it("preserves edit quantity and notes and rejects disappeared selections", () => {
    const { store, taste } = fixture();
    const save = vi.fn();
    renderDom(<LivePizzaEditor store={store} product={taste} disabled={false} avoid={[]} onClose={vi.fn()} onSave={save}
      line={{ productId: taste.id, quantity: 3, notes: "Tagliata", optionIds: [], selections: [
        ...taste.pizza!.defaultSelections, { optionId: "missing", quantity: 1 }
      ] }} />);
    expect(domScreen.getByLabelText("Messaggio opzionale").getAttribute("maxlength")).toBe("500");
    expect(domScreen.getByRole("button", { name: /Aggiorna scelta/ }).hasAttribute("disabled")).toBe(true);
    expect(domScreen.getByText("Alcune opzioni sono cambiate. Controlla le nuove scelte.")).toBeTruthy();
    expect(save).not.toHaveBeenCalled();
    domFireEvent.click(domScreen.getByRole("button", { name: "Riparti dalle scelte standard" }));
    domFireEvent.click(domScreen.getByRole("button", { name: /Aggiorna scelta/ }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3, notes: "Tagliata" }));
  });
});
