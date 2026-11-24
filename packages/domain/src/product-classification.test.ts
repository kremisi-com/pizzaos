import { describe, expect, it } from "vitest";
import {
  emptyPizzaCatalog,
  materializePizzaMenu,
  planProductClassification,
  resolveMenuComposition,
  syncPizzaInventory,
  type IndividualIngredient,
  type IndividualProduct,
  type MenuDraft
} from "@pizzaos/domain";

const ingredients: IndividualIngredient[] = [
  { id: "farina", name: "Farina", stock: 100, extra: { enabled: false, priceCents: null, dose: null } },
  { id: "pomodoro", name: "Pomodoro", stock: 100, extra: { enabled: false, priceCents: null, dose: null } },
  { id: "olive", name: "Olive", stock: 100, extra: { enabled: true, priceCents: 150, dose: 2 } }
];

function fixture(recipe: IndividualProduct["ingredients"] = { farina: 2, pomodoro: 1, olive: 3 }): MenuDraft {
  const component = (id: string, recipe: IndividualProduct["ingredients"]) => ({ id, name: id, description: "", priceCents: 0, available: true, ingredients: recipe });
  return {
    id: "menu", name: "Menu prova",
    sections: [{ id: "primi", name: "Specialità", productIds: ["prima", "prodotto", "dopo"] }],
    products: [{
      id: "prodotto", name: "Specialità", description: "Ricetta del giorno", priceCents: 900, available: true,
      allergens: ["glutine"], ingredients: recipe, imageId: "foto", pairingProductIds: ["birra"],
      options: [{ id: "salsa", name: "Salsa piccante", priceCents: 70, ingredients: { olive: 1 }, removesIngredientIds: ["pomodoro"] }],
      groups: [{ id: "salse", name: "Salse", kind: "selection", min: 1, max: 2, allowRepeat: true, optionIds: ["salsa"] }]
    }, ...["prima", "dopo", "birra"].map((id) => ({ id, name: id, description: "", priceCents: 100, available: true, allergens: [], ingredients: {}, options: [] }))],
    pizzaCatalog: {
      ...emptyPizzaCatalog(),
      doughs: [component("classico", { farina: 2 })], bases: [component("rossa", { pomodoro: 1 })], formats: [component("tonda", {})],
      defaults: { doughId: "classico", baseId: "rossa", formatId: "tonda" },
      inventoryExtras: false, customEnabled: false
    }
  };
}

