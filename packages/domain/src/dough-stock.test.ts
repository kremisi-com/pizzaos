import { describe, expect, it } from "vitest";
import {
  materializePizzaMenu, resolveMenuComposition, simplifyPizzaInventory,
  type IndividualProduct, type MenuDraft, type MenuSelection, type PizzaCatalog, type PizzaComponent,
} from "@pizzaos/domain";

const component = (id: string, priceCents = 0): PizzaComponent => ({
  id, name: id, description: "", available: true, priceCents, ingredients: {},
});

function draft(): MenuDraft {
  const entry = {
    id: "margherita", name: "Margherita", description: "", priceCents: 700, available: true,
    standardDoughId: "classico", standardBaseId: "", standardFormatId: "tonda",
    doughIds: ["classico", "integrale"], baseIds: [], formatIds: ["tonda", "maxi"], toppingIds: ["pomodoro", "olive"],
  };
  const pizzaCatalog: PizzaCatalog = {
    inventoryMode: "dough-format", bases: [],
    doughs: [
      { ...component("classico"), inventoryIngredientId: "panetto-classico" },
      { ...component("integrale", 150), inventoryIngredientId: "panetto-integrale" },
    ],
    formats: [{ ...component("tonda"), doughQuantity: 2 }, { ...component("maxi", 250), doughQuantity: 3 }],
    toppings: [
      { ...component("pomodoro"), category: "Ingredienti", ingredients: { pomodoro: 1 } },
      { ...component("olive", 100), category: "Extra", ingredients: { olive: 2 } },
    ],
    tastes: [{ ...entry, includedToppingIds: ["pomodoro"] }], formulas: [],
    defaults: { doughId: "classico", baseId: "", formatId: "tonda" },
  };
  return { id: "menu", name: "Menu", products: [], pizzaCatalog,
    sections: [{ id: "pizze", name: "Pizze", productIds: ["margherita"] }] };
}

function choices(product: IndividualProduct, doughId: string, formatId: string): MenuSelection[] {
  return ["dough", "format"].map(kind => {
    const option = product.options.find(item => item.pizza?.kind === kind
      && item.pizza.sourceId === (kind === "dough" ? doughId : formatId));
    expect(option).toBeDefined();
    return { optionId: option!.id, quantity: 1 };
  });
}

