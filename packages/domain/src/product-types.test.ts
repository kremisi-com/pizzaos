import { describe, expect, it } from "vitest";
import {
  materializeSandwich, mealDefaultSelections, productType, resolveMealComposition, resolveMenuComposition,
  type IndividualIngredient, type IndividualOption, type IndividualProduct, type MealSelection
} from "@pizzaos/domain";

function product(overrides: Partial<IndividualProduct> = {}): IndividualProduct {
  return {
    id: "panino", name: "Panino", description: "", priceCents: 800, available: true,
    allergens: [], ingredients: {}, options: [], ...overrides
  };
}

function selection(stepId: string, productId: string, removedIngredientIds: string[] = [], notes = ""): MealSelection {
  return { stepId, productId, removedIngredientIds, notes };
}

function meal(): IndividualProduct {
  return product({
    id: "menu", productType: "meal", priceCents: 1200,
    meal: { steps: [
      { id: "portata", name: "Portata", alternatives: [{ productId: "panino", priceCents: 0 }] },
      { id: "bibita", name: "Bibita", alternatives: [
        { productId: "acqua", priceCents: -50 }, { productId: "birra", priceCents: 50 }
      ] }
    ] }
  });
}

const products: IndividualProduct[] = [
  product({ productType: "sandwich", ingredients: { pane: 1, formaggio: 2 },
    foodIngredients: [
      { id: "pane", name: "Pane", food: { contains: ["Glutine"], mayContain: [] } },
      { id: "formaggio", name: "Formaggio", food: { contains: ["Latte"], mayContain: [] } }
    ] }),
  product({ id: "acqua", name: "Acqua", priceCents: 99999, ingredients: { acqua: 1 } }),
  product({ id: "birra", name: "Birra", priceCents: 1, ingredients: { birra: 1 } })
];

function option(id: string, overrides: Partial<IndividualOption> = {}): IndividualOption {
  return { id, name: id, priceCents: 0, ingredients: {}, ...overrides };
}

function pizza(): IndividualProduct {
  return product({
    id: "pizza", productType: "pizza", ingredients: { pomodoro: 2 },
    pizza: { kind: "taste", sourceId: "pizza", defaultSelections: [
      { optionId: "standard", quantity: 1 }, { optionId: "tonda", quantity: 1 }
    ] },
    options: [
      option("standard", { ingredients: { farina: 1 }, pizza: { kind: "dough", sourceId: "standard" } }),
      option("consigliato", { ingredients: { farina: 2 }, pizza: { kind: "dough", sourceId: "consigliato" } }),
      option("tonda", { pizza: { kind: "format", sourceId: "tonda" } })
    ],
    groups: [
      { id: "impasti", name: "Impasti", kind: "dough", min: 1, max: 1, optionIds: ["standard", "consigliato"] },
      { id: "formati", name: "Formati", kind: "format", min: 1, max: 1, optionIds: ["tonda"] }
    ]
  });
}

describe("productType: contratto e dati precedenti", () => {
  it("riconosce pizza strutturata, selection Box e prodotto senza deduzioni dal nome", () => {
    const legacyPizza = pizza();
    delete legacyPizza.productType;
    expect(productType(legacyPizza)).toBe("pizza");
    expect(productType(product({ groups: [{ id: "s", name: "S", kind: "selection", min: 3, max: 3, optionIds: [] }] }))).toBe("box");
    expect(productType(product({ name: "Pizza Menu Panino Box" }))).toBe("product");
  });

  it.each(["pizza", "sandwich", "product", "box", "meal"] as const)("rispetta il tipo esplicito %s", type => {
    expect(productType(product({ productType: type }))).toBe(type);
  });

  it("dà precedenza al tipo esplicito sulle identità precedenti", () => {
    expect(productType({ ...pizza(), productType: "sandwich" })).toBe("sandwich");
  });
});

