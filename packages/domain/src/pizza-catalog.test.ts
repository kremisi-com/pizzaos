import { describe, expect, it } from "vitest";
import {
  materializePizzaMenu,
  resolveMenuComposition,
  type IndividualProduct,
  type MenuDraft,
  type MenuSelection,
  type PizzaCatalog,
  type PizzaComponent,
} from "@pizzaos/domain";

function component(id: string, priceCents: number, ingredients: Record<string, number | null>): PizzaComponent {
  return { id, name: id, description: "", priceCents, available: true, ingredients };
}

function catalog(): PizzaCatalog {
  const entry = {
    name: "Margherita", description: "", priceCents: 600, available: true,
    standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda",
    doughIds: ["classico", "integrale", "leggero"], baseIds: ["rossa", "bianca"], formatIds: ["tonda", "maxi"],
    toppingIds: ["mozzarella", "olive"],
  };
  return {
    doughs: [component("classico", 200, { farina: 2 }), component("integrale", 320, { crusca: 3 }), component("leggero", 150, { farina: 1 })],
    bases: [component("rossa", 100, { pomodoro: 2 }), component("bianca", 140, { panna: 1 })],
    formats: [component("tonda", 0, {}), component("maxi", 200, { farina: 1 })],
    toppings: [
      { ...component("mozzarella", 150, { latte: 2 }), category: "Formaggi" },
      { ...component("olive", 110, { olive: 3 }), category: "Verdure" },
    ],
    tastes: [{ ...entry, id: "margherita", includedToppingIds: ["mozzarella"] }],
    formulas: [{ ...entry, id: "simple", name: "Simple", priceCents: 500, offer: "Simple" }],
  };
}

const ordinary: IndividualProduct = {
  id: "acqua", name: "Acqua", description: "Naturale", priceCents: 200, available: true,
  allergens: [], ingredients: {}, options: [],
};

function draft(source = catalog()): MenuDraft {
  return {
    id: "menu-pizza", name: "Menu pizza", pizzaCatalog: source, products: [structuredClone(ordinary)],
    sections: [{ id: "menu", name: "Menu", description: "", productIds: ["margherita", "simple", "acqua"] }],
  };
}

function pizza(source = catalog(), id = "margherita"): IndividualProduct {
  const result = materializePizzaMenu(draft(source)).products.find((product) => product.id === id);
  expect(result).toBeDefined();
  return result!;
}

function option(product: IndividualProduct, kind: string, sourceId: string): MenuSelection {
  const selected = product.options.find((candidate) => candidate.pizza?.kind === kind && candidate.pizza.sourceId === sourceId);
  expect(selected, `${kind}: ${sourceId}`).toBeDefined();
  return { optionId: selected!.id, quantity: 1 };
}

function selections(product: IndividualProduct, ...changes: { kind: string; sourceId: string }[]): MenuSelection[] {
  const defaults = product.pizza?.defaultSelections ?? [];
  return [
    ...defaults.filter((selection) => !changes.some(({ kind }) => product.options.find(({ id }) => id === selection.optionId)?.pizza?.kind === kind)),
    ...changes.map(({ kind, sourceId }) => option(product, kind, sourceId)),
  ];
}