describe("impasto e formato determinano il consumo della voce Magazzino scelta", () => {
  it("omette l'impasto dagli ingredienti visibili mantenendo consumi e allergeni", () => {
    const product = materializePizzaMenu(draft()).products[0];
    product.foodIngredients = [
      { id: "panetto-integrale", name: "Impasto integrale", food: { contains: ["Glutine"], mayContain: ["Sesamo"] } },
      { id: "pomodoro", name: "Pomodoro", food: { contains: [], mayContain: [] } }
    ];
    const result = resolveMenuComposition(product, choices(product, "integrale", "maxi"));
    expect(result.recipe).toEqual({ "panetto-integrale": 3, pomodoro: 1 });
    expect(result.composition.ingredients).toEqual(["Pomodoro"]);
    expect(result.composition.contains).toEqual(["Glutine"]);
    expect(result.composition.mayContain).toEqual(["Sesamo"]);
  });

  it("proietta il consiglio senza cambiare selezione standard o supplementi", () => {
    const source = draft();
    source.pizzaCatalog!.tastes[0].recommendedDoughId = "integrale";
    const product = materializePizzaMenu(source).products[0];
    expect(product.pizza?.recommendedDoughOptionId).toBe("dough:integrale");
    expect(product.pizza?.defaultSelections).toContainEqual({ optionId: "dough:classico", quantity: 1 });
    expect(resolveMenuComposition(product, product.pizza!.defaultSelections).unitCents).toBe(700);
    source.pizzaCatalog!.tastes[0].recommendedDoughId = "classico";
    expect(materializePizzaMenu(source).products[0].pizza?.recommendedDoughOptionId).toBeUndefined();
  });

  it("scala la quantità del formato esclusivamente dall'impasto scelto, con supplementi invariati", () => {
    const product = materializePizzaMenu(draft()).products[0];
    const result = resolveMenuComposition(product, choices(product, "integrale", "maxi"));
    expect(result.valid).toBe(true);
    expect(result.recipe).toEqual({ "panetto-integrale": 3, pomodoro: 1 });
    expect(result.unitCents).toBe(1100);
    expect(product.groups?.some(item => item.kind === "base")).toBe(false);
    expect(product.options.some(item => item.pizza?.kind === "base")).toBe(false);
  });

  it("cambia quantità passando di formato e di impasto senza duplicare né moltiplicare condimenti o extra", () => {
    const product = materializePizzaMenu(draft()).products[0];
    const olive = product.options.find(item => item.pizza?.kind === "topping" && item.pizza.sourceId === "olive")!;
    expect(resolveMenuComposition(product, choices(product, "classico", "tonda")).recipe)
      .toEqual({ "panetto-classico": 2, pomodoro: 1 });
    const result = resolveMenuComposition(product, [...choices(product, "integrale", "maxi"), { optionId: olive.id, quantity: 2 }]);
    expect(result.recipe).toEqual({ "panetto-integrale": 3, pomodoro: 1, olive: 4 });
    expect(result.unitCents).toBe(1300);
  });

  it("considera ordinabile una composizione con quantità impasto non tracciata", () => {
    const source = draft();
    source.pizzaCatalog!.formats[0].doughQuantity = null;
    const product = materializePizzaMenu(source).products[0];
    const result = resolveMenuComposition(product, choices(product, "classico", "tonda"));
    expect(result.valid).toBe(true);
    expect(result.recipe["panetto-classico"]).toBeNull();
  });

  it("trasferisce la base standard fra gli ingredienti inclusi conservando input, prezzi e identità", () => {
    const source = draft();
    const catalog = source.pizzaCatalog!;
    delete catalog.inventoryMode;
    delete catalog.defaults;
    catalog.doughs = [{ ...component("classico"), ingredients: { "panetto-classico": 2 } }];
    catalog.formats = [component("tonda")];
    catalog.bases = [{ ...component("rossa"), ingredients: { salsa: 1 } }];
    catalog.tastes[0].doughIds = ["classico"];
    catalog.tastes[0].formatIds = ["tonda"];
    catalog.tastes[0].standardBaseId = "rossa";
    catalog.tastes[0].baseIds = ["rossa"];
    catalog.formulas = [{ ...catalog.tastes[0], id: "custom", name: "Custom", includedToppingIds: [], extraOffer: { quota: 0, percent: 0 } }];
    source.sections[0].productIds.push("custom");
    const before = structuredClone(source);
    const converted = simplifyPizzaInventory(source);
    expect(source).toEqual(before);
    expect(simplifyPizzaInventory(converted)).toEqual(converted);
    expect(converted.pizzaCatalog?.inventoryMode).toBe("dough-format");
    expect(converted.pizzaCatalog?.bases).toEqual([]);
    for (const product of materializePizzaMenu(converted).products) {
      expect(product.priceCents).toBe(700);
      expect(product.options.some(item => item.pizza?.kind === "base")).toBe(false);
      const resolved = resolveMenuComposition(product, product.pizza!.defaultSelections);
      expect(resolved.recipe.salsa).toBe(1);
      expect(product.pizza?.kind).toBe(product.id === "custom" ? "formula" : "taste");
    }
  });

  it("lascia da verificare l'associazione di un impasto con ricetta ambigua", () => {
    const source = draft();
    delete source.pizzaCatalog!.inventoryMode;
    source.pizzaCatalog!.doughs[0].ingredients = { farina: 2, acqua: 1 };
    for (const dough of source.pizzaCatalog!.doughs) delete dough.inventoryIngredientId;
    for (const format of source.pizzaCatalog!.formats) delete format.doughQuantity;
    const result = simplifyPizzaInventory(source);
    expect(result.pizzaCatalog!.doughs[0].inventoryIngredientId).toBeUndefined();
    expect(result.pizzaCatalog!.formats[0].doughQuantity).toBeNull();
  });
});
