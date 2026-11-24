// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { IndividualCheckoutResult, IndividualQuote, IndividualStore, MenuDraft, MenuWorkspace, PizzaCatalog, PizzaComponent } from "@pizzaos/domain";
import { preparePizzaMenu, validatePizzaCatalog } from "./pizza-catalog";
import { createDiagnostics } from "./diagnostics";
import { buildOrderingApp } from "./http-app";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

const component = (id: string): PizzaComponent => ({ id, name: id, description: "", priceCents: 0, available: true, ingredients: {} });
const ingredientIds = new Set(["panetto", "pomodoro"]);
const invalid = (message: string): never => { throw new Error(message); };
function catalog(): PizzaCatalog {
  return {
    inventoryMode: "dough-format", bases: [],
    doughs: [{ ...component("classico"), inventoryIngredientId: "panetto" }],
    formats: [{ ...component("tonda"), doughQuantity: 2 }],
    toppings: [{ ...component("pomodoro"), category: "Ingredienti", ingredients: { pomodoro: 1 } }],
    tastes: [{ id: "margherita", name: "Margherita", description: "", priceCents: 700, available: true,
      standardDoughId: "classico", standardBaseId: "", standardFormatId: "tonda", doughIds: ["classico"], baseIds: [],
      formatIds: ["tonda"], toppingIds: [], includedToppingIds: ["pomodoro"] }], formulas: [],
    defaults: { doughId: "classico", baseId: "", formatId: "tonda" },
  };
}

describe("validazione autorevole impasti e formati", () => {
  it("pubblica il catalogo nuovo senza richiedere basi", () => {
    expect(() => validatePizzaCatalog(catalog(), ingredientIds, invalid, true, new Map([["panetto", 20], ["pomodoro", 10]]))).not.toThrow();
  });
  it("salva associazioni e quantità mancanti soltanto in bozza", () => {
    const source = catalog();
    delete source.doughs[0].inventoryIngredientId;
    source.formats[0].doughQuantity = null;
    expect(() => validatePizzaCatalog(source, ingredientIds, invalid)).not.toThrow();
    expect(() => validatePizzaCatalog(source, ingredientIds, invalid, true)).toThrow();
  });
  it.each([0, -1, 1.5, Infinity, NaN])("rifiuta quantità impasto non valida %s anche in bozza", quantity => {
    const source = catalog();
    source.formats[0].doughQuantity = quantity;
    expect(() => validatePizzaCatalog(source, ingredientIds, invalid)).toThrow();
  });
  it("rifiuta riferimenti Magazzino inesistenti", () => {
    const source = catalog();
    source.doughs[0].inventoryIngredientId = "assente";
    expect(() => validatePizzaCatalog(source, ingredientIds, invalid)).toThrow();
  });
  it("blocca la pubblicazione quando la scorta dell'impasto non è verificata", () => {
    expect(() => validatePizzaCatalog(catalog(), ingredientIds, invalid, true, new Map([["panetto", null], ["pomodoro", 10]]))).toThrow();
  });
  it("ricompone le pizze dalla sorgente ignorando una proiezione contraffatta del browser", () => {
    const draft: MenuDraft = { id: "menu", name: "Menu", pizzaCatalog: catalog(),
      sections: [{ id: "pizze", name: "Pizze", productIds: ["margherita"] }],
      products: [{ id: "margherita", name: "Contraffatta", description: "", available: true, priceCents: 1,
        ingredients: {}, options: [], allergens: [] }] };
    const prepared = preparePizzaMenu(draft, ingredientIds, invalid);
    const product = prepared.products[0];
    expect(product.name).toBe("Margherita");
    expect(product.priceCents).toBe(700);
    expect(product.options.find(item => item.pizza?.kind === "dough")?.ingredients).toEqual({ panetto: 1 });
    expect(product.options.find(item => item.pizza?.kind === "format")?.pizza?.doughQuantity).toBe(2);
  });
});

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });

function fixture() {
  let state: OrderingState = {
    stores: { roma: { id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true, deliveryBands: [],
      slots: [{ id: "pranzo", startsAt: "2030-01-01T13:00:00Z", capacity: 30 }], products: [],
      ingredients: ["panetto", "integrale", "pomodoro"].map(id => ({ id, name: id, stock: 10,
        food: { contains: id === "integrale" ? ["Glutine"] : [], mayContain: [] } })),
    } }, memberships: [{ storeId: "roma", email: "operator@example.test" }], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  const repository: OrderingRepository = { async transact(work) {
    const snapshot = structuredClone(state);
    const result = await work(snapshot);
    state = snapshot;
    return structuredClone(result);
  } };
  let serial = 0;
  const diagnostics = createDiagnostics({ level: "silent" });
  const service = createOrderingService({ repository, diagnostics, superadminEmails: [],
    now: () => new Date("2030-01-01T12:00:00Z"), id: () => `dough-test-${++serial}`,
    payments: {
      async create() { return { id: "intent", status: "requires_action", clientSecret: "test" }; },
      async read() { return { id: "intent", status: "requires_action", clientSecret: "test" }; },
      async cancel(id) { return { id, status: "cancelled" }; },
      async refund() { return { id: "refund", status: "succeeded" }; },
      async readRefund(id) { return { id, status: "succeeded" }; },
    },
  });
  const authenticate = async (request: { headers: Record<string, unknown> }) => {
    const id = request.headers["x-test-account"];
    return typeof id === "string" ? { id, name: id, email: `${id}@example.test` } : null;
  };
  const app = buildOrderingApp({ service, diagnostics, authenticate });
  apps.push(app);
  const request = (method: "GET" | "PUT" | "POST", url: string, payload?: Record<string, unknown>, account = "operator") => app.inject({
    method, url, payload, headers: { origin: "https://ordering.example.test", "x-pizzaos-origin": "https://ordering.example.test", "x-test-account": account },
  });
  return { request };
}

describe("consumi impasto e formato lungo l'ordine HTTP", () => {
  it("riserva e scarica sei unità soltanto dell'impasto scelto per due pizze, mantenendo condimenti e allergeni", async () => {
    const f = fixture();
    const menuPath = "/v1/pilot/stores/roma/menu-admin";
    const source = catalog();
    source.doughs.push({ ...component("integrale"), inventoryIngredientId: "integrale" });
    source.formats.push({ ...component("maxi"), doughQuantity: 3 });
    source.tastes[0].doughIds.push("integrale");
    source.tastes[0].formatIds.push("maxi");
    const draft: MenuDraft = { id: "menu", name: "Menu", pizzaCatalog: source, products: [],
      sections: [{ id: "pizze", name: "Pizze", productIds: ["margherita"] }] };
    const workspace = (await f.request("GET", menuPath)).json<MenuWorkspace>();
    const saved = await f.request("PUT", `${menuPath}/drafts`, { revision: workspace.revision, draft });
    expect(saved.statusCode, saved.body).toBe(200);
    const published = await f.request("POST", `${menuPath}/publish`, { revision: saved.json<MenuWorkspace>().revision, draftId: draft.id });
    expect(published.statusCode, published.body).toBe(200);
    const customer = (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>();
    expect(JSON.stringify(customer)).not.toContain("doughQuantity");
    expect(customer.menu?.pizzaCatalog).toBeUndefined();
    const product = customer.products.find(item => item.id === "margherita")!;
    expect(product.options.some(item => item.pizza?.kind === "base")).toBe(false);
    const selections = ["dough", "format"].map(kind => ({ optionId: product.options.find(item => item.pizza?.kind === kind
      && item.pizza.sourceId === (kind === "dough" ? "integrale" : "maxi"))!.id, quantity: 1 }));
    const cart = { storeId: "roma", mode: "pickup", slotId: "pranzo", notes: "", lines: [{ productId: "margherita", quantity: 2,
      optionIds: [], selections, notes: "" }] };
    const quoted = await f.request("POST", "/v1/pilot/quote", { cart }, "customer");
    expect(quoted.statusCode, quoted.body).toBe(200);
    const quote = quoted.json<IndividualQuote>();
    expect(quote.lines[0].composition?.contains).toContain("Glutine");
    expect(quote.lines[0].composition?.ingredients).toEqual(expect.arrayContaining(["integrale", "pomodoro"]));
    const checkout = await f.request("POST", "/v1/pilot/checkouts", { cart, fingerprint: quote.fingerprint,
      phone: "+393331234567", method: "cash", idempotencyKey: "dough-quantity" }, "customer");
    expect(checkout.statusCode, checkout.body).toBe(200);
    const order = checkout.json<IndividualCheckoutResult>().order;
    const reserved = await f.request("POST", "/v1/pilot/quote", { cart }, "customer");
    expect(reserved.statusCode, reserved.body).toBe(409);
    expect(reserved.json()).toMatchObject({ code: "inventory_changed" });
    const before = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    expect(before.ingredients.find(item => item.id === "integrale")?.stock).toBe(10);
    for (const action of ["accept", "prepare", "ready", "complete"]) {
      const transitioned = await f.request("POST", `/v1/pilot/orders/${order.id}/actions`, { action });
      expect(transitioned.statusCode, transitioned.body).toBe(200);
    }
    const after = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    expect(after.ingredients.find(item => item.id === "integrale")?.stock).toBe(4);
    expect(after.ingredients.find(item => item.id === "panetto")?.stock).toBe(10);
    expect(after.ingredients.find(item => item.id === "pomodoro")?.stock).toBe(8);
  });
});