describe("contratto pubblico del catalogo pizza", () => {
  it("blocca un topping incluso disattivato finché viene rimosso, mantenendo visibile il gusto", () => {
    const source = catalog();
    source.toppings[0].available = false;
    const product = pizza(source);
    expect(product.available).toBe(true);
    expect(resolveMenuComposition(product, selections(product)).valid).toBe(false);
    expect(resolveMenuComposition(product, [...selections(product), option(product, "removal", "mozzarella")])).toMatchObject({
      valid: true, unitCents: 600, recipe: { farina: 2, pomodoro: 2 },
    });
    const legacy = structuredClone(product);
    for (const included of legacy.pizza!.includedToppings!) Reflect.deleteProperty(included, "available");
    expect(resolveMenuComposition(legacy, selections(legacy)).valid).toBe(true);
  });

  it("include le scelte standard nel prezzo completo e applica soltanto i differenziali", () => {
    const product = pizza();
    expect(product.pizza).toMatchObject({ kind: "taste", sourceId: "margherita" });
    expect(product.pizza?.defaultSelections).toHaveLength(3);
    for (const selection of product.pizza!.defaultSelections) {
      expect(product.options.find(({ id }) => id === selection.optionId)?.priceCents).toBe(0);
    }
    expect(resolveMenuComposition(product, selections(product))).toMatchObject({ valid: true, unitCents: 600 });
    expect(resolveMenuComposition(product, selections(product, { kind: "dough", sourceId: "integrale" }))).toMatchObject({ valid: true, unitCents: 720 });
    expect(resolveMenuComposition(product, selections(product, { kind: "dough", sourceId: "leggero" }))).toMatchObject({ valid: true, unitCents: 550 });
    expect(resolveMenuComposition(product, selections(product, { kind: "base", sourceId: "bianca" }, { kind: "format", sourceId: "maxi" }))).toMatchObject({ valid: true, unitCents: 840 });
    const source = catalog();
    source.formats[0].priceCents = 250;
    const cheaperFormat = pizza(source);
    expect(resolveMenuComposition(cheaperFormat, selections(cheaperFormat, { kind: "format", sourceId: "maxi" }))).toMatchObject({ valid: true, unitCents: 550 });
  });

  it("sostituisce le ricette standard e conserva soltanto gli ingredienti effettivi", () => {
    const product = pizza();
    const result = resolveMenuComposition(product, selections(product, { kind: "dough", sourceId: "integrale" }, { kind: "base", sourceId: "bianca" }));
    expect(result.valid).toBe(true);
    expect(result.recipe).toEqual({ crusca: 3, panna: 1, latte: 2 });
  });

  it("rimuove topping inclusi gratuitamente e aggiunge extra alla dose e al prezzo configurati", () => {
    const product = pizza();
    const removed = [...selections(product), option(product, "removal", "mozzarella")];
    expect(resolveMenuComposition(product, removed)).toMatchObject({ valid: true, unitCents: 600, recipe: { farina: 2, pomodoro: 2 } });
    const result = resolveMenuComposition(product, [...removed, option(product, "topping", "olive")]);
    expect(result).toMatchObject({ valid: true, unitCents: 710 });
    expect(result.recipe).toEqual({ farina: 2, pomodoro: 2, olive: 3 });
  });

  it("rimuove solo il contributo del topping quando più componenti condividono un ingrediente", () => {
    const source = catalog();
    source.toppings[0].food = { contains: ["Latte"], mayContain: [] };
    source.toppings.push({ ...component("provola", 170, { latte: 3, farina: 1 }), category: "Formaggi", food: { contains: ["Latte", "Senape"], mayContain: [] } });
    source.tastes[0].toppingIds.push("provola");
    source.tastes[0].includedToppingIds.push("provola");
    const product = pizza(source);
    const result = resolveMenuComposition(product, [...selections(product), option(product, "removal", "provola")]);
    expect(result.valid).toBe(true);
    expect(result.unitCents).toBe(600);
    expect(result.recipe).toEqual({ farina: 2, pomodoro: 2, latte: 2 });
    expect(result.composition.contains).toContain("Latte");
    expect(result.composition.contains).not.toContain("Senape");
    const withoutCheese = resolveMenuComposition(product, [...selections(product), option(product, "removal", "provola"), option(product, "removal", "mozzarella")]);
    expect(withoutCheese.recipe).toEqual({ farina: 2, pomodoro: 2 });
    expect(withoutCheese.composition.contains).not.toContain("Latte");
  });

  it.each([
    { offer: "Simple" as const, expected: 1468 },
    { offer: "Wild" as const, expected: 1256 },
    { offer: "Savage" as const, expected: 1081 },
  ])("sconta solo la quota di extra più costosi di $offer arrotondando ogni unità", ({ offer, expected }) => {
    const source = catalog();
    source.toppings = [61, 221, 111, 213, 101, 197, 85, 105].map((price, index) => ({
      ...component(`extra-${index}`, price, { [`ingrediente-${index}`]: 1 }), category: "Extra",
    }));
    source.formulas[0] = { ...source.formulas[0], offer, toppingIds: source.toppings.map(({ id }) => id) };
    source.tastes = [];
    const product = pizza(source, "simple");
    const result = resolveMenuComposition(product, [...selections(product), ...source.toppings.map(({ id }) => option(product, "topping", id))]);
    expect(result).toMatchObject({ valid: true, unitCents: expected });
    expect(result.recipe).not.toHaveProperty("latte");
  });

  it("riproduce l'esempio Simple 500 + 220/210/190/110 = 1106", () => {
    const source = catalog();
    source.toppings = [220, 210, 190, 110].map((price, index) => ({ ...component(`extra-${index}`, price, {}), category: "Extra" }));
    source.formulas[0].toppingIds = source.toppings.map(({ id }) => id);
    source.tastes = [];
    const product = pizza(source, "simple");
    expect(resolveMenuComposition(product, [...selections(product), ...source.toppings.map(({ id }) => option(product, "topping", id))])).toMatchObject({ valid: true, unitCents: 1106 });
  });

  it("è pura, deterministica e idempotente e conserva i prodotti ordinari", () => {
    const input = draft();
    const before = structuredClone(input);
    const first = materializePizzaMenu(input);
    expect(input).toEqual(before);
    expect(materializePizzaMenu(input)).toEqual(first);
    expect(materializePizzaMenu(first)).toEqual(first);
    expect(first.products.find(({ id }) => id === ordinary.id)).toEqual(ordinary);
    expect(first.products.map(({ id }) => id).sort()).toEqual(["acqua", "margherita", "simple"]);
    expect(first.sections).toEqual(input.sections);
    const legacy: MenuDraft = { id: "classico", name: "Classico", products: [ordinary], sections: [] };
    expect(materializePizzaMenu(legacy)).toEqual(legacy);
  });
});
