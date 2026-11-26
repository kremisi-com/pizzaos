import { beforeEach, expect, it, vi } from "vitest";
import { materializeSandwich, type IndividualLine, type IndividualProduct, type IndividualStore } from "@pizzaos/domain";
import { cleanupDom, domFireEvent, domScreen, renderDom } from "@pizzaos/testing";
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
  domFireEvent.click(domScreen.getByRole("checkbox", { name: /Senza Pomodoro/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi Formaggio" }));
  domFireEvent.change(domScreen.getByLabelText("Note per la cucina"), { target: { value: "Tostato" } });
  expect(domScreen.queryByText("Impasto")).toBeNull();
  expect(domScreen.queryByText("Formato")).toBeNull();
  expect(domScreen.queryByText(/pizza/i)).toBeNull();
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ productId: base.id, notes: "Tostato", selections: [
    { optionId: sandwich.options.find(option => option.removesIngredientIds?.includes("pomodoro"))!.id, quantity: 1 },
    { optionId: sandwich.options.find(option => option.name === "Formaggio")!.id, quantity: 1 }
  ] }));
});

it("guides required phases, allows only removals and kitchen notes, and saves the entire composition", () => {
  const onAdd = vi.fn();
  renderDom(<OperationalMenu store={store} preferences={{ avoid: [], busy: false, message: "", authenticated: false, available: true, retry: vi.fn(), save: vi.fn() }} onAdd={onAdd} />);
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi Menu pranzo" }));
  domFireEvent.click(domScreen.getByRole("radio", { name: /Panino/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Personalizza Panino" }));
  domFireEvent.click(domScreen.getByRole("checkbox", { name: "Pomodoro" }));
  domFireEvent.change(domScreen.getByLabelText("Note per la cucina"), { target: { value: "Ben caldo" } });
  expect(domScreen.queryByText("Extra")).toBeNull();
  expect(domScreen.queryByText("Impasto")).toBeNull();
  expect(domScreen.queryByText("Formato")).toBeNull();
  domFireEvent.click(domScreen.getByRole("button", { name: "Avanti" }));
  domFireEvent.click(domScreen.getByRole("radio", { name: /Acqua/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi" }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ productId: "menu", mealSelections: [
    { stepId: "portata", productId: "panino", removedIngredientIds: ["pomodoro"], notes: "Ben caldo" },
    { stepId: "bibita", productId: "acqua", removedIngredientIds: [], notes: "" }
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
  domFireEvent.click(domScreen.getByRole("button", { name: "Avanti" }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiorna scelta" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mealSelections: first.mealSelections }));
});

it("preserves previous phases and clears only the changed alternative's removals and notes", () => {
  const alternate = { ...base, id: "altro", name: "Altro panino" };
  const configured = { ...meal, meal: { steps: meal.meal!.steps.map((step, index) => index === 0
    ? { ...step, alternatives: [...step.alternatives, { productId: alternate.id, priceCents: 50 }] } : step) } };
  const onAdd = vi.fn();
  renderDom(<MenuLineEditor store={{ ...store, products: [base, water, alternate, configured] }} product={configured} avoid={[]} onSave={onAdd} />);
  domFireEvent.click(domScreen.getByRole("button", { name: "Personalizza Menu pranzo" }));
  domFireEvent.click(domScreen.getByRole("radio", { name: /^Panino/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Personalizza Panino" }));
  domFireEvent.click(domScreen.getByRole("checkbox", { name: "Pomodoro" }));
  domFireEvent.change(domScreen.getByLabelText("Note per la cucina"), { target: { value: "Prima nota" } });
  domFireEvent.click(domScreen.getByRole("button", { name: "Avanti" }));
  domFireEvent.click(domScreen.getByRole("radio", { name: /Acqua/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Personalizza Acqua" }));
  domFireEvent.change(domScreen.getByLabelText("Note per la cucina"), { target: { value: "Fredda" } });
  domFireEvent.click(domScreen.getByRole("button", { name: "Indietro" }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Personalizza Panino" }));
  expect((domScreen.getByRole("checkbox", { name: "Pomodoro" }) as HTMLInputElement).checked).toBe(false);
  expect((domScreen.getByLabelText("Note per la cucina") as HTMLTextAreaElement).value).toBe("Prima nota");
  domFireEvent.click(domScreen.getByRole("radio", { name: /Altro panino/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Avanti" }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiungi" }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ mealSelections: [
    { stepId: "portata", productId: "altro", removedIngredientIds: [], notes: "" },
    { stepId: "bibita", productId: "acqua", removedIngredientIds: [], notes: "Fredda" }
  ] }));
});

it("lets the customer explicitly reset removed phases rather than trapping an obsolete cart line", () => {
  const onSave = vi.fn();
  const line: IndividualLine = { productId: meal.id, quantity: 1, optionIds: [], notes: "", mealSelections: [
    { stepId: "fase-rimossa", productId: base.id, removedIngredientIds: [], notes: "" }
  ] };
  renderDom(<MenuLineEditor store={store} product={meal} line={line} avoid={[]} onSave={onSave} />);
  domFireEvent.click(domScreen.getByRole("button", { name: "Modifica Menu pranzo" }));
  expect(domScreen.getByText(/Alcune scelte del Menu sono cambiate/)).toBeTruthy();
  domFireEvent.click(domScreen.getByRole("button", { name: "Azzera scelte" }));
  domFireEvent.click(domScreen.getByRole("radio", { name: /Panino/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Avanti" }));
  domFireEvent.click(domScreen.getByRole("radio", { name: /Acqua/ }));
  domFireEvent.click(domScreen.getByRole("button", { name: "Aggiorna scelta" }));
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ mealSelections: [
    { stepId: "portata", productId: base.id, removedIngredientIds: [], notes: "" },
    { stepId: "bibita", productId: water.id, removedIngredientIds: [], notes: "" }
  ] }));
});