describe("classificazione prodotto: contratto pubblico", () => {
  it("inizia la ricetta di un prodotto appena aggiunto dagli standard solo con newProduct esplicito", () => {
    const draft = fixture({});
    draft.products[0].options = [];
    draft.products[0].groups = [];
    const before = structuredClone(draft);
    const plan = planProductClassification(draft, "prodotto", true, ingredients, { newProduct: true });
    expect(plan.errors).toEqual([]);
    expect(plan.draft).toBeDefined();
    const pizza = plan.draft!.products.find((product) => product.id === "prodotto")!;
    expect(resolveMenuComposition(pizza, pizza.pizza!.defaultSelections).recipe).toEqual({ farina: 2, pomodoro: 1 });
    expect(draft).toEqual(before);
    expect(planProductClassification(draft, "prodotto", true, ingredients).draft).toBeUndefined();
    expect(planProductClassification(draft, "prodotto", true, ingredients, { newProduct: false }).draft).toBeUndefined();
    expect(planProductClassification(fixture({ farina: 1 }), "prodotto", true, ingredients, { newProduct: true }).draft).toBeUndefined();
  });

  it("mantiene attivi nella composizione gli allergeni dichiarati senza food", () => {
    const draft = fixture();
    draft.products[0].allergens = ["Glutine"];
    delete draft.products[0].food;
    const plan = planProductClassification(draft, "prodotto", true, ingredients);
    expect(plan.errors).toEqual([]);
    const pizza = plan.draft!.products.find((product) => product.id === "prodotto")!;
    expect(resolveMenuComposition(pizza, pizza.pizza!.defaultSelections).composition.contains).toContain("Glutine");
  });

  it("consente on e off in bozza senza catalogo iniziale conservando un prodotto ordinario", () => {
    const draft = fixture({});
    delete draft.pizzaCatalog;
    const before = structuredClone(draft);
    const pizza = planProductClassification(draft, "prodotto", true, ingredients);
    expect(pizza.errors).toEqual([]);
    const restored = planProductClassification(pizza.draft!, "prodotto", false, ingredients);
    expect(restored.errors).toEqual([]);
    expect(restored.draft!.products.find((product) => product.id === "prodotto")).toMatchObject(before.products[0]);
    expect(restored.draft!.products.some((product) => product.pizza)).toBe(false);
    expect(draft).toEqual(before);
  });

  it("richiede standard comuni espliciti prima di aggiungere un gusto a un catalogo legacy", () => {
    const draft = fixture();
    delete draft.pizzaCatalog!.defaults;
    draft.pizzaCatalog!.tastes = [{
      id: "legacy", name: "Legacy", description: "", priceCents: 700, available: true,
      standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [], includedToppingIds: []
    }];
    const source = materializePizzaMenu(draft);
    const before = structuredClone(source);
    const plan = planProductClassification(source, "prodotto", true, ingredients);
    expect(plan.draft).toBeUndefined();
    expect(plan.errors.join(" ")).toMatch(/standard/i);
    expect(source).toEqual(before);
  });

  it("conserva entrambe le ricette incluse con ID simili agli automatici e dose extra diversa", () => {
    const draft = fixture();
    draft.products = draft.products.filter((product) => product.id !== "prodotto");
    const topping = (id: string, dose: number) => ({ id, name: id, description: "", priceCents: 150, available: true, ingredients: { olive: dose }, category: "Vegetali" });
    draft.pizzaCatalog!.toppings = [
      { ...topping("inventory:olive", 1), inventoryIngredientId: "olive" },
      topping("recipe:inventory:olive", 3)
    ];
    draft.pizzaCatalog!.tastes = [{
      id: "prodotto", name: "Specialità", description: "", priceCents: 900, available: true,
      standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico"], baseIds: ["rossa"], formatIds: ["tonda"],
      toppingIds: ["inventory:olive", "recipe:inventory:olive"], includedToppingIds: ["inventory:olive", "recipe:inventory:olive"]
    }];
    const source = materializePizzaMenu(draft);
    const before = structuredClone(source);
    const synced = syncPizzaInventory(source, ingredients);
    expect(source).toEqual(before);
    const ids = synced.pizzaCatalog!.toppings.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    const product = synced.products.find((entry) => entry.id === "prodotto")!;
    expect(resolveMenuComposition(product, product.pizza!.defaultSelections).recipe).toEqual({ farina: 2, pomodoro: 1, olive: 4 });
    expect(product.options.some((option) => option.pizza?.kind === "topping" && option.ingredients.olive === 2)).toBe(true);
    expect(syncPizzaInventory(synced, ingredients)).toEqual(synced);
  });

  it("togliere Pizza da un gusto legacy conserva gli standard specifici delle altre pizze", () => {
    const draft = fixture();
    const catalog = draft.pizzaCatalog!;
    delete catalog.defaults;
    catalog.doughs.push({ id: "integrale", name: "Integrale", description: "", priceCents: 0, available: true, ingredients: { farina: 3 } });
    catalog.bases.push({ id: "bianca", name: "Bianca", description: "", priceCents: 0, available: true, ingredients: { pomodoro: 2 } });
    catalog.formats.push({ id: "grande", name: "Grande", description: "", priceCents: 0, available: true, ingredients: { olive: 2 } });
    const entry = (id: string, dough: string, base: string, format: string) => ({
      id, name: id, description: "", priceCents: 700, available: true,
      standardDoughId: dough, standardBaseId: base, standardFormatId: format,
      doughIds: [dough], baseIds: [base], formatIds: [format], toppingIds: [], includedToppingIds: []
    });
    catalog.tastes = [entry("da-convertire", "classico", "rossa", "tonda"), entry("da-preservare", "integrale", "bianca", "grande")];
    draft.sections[0].productIds.push("da-convertire", "da-preservare");
    const source = materializePizzaMenu(draft);
    const before = structuredClone(source);
    const plan = planProductClassification(source, "da-convertire", false, ingredients.map((ingredient) => ({ ...ingredient, extra: { ...ingredient.extra!, enabled: false } })));
    expect(plan.errors).toEqual([]);
    expect(plan.draft!.products.find((product) => product.id === "da-convertire")).toMatchObject({ ingredients: { farina: 2, pomodoro: 1 } });
    const preserved = plan.draft!.products.find((product) => product.id === "da-preservare")!;
    expect(preserved.pizza!.defaultSelections).toEqual(before.products.find((product) => product.id === "da-preservare")!.pizza!.defaultSelections);
    expect(resolveMenuComposition(preserved, preserved.pizza!.defaultSelections).recipe).toEqual({ farina: 3, pomodoro: 2, olive: 2 });
    expect(plan.draft!.pizzaCatalog!.tastes.find((taste) => taste.id === "da-preservare")).toMatchObject({ standardDoughId: "integrale", standardBaseId: "bianca", standardFormatId: "grande" });
    expect(source).toEqual(before);
  });

  it("preserva ricetta completa, identità, contenuti e posizione senza mutare la bozza", () => {
    const draft = fixture();
    const before = structuredClone(draft);
    const plan = planProductClassification(draft, "prodotto", true, ingredients);
    expect(plan.errors).toEqual([]);
    expect(plan.changes.length).toBeGreaterThan(0);
    expect(plan.draft).toBeDefined();
    expect(draft).toEqual(before);
    const pizza = plan.draft!.products.find((product) => product.id === "prodotto")!;
    expect(pizza).toMatchObject({ id: "prodotto", name: "Specialità", description: "Ricetta del giorno", priceCents: 900, available: true, imageId: "foto", pairingProductIds: ["birra"], allergens: ["glutine"], pizza: { kind: "taste" } });
    expect(plan.draft!.sections).toEqual(before.sections);
    expect(resolveMenuComposition(pizza, pizza.pizza!.defaultSelections).recipe).toEqual({ farina: 2, pomodoro: 1, olive: 3 });
    expect(plan.draft!.pizzaCatalog!.tastes[0].customizations).toEqual({ options: before.products[0].options, groups: before.products[0].groups });
    expect(new Set(pizza.options.map((option) => option.id)).size).toBe(pizza.options.length);
  });

  it("ripristina solo le scelte specifiche e la ricetta completa tornando prodotto", () => {
    const draft = fixture();
    const pizza = planProductClassification(draft, "prodotto", true, ingredients).draft!;
    const restored = planProductClassification(pizza, "prodotto", false, ingredients);
    expect(restored.errors).toEqual([]);
    expect(restored.draft!.products.find((product) => product.id === "prodotto")).toMatchObject({ ingredients: draft.products[0].ingredients, options: draft.products[0].options, groups: draft.products[0].groups });
    expect(restored.draft!.products.find((product) => product.id === "prodotto")!.pizza).toBeUndefined();
    expect(restored.draft!.sections).toEqual(draft.sections);
    const again = planProductClassification(restored.draft!, "prodotto", true, ingredients).draft!;
    const againProduct = again.products.find((product) => product.id === "prodotto")!;
    const pizzaProduct = pizza.products.find((product) => product.id === "prodotto")!;
    expect(resolveMenuComposition(againProduct, againProduct.pizza!.defaultSelections).recipe).toEqual({ farina: 2, pomodoro: 1, olive: 3 });
    expect(againProduct.options.map((option) => option.id)).toEqual(pizzaProduct.options.map((option) => option.id));
  });

  const insufficientRecipes: IndividualProduct["ingredients"][] = [{ farina: 1, pomodoro: 1 }, { pomodoro: 1 }];
  it.each(insufficientRecipes)("blocca una ricetta che non copre lo standard: %j", (recipe) => {
    const draft = fixture(recipe);
    const before = structuredClone(draft);
    const plan = planProductClassification(draft, "prodotto", true, ingredients);
    expect(plan.draft).toBeUndefined();
    expect(plan.errors.join(" ")).toMatch(/ricetta|standard/i);
    expect(draft).toEqual(before);
  });

  it("conserva dosi null come dati da verificare", () => {
    const plan = planProductClassification(fixture({ farina: 2, pomodoro: 1, olive: null }), "prodotto", true, ingredients);
    expect(plan.errors).toEqual([]);
    expect(plan.draft).toBeDefined();
    const catalog = plan.draft!.pizzaCatalog!;
    expect([ ...catalog.toppings, ...catalog.tastes.map((taste) => ({ ingredients: plan.draft!.products.find((product) => product.pizza?.sourceId === taste.id)?.ingredients ?? {} })) ].some((entry) => entry.ingredients.olive === null)).toBe(true);
  });

  it("è idempotente e segnala un ID assente", () => {
    const draft = fixture();
    expect(planProductClassification(draft, "prodotto", false, ingredients).draft).toEqual(draft);
    expect(planProductClassification(draft, "assente", true, ingredients).draft).toBeUndefined();
    expect(planProductClassification(draft, "assente", true, ingredients).errors.length).toBeGreaterThan(0);
    const pizza = planProductClassification(draft, "prodotto", true, ingredients).draft!;
    expect(planProductClassification(pizza, "prodotto", true, ingredients).draft).toEqual(pizza);
  });

  it("eredita extra su tutti i gusti anche con custom e inventoryExtras disattivati, senza modificare prodotti ordinari", () => {
    const draft = planProductClassification(fixture(), "prodotto", true, ingredients).draft!;
    const ordinary = { ...fixture().products[0], id: "bevanda", name: "Bevanda" };
    draft.products.push(ordinary);
    draft.pizzaCatalog!.customEnabled = false;
    draft.pizzaCatalog!.inventoryExtras = false;
    const before = structuredClone(draft);
    const synced = syncPizzaInventory(draft, ingredients);
    expect(draft).toEqual(before);
    expect(synced.products.find((product) => product.id === "bevanda")).toEqual(ordinary);
    const pizza = synced.products.find((product) => product.id === "prodotto")!;
    const extra = pizza.options.find((option) => option.pizza?.kind === "topping" && option.ingredients.olive === 2)!;
    expect(extra).toMatchObject({ name: "Olive", priceCents: 150, ingredients: { olive: 2 } });
    expect(pizza.options.some((option) => option.pizza?.kind === "topping" && option.ingredients.farina)).toBe(false);
    expect(pizza.options.find((option) => option.id === "salsa")).toEqual(ordinary.options[0]);
    expect(syncPizzaInventory(synced, ingredients)).toEqual(synced);
  });

  it("non cancella la ricetta inclusa disabilitando un extra e ammette prezzo zero", () => {
    const pizza = planProductClassification(fixture(), "prodotto", true, ingredients).draft!;
    const free = syncPizzaInventory(pizza, ingredients.map((ingredient) => ingredient.id === "olive" ? { ...ingredient, extra: { enabled: true, priceCents: 0, dose: 2 } } : ingredient));
    expect(free.products.find((product) => product.id === "prodotto")!.options.some((option) => option.pizza?.kind === "topping" && option.priceCents === 0 && option.ingredients.olive === 2)).toBe(true);
    const disabled = syncPizzaInventory(free, ingredients.map((ingredient) => ({ ...ingredient, extra: { ...ingredient.extra!, enabled: false } })));
    const product = materializePizzaMenu(disabled).products.find((entry) => entry.id === "prodotto")!;
    expect(resolveMenuComposition(product, product.pizza!.defaultSelections).recipe).toEqual({ farina: 2, pomodoro: 1, olive: 3 });
    expect(product.options.filter((option) => option.pizza?.kind === "topping" && option.available !== false && option.ingredients.olive === 2)).toEqual([]);
  });
});
