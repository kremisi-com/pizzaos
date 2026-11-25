import { describe, expect, it } from "vitest";
import { materializePizzaMenu, resolveMenuComposition, type IndividualProduct, type MenuDraft } from "@pizzaos/domain";

function product(): IndividualProduct {
  return {
    id: "piatto", name: "Piatto", description: "", available: true, priceCents: 800,
    allergens: [], ingredients: { pomodoro: null, latte: 2 }, options: [],
    foodIngredients: [
      { id: "pomodoro", name: "Pomodoro", food: { contains: ["Sedano"], mayContain: ["Sesamo"] } },
      { id: "latte", name: "Mozzarella", food: { contains: ["Latte"], mayContain: [] } },
    ],
  };
}

describe("dosi facoltative nella composizione pubblica", () => {
  it("conserva dose ignota, ingredienti e allergeni senza invalidare il prezzo", () => {
    const result = resolveMenuComposition(product(), []);
    expect(result).toMatchObject({ valid: true, unitCents: 800, recipe: { pomodoro: null, latte: 2 } });
    expect(result.composition.ingredients).toEqual(expect.arrayContaining(["Pomodoro", "Mozzarella"]));
    expect(result.composition.contains).toEqual(expect.arrayContaining(["Sedano", "Latte"]));
    expect(result.composition.mayContain).toContain("Sesamo");
  });

  it.each([null, 2])("unisce contributi noti e ignoti senza inventare una dose: base %s", baseDose => {
    const candidate = product();
    candidate.ingredients = { pomodoro: baseDose };
    candidate.options = [{ id: "extra", name: "Extra", priceCents: 100, ingredients: { pomodoro: baseDose === null ? 2 : null } }];
    candidate.groups = [{ id: "extra-group", name: "Extra", kind: "selection", min: 0, max: 3, allowRepeat: true, optionIds: ["extra"] }];
    const result = resolveMenuComposition(candidate, [{ optionId: "extra", quantity: 3 }]);
    expect(result).toMatchObject({ valid: true, unitCents: 1100, recipe: { pomodoro: null } });
  });

  it("rimuove la dose ignota e applica la sostituzione mantenendo i contributi noti", () => {
    const candidate = product();
    candidate.options = [{ id: "sostituzione", name: "Sostituzione", priceCents: 50, removesIngredientIds: ["pomodoro"], ingredients: { olive: null } }];
    const result = resolveMenuComposition(candidate, [{ optionId: "sostituzione", quantity: 1 }]);
    expect(result).toMatchObject({ valid: true, unitCents: 850, recipe: { latte: 2, olive: null } });
    expect(result.recipe).not.toHaveProperty("pomodoro");
    expect(result.composition.contains).not.toContain("Sedano");
  });

  it("ammette formato con quantità impasto ignota conservando il riferimento", () => {
    const source: MenuDraft = {
      id: "menu", name: "Menu", products: [], sections: [{ id: "pizze", name: "Pizze", productIds: ["pizza"] }],
      pizzaCatalog: {
        inventoryMode: "dough-format", bases: [], toppings: [], formulas: [],
        doughs: [{ id: "classico", name: "Classico", description: "", available: true, priceCents: 0, ingredients: {}, inventoryIngredientId: "panetto" }],
        formats: [{ id: "tonda", name: "Tonda", description: "", available: true, priceCents: 0, ingredients: {}, doughQuantity: null }],
        tastes: [{ id: "pizza", name: "Pizza", description: "", available: true, priceCents: 700, standardDoughId: "classico", standardBaseId: "", standardFormatId: "tonda", doughIds: ["classico"], baseIds: [], formatIds: ["tonda"], toppingIds: [], includedToppingIds: [] }],
      },
    };
    const pizza = materializePizzaMenu(source).products[0];
    pizza.foodIngredients = [{ id: "panetto", name: "Impasto", food: { contains: ["Glutine"], mayContain: [] } }];
    const result = resolveMenuComposition(pizza, pizza.pizza!.defaultSelections);
    expect(result).toMatchObject({ valid: true, unitCents: 700, recipe: { panetto: null } });
    expect(result.composition.contains).toContain("Glutine");
  });
});