describe("materializeSandwich", () => {
  const ingredients: IndividualIngredient[] = [
    { id: "pane", name: "Pane", stock: 10 },
    { id: "formaggio", name: "Formaggio", stock: 10, food: { contains: ["Latte"], mayContain: [] }, extra: { enabled: true, priceCents: 150, dose: 2 } },
    { id: "salsa", name: "Salsa", stock: null, extra: { enabled: false, priceCents: 50, dose: 1 } }
  ];

  it("limita ogni extra a una unità anche con gruppi precedenti ripetibili", () => {
    const sandwich = materializeSandwich(products[0]!, ingredients);
    const group = sandwich.groups!.find(group => group.kind === "extras")!;
    const extra = { optionId: group.optionIds[0], quantity: 1 };
    expect(group).toMatchObject({ allowRepeat: false, max: group.optionIds.length });
    expect(resolveMenuComposition(sandwich, [extra]).valid).toBe(true);
    expect(resolveMenuComposition(sandwich, [{ ...extra, quantity: 2 }]).valid).toBe(false);
    group.allowRepeat = true;
    expect(resolveMenuComposition(sandwich, [{ ...extra, quantity: 2 }]).valid).toBe(false);
  });

  it("genera rimozioni incluse ed extra comuni abilitati, senza impasti o formati", () => {
    const source = { ...pizza(), productType: "sandwich" as const, ingredients: { pane: 1, formaggio: 2 } };
    const snapshot = structuredClone(source);
    const result = materializeSandwich(source, ingredients);
    expect(result.pizza).toBeUndefined();
    expect(result.options.filter(item => item.removesIngredientIds?.includes("pane"))).toHaveLength(1);
    expect(result.options.filter(item => item.removesIngredientIds?.includes("formaggio"))).toHaveLength(1);
    expect(result.options.some(item => item.priceCents === 150 && item.ingredients.formaggio === 2 && !item.removesIngredientIds?.length)).toBe(true);
    expect(result.options.some(item => item.ingredients.salsa)).toBe(false);
    expect(result.options.some(item => item.pizza?.kind === "dough" || item.pizza?.kind === "format")).toBe(false);
    expect(result.groups?.some(group => group.kind === "dough" || group.kind === "format")).toBeFalsy();
    expect(source).toEqual(snapshot);
  });

  it("è idempotente e conserva la ricetta ordinaria del pane", () => {
    const first = materializeSandwich(products[0]!, ingredients);
    expect(materializeSandwich(first, ingredients)).toEqual(first);
    expect(first.ingredients).toEqual({ pane: 1, formaggio: 2 });
  });

  it("rimozione e riaggiunta del formaggio consumano soltanto la dose extra pagata", () => {
    const sandwich = materializeSandwich(products[0]!, ingredients);
    const removal = sandwich.options.find(item => item.removesIngredientIds?.includes("formaggio"))!;
    const extra = sandwich.options.find(item => item.priceCents === 150 && item.ingredients.formaggio === 2 && !item.removesIngredientIds?.length)!;
    expect(removal).toBeDefined();
    expect(extra).toBeDefined();
    const result = resolveMenuComposition(sandwich, [
      { optionId: removal.id, quantity: 1 }, { optionId: extra.id, quantity: 1 }
    ]);
    expect(result.valid).toBe(true);
    expect(result.unitCents).toBe(950);
    expect(result.recipe).toEqual({ pane: 1, formaggio: 2 });
    expect(result.composition.contains).toContain("Latte");
  });
});

