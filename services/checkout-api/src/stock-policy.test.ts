import { describe, expect, it } from "vitest";
import type { IndividualActor, IndividualCart, IndividualStore, OutOfStockBehavior } from "@pizzaos/domain";
import { createOrderingService } from "./ordering-service";
import type { OrderingState } from "./ordering-contract";

const operator: IndividualActor = { id: "operator", name: "Operatore", email: "operator@example.test" };
const customer: IndividualActor = { id: "customer", name: "Cliente", email: "customer@example.test" };
const cart: IndividualCart = { storeId: "store", lines: [{ productId: "product", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "" };

function setup(stock: number | null, behavior?: OutOfStockBehavior) {
  let state: OrderingState = {
    stores: { store: { id: "store", name: "Sede", latitude: 45, longitude: 9, acceptingOrders: true, outOfStockBehavior: behavior,
      ingredients: [{ id: "ingredient", name: "Pomodoro", stock }],
      products: [{ id: "product", productType: "product", name: "Pizza", description: "", priceCents: 800, available: true, allergens: [], ingredients: { ingredient: 1 }, options: [] }],
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

describe("politica delle scorte", () => {
  it.each(["allow", "disable", "hide"] as const)("scorta null è ordinabile e resta null con %s", async (behavior) => {
    const { service, state } = setup(null, behavior);
    expect((await service.catalog("store")).products).toHaveLength(1);
    const { order: placed } = await order(service);
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await service.action(operator, placed.id, { action });
    expect(state().stores.store.ingredients[0].stock).toBeNull();
  });

  it("allow mantiene visibile e ordinabile lo zero senza quantità negative", async () => {
    const { service, state } = setup(0, "allow");
    expect((await service.catalog("store")).products[0]).toMatchObject({ available: true });
    const { order: placed } = await order(service);
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await service.action(operator, placed.id, { action });
    expect(state().stores.store.ingredients[0].stock).toBe(0);
  });

  it.each([undefined, "disable"] as const)("zero con %s è visibile Esaurito e gli ID diretti sono respinti", async (behavior) => {
    const { service } = setup(0, behavior);
    expect((await service.catalog("store")).products[0]).toMatchObject({ available: false, soldOut: true });
    await expect(service.quote(cart, customer)).rejects.toThrow();
    await expect(service.checkout(customer, { cart, fingerprint: "known-id", phone: "3331234567", method: "cash", idempotencyKey: "unavailable" })).rejects.toThrow();
  });

  it("hide rimuove il prodotto pubblico e conserva quello dell'operatore", async () => {
    const { service } = setup(0, "hide");
    expect((await service.catalog("store")).products).toHaveLength(0);
    expect((await service.catalog("store", operator)).products).toHaveLength(1);
    await expect(service.quote(cart, customer)).rejects.toThrow();
    await expect(service.checkout(customer, { cart, fingerprint: "known-id", phone: "3331234567", method: "cash", idempotencyKey: "hidden" })).rejects.toThrow();
  });

  it.each(["allow", "disable", "hide"] as const)("scorta positiva insufficiente resta bloccante con %s", async (behavior) => {
    const { service } = setup(1, behavior);
    await expect(service.quote({ ...cart, lines: [{ ...cart.lines[0], quantity: 2 }] }, customer)).rejects.toThrow();
  });

  it.each(["allow", "disable", "hide"] as const)("la disabilitazione manuale prevale su %s", async (behavior) => {
    const { service } = setup(0, behavior);
    const store = await service.catalog("store", operator);
    await service.saveStore(operator, { ...store, products: store.products.map((product) => ({ ...product, available: false })) });
    await expect(service.quote(cart, customer)).rejects.toThrow();
  });

  it("le prenotazioni concorrenti non eccedono una scorta positiva", async () => {
    const { service } = setup(1, "allow");
    const results = await Promise.allSettled([order(service, "concurrent-1"), order(service, "concurrent-2")]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it.each(["allow", "disable", "hide"] as const)("extra zero con %s: il prodotto base resta ordinabile", async (behavior) => {
    const { service } = setup(5, behavior);
    const store = await service.catalog("store", operator);
    await service.saveStore(operator, { ...store, ingredients: [...store.ingredients, { id: "optional", name: "Olive", stock: 0 }], products: store.products.map((product) => ({ ...product,
      options: [{ id: "extra", name: "Olive extra", priceCents: 100, ingredients: { optional: 1 }, available: true }],
      groups: [{ id: "extras", name: "Extra", kind: "selection", min: 0, max: 1, optionIds: ["extra"] }],
    })) });
    const product = (await service.catalog("store")).products[0];
    expect(product.available).toBe(true);
    await expect(service.quote({ ...cart, lines: [{ ...cart.lines[0], selections: [] }] }, customer)).resolves.toBeDefined();
    const withExtra = { ...cart, lines: [{ ...cart.lines[0], selections: [{ optionId: "extra", quantity: 1 }] }] };
    if (behavior === "allow") {
      expect(product.options[0].available).toBe(true);
      await expect(service.quote(withExtra, customer)).resolves.toBeDefined();
    } else {
      if (behavior === "disable") expect(product.options[0].available).toBe(false);
      if (behavior === "hide") {
        expect(product.options).toHaveLength(0);
        expect(product.groups?.flatMap((group) => group.optionIds)).not.toContain("extra");
      }
      await expect(service.quote(withExtra, customer)).rejects.toThrow();
    }
  });

  it("un extra con scorta null è ordinabile anche in hide", async () => {
    const { service } = setup(5, "hide");
    const store = await service.catalog("store", operator);
    await service.saveStore(operator, { ...store, ingredients: [...store.ingredients, { id: "optional", name: "Olive", stock: null }], products: store.products.map((product) => ({ ...product,
      options: [{ id: "extra", name: "Olive extra", priceCents: 100, ingredients: { optional: 1 }, available: true }],
      groups: [{ id: "extras", name: "Extra", kind: "selection", min: 0, max: 1, optionIds: ["extra"] }],
    })) });
    expect((await service.catalog("store")).products[0].options[0].available).toBe(true);
    await expect(service.quote({ ...cart, lines: [{ ...cart.lines[0], selections: [{ optionId: "extra", quantity: 1 }] }] }, customer)).resolves.toBeDefined();
  });

  it("un'opzione disabilitata manualmente non diventa ordinabile in allow", async () => {
    const { service } = setup(5, "allow");
    const store = await service.catalog("store", operator);
    await service.saveStore(operator, { ...store, products: store.products.map((product) => ({ ...product,
      options: [{ id: "extra", name: "Olive extra", priceCents: 100, ingredients: {}, available: false }],
      groups: [{ id: "extras", name: "Extra", kind: "selection", min: 0, max: 1, optionIds: ["extra"] }],
    })) });
    await expect(service.quote({ ...cart, lines: [{ ...cart.lines[0], selections: [{ optionId: "extra", quantity: 1 }] }] }, customer)).rejects.toThrow();
  });

  it("hide ripulisce sezioni e abbinamenti mantenendo il menu pubblicato dell'operatore", async () => {
    const { service } = setup(0, "hide");
    const store = await service.catalog("store", operator);
    const products = [...store.products, { ...store.products[0], id: "other", name: "Altra pizza", ingredients: {}, pairingProductIds: ["product"] }];
    await service.saveStore(operator, { ...store, products });
    const workspace = await service.menu.workspace(operator, "store");
    const draft = { id: "draft", name: "Menu", sections: [{ id: "section", name: "Pizze", productIds: ["product", "other"] }], products };
    const saved = await service.menu.saveDraft(operator, "store", workspace.revision, draft);
    await service.menu.publish(operator, "store", saved.revision, draft.id);
    const publicStore = await service.catalog("store");
    expect(publicStore.products.map((product) => product.id)).toEqual(["other"]);
    expect(publicStore.products[0].pairingProductIds ?? []).not.toContain("product");
    const operatorWorkspace = await service.menu.workspace(operator, "store");
    expect(operatorWorkspace.published?.products.map((product) => product.id)).toContain("product");
    expect(operatorWorkspace.published?.sections.flatMap((section) => section.productIds)).toContain("product");
  });

  it("un ordine misto consuma solo gli ingredienti tracciati", async () => {
    const { service, state } = setup(null, "allow");
    const original = await service.catalog("store", operator);
    await service.saveStore(operator, { ...original, ingredients: [...original.ingredients, { id: "tracked", name: "Mozzarella", stock: 5 }], products: original.products.map((product) => ({ ...product, ingredients: { ingredient: 1, tracked: 2 } })) });
    const { order: placed } = await order(service);
    const store = await service.catalog("store", operator);
    await service.saveStore(operator, { ...store, ingredients: store.ingredients.map((ingredient) => ingredient.id === "ingredient" ? { ...ingredient, stock: 10 } : ingredient) });
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await service.action(operator, placed.id, { action });
    expect(state().stores.store.ingredients.find((ingredient) => ingredient.id === "ingredient")?.stock).toBe(10);
    expect(state().stores.store.ingredients.find((ingredient) => ingredient.id === "tracked")?.stock).toBe(3);
  });

  it("un riferimento ingrediente assente resta non pubblicabile", async () => {
    const { service, state } = setup(null, "allow");
    const recipe: Record<string, number | null> = { missing: 1 };
    const products = state().stores.store.products.map((product) => ({ ...product, ingredients: recipe }));
    const workspace = await service.menu.workspace(operator, "store");
    const draft = { id: "draft", name: "Menu", sections: [{ id: "section", name: "Pizze", productIds: ["product"] }], products };
    const publishIncomplete = async () => {
      const saved = await service.menu.saveDraft(operator, "store", workspace.revision, draft);
      return service.menu.publish(operator, "store", saved.revision, draft.id);
    };
    await expect(publishIncomplete()).rejects.toThrow();
  });

  it("salva la modalità per sede e la conserva quando il campo viene omesso", async () => {
    const { service } = setup(0);
    let store = await service.catalog("store", operator);
    store = await service.saveStore(operator, { ...store, outOfStockBehavior: "hide" });
    expect(store.outOfStockBehavior).toBe("hide");
    const { outOfStockBehavior: omitted, ...otherFields } = store;
    expect(omitted).toBe("hide");
    await service.saveStore(operator, otherFields);
    expect((await service.catalog("store", operator)).outOfStockBehavior).toBe("hide");
    expect((await service.catalog("store")).products).toHaveLength(0);
  });

  it("rifiuta modalità sconosciute", async () => {
    const { service } = setup(0);
    const store = await service.catalog("store", operator);
    const invalidStore = JSON.parse(JSON.stringify({ ...store, outOfStockBehavior: "unknown" })) as IndividualStore;
    await expect(service.saveStore(operator, invalidStore)).rejects.toMatchObject({ code: "invalid_input" });
  });

  it.each([null, 0])("pubblica un menu completo con scorta %s", async (stock) => {
    const { service, state } = setup(stock);
    const workspace = await service.menu.workspace(operator, "store");
    const draft = { id: "draft", name: "Menu", sections: [{ id: "section", name: "Pizze", productIds: ["product"] }], products: state().stores.store.products };
    const saved = await service.menu.saveDraft(operator, "store", workspace.revision, draft);
    await expect(service.menu.publish(operator, "store", saved.revision, draft.id)).resolves.toBeDefined();
  });

  it.each([null, 0])("non consuma ingredienti ordinati senza tracciamento dopo un rifornimento da %s", async (stock) => {
    const { service, state } = setup(stock, "allow");
    const { order: placed } = await order(service);
    const store = await service.catalog("store", operator);
    await service.saveStore(operator, { ...store, ingredients: store.ingredients.map((ingredient) => ({ ...ingredient, stock: 10 })) });
    for (const action of ["accept", "prepare", "ready", "complete"] as const) await service.action(operator, placed.id, { action });
    expect(state().stores.store.ingredients[0].stock).toBe(10);
  });
});
