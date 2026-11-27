import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPizzaCatalog, materializePizzaMenu, type IndividualCart, type IndividualLine, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
import { MenuLineEditor } from "../features/menu";
import { LivePizzaEditor } from "../features/customization";
import { IndividualCartScreen } from "../features/cart";
import { readIndividualDraft, writeIndividualDraft } from "../features/individual-ordering/draft";

const extra = { id: "olive", name: "Olive", priceCents: 100, available: true, ingredients: {} };
const generic: IndividualProduct = { id: "prodotto", name: "Prodotto", description: "", priceCents: 700, available: true, allergens: [], ingredients: {}, options: [] };
const oldLine = (): IndividualLine => ({ productId: generic.id, quantity: 2, optionIds: [extra.id], notes: "Ben cotta" });
function storeFor(products: IndividualProduct[]): IndividualStore {
  return { id: "sede", name: "Sede", latitude: 0, longitude: 0, acceptingOrders: true, ingredients: [], deliveryBands: [], slots: [], products };
}
function recoveryNotice() {
  const notices = [...domScreen.queryAllByRole("alert"), ...domScreen.queryAllByRole("status")];
  expect(notices.some(node => /rimo|eliminat|esaurit|non.*disponibil/i.test(node.textContent ?? ""))).toBe(true);
}
function confirm() { return domScreen.getByRole("button", { name: "Conferma modifica" }); }
function openGeneric(product: IndividualProduct, line: IndividualLine, save = vi.fn()) {
  const view = renderDom(<MenuLineEditor store={storeFor([product])} product={product} line={line} avoid={[]} onSave={save} />);
  domFireEvent.click(domScreen.getByRole("button", { name: `Modifica ${product.name}` }));
  return { view, save };
}
function pizzaFixture() {
  const component = (id: string, name: string, priceCents = 0) => ({ id, name, priceCents, description: "", available: true, ingredients: {} });
  const catalog = emptyPizzaCatalog();
  catalog.doughs = [component("classico", "Classico"), component("integrale", "Integrale", 100)];
  catalog.bases = [component("rossa", "Rossa")];
  catalog.formats = [component("tonda", "Tonda")];
  catalog.toppings = [{ ...component("olive", "Olive", 100), category: "Vegetali" }];
  catalog.tastes = [{ id: "pizza", name: "Margherita", description: "", priceCents: 700, available: true,
    standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda",
    doughIds: ["classico", "integrale"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: ["olive"], includedToppingIds: [] }];
  const menu = materializePizzaMenu({ id: "menu", name: "Menu", sections: [], products: [], pizzaCatalog: catalog });
  const product = menu.products.find(item => item.id === "pizza")!;
  const store = { ...storeFor(menu.products), menu };
  const line: IndividualLine = { productId: product.id, kind: "pizza_taste", quantity: 2, optionIds: [], notes: "Ben cotta",
    selections: [...product.pizza!.defaultSelections.map(selection => ({ ...selection })), { optionId: "extra:olive", quantity: 1 }] };
  return { store, product, line };
}

beforeEach(() => {
  cleanupDom();
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(cleanupDom);

describe("recupero esplicito delle personalizzazioni obsolete", () => {
  it.each(["removed", "unavailable"])("propone il generico senza extra %s e salva quantità e note senza mutare la riga", state => {
    const product = { ...generic, options: state === "removed" ? [] : [{ ...extra, available: false }] };
    const line = oldLine();
    const original = structuredClone(line);
    const { save } = openGeneric(product, line);
    recoveryNotice();
    expect(domScreen.getByRole("dialog").textContent).toMatch(/14,00/);
    expect(line).toEqual(original);
    expect(save).not.toHaveBeenCalled();
    expect((confirm() as HTMLButtonElement).disabled).toBe(false);
    domFireEvent.click(confirm());
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toMatchObject({ productId: generic.id, quantity: 2, notes: "Ben cotta", optionIds: [] });
    expect(save.mock.calls[0][0].selections ?? []).toEqual([]);
    expect(save.mock.calls[0][0]).not.toBe(line);
    expect(line).toEqual(original);
  });

  it("chiudere una proposta non chiama onSave né cambia gli array della riga originale", () => {
    const line = oldLine();
    const original = structuredClone(line);
    const { save } = openGeneric(generic, line);
    domFireEvent.click(domScreen.getByRole("button", { name: "Chiudi personalizzazione" }));
    expect(save).not.toHaveBeenCalled();
    expect(line).toEqual(original);
    expect(domScreen.queryByRole("dialog")).toBeNull();
  });

  it("un gruppo obbligatorio non sceglie automaticamente l'unica alternativa", () => {
    const product: IndividualProduct = { ...generic, options: [{ ...extra, id: "salsa", name: "Salsa" }],
      groups: [{ id: "salse", name: "Salse", kind: "selection", min: 1, max: 1, allowRepeat: false, optionIds: ["salsa"] }] };
    const { save } = openGeneric(product, oldLine());
    expect((confirm() as HTMLButtonElement).disabled).toBe(true);
    const choice = domScreen.getByRole("radio", { name: /Salsa/ }) as HTMLInputElement;
    expect(choice.checked).toBe(false);
    domFireEvent.click(choice);
    expect((confirm() as HTMLButtonElement).disabled).toBe(false);
    domFireEvent.click(confirm());
    expect(save.mock.calls[0][0].selections).toEqual([{ optionId: "salsa", quantity: 1 }]);
  });

  it("la pizza rimuove l'extra con la stessa conferma e conserva le scelte valide", () => {
    const { store, product, line } = pizzaFixture();
    const current = { ...product, options: product.options.filter(option => option.id !== "extra:olive") };
    const save = vi.fn();
    renderDom(<LivePizzaEditor store={store} product={current} line={line} disabled={false} avoid={[]} onClose={vi.fn()} onSave={save} />);
    recoveryNotice();
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("14,00");
    domFireEvent.click(confirm());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, notes: "Ben cotta", selections: product.pizza!.defaultSelections }));
    expect(line.selections).toContainEqual({ optionId: "extra:olive", quantity: 1 });
  });

  it("apre subito Impasto anche con un'unica alternativa e richiede una scelta esplicita", () => {
    const { store, product, line } = pizzaFixture();
    const current = { ...product, options: product.options.filter(option => option.id !== "dough:classico") };
    const save = vi.fn();
    renderDom(<LivePizzaEditor store={store} product={current} line={line} disabled={false} avoid={[]} onClose={vi.fn()} onSave={save} />);
    const choice = domScreen.getByRole("radio", { name: /Integrale/ }) as HTMLInputElement;
    expect(choice.checked).toBe(false);
    expect(domScreen.getByRole("button", { name: /^Impasto/ }).getAttribute("aria-expanded")).toBe("true");
    expect((confirm() as HTMLButtonElement).disabled).toBe(true);
    domFireEvent.click(choice);
    expect((confirm() as HTMLButtonElement).disabled).toBe(false);
    domFireEvent.click(confirm());
    expect(save.mock.calls[0][0]).toMatchObject({ quantity: 2, notes: "Ben cotta", selections: expect.arrayContaining([
      { optionId: "dough:integrale", quantity: 1 }, { optionId: "base:rossa", quantity: 1 }, { optionId: "format:tonda", quantity: 1 }
    ]) });
  });

  it("aggiorna la proposta pizza al refresh del catalogo senza perdere note inserite o scelte valide", () => {
    const { store, product, line } = pizzaFixture();
    const save = vi.fn();
    const close = vi.fn();
    const view = renderDom(<LivePizzaEditor store={store} product={product} line={line} disabled={false} avoid={[]} onClose={close} onSave={save} />);
    domFireEvent.change(domScreen.getByLabelText("Messaggio opzionale"), { target: { value: "Tagliata" } });
    const current = { ...product, priceCents: 800, options: product.options.map(option => option.id === "extra:olive" ? { ...option, available: false } : option) };
    view.rerender(<LivePizzaEditor store={{ ...store, products: [current] }} product={current} line={line} disabled={false} avoid={[]} onClose={close} onSave={save} />);
    recoveryNotice();
    expect(domScreen.getByTestId("customization-total-value").textContent).toContain("16,00");
    domFireEvent.click(confirm());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ notes: "Tagliata", quantity: 2, selections: product.pizza!.defaultSelections }));
  });

  it("aggiorna anche il generico quando un extra scompare durante l'apertura", () => {
    const product = { ...generic, options: [extra] };
    const line = oldLine();
    const { view, save } = openGeneric(product, line);
    view.rerender(<MenuLineEditor store={storeFor([generic])} product={generic} line={line} avoid={[]} onSave={save} />);
    recoveryNotice();
    domFireEvent.click(confirm());
    expect(save.mock.calls[0][0]).toMatchObject({ optionIds: [], notes: "Ben cotta", quantity: 2 });
    expect(save.mock.calls[0][0].selections ?? []).toEqual([]);
  });

  it("rende modificabile dal carrello il prodotto senza opzioni e persiste solo la conferma", () => {
    const line = oldLine();
    const cart: IndividualCart = { storeId: "sede", mode: "pickup", slotId: null, notes: "", lines: [line] };
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
    const now = new Date("2026-11-26T12:00:00Z");
    writeIndividualDraft(storage, cart, now);
    const change = vi.fn((next: IndividualCart) => writeIndividualDraft(storage, next, now));
    renderDom(<IndividualCartScreen cart={cart} store={storeFor([generic])} avoid={[]} disabled={false} onChange={change} />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Modifica Prodotto" }));
    expect(readIndividualDraft(storage, now)).toEqual(cart);
    domFireEvent.click(domScreen.getByRole("button", { name: "Chiudi personalizzazione" }));
    expect(change).not.toHaveBeenCalled();
    domFireEvent.click(domScreen.getByRole("button", { name: "Modifica Prodotto" }));
    domFireEvent.click(confirm());
    expect(change).toHaveBeenCalledOnce();
    expect(readIndividualDraft(storage, now)?.lines[0]).toMatchObject({ optionIds: [], quantity: 2, notes: "Ben cotta" });
    expect(cart.lines[0].optionIds).toEqual([extra.id]);
  });

  it("apre la prima fase Menu non valida senza azzerare le altre fasi", () => {
    const main = { ...generic, id: "portata", name: "Portata" };
    const drink = { ...generic, id: "acqua", name: "Acqua" };
    const meal: IndividualProduct = { ...generic, id: "menu", name: "Menu pranzo", productType: "meal", meal: { steps: [
      { id: "primo", name: "Prima fase", alternatives: [{ productId: main.id, priceCents: 0 }] },
      { id: "secondo", name: "Seconda fase", alternatives: [{ productId: drink.id, priceCents: 0 }] }
    ] } };
    const valid = { stepId: "secondo", productId: drink.id, removedIngredientIds: [], notes: "Fredda" };
    const line: IndividualLine = { productId: meal.id, quantity: 2, optionIds: [], notes: "Ben cotta", mealSelections: [
      { stepId: "primo", productId: "eliminato", removedIngredientIds: [], notes: "" }, valid
    ] };
    const save = vi.fn();
    renderDom(<MenuLineEditor store={storeFor([main, drink, meal])} product={meal} line={line} avoid={[]} onSave={save} />);
    domFireEvent.click(domScreen.getByRole("button", { name: "Modifica Menu pranzo" }));
    const choice = domScreen.getByRole("radio", { name: /Portata/ }) as HTMLInputElement;
    expect(choice.checked).toBe(false);
    expect(save).not.toHaveBeenCalled();
    domFireEvent.click(choice);
    domFireEvent.click(domScreen.getByRole("button", { name: "Scelta Successiva" }));
    expect((domScreen.getByRole("radio", { name: /Acqua/ }) as HTMLInputElement).checked).toBe(true);
    domFireEvent.click(confirm());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, notes: "Ben cotta", mealSelections: [
      { stepId: "primo", productId: main.id, removedIngredientIds: [], notes: "" }, valid
    ] }));
    expect(line.mealSelections![0].productId).toBe("eliminato");
  });
});
