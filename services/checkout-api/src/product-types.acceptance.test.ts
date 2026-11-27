// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { GroupQuote, GroupSnapshot, IndividualAdditionQuote, IndividualCart, IndividualOrder, IndividualProduct, IndividualQuote, IndividualStore, MealSelection, MenuDraft, MenuWorkspace } from "@pizzaos/domain";
import { createDiagnostics } from "./diagnostics";
import { buildOrderingApp } from "./http-app";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";
import { emailText } from "./operational-emails/snapshot";
import { createGroupOrderingService } from "./group/group-service";
import { registerGroupOrderingRoutes } from "./group/group-http";

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
const actor = { id: "operator", email: "operator@example.test", name: "Operatore" };
const customer = { id: "customer", email: "customer@example.test", name: "Cliente" };
const origin = "https://ordering.example.test";
const base = "/v1/pilot";
const menuPath = `${base}/stores/roma/menu-admin`;
function product(id: string, changes: Partial<IndividualProduct> = {}): IndividualProduct {
  return { id, name: id, description: "", available: true, ingredients: {}, allergens: [], options: [], priceCents: 500, productType: "product", ...changes };
}
function menuDraft(): MenuDraft {
  const products = [
    product("panino", { productType: "sandwich", priceCents: 9900, ingredients: { pane: 1, formaggio: 1 } }),
    product("acqua", { priceCents: 200, ingredients: { acqua: 1 } }),
    product("birra", { priceCents: 600, ingredients: { birra: 1 } }),
    product("menu", { productType: "meal", priceCents: 1200, meal: { steps: [
      { id: "portata", name: "Portata", alternatives: [{ productId: "panino", priceCents: 0 }] },
      { id: "bibita", name: "Bibita", alternatives: [{ productId: "acqua", priceCents: -50 }, { productId: "birra", priceCents: 50 }] }
    ] } })
  ];
  return { id: "bozza", name: "Menu", products, sections: [{ id: "prodotti", name: "Prodotti", productIds: products.map(item => item.id) }] };
}
function fixture() {
  let serial = 0;
  let state: OrderingState = { stores: { roma: {
    id: "roma", name: "Roma", acceptingOrders: true, latitude: 41.9, longitude: 12.5, deliveryBands: [], products: [],
    slots: [{ id: "pranzo", startsAt: "2030-01-01T13:00:00Z", capacity: 30 }],
    ingredients: [
      { id: "pane", name: "Pane", stock: 10, food: { contains: ["Glutine"], mayContain: [] } },
      { id: "formaggio", name: "Formaggio", stock: 10, food: { contains: ["Latte"], mayContain: [] }, extra: { enabled: true, priceCents: 100, dose: 1 } },
      { id: "acqua", name: "Acqua", stock: 10, food: { contains: [], mayContain: [] } },
      { id: "birra", name: "Birra", stock: 10, food: { contains: ["Glutine"], mayContain: [] } }
    ]
  } }, orders: {}, memberships: [{ storeId: "roma", email: actor.email }], idempotency: {}, events: [], cursor: 0 };
  const repository: OrderingRepository = { async transact(work) {
    const next = structuredClone(state);
    const result = await work(next);
    state = next;
    return structuredClone(result);
  } };
  const diagnostics = createDiagnostics({ level: "silent" });
  const service = createOrderingService({ repository, superadminEmails: [], diagnostics, now: () => new Date("2030-01-01T12:00:00Z"), id: () => `types-${++serial}`,
    payments: {
      async create() { return { id: "intent", status: "requires_action", clientSecret: "test" }; },
      async read() { return { id: "intent", status: "paid" }; },
      async cancel(id) { return { id, status: "cancelled" }; },
      async refund() { return { id: "refund", status: "succeeded" }; },
      async readRefund(id) { return { id, status: "succeeded" }; }
    }
  });
  const app = buildOrderingApp({ service, diagnostics, authenticate: async request => request.headers["x-actor"] === "operator" ? actor : customer });
  const groups = createGroupOrderingService({ repository, ordering: service, now: () => new Date("2030-01-01T12:00:00Z"), id: () => `group-${++serial}` });
  registerGroupOrderingRoutes(app, { groups, authenticate: async () => customer });
  apps.push(app);
  const request = (method: "GET" | "PUT" | "POST", url: string, payload?: object, operator = false) => app.inject({ method, url, payload,
    headers: { origin, "x-pizzaos-origin": origin, "x-actor": operator ? "operator" : "customer" } });
  async function save(draft: MenuDraft, revision = 0) {
    const response = await request("PUT", `${menuPath}/drafts`, { revision, draft }, true);
    expect(response.statusCode, response.body).toBe(200);
    return response.json<MenuWorkspace>();
  }
  async function deploy(draft = menuDraft()) {
    const saved = await save(draft);
    const response = await request("POST", `${menuPath}/publish`, { revision: saved.revision, draftId: draft.id }, true);
    expect(response.statusCode, response.body).toBe(200);
  }
  return { request, save, deploy, state: () => structuredClone(state), service };
}
function cart(bibita = "acqua", removedIngredientIds: string[] = []): IndividualCart {
  const mealSelections: MealSelection[] = [
    { stepId: "portata", productId: "panino", removedIngredientIds, notes: "Ben caldo" },
    { stepId: "bibita", productId: bibita, removedIngredientIds: [], notes: "" }
  ];
  return { storeId: "roma", mode: "pickup", slotId: "pranzo", notes: "", lines: [{ productId: "menu", kind: "product", quantity: 1, optionIds: [], notes: "", mealSelections }] };
}