describe("mealDefaultSelections", () => {
  it("usa impasto e formato standard in assenza di consiglio", () => {
    expect(mealDefaultSelections(pizza())).toEqual([
      { optionId: "standard", quantity: 1 }, { optionId: "tonda", quantity: 1 }
    ]);
  });

  it("sostituisce solo l'impasto con il consigliato anche se indisponibile, senza fallback", () => {
    const child = pizza();
    child.pizza = { ...child.pizza!, recommendedDoughOptionId: "consigliato" };
    child.options = child.options.map(item => item.id === "consigliato" ? { ...item, available: false } : item);
    const snapshot = structuredClone(child);
    const result = mealDefaultSelections(child);
    expect(result).toContainEqual({ optionId: "consigliato", quantity: 1 });
    expect(result).toContainEqual({ optionId: "tonda", quantity: 1 });
    expect(result.some(item => item.optionId === "standard")).toBe(false);
    expect(child).toEqual(snapshot);
  });

  it("non preseleziona le alternative del Menu né opzioni di prodotti ordinari", () => {
    expect(mealDefaultSelections(meal())).toEqual([]);
    expect(mealDefaultSelections(products[0]!)).toEqual([]);
  });
});

describe("resolveMealComposition", () => {
  const choices = [selection("portata", "panino"), selection("bibita", "acqua")];

  it.each([["acqua", 1150], ["birra", 1250]] as const)("applica la variazione di %s ignorando i prezzi figli", (drink, total) => {
    const result = resolveMealComposition(meal(), [selection("portata", "panino"), selection("bibita", drink)], products);
    expect(result.valid).toBe(true);
    expect(result.unitCents).toBe(total);
    expect(result.recipe).toEqual({ pane: 1, formaggio: 2, [drink]: 1 });
  });

  it("conserva nomi, variazioni, rimozioni e note nella fase e ricalcola gli allergeni effettivi", () => {
    const input = [selection("bibita", "acqua"), selection("portata", "panino", ["formaggio"], "Ben caldo")];
    const snapshot = structuredClone({ menu: meal(), input, products });
    const result = resolveMealComposition(meal(), input, products);
    expect(result.valid).toBe(true);
    expect(result.unitCents).toBe(1150);
    expect(result.recipe).toEqual({ pane: 1, acqua: 1 });
    expect(result.composition.contains).toContain("Glutine");
    expect(result.composition.contains).not.toContain("Latte");
    expect(result.composition.mealSteps).toMatchObject([
      { stepId: "portata", name: "Portata", productId: "panino", productName: "Panino", priceCents: 0, removedIngredientIds: ["formaggio"], notes: "Ben caldo" },
      { stepId: "bibita", name: "Bibita", productId: "acqua", productName: "Acqua", priceCents: -50 }
    ]);
    expect({ menu: meal(), input, products }).toEqual(snapshot);
  });

  it.each([
    ["manca una fase", [selection("portata", "panino")]],
    ["nessuna scelta", []],
    ["fase duplicata", [...choices, selection("portata", "panino")]],
    ["fase estranea", [...choices, selection("estranea", "acqua")]],
    ["alternativa non configurata", [selection("portata", "birra"), selection("bibita", "acqua")]],
    ["rimozione non inclusa", [selection("portata", "panino", ["assente"]), selection("bibita", "acqua")]],
    ["nota troppo lunga", [selection("portata", "panino", [], "x".repeat(1001)), selection("bibita", "acqua")]]
  ])("rifiuta senza eccezioni: %s", (_name, selections) => {
    expect(resolveMealComposition(meal(), selections, products).valid).toBe(false);
  });

  it("accetta note al limite di 1000 caratteri", () => {
    expect(resolveMealComposition(meal(), [selection("portata", "panino", [], "x".repeat(1000)), choices[1]!], products).valid).toBe(true);
  });

  it.each(["box", "meal"] as const)("esclude un figlio %s", type => {
    expect(resolveMealComposition(meal(), choices, [{ ...products[0]!, productType: type }, ...products.slice(1)]).valid).toBe(false);
  });

  it("rifiuta prodotti mancanti o indisponibili", () => {
    expect(resolveMealComposition(meal(), choices, products.slice(1)).valid).toBe(false);
    expect(resolveMealComposition(meal(), choices, [{ ...products[0]!, available: false }, ...products.slice(1)]).valid).toBe(false);
  });

  it("rifiuta un prezzo finale negativo", () => {
    expect(resolveMealComposition({ ...meal(), priceCents: 10 }, choices, products).valid).toBe(false);
  });

  it("aggrega ingredienti tra fasi e conserva null per consumi non tracciati", () => {
    const parent = meal();
    parent.meal = { steps: ["primo", "secondo"].map(id => ({ id, name: id, alternatives: [{ productId: "panino", priceCents: 0 }] })) };
    const child = { ...products[0]!, ingredients: { pane: 1, salsa: null } };
    const result = resolveMealComposition(parent, [selection("primo", "panino"), selection("secondo", "panino")], [child]);
    expect(result.valid).toBe(true);
    expect(result.recipe).toEqual({ pane: 2, salsa: null });
  });

  it("preserva null anche quando un'altra fase consuma una dose numerica", () => {
    const parent = meal();
    const children = products.map(child => child.id === "panino"
      ? { ...child, ingredients: { comune: null } }
      : child.id === "acqua" ? { ...child, ingredients: { comune: 3 } } : child);
    const result = resolveMealComposition(parent, choices, children);
    expect(result.valid).toBe(true);
    expect(result.recipe).toEqual({ comune: null });
  });

  it("applica ricetta pizza standard e rifiuta formule e consigli indisponibili", () => {
    const parent = meal();
    parent.meal = { steps: [{ id: "portata", name: "Portata", alternatives: [{ productId: "pizza", priceCents: 0 }] }] };
    const input = [selection("portata", "pizza")];
    const child = pizza();
    const resolved = resolveMealComposition(parent, input, [child]);
    expect(resolved.valid).toBe(true);
    expect(resolved.recipe).toEqual({ pomodoro: 2, farina: 1 });
    expect(resolveMealComposition(parent, input, [{ ...child, pizza: { ...child.pizza!, kind: "formula" } }]).valid).toBe(false);
    child.pizza = { ...child.pizza!, recommendedDoughOptionId: "consigliato" };
    child.options = child.options.map(item => item.id === "consigliato" ? { ...item, available: false } : item);
    expect(resolveMealComposition(parent, input, [child]).valid).toBe(false);
  });

  it.each([-100, 100])("ignora il prezzo %i dell'impasto consigliato nel prezzo fisso Menu", priceCents => {
    const parent = meal();
    parent.meal = { steps: [{ id: "portata", name: "Portata", alternatives: [{ productId: "pizza", priceCents: 0 }] }] };
    const child = pizza();
    child.priceCents = 0;
    child.pizza = { ...child.pizza!, recommendedDoughOptionId: "consigliato" };
    child.options = child.options.map(item => item.id === "consigliato" ? { ...item, priceCents } : item);
    const result = resolveMealComposition(parent, [selection("portata", "pizza")], [child]);
    expect(result.valid).toBe(true);
    expect(result.unitCents).toBe(1200);
    expect(result.recipe).toEqual({ pomodoro: 2, farina: 2 });
  });

  it("non permette di rimuovere l'impasto automatico", () => {
    const parent = meal();
    parent.meal = { steps: [{ id: "portata", name: "Portata", alternatives: [{ productId: "pizza", priceCents: 0 }] }] };
    expect(resolveMealComposition(parent, [selection("portata", "pizza", ["farina"])], [pizza()]).valid).toBe(false);
  });
});


it("non permette rimozioni per i prodotti ordinari nelle fasi del Menu", () => {
  const configured = meal();
  const choices = [selection("portata", "panino"), selection("bibita", "acqua", [], "Fredda")];
  expect(resolveMealComposition(configured, choices, products).valid).toBe(true);
  choices[1] = selection("bibita", "acqua", ["acqua"], "Fredda");
  expect(resolveMealComposition(configured, choices, products).valid).toBe(false);
  choices[1] = selection("bibita", "acqua", [], "Fredda");
  choices[0] = selection("portata", "panino", ["formaggio"]);
  expect(resolveMealComposition(configured, choices, products).valid).toBe(true);
});
