// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { IndividualProduct, PizzaCatalog } from "@pizzaos/domain";
import type { OrderingState } from "./ordering-contract";
import { planPizzaMenuMigration } from "./pizza-menu-migration";

function product(id: string): IndividualProduct {
  return { id, name: id, description: "Prodotto esistente", priceCents: 850, available: true, allergens: [], ingredients: { farina: 1 }, options: [] };
}

function fixture(): OrderingState {
  const products = [product("contenitore"), product("acqua")];
  return {
    stores: { roma: {
      id: "roma", name: "Roma", latitude: 45, longitude: 9, acceptingOrders: true, deliveryBands: [],
      ingredients: [{ id: "farina", name: "Farina", stock: 100 }], slots: [], products,
      menu: { id: "pubblicato", name: "Menu pubblicato", sections: [{ id: "menu", name: "Menu", description: "Dal forno", productIds: ["contenitore", "acqua"] }] },
    } },
    memberships: [], orders: {
      storico: {
        id: "storico", storeId: "roma", customerId: "cliente", status: "accepted",
        cart: { storeId: "roma", lines: [{ productId: "contenitore", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "" },
        quote: { fingerprint: "storico", subtotalCents: 850, deliveryCents: 0, totalCents: 850, slotId: "slot", slotStartsAt: "2026-11-25T18:00:00Z", lines: [{ productId: "contenitore", name: "Contenitore", quantity: 1, unitCents: 850, optionIds: [], notes: "" }] },
        contact: { name: "Cliente", email: "cliente@example.test", phone: "3330000000" },
        payment: "cash_due", method: "cash", notes: "", createdAt: "2026-11-24T12:00:00Z", submittedAt: "2026-11-24T12:00:00Z",
        acceptanceDeadline: null, reservationExpiresAt: null, reservationReleased: false, unavailableProductIds: [],
        providerIntentId: null, refundId: null, refundAttempt: 0, revision: 3,
      },
    },
    idempotency: { historical: { hash: "historical", orderId: "storico" } }, events: [], cursor: 12,
    menuDrafts: { roma: { revision: 7, drafts: [{
      id: "bozza-fonte", name: "Bozza fonte", products: structuredClone(products),
      sections: [{ id: "menu", name: "Menu", description: "Dal forno", productIds: ["contenitore", "acqua"] }],
    }] } },
  };
}

function source() {
  const entry = { description: "Formula pizza", priceCents: 500, available: true,
    standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda",
    doughIds: ["classico"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [],
  };
  const component = { description: "", priceCents: 0, available: true, ingredients: {} };
  const pizzaCatalog: PizzaCatalog = {
    doughs: [{ ...component, id: "classico", name: "Classico", ingredients: { farina: 1 } }],
    bases: [{ ...component, id: "rossa", name: "Rossa" }], formats: [{ ...component, id: "tonda", name: "Tonda" }],
    toppings: [], tastes: [], formulas: [
      { ...entry, id: "simple", name: "Simple", offer: "Simple" },
      { ...entry, id: "wild", name: "Wild", offer: "Wild" },
      { ...entry, id: "savage", name: "Savage", offer: "Savage" },
    ],
  };
  return { storeId: "roma", draftId: "pizza-convertita", name: "Pizza convertita", pizzaCatalog,
    replacements: [{ productId: "contenitore", pizzaIds: ["simple", "wild", "savage"] }],
  };
}

describe("contratto indipendente della migrazione catalogo pizza", () => {
  it("pianifica senza scritture, espande uno-a-molti e conserva i prodotti ordinari", () => {
    const state = fixture();
    const input = source();
    const before = structuredClone(state);
    const beforeInput = structuredClone(input);
    const result = planPizzaMenuMigration(state, input);
    expect(state).toEqual(before);
    expect(input).toEqual(beforeInput);
    expect(result.state).not.toBe(state);
    const target = result.state.menuDrafts!.roma.drafts.find(({ id }) => id === input.draftId)!;
    expect(target).toBeDefined();
    expect(target.sections[0].productIds).toEqual(["simple", "wild", "savage", "acqua"]);
    expect(target.products.map(({ id }) => id).sort()).toEqual(["acqua", "savage", "simple", "wild"]);
    expect(target.products.find(({ id }) => id === "acqua")).toEqual(before.stores.roma.products[1]);
    expect(target.pizzaCatalog).toEqual(input.pizzaCatalog);
    expect(result.state.stores).toEqual(before.stores);
    expect(result.state.orders).toEqual(before.orders);
    expect(result.state.idempotency).toEqual(before.idempotency);
    expect(result.state.events).toEqual(before.events);
    expect(result.state.cursor).toBe(before.cursor);
  });

  it("ripete la conversione senza duplicazioni né incremento della revisione", () => {
    const first = planPizzaMenuMigration(fixture(), source());
    const second = planPizzaMenuMigration(first.state, source());
    expect(second.state).toEqual(first.state);
    expect(second.state.menuDrafts!.roma.drafts.filter(({ id }) => id === source().draftId)).toHaveLength(1);
    expect(second.state.menuDrafts!.roma.revision).toBe(first.state.menuDrafts!.roma.revision);
  });

  it("usa soltanto la bozza fonte esplicita quando richiesta", () => {
    const state = fixture();
    state.menuDrafts!.roma.drafts[0].products[1].priceCents = 123;
    const before = structuredClone(state);
    const input = { ...source(), sourceDraftId: "bozza-fonte" };
    const result = planPizzaMenuMigration(state, input);
    const target = result.state.menuDrafts!.roma.drafts.find(({ id }) => id === input.draftId)!;
    expect(target.products.find(({ id }) => id === "acqua")?.priceCents).toBe(123);
    expect(result.state.menuDrafts!.roma.drafts.find(({ id }) => id === "bozza-fonte")).toEqual(before.menuDrafts!.roma.drafts[0]);
    expect(result.state.stores).toEqual(before.stores);
  });

  it.each(["bozza-fonte", "pubblicato"])("rifiuta target %s che sovrascrive fonte o pubblicato", draftId => {
    const state = fixture();
    const before = structuredClone(state);
    expect(() => planPizzaMenuMigration(state, { ...source(), sourceDraftId: "bozza-fonte", draftId })).toThrow(Error);
    expect(state).toEqual(before);
  });

  it.each(["store", "source", "product", "pizza", "duplicate-map", "duplicate-target"])("rifiuta %s senza mutazioni parziali", kind => {
    const state = fixture();
    const before = structuredClone(state);
    const input: ReturnType<typeof source> & { sourceDraftId?: string } = source();
    if (kind === "store") input.storeId = "assente";
    if (kind === "source") input.sourceDraftId = "assente";
    if (kind === "product") input.replacements[0].productId = "assente";
    if (kind === "pizza") input.replacements[0].pizzaIds.push("assente");
    if (kind === "duplicate-map") input.replacements.push(structuredClone(input.replacements[0]));
    if (kind === "duplicate-target") input.replacements[0].pizzaIds.push("simple");
    expect(() => planPizzaMenuMigration(state, input)).toThrow(Error);
    expect(state).toEqual(before);
  });
});
