import { beforeEach, expect, it, vi } from "vitest";
import { materializeSandwich, type IndividualLine, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, domWithin, renderDom } from "@pizzaos/testing";
import { MenuLineEditor, OperationalMenu } from "../features/menu";
import { appendMenuLine } from "../features/menu/live-menu-model";
import { copyIndividualCart, isIndividualCart, readIndividualDraft, writeIndividualDraft } from "../features/individual-ordering/draft";

const base: IndividualProduct = { id: "panino", productType: "sandwich", name: "Panino", description: "", priceCents: 900, available: true,
  ingredients: { pane: 1, pomodoro: 1 }, allergens: [], options: [], foodIngredients: [{ id: "pane", name: "Pane" }, { id: "pomodoro", name: "Pomodoro" }], baseIngredientIds: ["pane", "pomodoro"] };
const water: IndividualProduct = { ...base, id: "acqua", productType: "product", name: "Acqua", ingredients: {}, foodIngredients: [], baseIngredientIds: [] };
const meal: IndividualProduct = { ...water, id: "menu", productType: "meal", name: "Menu pranzo", priceCents: 1200,
  meal: { steps: [{ id: "portata", name: "Portata", alternatives: [{ productId: "panino", priceCents: 0 }] },
    { id: "bibita", name: "Bibita", alternatives: [{ productId: "acqua", priceCents: -50 }] }] } };
const store: IndividualStore = { id: "sede", name: "Sede", latitude: 0, longitude: 0, acceptingOrders: true, ingredients: [], slots: [], deliveryBands: [], products: [base, water, meal] };
beforeEach(cleanupDom);

