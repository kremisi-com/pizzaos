// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { IndividualProduct, MenuDraft } from "@pizzaos/domain";
import type { OrderingState } from "./ordering-contract";
import { ingredientNameKey, reconcileMenuImport } from "./menu-import";

function product(id = "margherita", name = "Margherita"): IndividualProduct {
  return {
    id, name, description: "Descrizione precedente", priceCents: 850, available: true,
    allergens: ["latte"], ingredients: { mozzarella: 120 },
    options: [{ id: "pesto-option", name: "Aggiunta pesto", priceCents: 200, ingredients: {} }],
  };
}

function draft(id: string): MenuDraft {
  return { id, name: `Bozza ${id}`, sections: [], products: [product(`${id}-pizza`)] };
}

function fixture(): OrderingState {
  return {
    stores: {
      "store-a": {
        id: "store-a", name: "Pizzeria di prova", latitude: 45, longitude: 9,
        acceptingOrders: true, deliveryBands: [{ upToKm: 5, feeCents: 300, minimumCents: 1000 }],
        ingredients: [
          { id: "mozzarella", name: "Mozzarella", stock: 900 },
          { id: "olive", name: "Olive", stock: 40 },
        ],
        products: [product(), { ...product("unrelated", "Olive al forno"), ingredients: { olive: 2 }, options: [] }],
        slots: [{ id: "slot", startsAt: "2026-11-25T18:00:00Z", capacity: 10 }],
        menu: { id: "published", name: "Menu pubblicato", sections: [] },
      },
      "store-b": {
        id: "store-b", name: "Altro locale", latitude: 44, longitude: 8,
        acceptingOrders: false, deliveryBands: [], ingredients: [], products: [], slots: [],
      },
    },
    memberships: [{ storeId: "store-a", email: "operatore@example.test" }],
    orders: {
      confirmed: {
        id: "confirmed", storeId: "store-a", customerId: "customer", status: "accepted",
        cart: { storeId: "store-a", lines: [{ productId: "margherita", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "" },
        quote: { fingerprint: "quote", subtotalCents: 850, deliveryCents: 0, totalCents: 850, slotId: "slot", slotStartsAt: "2026-11-25T18:00:00Z", lines: [{ productId: "margherita", name: "Margherita", quantity: 1, unitCents: 850, optionIds: [], notes: "" }] },
        contact: { name: "Cliente", email: "cliente@example.test", phone: "3330000000" },
        payment: "cash_due", method: "cash", notes: "", createdAt: "2026-11-24T12:00:00Z",
        submittedAt: "2026-11-24T12:00:00Z", acceptanceDeadline: null,
        reservationExpiresAt: null, reservationReleased: false, unavailableProductIds: [],
        providerIntentId: null, refundId: null, refundAttempt: 0, revision: 3,
      },
    },
    idempotency: { existing: { hash: "hash", orderId: "confirmed" } },
    events: [], cursor: 12,
    menuDrafts: { "store-a": { revision: 7, drafts: [draft("first"), draft("second")] } },
  };
}

function source() {
  return {
    storeId: "store-a",
    recipes: [
      { name: "Margherita", description: "Pomodoro e mozzarella", ingredients: [
        { name: "  MOZZARÈLLA ", quantity: null },
        { name: "Datterini gialli", quantity: null },
      ] },
      { name: "Aggiunta pesto", description: "Pesto di Pra’ senza aglio", ingredients: [
        { name: "Pesto di Pra’ senza aglio", quantity: null },
      ] },
    ],
  };
}

describe("contratto indipendente della riconciliazione menu", () => {
  it("normalizza maiuscole, spazi, accenti e apostrofi senza perdere distinzioni", () => {
    expect(ingredientNameKey("  MOZZARÈLLA  ")).toBe(ingredientNameKey("Mozzarella"));
    expect(ingredientNameKey("Pesto   di Pra’ senza aglio")).toBe(ingredientNameKey("pesto di pra' senza aglio"));
    expect(ingredientNameKey("Datterini gialli")).not.toBe(ingredientNameKey("Datterini rossi"));
    expect(ingredientNameKey("mozzarela")).not.toBe(ingredientNameKey("Mozzarella"));
  });

  it("riusa un ingrediente tramite alias esplicito senza usare somiglianze fuzzy", () => {
    const state = fixture();
    const result = reconcileMenuImport(state, {
      storeId: "store-a", recipes: [{ name: "Margherita", description: "Mozzarella", ingredients: [
        { name: "mozzarela", aliases: ["Mozzarella"], quantity: null },
      ] }],
    });
    expect(result.state.stores["store-a"].ingredients).toEqual(state.stores["store-a"].ingredients);
    expect(result.state.stores["store-a"].products[0].ingredients.mozzarella).toBe(120);
    expect(result.report.matched).toContainEqual({ name: "mozzarela", id: "mozzarella" });
    expect(result.report.created).toHaveLength(0);
  });

  it("crea ingredienti distinti e conserva il nome composto senza inventare quantità", () => {
    const input = source();
    input.recipes[0].ingredients.push({ name: "Datterini rossi", quantity: null });
    const { state, report } = reconcileMenuImport(fixture(), input);
    const ingredients = state.stores["store-a"].ingredients;
    const yellow = ingredients.find(item => item.name === "Datterini gialli")!;
    const red = ingredients.find(item => item.name === "Datterini rossi")!;
    const pesto = ingredients.find(item => item.name === "Pesto di Pra’ senza aglio")!;
    expect(yellow).toBeDefined();
    expect(red).toBeDefined();
    expect(pesto).toBeDefined();
    expect(new Set([yellow.id, red.id, pesto.id]).size).toBe(3);
    expect([yellow.stock, red.stock, pesto.stock]).toEqual([null, null, null]);
    expect(ingredients.some(item => ["aglio", "senza aglio"].includes(item.name))).toBe(false);
    expect(state.stores["store-a"].products[0].ingredients[yellow.id]).toBeNull();
    expect(state.stores["store-a"].products[0].options[0].ingredients[pesto.id]).toBeNull();
    expect(report.created).toHaveLength(3);
    expect(report.pending.length).toBeGreaterThan(0);
  });

  it("aggiorna prodotti e opzioni nel pubblicato e in tutte le bozze, conservando gli altri dati", () => {
    const before = fixture();
    const snapshot = structuredClone(before);
    const { state, report } = reconcileMenuImport(before, source());
    expect(before).toEqual(snapshot);
    expect(state).not.toBe(before);
    const inventoryIds = new Set(state.stores["store-a"].ingredients.map(item => item.id));
    const yellow = state.stores["store-a"].ingredients.find(item => item.name === "Datterini gialli")!;
    const pesto = state.stores["store-a"].ingredients.find(item => item.name === "Pesto di Pra’ senza aglio")!;
    const products = [state.stores["store-a"].products[0], ...state.menuDrafts!["store-a"].drafts.map(item => item.products[0])];
    for (const item of products) {
      expect(item.description).toBe("Pomodoro e mozzarella");
      expect(item.priceCents).toBe(850);
      expect(item.ingredients).toMatchObject({ mozzarella: 120, [yellow.id]: null });
      expect(item.options[0].ingredients[pesto.id]).toBeNull();
      expect(item.options[0].description).toBe("Pesto di Pra’ senza aglio");
      expect(item.options[0].priceCents).toBe(200);
      for (const id of [...Object.keys(item.ingredients), ...Object.keys(item.options[0].ingredients)]) {
        expect(inventoryIds.has(id)).toBe(true);
      }
    }
    expect(report.updatedRecipes).toBeGreaterThan(0);
    expect(state.stores["store-a"].ingredients.find(item => item.id === "mozzarella")?.stock).toBe(900);
    expect(state.stores["store-a"].products[1]).toEqual(snapshot.stores["store-a"].products[1]);
    expect(state.stores["store-a"].menu).toEqual(snapshot.stores["store-a"].menu);
    expect(state.stores["store-b"]).toEqual(snapshot.stores["store-b"]);
    expect(state.orders).toEqual(snapshot.orders);
    expect(state.idempotency).toEqual(snapshot.idempotency);
    expect(state.memberships).toEqual(snapshot.memberships);
    expect(state.events).toEqual(snapshot.events);
    expect(state.cursor).toBe(snapshot.cursor);
  });

  it("è idempotente anche per revisioni e identificativi", () => {
    const first = reconcileMenuImport(fixture(), source());
    const second = reconcileMenuImport(first.state, source());
    expect(second.state).toEqual(first.state);
    expect(second.report.created).toEqual([]);
    expect(second.report.updatedRecipes).toBe(0);
  });

  it("rifiuta corrispondenze ambigue atomicamente anche dopo una voce valida", () => {
    const state = fixture();
    state.stores["store-a"].ingredients.push({ id: "duplicate", name: "  MOZZARÈLLA ", stock: 70 });
    const snapshot = structuredClone(state);
    expect(() => reconcileMenuImport(state, {
      storeId: "store-a", recipes: [{ name: "Margherita", description: "Nuova", ingredients: [
        { name: "Ingrediente nuovo", quantity: null }, { name: "Mozzarella", quantity: null },
      ] }],
    })).toThrow(Error);
    expect(state).toEqual(snapshot);
  });

  it("rifiuta anche un alias che collega due ingredienti diversi", () => {
    const state = fixture();
    const snapshot = structuredClone(state);
    expect(() => reconcileMenuImport(state, {
      storeId: "store-a", recipes: [{ name: "Margherita", description: "Ambigua", ingredients: [
        { name: "Mozzarella", aliases: ["Olive"], quantity: null },
      ] }],
    })).toThrow(Error);
    expect(state).toEqual(snapshot);
  });

  it.each([-1, 0, Number.NaN, Number.POSITIVE_INFINITY])("rifiuta quantità non valide (%s) senza modificare l'input", quantity => {
    const state = fixture();
    const snapshot = structuredClone(state);
    expect(() => reconcileMenuImport(state, {
      storeId: "store-a", recipes: [{ name: "Margherita", description: "Non valida", ingredients: [{ name: "Mozzarella", quantity }] }],
    })).toThrow(Error);
    expect(state).toEqual(snapshot);
  });

  it("accetta quantità esplicite valide e alias dei nomi di ricetta", () => {
    const { state } = reconcileMenuImport(fixture(), {
      storeId: "store-a", recipes: [{ name: "Pizza classica", aliases: ["Margherita"], description: "Ricetta verificata", ingredients: [
        { name: "Mozzarella", quantity: 95 },
      ] }],
    });
    expect(state.stores["store-a"].products[0].description).toBe("Ricetta verificata");
    expect(state.stores["store-a"].products[0].ingredients.mozzarella).toBe(95);
    expect(state.stores["store-a"].ingredients.find(item => item.id === "mozzarella")?.stock).toBe(900);
  });

  it("reimporta la stessa bozza conservando ID di magazzino e dosi corrette dall'operatore", () => {
    const importedDraft = draft("imported");
    const input = { ...source(), draft: importedDraft };
    const first = reconcileMenuImport(fixture(), input);
    const yellow = first.state.stores["store-a"].ingredients.find(item => item.name === "Datterini gialli")!;
    const edited = first.state.menuDrafts!["store-a"].drafts.find(item => item.id === "imported")!;
    expect(edited).toBeDefined();
    edited.products[0].ingredients[yellow.id] = 65;
    first.state.stores["store-a"].ingredients.find(item => item.id === yellow.id)!.stock = 500;
    const second = reconcileMenuImport(first.state, input);
    const imported = second.state.menuDrafts!["store-a"].drafts.filter(item => item.id === "imported");
    expect(imported).toHaveLength(1);
    expect(imported[0].products[0].ingredients[yellow.id]).toBe(65);
    expect(second.state.stores["store-a"].ingredients).toEqual(first.state.stores["store-a"].ingredients);
    expect(second.state.stores["store-a"].menu).toEqual(first.state.stores["store-a"].menu);
    expect(importedDraft).toEqual(draft("imported"));
    expect(reconcileMenuImport(second.state, input).state).toEqual(second.state);
  });
});