describe("Tipi prodotto e Menu autorevole HTTP", () => {
  it.each(["product", "group", "option"] as const)("salva il nome %s vuoto in bozza senza inventare contenuti e blocca la pubblicazione", async field => {
    const f = fixture();
    const item = product("nuovo", { name: field === "product" ? "" : "Box", productType: field === "product" ? "product" : "box",
      ...(field === "product" ? {} : {
        options: [{ id: "scelta", name: field === "option" ? "" : "Birra", priceCents: 0, ingredients: { birra: 1 } }],
        groups: [{ id: "gruppo", name: field === "group" ? "" : "Birre", kind: "selection", min: 1, max: 1, optionIds: ["scelta"] }]
      })
    });
    const draft: MenuDraft = { id: "incompleta", name: "Menu", products: [item], sections: [{ id: "prodotti", name: "Prodotti", productIds: [item.id] }] };
    const saved = await f.save(draft);
    expect(saved.drafts[0].products[0]).toMatchObject(item);
    const publication = await f.request("POST", `${menuPath}/publish`, { revision: saved.revision, draftId: draft.id }, true);
    expect(publication.statusCode, publication.body).toBe(400);
    expect(publication.json()).toMatchObject({ code: "invalid_input" });
  });
  it("i nomi incompleti non rendono salvabili prezzi negativi o ingredienti inesistenti", async () => {
    const f = fixture();
    for (const changes of [{ priceCents: -1 }, { ingredients: { mancante: 1 } }]) {
      const item = product("nuovo", { name: "", ...changes });
      const draft: MenuDraft = { id: "incompleta", name: "Menu", products: [item], sections: [{ id: "prodotti", name: "Prodotti", productIds: [item.id] }] };
      const response = await f.request("PUT", `${menuPath}/drafts`, { revision: 0, draft }, true);
      expect(response.statusCode, response.body).toBe(400);
    }
  });
  it("rifiuta il cambio tipo di un ID salvato", async () => {
    const f = fixture();
    const saved = await f.save(menuDraft());
    const changed = structuredClone(saved.drafts[0]);
    changed.products.find(item => item.id === "panino")!.productType = "product";
    const response = await f.request("PUT", `${menuPath}/drafts`, { revision: saved.revision, draft: changed }, true);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "invalid_input" });
  });
  it("usa prezzo fisso e variazioni, preserva rimozioni, note e allergeni effettivi", async () => {
    const f = fixture(); await f.deploy();
    const water = await f.request("POST", `${base}/quote`, { cart: cart("acqua", ["formaggio"]) });
    expect(water.statusCode, water.body).toBe(200);
    const quote = water.json<IndividualQuote>();
    expect(quote.totalCents).toBe(1150);
    expect(quote.lines[0].composition?.contains).toEqual(["Glutine"]);
    expect(quote.lines[0].composition?.mealSteps?.[0]).toMatchObject({ productName: "panino", notes: "Ben caldo", removedIngredientIds: ["formaggio"] });
    const beer = await f.request("POST", `${base}/quote`, { cart: cart("birra") });
    expect(beer.statusCode, beer.body).toBe(200);
    expect(beer.json<IndividualQuote>().totalCents).toBe(1250);
  });
  it("rifiuta extra e campi arbitrari iniettati nelle fasi", async () => {
    const f = fixture(); await f.deploy();
    const value = cart(); value.lines[0].optionIds = ["extra:formaggio"];
    expect((await f.request("POST", `${base}/quote`, { cart: value })).statusCode).toBe(400);
    const bad = cart();
    const response = await f.request("POST", `${base}/quote`, { cart: { ...bad, lines: [{ ...bad.lines[0], mealSelections: bad.lines[0].mealSelections?.map(item => ({ ...item, optionIds: ["extra"] })) }] } });
    expect(response.statusCode).toBe(400);
  });
  it("pubblica solo fasi complete con riferimenti ammessi e totale non negativo", async () => {
    for (const invalid of ["empty", "missing", "negative", "nested"] as const) {
      const f = fixture(); const draft = menuDraft(); const meal = draft.products.find(item => item.id === "menu")!;
      if (invalid === "empty") meal.meal!.steps[0].alternatives = [];
      if (invalid === "missing") meal.meal!.steps[0].alternatives[0].productId = "missing";
      if (invalid === "negative") meal.meal!.steps[0].alternatives[0].priceCents = -2000;
      if (invalid === "nested") meal.meal!.steps[0].alternatives[0].productId = "menu";
      const saved = await f.save(draft);
      const response = await f.request("POST", `${menuPath}/publish`, { revision: saved.revision, draftId: draft.id }, true);
      expect(response.statusCode, invalid).toBe(400);
    }
  });
  it("impedisce rimozione di prodotti ancora referenziati", async () => {
    const f = fixture(); const saved = await f.save(menuDraft());
    const draft = structuredClone(saved.drafts[0]);
    draft.products = draft.products.filter(item => item.id !== "panino");
    draft.sections[0].productIds = draft.sections[0].productIds.filter(id => id !== "panino");
    expect((await f.request("PUT", `${menuPath}/drafts`, { revision: saved.revision, draft }, true)).statusCode).toBe(400);
  });
  it("riserva e scarica scorte dei figli, conserva lo snapshot anche nelle email", async () => {
    const f = fixture(); await f.deploy(); const value = cart("acqua", ["formaggio"]); value.lines[0].quantity = 2;
    const quoted = await f.request("POST", `${base}/quote`, { cart: value }); const quote = quoted.json<IndividualQuote>();
    const checkout = await f.request("POST", `${base}/checkouts`, { cart: value, fingerprint: quote.fingerprint, phone: "+393331234567", method: "cash", idempotencyKey: "meal" });
    expect(checkout.statusCode, checkout.body).toBe(200);
    const order = checkout.json<{ order: IndividualOrder }>().order;
    expect(order.cart.lines[0].mealSelections).toEqual(expect.arrayContaining(value.lines[0].mealSelections!));
    const email = emailText(order, "Ricevuta", "2030-01-01T12:00:00Z", "Europe/Rome");
    expect(email).toContain("Portata"); expect(email).toContain("panino"); expect(email).toContain("Ben caldo");
    for (const action of ["accept", "prepare", "ready", "complete"]) {
      const response = await f.request("POST", `${base}/orders/${order.id}/actions`, { action }, true);
      expect(response.statusCode, response.body).toBe(200);
    }
    const store = f.state().stores.roma;
    expect(store.ingredients.find(item => item.id === "pane")!.stock).toBe(8);
    expect(store.ingredients.find(item => item.id === "formaggio")!.stock).toBe(10);
    expect(store.ingredients.find(item => item.id === "acqua")!.stock).toBe(8);
  });
  it("proietta gli extra Panino senza dosi e disabilita Menu se una fase è esaurita", async () => {
    const f = fixture(); await f.deploy();
    const catalog = await f.request("GET", `${base}/stores/roma`);
    const publicStore = catalog.json<IndividualStore>(); const sandwich = publicStore.products.find(item => item.id === "panino")!;
    expect(sandwich.options.some(option => option.ingredients.formaggio !== undefined)).toBe(false);
    expect(sandwich.groups?.some(group => group.kind === "extras")).toBe(true);
    expect(sandwich.groups?.some(group => ["dough", "format"].includes(group.kind))).toBe(false);
    const operatorStore = (await f.request("GET", `${base}/stores/roma`, undefined, true)).json<IndividualStore>();
    operatorStore.ingredients.find(item => item.id === "acqua")!.stock = 0;
    operatorStore.ingredients.find(item => item.id === "birra")!.stock = 0;
    const saved = await f.request("PUT", `${base}/stores/roma`, operatorStore, true);
    expect(saved.statusCode, saved.body).toBe(200);
    const changed = (await f.request("GET", `${base}/stores/roma`)).json<IndividualStore>();
    expect(changed.products.find(item => item.id === "menu")!.available).toBe(false);
    const hiddenStore = (await f.request("GET", `${base}/stores/roma`, undefined, true)).json<IndividualStore>();
    hiddenStore.outOfStockBehavior = "hide";
    expect((await f.request("PUT", `${base}/stores/roma`, hiddenStore, true)).statusCode).toBe(200);
    const hidden = (await f.request("GET", `${base}/stores/roma`)).json<IndividualStore>();
    expect(hidden.products.some(item => item.id === "menu")).toBe(false);
    expect(hidden.menu!.sections.flatMap(section => section.productIds)).not.toContain("menu");
  });
  it("mantiene le fasi nel gruppo e usa lo stesso preventivo canonico", async () => {
    const f = fixture(); await f.deploy();
    let response = await f.request("POST", `${base}/groups`, { storeId: "roma", lines: [], idempotencyKey: "product-types-group" });
    expect(response.statusCode, response.body).toBe(200); let group = response.json<GroupSnapshot>();
    response = await f.request("PUT", `${base}/groups/${group.id}/lines`, { participantId: group.participantId, revision: group.revision, lines: cart("birra", ["formaggio"]).lines });
    expect(response.statusCode, response.body).toBe(200); group = response.json<GroupSnapshot>();
    response = await f.request("POST", `${base}/groups/${group.id}/close`, { revision: group.revision });
    expect(response.statusCode, response.body).toBe(200); group = response.json<GroupSnapshot>();
    const fulfillment = { mode: "pickup", slotId: "pranzo", notes: "" };
    response = await f.request("POST", `${base}/groups/${group.id}/quote`, { revision: group.revision, fulfillment });
    expect(response.statusCode, response.body).toBe(200); const quoted = response.json<GroupQuote>();
    expect(quoted.quote.totalCents).toBe(1250);
    response = await f.request("POST", `${base}/groups/${group.id}/checkout`, { revision: quoted.revision, fingerprint: quoted.quote.fingerprint, fulfillment, phone: "+393331234567", method: "cash", idempotencyKey: "group-meal" });
    expect(response.statusCode, response.body).toBe(200);
    const order = response.json<{ order: IndividualOrder }>().order;
    expect(order.quote.lines[0].composition?.mealSteps?.[0]).toMatchObject({ notes: "Ben caldo", removedIngredientIds: ["formaggio"] });
  });
  it("aggiunge un Menu a un ordine preservando fasi e delta fisso", async () => {
    const f = fixture(); await f.deploy();
    const initial = cart(); initial.lines = [{ productId: "acqua", quantity: 1, optionIds: [], notes: "" }];
    const quote = (await f.request("POST", `${base}/quote`, { cart: initial })).json<IndividualQuote>();
    let response = await f.request("POST", `${base}/checkouts`, { cart: initial, fingerprint: quote.fingerprint, phone: "+393331234567", method: "cash", idempotencyKey: "initial" });
    expect(response.statusCode, response.body).toBe(200); const order = response.json<{ order: IndividualOrder }>().order;
    const lines = cart("birra", ["formaggio"]).lines;
    response = await f.request("POST", `${base}/orders/${order.id}/additions/quote`, { lines });
    expect(response.statusCode, response.body).toBe(200); const addition = response.json<IndividualAdditionQuote>();
    expect(addition.deltaCents).toBe(1250);
    response = await f.request("POST", `${base}/orders/${order.id}/additions`, { lines, fingerprint: addition.fingerprint, idempotencyKey: "meal-addition" });
    expect(response.statusCode, response.body).toBe(200);
    const changed = response.json<{ order: IndividualOrder }>().order;
    expect(changed.quote.totalCents).toBe(1450);
    expect(changed.cart.lines[1].mealSelections).toHaveLength(2);
    expect(changed.quote.lines[1].composition?.mealSteps?.[0].notes).toBe("Ben caldo");
  });
  it("include impasto consigliato e formato standard senza supplementi e senza ripiego", async () => {
    const f = fixture(); const draft = menuDraft();
    draft.pizzaCatalog = { inventoryMode: "dough-format", defaults: { doughId: "classico", baseId: "", formatId: "tonda" }, bases: [], formulas: [],
      doughs: [
        { id: "classico", name: "Classico", description: "", priceCents: 0, available: true, ingredients: {}, inventoryIngredientId: "pane" },
        { id: "consigliato", name: "Consigliato", description: "", priceCents: 300, available: true, ingredients: {}, inventoryIngredientId: "birra" }
      ],
      formats: [{ id: "tonda", name: "Tonda", description: "", priceCents: 0, available: true, ingredients: {}, doughQuantity: 2 }],
      toppings: [{ id: "formaggio", name: "Formaggio", category: "Ingredienti", description: "", priceCents: 0, available: true, ingredients: { formaggio: 1 } }],
      tastes: [{ id: "pizza", name: "Pizza", description: "", priceCents: 900, available: true,
        standardDoughId: "classico", recommendedDoughId: "consigliato", standardBaseId: "", standardFormatId: "tonda",
        doughIds: ["classico", "consigliato"], baseIds: [], formatIds: ["tonda"], toppingIds: [], includedToppingIds: ["formaggio"] }]
    };
    draft.sections[0].productIds.push("pizza");
    draft.products.find(item => item.id === "menu")!.meal!.steps[0].alternatives = [{ productId: "pizza", priceCents: 0 }];
    await f.deploy(draft);
    const value = cart(); value.lines[0].mealSelections![0].productId = "pizza";
    const response = await f.request("POST", `${base}/quote`, { cart: value });
    expect(response.statusCode, response.body).toBe(200); expect(response.json<IndividualQuote>().totalCents).toBe(1150);
    const composition = response.json<IndividualQuote>().lines[0].composition!.mealSteps![0].composition;
    expect(composition.choices.some(item => item.name === "Consigliato")).toBe(true);
    value.lines[0].mealSelections![0].removedIngredientIds = ["birra"];
    expect((await f.request("POST", `${base}/quote`, { cart: value })).statusCode).toBe(409);
    value.lines[0].mealSelections![0].removedIngredientIds = [];
    const store = (await f.request("GET", `${base}/stores/roma`, undefined, true)).json<IndividualStore>();
    store.ingredients.find(item => item.id === "birra")!.stock = 0;
    expect((await f.request("PUT", `${base}/stores/roma`, store, true)).statusCode).toBe(200);
    const publicStore = (await f.request("GET", `${base}/stores/roma`)).json<IndividualStore>();
    expect(publicStore.products.find(item => item.id === "menu")!.available).toBe(false);
    expect((await f.request("POST", `${base}/quote`, { cart: value })).statusCode).toBe(409);
  });
});