it("customizes a sandwich with removals and common extras without pizza dimensions or terminology", () => {
  const sandwich = materializeSandwich(base, [{ id: "pane", name: "Pane", stock: null }, { id: "pomodoro", name: "Pomodoro", stock: null },
    { id: "formaggio", name: "Formaggio", stock: 10, extra: { enabled: true, priceCents: 200, dose: 1 } }]);
  const onSave = vi.fn();
  renderDom(<MenuLineEditor store={{ ...store, products: [sandwich] }} product={sandwich} avoid={[]} onSave={onSave} />);
  domFireEvent.click(domScreen.getByRole("button", { name: "Personalizza Panino" }));
  domFireEvent.click(domScreen.getByRole("button", { name: /^Ingredienti/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Pomodoro incluso" }));
  domFireEvent.click(domScreen.getByRole("button", { name: /^Extra/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Formaggio escluso" }));
  domFireEvent.change(domScreen.getByLabelText("Messaggio opzionale"), { target: { value: "Tostato" } });
  expect(domScreen.queryByText("Impasto")).toBeNull();
  expect(domScreen.queryByText("Formato")).toBeNull();
  expect(domScreen.queryByText(/pizza/i)).toBeNull();
  domFireEvent.click(domScreen.getByRole("button", { name: /Aggiungi al carrello/ }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ productId: base.id, notes: "Tostato", selections: [
    { optionId: sandwich.options.find(option => option.removesIngredientIds?.includes("pomodoro"))!.id, quantity: 1 },
    { optionId: sandwich.options.find(option => option.name === "Formaggio")!.id, quantity: 1 }
  ] }));
});

it("preserves different Menu compositions in cart identity, storage and editing", () => {
  const first: IndividualLine = { productId: "menu", quantity: 1, optionIds: [], notes: "", mealSelections: [
    { stepId: "portata", productId: "panino", removedIngredientIds: ["pomodoro"], notes: "Caldo" },
    { stepId: "bibita", productId: "acqua", removedIngredientIds: [], notes: "" }
  ] };
  const next = { ...first, mealSelections: first.mealSelections!.map(item => ({ ...item, notes: "Diversa" })) };
  expect(appendMenuLine([first], next)).toHaveLength(2);
  const cart = { storeId: "sede", mode: "pickup" as const, slotId: null, notes: "", lines: [first] };
  expect(copyIndividualCart(cart)).toEqual(cart);
  expect(isIndividualCart(cart)).toBe(true);
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const now = new Date("2026-11-26T10:00:00Z");
  writeIndividualDraft(storage, cart, now);
  expect(readIndividualDraft(storage, now)).toEqual(cart);
  expect(appendMenuLine([first], { ...first, mealSelections: first.mealSelections!.map((item, index) => index === 0 ? { ...item, removedIngredientIds: [] } : item) })).toHaveLength(2);
  expect(appendMenuLine([first], { ...first, mealSelections: first.mealSelections!.map((item, index) => index === 0 ? { ...item, productId: "altro-panino" } : item) })).toHaveLength(2);
  expect(appendMenuLine([first], structuredClone(first))).toMatchObject([{ quantity: 2 }]);
  const onSave = vi.fn();
  renderDom(<MenuLineEditor store={store} product={meal} line={first} avoid={[]} onSave={onSave} />);
  domFireEvent.click(domScreen.getByRole("button", { name: "Modifica Menu pranzo" }));
  domFireEvent.click(domScreen.getByRole("button", { name: /Aggiorna scelta/ }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mealSelections: first.mealSelections }));
});


function phase(name: string) {
  return domWithin(domScreen.getByRole("radiogroup", { name }).parentElement!);
}
function header(name: string) { return domScreen.getByRole("button", { name: new RegExp(`^${name} `) }); }
function show(name: string) {
  const button = header(name);
  if (button.getAttribute("aria-expanded") !== "true") domFireEvent.click(button);
}
function menuView(products = store.products, product = meal, line?: IndividualLine) {
  const onSave = vi.fn();
  const view = renderDom(<MenuLineEditor store={{ ...store, products }} product={product} line={line} avoid={[]} onSave={onSave} />);
  domFireEvent.click(domScreen.getByRole("button", { name: `${line ? "Modifica" : "Personalizza"} ${product.name}` }));
  return { onSave, view };
}

it("espande le fasi dopo la scelta e salva ingredienti, note della fase e note finali", () => {
  const { onSave } = menuView();
  expect(header("Portata").getAttribute("aria-expanded")).toBe("true");
  expect((domScreen.getByRole("button", { name: /Aggiungi al carrello/ }) as HTMLButtonElement).disabled).toBe(true);
  domFireEvent.click(phase("Portata").getByRole("radio", { name: /Panino/ }));
  expect(header("Portata").getAttribute("aria-expanded")).toBe("false");
  expect(header("Bibita").getAttribute("aria-expanded")).toBe("true");
  show("Portata");
  const main = phase("Portata");
  domFireEvent.click(main.getByRole("button", { name: "Pomodoro incluso" }));
  domFireEvent.change(main.getByLabelText("Note per la cucina"), { target: { value: "Ben caldo" } });
  show("Bibita");
  domFireEvent.click(phase("Bibita").getByRole("radio", { name: /Acqua/ }));
  expect(phase("Bibita").queryByRole("button", { pressed: true })).toBeNull();
  domFireEvent.change(phase("Bibita").getByLabelText("Note per la cucina"), { target: { value: "Fredda" } });
  domFireEvent.change(domScreen.getByLabelText("Messaggio opzionale"), { target: { value: "Da dividere" } });
  expect(domScreen.getByTestId("customization-total-value").textContent).toMatch(/11,50/);
  expect(domScreen.queryByRole("button", { name: "Scelta Successiva" })).toBeNull();
  expect(domScreen.queryByRole("button", { name: "Indietro" })).toBeNull();
  domFireEvent.click(domScreen.getByRole("button", { name: /Aggiungi al carrello/ }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ notes: "Da dividere", mealSelections: [
    { stepId: "portata", productId: "panino", removedIngredientIds: ["pomodoro"], notes: "Ben caldo" },
    { stepId: "bibita", productId: "acqua", removedIngredientIds: [], notes: "Fredda" }
  ] }));
});

it("conserva le altre fasi e ripristina solo ingredienti e note della scelta sostituita", () => {
  const alternate = { ...base, id: "altro", name: "Altro panino" };
  const configured = { ...meal, meal: { steps: meal.meal!.steps.map((step, index) => index === 0
    ? { ...step, alternatives: [...step.alternatives, { productId: alternate.id, priceCents: 50 }] } : step) } };
  const { onSave } = menuView([base, water, alternate, configured], configured);
  domFireEvent.click(phase("Portata").getByRole("radio", { name: /^Panino/ }));
  show("Portata");
  domFireEvent.click(phase("Portata").getByRole("button", { name: "Pomodoro incluso" }));
  domFireEvent.change(phase("Portata").getByLabelText("Note per la cucina"), { target: { value: "Prima nota" } });
  show("Bibita");
  domFireEvent.click(phase("Bibita").getByRole("radio", { name: /Acqua/ }));
  domFireEvent.change(phase("Bibita").getByLabelText("Note per la cucina"), { target: { value: "Fredda" } });
  show("Portata");
  expect(phase("Portata").getByRole("button", { name: "Pomodoro escluso" })).toBeTruthy();
  domFireEvent.click(phase("Portata").getByRole("radio", { name: /Altro panino/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: /Aggiungi al carrello/ }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mealSelections: [
    { stepId: "portata", productId: "altro", removedIngredientIds: [], notes: "" },
    { stepId: "bibita", productId: "acqua", removedIngredientIds: [], notes: "Fredda" }
  ] }));
});

it("recupera fasi obsolete con conferma esplicita senza mutare la riga", () => {
  const line: IndividualLine = { productId: meal.id, quantity: 2, optionIds: [], notes: "Nota finale", mealSelections: [
    { stepId: "fase-rimossa", productId: base.id, removedIngredientIds: [], notes: "" }
  ] };
  const { onSave } = menuView(store.products, meal, line);
  expect(domScreen.getAllByRole("status").some(node => /scelte del Menu non sono/.test(node.textContent ?? ""))).toBe(true);
  domFireEvent.click(phase("Portata").getByRole("radio", { name: /Panino/ }));
  domFireEvent.click(phase("Bibita").getByRole("radio", { name: /Acqua/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Conferma modifica" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2, notes: "Nota finale", mealSelections: [
    { stepId: "portata", productId: base.id, removedIngredientIds: [], notes: "" },
    { stepId: "bibita", productId: water.id, removedIngredientIds: [], notes: "" }
  ] }));
  expect(line.mealSelections![0].stepId).toBe("fase-rimossa");
});

it("mostra solo gli abbinamenti del Menu completo dopo le fasi e prima delle note finali", () => {
  const drink = { ...water, id: "birra", name: "Birra" };
  const hidden = { ...water, id: "dolce", name: "Dolce" };
  const configured = { ...meal, pairingProductIds: [drink.id] };
  const onAdd = vi.fn();
  renderDom(<OperationalMenu store={{ ...store, products: [{ ...base, pairingProductIds: [hidden.id] }, water, drink, hidden, configured] }}
    preferences={{ avoid: [], busy: false, message: "", authenticated: false, available: true, retry: vi.fn(), save: vi.fn() }} onAdd={onAdd} />);
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi Menu pranzo" }));
  domFireEvent.click(phase("Portata").getByRole("radio", { name: /Panino/ }));
  domFireEvent.click(phase("Bibita").getByRole("radio", { name: /Acqua/ }));
  domFireEvent.change(domScreen.getByLabelText("Messaggio opzionale"), { target: { value: "Nota finale" } });
  const pairing = domScreen.getByRole("region", { name: "Abbinamenti consigliati" });
  expect(header("Bibita").compareDocumentPosition(pairing) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(pairing.compareDocumentPosition(domScreen.getByLabelText("Messaggio opzionale")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(domWithin(pairing).queryByText("Dolce")).toBeNull();
  domFireEvent.click(domWithin(pairing).getByRole("button", { name: "Aggiungi Birra al carrello" }));
  expect(onAdd).toHaveBeenCalledWith({ productId: "birra", quantity: 1, optionIds: [], notes: "" });
  expect((domScreen.getByLabelText("Messaggio opzionale") as HTMLTextAreaElement).value).toBe("Nota finale");
  domFireEvent.click(domScreen.getByRole("button", { name: /[0-9].*Aggiungi al carrello/ }));
  expect(onAdd).toHaveBeenLastCalledWith(expect.objectContaining({ productId: meal.id, notes: "Nota finale", mealSelections: expect.any(Array) }));
});


it("chiudere la composizione modificata non salva note o selezioni", () => {
  const line: IndividualLine = { productId: meal.id, quantity: 2, optionIds: [], notes: "Nota originale", mealSelections: [
    { stepId: "portata", productId: base.id, removedIngredientIds: [], notes: "" },
    { stepId: "bibita", productId: water.id, removedIngredientIds: [], notes: "" }
  ] };
  const original = structuredClone(line);
  const { onSave } = menuView(store.products, meal, line);
  domFireEvent.click(phase("Portata").getByRole("button", { name: "Pomodoro incluso" }));
  domFireEvent.change(domScreen.getByLabelText("Messaggio opzionale"), { target: { value: "Nuova nota" } });
  domFireEvent.click(domScreen.getByRole("button", { name: "Chiudi personalizzazione" }));
  expect(onSave).not.toHaveBeenCalled();
  expect(line).toEqual(original);
  expect(domScreen.queryByRole("dialog")).toBeNull();
});
