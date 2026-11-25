import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualCart, MenuDraft, OutOfStockBehavior, PizzaComponent } from "@pizzaos/domain";
import { createOrderingService } from "./ordering-service";
import type { OrderingState } from "./ordering-contract";

const operator: IndividualActor = { id: "operator", name: "Operatore", email: "operator@example.test" };
const customer: IndividualActor = { id: "customer", name: "Cliente", email: "customer@example.test" };
const cart: IndividualCart = { storeId: "store", lines: [{ productId: "product", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "" };

function setup(stock: number | null, behavior?: OutOfStockBehavior) {
  let state: OrderingState = {
    stores: { store: { id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, outOfStockBehavior: behavior,
      ingredients: [{ id: "ingredient", name: "Pomodoro", stock }],
      products: [{ id: "product", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: { ingredient: null }, options: [] }],
      slots: [{ id: "slot", startsAt: "2030-01-01T19:00:00Z", capacity: 50 }], deliveryBands: [] } },
    memberships: [{ storeId: "store", email: operator.email }], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  let queue = Promise.resolve();
  let sequence = 0;
  const service = createOrderingService({
    repository: { transact<T>(work: (draft: OrderingState) => T | Promise<T>): Promise<T> {
      const result = queue.then(async () => { const draft = structuredClone(state); const value = await work(draft); state = draft; return value; });
      queue = result.then(() => undefined, () => undefined);
      return result;
    } },
    payments: { create: async () => ({ id: "payment", status: "paid" }), read: async (id) => ({ id, status: "paid" }), cancel: async (id) => ({ id, status: "cancelled" }), refund: async () => ({ id: "refund", status: "succeeded" }), readRefund: async (id) => ({ id, status: "succeeded" }) },
    now: () => new Date("2030-01-01T12:00:00Z"), id: () => `generated-${++sequence}`, superadminEmails: [],
  });
  return { service, state: () => state };
}

async function order(service: ReturnType<typeof setup>["service"], idempotencyKey = "order-1") {
  const quote = await service.quote(cart, customer);
  return service.checkout(customer, { cart, fingerprint: quote.fingerprint, phone: "3331234567", method: "cash", idempotencyKey });
}

async function publish(f: ReturnType<typeof setup>, products = f.state().stores.store.products) {
  const workspace = await f.service.menu.workspace(operator, "store");
  const draft: MenuDraft = { id: "draft", name: "Menu", sections: [{ id: "section", name: "Pizze", productIds: products.map(product => product.id) }], products };
  const saved = await f.service.menu.saveDraft(operator, "store", workspace.revision, draft);
  return f.service.menu.publish(operator, "store", saved.revision, draft.id);
}

describe("dosi facoltative nel servizio autorevole", () => {
  it.each([
    { mode: "componenti", priceCents: 100 }, { mode: "formato", priceCents: 100 },
    { mode: "componenti", priceCents: null }, { mode: "formato", priceCents: null },
  ])("pubblica dosi null solo con prezzo extra presente: $mode / $priceCents", async ({ mode, priceCents }) => {
    const f = setup(10, "disable");
    const store = await f.service.catalog("store", operator);
    await f.service.saveStore(operator, { ...store, ingredients: [
      ...store.ingredients, { id: "extra-ingredient", name: "Olive", stock: 3, extra: { enabled: true, priceCents, dose: null } },
    ] });
    const component = (id: string): PizzaComponent => ({ id, name: id, description: "", available: true, priceCents: 0, ingredients: { ingredient: null } });
    const entry = { name: "Pizza", description: "", available: true, priceCents: 700,
      standardDoughId: "classico", standardBaseId: mode === "formato" ? "" : "rossa", standardFormatId: "tonda",
      doughIds: ["classico"], baseIds: mode === "formato" ? [] : ["rossa"], formatIds: ["tonda"], toppingIds: ["pomodoro"],
    };
    const draft: MenuDraft = { id: "pizza-menu", name: "Menu", products: [], sections: [{ id: "pizze", name: "Pizze", productIds: ["gusto", "formula"] }],
      pizzaCatalog: {
        ...(mode === "formato" ? { inventoryMode: "dough-format" as const } : {}),
        doughs: [{ ...component("classico"), ...(mode === "formato" ? { ingredients: {}, inventoryIngredientId: "ingredient" } : {}) }],
        bases: mode === "formato" ? [] : [component("rossa")],
        formats: [{ ...component("tonda"), ingredients: {}, ...(mode === "formato" ? { doughQuantity: null } : {}) }],
        toppings: [{ ...component("pomodoro"), category: "Ingredienti" }],
        tastes: [{ ...entry, id: "gusto", includedToppingIds: ["pomodoro"] }],
        formulas: [{ ...entry, id: "formula", extraOffer: { quota: 0, percent: 0 } }],
      },
    };
    const workspace = await f.service.menu.workspace(operator, "store");
    const saved = await f.service.menu.saveDraft(operator, "store", workspace.revision, draft);
    if (priceCents === null) {
      await expect(f.service.menu.publish(operator, "store", saved.revision, draft.id)).rejects.toThrow();
      expect((await f.service.menu.workspace(operator, "store")).published).toEqual(workspace.published);
      return;
    }
    await f.service.menu.publish(operator, "store", saved.revision, draft.id);
    const snapshot = (await f.service.menu.workspace(operator, "store")).published!;
    if (mode === "formato") expect(snapshot.pizzaCatalog!.formats[0].doughQuantity).toBeNull();
    else expect(snapshot.pizzaCatalog!.doughs[0].ingredients).toEqual({ ingredient: null });
    for (const product of (await f.service.catalog("store")).products) {
      const extra = product.options.find(option => option.ingredientIds?.includes("extra-ingredient"));
      expect(extra).toMatchObject({ available: true, priceCents: 100 });
      const selected = { ...cart, lines: [{ ...cart.lines[0], productId: product.id, selections: [...product.pizza!.defaultSelections, { optionId: extra!.id, quantity: 1 }] }] };
      const quote = await f.service.quote(selected, customer);
      expect(quote.lines[0].unitCents).toBe(800);
      const { order: placed } = await f.service.checkout(customer, { cart: selected, fingerprint: quote.fingerprint, phone: "3331234567", method: "cash", idempotencyKey: product.id });
      for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, placed.id, { action });
    }
    expect(f.state().stores.store.ingredients.map(ingredient => ingredient.stock)).toEqual([10, 3]);
  });

  it.each([null, 5])("pubblica e ordina una dose null con scorta %s senza consumarla", async stock => {
    const f = setup(stock, "disable");
    await publish(f);
    const snapshot = (await f.service.menu.workspace(operator, "store")).published!;
    expect(snapshot.products[0].ingredients).toEqual({ ingredient: null });
    expect((await f.service.catalog("store")).products[0].available).toBe(true);
    const { order: placed } = await order(f.service);
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, placed.id, { action });
    expect(f.state().stores.store.ingredients[0].stock).toBe(stock);
  });

  it.each(["allow", "disable", "hide"] as const)("la dose null rispetta la policy zero %s anche con ID diretto", async behavior => {
    const f = setup(0, behavior);
    await publish(f);
    const products = (await f.service.catalog("store")).products;
    if (behavior === "allow") {
      expect(products[0]).toMatchObject({ available: true });
      await expect(order(f.service)).resolves.toBeDefined();
    } else {
      if (behavior === "hide") expect(products).toHaveLength(0);
      else expect(products[0]).toMatchObject({ available: false, soldOut: true });
      await expect(f.service.quote(cart, customer)).rejects.toThrow();
      await expect(f.service.checkout(customer, { cart, fingerprint: "direct", phone: "3331234567", method: "cash", idempotencyKey: "direct" })).rejects.toThrow();
    }
  });

  it.each(["allow", "disable", "hide"] as const)("extra opzionale con dose null e zero segue %s senza bloccare la base", async behavior => {
    const f = setup(0, behavior);
    const products = f.state().stores.store.products.map(product => ({ ...product, ingredients: {},
      options: [{ id: "extra", name: "Extra", priceCents: 100, ingredients: { ingredient: null }, available: true }],
      groups: [{ id: "extra-group", name: "Extra", kind: "selection" as const, min: 0, max: 1, optionIds: ["extra"] }],
    }));
    await publish(f, products);
    const product = (await f.service.catalog("store")).products[0];
    expect(product.available).toBe(true);
    await expect(f.service.quote(cart, customer)).resolves.toBeDefined();
    const selected = { ...cart, lines: [{ ...cart.lines[0], selections: [{ optionId: "extra", quantity: 1 }] }] };
    if (behavior === "allow") {
      expect(product.options[0].available).toBe(true);
      await expect(f.service.quote(selected, customer)).resolves.toMatchObject({ lines: [{ unitCents: 900 }] });
    } else {
      if (behavior === "hide") expect(product.options).toHaveLength(0);
      else expect(product.options[0].available).toBe(false);
      await expect(f.service.quote(selected, customer)).rejects.toThrow();
    }
  });

  it("prenota e consuma solo le dosi note e impedisce la sovraprenotazione concorrente", async () => {
    const f = setup(1, "disable");
    const store = await f.service.catalog("store", operator);
    await f.service.saveStore(operator, { ...store, ingredients: [...store.ingredients, { id: "tracked", name: "Mozzarella", stock: 2 }] });
    const products = f.state().stores.store.products.map(product => ({ ...product, ingredients: { ingredient: null, tracked: 2 } }));
    await publish(f, products);
    const results = await Promise.allSettled([order(f.service, "first"), order(f.service, "second")]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const successful = results.find(result => result.status === "fulfilled");
    expect(successful?.status).toBe("fulfilled");
    if (successful?.status !== "fulfilled") return;
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, successful.value.order.id, { action });
    expect(f.state().stores.store.ingredients.find(ingredient => ingredient.id === "ingredient")!.stock).toBe(1);
    expect(f.state().stores.store.ingredients.find(ingredient => ingredient.id === "tracked")!.stock).toBe(0);
  });

  it("il contributo ignoto dello stesso ingrediente prevale sul contributo noto al consumo", async () => {
    const f = setup(1, "disable");
    const products = f.state().stores.store.products.map(product => ({ ...product, ingredients: { ingredient: 5 },
      options: [{ id: "extra", name: "Extra", priceCents: 100, ingredients: { ingredient: null } }],
    }));
    await publish(f, products);
    const selected = { ...cart, lines: [{ ...cart.lines[0], selections: [{ optionId: "extra", quantity: 1 }] }] };
    const quote = await f.service.quote(selected, customer);
    const { order: placed } = await f.service.checkout(customer, { cart: selected, fingerprint: quote.fingerprint, phone: "3331234567", method: "cash", idempotencyKey: "mixed" });
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, placed.id, { action });
    expect(f.state().stores.store.ingredients[0].stock).toBe(1);
  });

  it.each([null, 5])("il prodotto legacy combina dose base %s ed extra dello stesso ingrediente senza consumo fittizio", async baseDose => {
    const f = setup(1, "disable");
    const store = await f.service.catalog("store", operator);
    await f.service.saveStore(operator, { ...store, products: store.products.map(product => ({
      ...product, ingredients: { ingredient: baseDose },
      options: [{ id: "extra", name: "Extra", priceCents: 100, ingredients: { ingredient: baseDose === null ? 5 : null } }],
    })) });
    expect((await f.service.catalog("store", operator)).products[0].groups).toBeUndefined();
    const selected = { ...cart, lines: [{ ...cart.lines[0], optionIds: ["extra"] }] };
    const quote = await f.service.quote(selected, customer);
    expect(quote.lines[0].unitCents).toBe(900);
    const { order: placed } = await f.service.checkout(customer, {
      cart: selected, fingerprint: quote.fingerprint, phone: "3331234567", method: "cash", idempotencyKey: "legacy-mixed",
    });
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, placed.id, { action });
    expect(f.state().stores.store.ingredients[0].stock).toBe(1);
  });

  it("una dose null resta ordinabile quando una ricetta nota ha riservato tutta la scorta positiva", async () => {
    const f = setup(1, "disable");
    const ordinary = f.state().stores.store.products[0];
    await publish(f, [ordinary, { ...ordinary, id: "known", ingredients: { ingredient: 1 } }]);
    const knownCart = { ...cart, lines: [{ ...cart.lines[0], productId: "known" }] };
    const knownQuote = await f.service.quote(knownCart, customer);
    await f.service.checkout(customer, { cart: knownCart, fingerprint: knownQuote.fingerprint, phone: "3331234567", method: "cash", idempotencyKey: "known" });
    expect((await f.service.catalog("store")).products.find(product => product.id === ordinary.id)?.available).toBe(true);
    await expect(f.service.quote(knownCart, customer)).rejects.toThrow();
    const { order: placed } = await order(f.service, "unknown-after-known");
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await f.service.action(operator, placed.id, { action });
    expect(f.state().stores.store.ingredients[0].stock).toBe(1);
  });
});
