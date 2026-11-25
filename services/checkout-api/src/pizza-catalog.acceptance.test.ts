// @vitest-environment node
import type { FastifyInstance } from "fastify";
import { planProductClassification, resolveMenuComposition } from "@pizzaos/domain";
import { afterEach, describe, expect, it } from "vitest";
import { materializePizzaMenu, type GroupSnapshot, type IndividualCheckoutResult, type IndividualOrder, type IndividualProduct, type IndividualQuote, type IndividualStore, type MenuDraft, type MenuWorkspace, type PizzaComponent } from "@pizzaos/domain";
import { createDiagnostics } from "./diagnostics";
import { registerGroupOrderingRoutes } from "./group/group-http";
import { createGroupOrderingService } from "./group/group-service";
import { buildOrderingApp } from "./http-app";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

const apps: FastifyInstance[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
const menuPath = "/v1/pilot/stores/roma/menu-admin";

function fixture() {
  let state: OrderingState = {
    stores: { roma: {
      id: "roma", name: "Roma", latitude: 41.9, longitude: 12.5, acceptingOrders: true, deliveryBands: [],
      slots: [{ id: "pranzo", startsAt: "2030-01-01T13:00:00Z", capacity: 30 }],
      ingredients: ["farina", "crusca", "pomodoro", "latte"].map(id => ({ id, name: id, stock: 30, food: { contains: id === "latte" ? ["Latte"] : [], mayContain: [] } })),
      products: [],
    } },
    memberships: [{ storeId: "roma", email: "operator@example.test" }], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  const repository: OrderingRepository = { async transact(work) {
    const snapshot = structuredClone(state);
    const result = await work(snapshot);
    state = snapshot;
    return structuredClone(result);
  } };
  let serial = 0;
  const diagnostics = createDiagnostics({ level: "silent" });
  const service = createOrderingService({
    repository, diagnostics, superadminEmails: [], now: () => new Date("2030-01-01T12:00:00Z"), id: () => `pizza-test-${++serial}`,
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
  registerGroupOrderingRoutes(app, { authenticate, groups: createGroupOrderingService({
    repository, ordering: service, now: () => new Date("2030-01-01T12:00:00Z"), id: () => `pizza-group-${++serial}`,
  }) });
  apps.push(app);
  const request = (method: "GET" | "PUT" | "POST", url: string, payload?: Record<string, unknown>, account = "operator") => app.inject({
    method, url, payload, headers: { origin: "https://ordering.example.test", "x-pizzaos-origin": "https://ordering.example.test", "x-test-account": account },
  });
  const workspace = async () => (await request("GET", menuPath)).json<MenuWorkspace>();
  const save = async (candidate: MenuDraft) => request("PUT", `${menuPath}/drafts`, { revision: (await workspace()).revision, draft: candidate });
  const publish = async (id: string) => request("POST", `${menuPath}/publish`, { revision: (await workspace()).revision, draftId: id });
  const quote = (product: IndividualProduct, selections = product.pizza?.defaultSelections, kind?: string) => request("POST", "/v1/pilot/quote", { cart: {
    storeId: "roma", mode: "pickup", slotId: "pranzo", notes: "", lines: [{ productId: product.id, quantity: 1, optionIds: [], selections, kind, notes: "" }],
  } }, "customer");
  return { request, workspace, save, publish, quote };
}

function component(id: string, priceCents: number, ingredients: Record<string, number | null>): PizzaComponent {
  return { id, name: id, description: "", priceCents, available: true, ingredients };
}

function draft(): MenuDraft {
  return {
    id: "pizza", name: "Pizza", products: [], sections: [{ id: "pizze", name: "Pizze", description: "Dal forno", productIds: ["margherita"] }],
    pizzaCatalog: {
      doughs: [component("classico", 200, { farina: 2 }), component("integrale", 320, { crusca: 3 })],
      bases: [component("rossa", 0, { pomodoro: 1 })], formats: [component("tonda", 0, {})],
      toppings: [{ ...component("mozzarella", 150, { latte: 1 }), category: "Formaggi" }], formulas: [],
      tastes: [{ id: "margherita", name: "Margherita", description: "", priceCents: 600, available: true,
        standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico", "integrale"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: ["mozzarella"], includedToppingIds: ["mozzarella"] }],
    },
  };
}

function inventoryDraft(): MenuDraft {
  const candidate = draft();
  const source = candidate.pizzaCatalog!;
  source.inventoryExtras = true;
  source.defaults = { doughId: "classico", baseId: "rossa", formatId: "tonda" };
  source.tastes = [];
  source.toppings = [];
  source.formulas = [{ id: "libera", name: "Pizza a modo mio", description: "", priceCents: 900, available: true,
    standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico", "integrale"],
    baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [], extraOffer: { quota: 2, percent: 40 } }];
  candidate.sections[0].productIds = ["libera"];
  return candidate;
}

describe("catalogo pizza autorevole via HTTP", () => {
  it("salva e pubblica il consiglio senza alterare standard e preventivo", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.tastes[0].recommendedDoughId = "integrale";
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json<MenuWorkspace>().drafts[0].pizzaCatalog!.tastes[0].recommendedDoughId).toBe("integrale");
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const store = (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>();
    const product = store.products.find(item => item.id === "margherita")!;
    expect(product.pizza?.recommendedDoughOptionId).toBe("dough:integrale");
    expect(product.pizza?.defaultSelections).toContainEqual({ optionId: "dough:classico", quantity: 1 });
    const quote = await f.quote(product);
    expect(quote.statusCode, quote.body).toBe(200);
  });

  it("rifiuta un consiglio estraneo agli impasti del menu", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.tastes[0].recommendedDoughId = "inesistente";
    expect((await f.save(candidate)).statusCode).toBe(400);
  });

  it("pubblica con custom disabilitato mantenendo formule sorgenti riattivabili", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.formulas = inventoryDraft().pizzaCatalog!.formulas;
    candidate.pizzaCatalog!.customEnabled = false;
    candidate.sections[0].productIds.push("libera");
    candidate.products.push({ id: "acqua", name: "Acqua", description: "", priceCents: 200, available: true,
      allergens: [], ingredients: {}, options: [], pairingProductIds: ["libera"] });
    candidate.sections[0].productIds.push("acqua");
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    const workspaceDraft = saved.json<MenuWorkspace>().drafts.find(({ id }) => id === candidate.id)!;
    expect(workspaceDraft.pizzaCatalog?.formulas).toHaveLength(1);
    expect(workspaceDraft.sections[0].productIds).toContain("libera");
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const publicStore = (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>();
    expect(publicStore.products.map(({ id }) => id)).toEqual(["acqua", "margherita"]);
    expect(publicStore.products.find(({ id }) => id === "acqua")?.pairingProductIds).toEqual(["libera"]);
    const operatorMenu = (await f.workspace()).published;
    expect(operatorMenu?.pizzaCatalog?.formulas).toHaveLength(1);
  });

  it.each([
    { quota: -1, percent: 40 }, { quota: 101, percent: 40 },
    { quota: 2, percent: -1 }, { quota: 2, percent: 101 },
  ])("rifiuta regole commerciali fuori limite $quota/$percent atomicamente", async extraOffer => {
    const f = fixture();
    const before = await f.workspace();
    const candidate = inventoryDraft();
    candidate.pizzaCatalog!.formulas[0].extraOffer = extraOffer;
    const response = await f.save(candidate);
    expect(response.statusCode, response.body).toBe(400);
    expect(response.json()).toMatchObject({ code: "invalid_input" });
    expect(await f.workspace()).toEqual(before);
  });

  it.each([
    { enabled: true, priceCents: -1, dose: 1 },
    { enabled: true, priceCents: 100.5, dose: 1 },
    { enabled: true, priceCents: 100, dose: 0 },
    { enabled: true, priceCents: 100, dose: 1.5 },
  ])("rifiuta prezzo/dose extra non validi $priceCents/$dose senza modificare il Magazzino", async extra => {
    const f = fixture();
    const before = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const candidate = structuredClone(before);
    candidate.ingredients[0].extra = extra;
    const response = await f.request("PUT", "/v1/pilot/stores/roma", { ...candidate });
    expect(response.statusCode, response.body).toBe(400);
    expect(response.json()).toMatchObject({ code: "invalid_input" });
    expect((await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>()).toEqual(before);
  });

  it("salva lo snapshot degli extra dal Magazzino e quota la formula libera a 1300 centesimi", async () => {
    const f = fixture();
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    store.ingredients.push(...[300, 200, 100].map((priceCents, index) => ({ id: `libero-${index}`, name: `Extra ${index}`, stock: 30,
      extra: { enabled: true, priceCents, dose: 2 }, food: { contains: [], mayContain: [] } })));
    const configured = await f.request("PUT", "/v1/pilot/stores/roma", { ...store });
    expect(configured.statusCode, configured.body).toBe(200);
    const saved = await f.save(inventoryDraft());
    expect(saved.statusCode, saved.body).toBe(200);
    const savedDraft = saved.json<MenuWorkspace>().drafts.find(({ id }) => id === "pizza")!;
    expect(savedDraft.pizzaCatalog?.inventorySignature).toEqual(expect.any(String));
    expect(savedDraft.pizzaCatalog!.toppings.filter(({ inventoryIngredientId }) => inventoryIngredientId)).toHaveLength(3);
    expect((await f.publish("pizza")).statusCode).toBe(200);
    const customerStore = (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>();
    expect(customerStore.menu?.pizzaCatalog).toBeUndefined();
    const product = customerStore.products.find(({ id }) => id === "libera")!;
    const options = product.options.filter(({ pizza }) => pizza?.kind === "topping");
    expect(options).toHaveLength(3);
    const quote = await f.quote(product, [...product.pizza!.defaultSelections, ...options.map(({ id }) => ({ optionId: id, quantity: 1 }))]);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().totalCents).toBe(1300);
    const serialized = JSON.stringify(customerStore);
    expect(serialized).not.toContain("inventoryIngredientId");
    expect(serialized).not.toContain('"extra":{"enabled"');
  });

  it("applica subito prezzo e dose correnti, conservando il controllo della bozza obsoleta", async () => {
    const f = fixture();
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    store.ingredients.find(({ id }) => id === "latte")!.extra = { enabled: true, priceCents: 300, dose: 2 };
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...store })).statusCode).toBe(200);
    const saved = await f.save(inventoryDraft());
    expect(saved.statusCode, saved.body).toBe(200);
    const candidate = saved.json<MenuWorkspace>().drafts.find(({ id }) => id === "pizza")!;
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const before = (await f.workspace()).published;
    const active = (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>().products[0];
    const topping = active.options.find(({ pizza }) => pizza?.kind === "topping")!;
    const choices = [...active.pizza!.defaultSelections, { optionId: topping.id, quantity: 1 }];
    expect((await f.quote(active, choices)).json<IndividualQuote>().totalCents).toBe(1080);
    candidate.id = "prossima";
    expect((await f.save(candidate)).statusCode).toBe(200);

    const changed = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    changed.ingredients.find(({ id }) => id === "latte")!.extra = { enabled: true, priceCents: 500, dose: 4 };
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...changed })).statusCode).toBe(200);
    expect((await f.quote(active, choices)).json<IndividualQuote>().totalCents).toBe(1200);
    const blocked = await f.publish(candidate.id);
    expect(blocked.statusCode, blocked.body).toBe(400);
    expect(blocked.json()).toMatchObject({ code: "invalid_input" });
    expect((await f.workspace()).published).toEqual(before);

    const updated = await f.save(candidate);
    expect(updated.statusCode, updated.body).toBe(200);
    const refreshed = updated.json<MenuWorkspace>().drafts.find(({ id }) => id === candidate.id)!;
    expect(refreshed.pizzaCatalog!.inventorySignature).not.toBe(candidate.pizzaCatalog!.inventorySignature);
    expect(refreshed.pizzaCatalog!.toppings.find(({ inventoryIngredientId }) => inventoryIngredientId === "latte")).toMatchObject({ priceCents: 500, ingredients: { latte: 4 } });
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    expect((await f.quote(active, choices)).json<IndividualQuote>().totalCents).toBe(1200);
    refreshed.id = "solo-scorte";
    const stockDraft = await f.save(refreshed);
    expect(stockDraft.statusCode, stockDraft.body).toBe(200);

    const stockChanged = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    stockChanged.ingredients.find(({ id }) => id === "latte")!.stock = 3;
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...stockChanged })).statusCode).toBe(200);
    expect((await f.publish(refreshed.id)).statusCode).toBe(200);
    const unavailable = await f.quote(active, choices);
    expect(unavailable.statusCode, unavailable.body).toBe(409);
    expect(unavailable.json()).toMatchObject({ code: "inventory_changed" });
  });

  it("pubblica con dose ignota di un extra abilitato", async () => {
    const f = fixture();
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const ingredient = store.ingredients.find(({ id }) => id === "latte")!;
    ingredient.extra = { enabled: true, priceCents: 200, dose: null };
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...store })).statusCode).toBe(200);
    const saved = await f.save(inventoryDraft());
    expect(saved.statusCode, saved.body).toBe(200);
    const published = await f.publish("pizza");
    expect(published.statusCode, published.body).toBe(200);
    expect((await f.workspace()).published.pizzaCatalog?.toppings.find(item => item.inventoryIngredientId === "latte")?.ingredients.latte).toBeNull();
  });

  it("permette di ordinare un gusto con topping disattivato soltanto dopo averlo rimosso", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.toppings[0].available = false;
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const product = store.products.find(({ id }) => id === "margherita")!;
    expect(product.available).toBe(true);
    const blocked = await f.quote(product);
    expect(blocked.statusCode, blocked.body).toBe(409);
    expect(blocked.json()).toMatchObject({ code: "customization_changed" });
    const removal = product.options.find(({ pizza }) => pizza?.kind === "removal" && pizza.sourceId === "mozzarella")!;
    const restored = await f.quote(product, [...product.pizza!.defaultSelections, { optionId: removal.id, quantity: 1 }]);
    expect(restored.statusCode, restored.body).toBe(200);
    expect(restored.json<IndividualQuote>().totalCents).toBe(600);
    expect(restored.json<IndividualQuote>().lines[0].composition?.contains).not.toContain("Latte");
  });

  it("accetta il tipo pizza_taste e rifiuta tipi riga incoerenti con il prodotto", async () => {
    const f = fixture();
    const saved = await f.save(draft());
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await f.publish("pizza")).statusCode).toBe(200);
    const product = saved.json<MenuWorkspace>().drafts[0].products[0];
    expect((await f.quote(product, product.pizza!.defaultSelections, "pizza_taste")).statusCode).toBe(200);
    for (const kind of ["product", "pizza_formula"]) {
      const result = await f.quote(product, product.pizza!.defaultSelections, kind);
      expect(result.statusCode, result.body).toBe(409);
      expect(result.json()).toMatchObject({ code: "customization_changed" });
    }
  });

  it("condivide il calcolo della pizza tra ordine individuale e raccolta di gruppo", async () => {
    const f = fixture();
    const saved = await f.save(draft());
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await f.publish("pizza")).statusCode).toBe(200);
    const product = saved.json<MenuWorkspace>().drafts[0].products[0];
    const individual = await f.quote(product);
    expect(individual.statusCode, individual.body).toBe(200);
    const created = await f.request("POST", "/v1/pilot/groups", { storeId: "roma", name: "Andrea", deadline: "2030-01-01T12:30:00.000Z" }, "customer");
    expect(created.statusCode, created.body).toBe(200);
    const group = created.json<GroupSnapshot>();
    const path = `/v1/pilot/groups/${group.id}`;
    const updated = await f.request("PUT", `${path}/lines`, { participantId: group.participantId, revision: group.revision, lines: [{
      productId: product.id, quantity: 1, optionIds: [], selections: product.pizza!.defaultSelections, notes: "",
    }] }, "customer");
    expect(updated.statusCode, updated.body).toBe(200);
    const closed = await f.request("POST", `${path}/close`, { revision: updated.json<GroupSnapshot>().revision }, "customer");
    expect(closed.statusCode, closed.body).toBe(200);
    const quoted = await f.request("POST", `${path}/quote`, { revision: closed.json<GroupSnapshot>().revision, fulfillment: { mode: "pickup", slotId: "pranzo", notes: "" } }, "customer");
    expect(quoted.statusCode, quoted.body).toBe(200);
    const groupQuote = quoted.json<{ quote: IndividualQuote }>().quote;
    expect(groupQuote.totalCents).toBe(600);
    expect(groupQuote.lines[0].composition).toEqual(individual.json<IndividualQuote>().lines[0].composition);
  });

  it("conserva la composizione acquistata dopo una nuova pubblicazione", async () => {
    const f = fixture();
    const candidate = draft();
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const product = saved.json<MenuWorkspace>().drafts.find(({ id }) => id === candidate.id)!.products[0];
    const response = await f.quote(product);
    expect(response.statusCode, response.body).toBe(200);
    const quote = response.json<IndividualQuote>();
    const cart = { storeId: "roma", mode: "pickup", slotId: "pranzo", notes: "", lines: [{
      productId: product.id, quantity: 1, optionIds: [], selections: product.pizza!.defaultSelections, notes: "",
    }] };
    const checkout = await f.request("POST", "/v1/pilot/checkouts", {
      cart, fingerprint: quote.fingerprint, phone: "+393331234567", method: "cash", idempotencyKey: "pizza-storica",
    }, "customer");
    expect(checkout.statusCode, checkout.body).toBe(200);
    const bought = checkout.json<IndividualCheckoutResult>().order;
    expect(bought.quote.lines[0].composition).toEqual(quote.lines[0].composition);
    expect(bought.quote.lines[0].composition?.ingredients).toEqual(expect.arrayContaining(["farina", "pomodoro", "latte"]));
    candidate.id = "nuovo-menu";
    candidate.pizzaCatalog!.tastes[0].name = "Nuova margherita";
    candidate.pizzaCatalog!.tastes[0].priceCents = 900;
    expect((await f.save(candidate)).statusCode).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const history = await f.request("GET", "/v1/pilot/orders", undefined, "customer");
    expect(history.statusCode).toBe(200);
    expect(history.json<IndividualOrder[]>()[0].quote.lines).toEqual(bought.quote.lines);
  });

  it("rigenera prezzo e ricette da sorgente anche quando la proiezione del browser è contraffatta", async () => {
    const f = fixture();
    const source = draft();
    const tampered = materializePizzaMenu(source);
    tampered.products[0].priceCents = 1;
    tampered.products[0].ingredients = { latte: 999 };
    tampered.products[0].food = { contains: ["Senape"], mayContain: [] };
    tampered.products[0].pizza!.sourceId = "sorgente-contraffatta";
    for (const option of tampered.products[0].options) { option.priceCents = 0; option.ingredients = {}; }
    const saved = await f.save(tampered);
    expect(saved.statusCode, saved.body).toBe(200);
    const projected = saved.json<MenuWorkspace>().drafts.find(({ id }) => id === source.id)!.products[0];
    expect(projected.priceCents).toBe(600);
    const published = await f.publish(source.id);
    expect(published.statusCode, published.body).toBe(200);
    const response = await f.quote(projected);
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json<IndividualQuote>().totalCents).toBe(600);
    expect(response.json<IndividualQuote>().lines[0].composition?.contains).toContain("Latte");
    expect(response.json<IndividualQuote>().lines[0].composition?.contains).not.toContain("Senape");
    expect(projected.pizza?.sourceId).toBe("margherita");
    const alternate = projected.options.find(({ pizza }) => pizza?.kind === "dough" && pizza.sourceId === "integrale")!;
    expect(alternate.priceCents).toBe(120);
  });

  it("rifiuta sorgenti pizza private su un prodotto ordinario anche in presenza del catalogo pizza", async () => {
    const f = fixture();
    const before = await f.workspace();
    const candidate = draft();
    candidate.products.push({ id: "bibita", name: "Bibita", description: "", priceCents: 200, available: true,
      ingredients: {}, allergens: [], options: [], pizzaRecipeSources: [{ sourceId: "estranea", ingredients: { latte: 1 } }] });
    candidate.sections[0].productIds.push("bibita");
    const response = await f.save(candidate);
    expect(response.statusCode, response.body).toBe(400);
    expect(await f.workspace()).toEqual(before);
  });

  it("conserva dosi sconosciute in bozza e nel menu pubblicato", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.doughs[0].ingredients.farina = null;
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json<MenuWorkspace>().drafts[0].pizzaCatalog?.doughs[0].ingredients.farina).toBeNull();
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    expect((await f.workspace()).published.pizzaCatalog?.doughs[0].ingredients.farina).toBeNull();
    expect((await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>().products[0].available).toBe(true);
  });

  it.each(["duplicate", "missing", "standard"])("rifiuta riferimenti %s senza scritture parziali", async kind => {
    const f = fixture();
    const before = await f.workspace();
    const candidate = draft();
    const source = candidate.pizzaCatalog!;
    if (kind === "duplicate") source.doughs.push(structuredClone(source.doughs[0]));
    if (kind === "missing") source.tastes[0].toppingIds.push("inesistente");
    if (kind === "standard") source.tastes[0].standardDoughId = "estraneo";
    const result = await f.save(candidate);
    if (result.statusCode === 200) {
      expect((await f.publish(candidate.id)).statusCode).toBe(400);
      expect((await f.workspace()).published).toEqual(before.published);
    } else {
      expect(result.statusCode, result.body).toBe(400);
      expect(await f.workspace()).toEqual(before);
    }
  });

  it.each(["external-image", "traversal-image", "formula-taste"])("rifiuta metadati sorgente %s atomicamente", async kind => {
    const f = fixture();
    const before = await f.workspace();
    const candidate = draft();
    const source = candidate.pizzaCatalog!;
    if (kind === "external-image") source.doughs[0].imagePath = "https://example.test/impasto.png";
    if (kind === "traversal-image") source.doughs[0].imagePath = "/images/../privato.png";
    if (kind === "formula-taste") {
      const entry = { ...source.tastes[0] };
      Reflect.deleteProperty(entry, "includedToppingIds");
      source.formulas.push({ ...entry, id: "simple", name: "Simple", offer: "Simple" });
      Object.assign(source.formulas[0], { tasteId: "margherita" });
    }
    const response = await f.save(candidate);
    expect(response.statusCode, response.body).toBe(400);
    expect(await f.workspace()).toEqual(before);
  });
});

describe("classificazione ed extra comuni: contratto HTTP indipendente", () => {
  it("sincronizza, pubblica e quota un extra con ID ingrediente valido di 120 caratteri", async () => {
    const f = fixture();
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const ingredientId = "i".repeat(120);
    const configured = await f.request("PUT", "/v1/pilot/stores/roma", {
      ...store, ingredients: [...store.ingredients, { id: ingredientId, name: "Extra con ID lungo", stock: 30, food: { contains: [], mayContain: [] }, extra: { enabled: true, priceCents: 100, dose: 1 } }]
    });
    expect(configured.statusCode, configured.body).toBe(200);
    const candidate = draft();
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const pizza = (await f.workspace()).published!.products.find((product) => product.pizza?.sourceId === "margherita")!;
    const extra = pizza.options.find((option) => option.pizza?.kind === "topping" && option.name === "Extra con ID lungo");
    expect(extra).toMatchObject({ priceCents: 100, ingredients: { [ingredientId]: 1 } });
    const quote = await f.quote(pizza, [...pizza.pizza!.defaultSelections, { optionId: extra!.id, quantity: 1 }]);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(700);
  });

  it("una scelta specifica può rimuovere pomodoro esaurito anche dopo conversione e nella proiezione cliente", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.id = "rimozioni-ordinario";
    candidate.pizzaCatalog!.defaults = { doughId: "classico", baseId: "rossa", formatId: "tonda" };
    const generic: IndividualProduct = {
      id: "specialita-rimozioni", name: "Specialità senza pomodoro", description: "", priceCents: 800, available: true,
      allergens: [], ingredients: { farina: 2, pomodoro: 1, latte: 1 },
      options: [{ id: "salsa-rimozioni", name: "Salsa", priceCents: 70, ingredients: { latte: 1 }, removesIngredientIds: ["pomodoro"] }],
      groups: [{ id: "salse-rimozioni", name: "Salse", kind: "selection", min: 1, max: 1, optionIds: ["salsa-rimozioni"] }]
    };
    candidate.products.push(generic);
    candidate.sections[0].productIds.push(generic.id);
    const baselineSaved = await f.save(candidate);
    expect(baselineSaved.statusCode, baselineSaved.body).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const setTomatoStock = async (stock: number) => {
      const current = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
      const changed = await f.request("PUT", "/v1/pilot/stores/roma", { ...current, outOfStockBehavior: "allow", ingredients: current.ingredients.map((ingredient) => ingredient.id === "pomodoro" ? { ...ingredient, stock } : ingredient) });
      expect(changed.statusCode, changed.body).toBe(200);
    };
    await setTomatoStock(0);
    const baselineQuote = await f.quote(generic, [{ optionId: "salsa-rimozioni", quantity: 1 }]);
    expect(baselineQuote.statusCode, baselineQuote.body).toBe(200);
    await setTomatoStock(30);
    candidate.id = "rimozioni-pizza";
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const plan = planProductClassification(candidate, generic.id, true, store.ingredients);
    expect(plan.errors).toEqual([]);
    const saved = await f.save(plan.draft!);
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    await setTomatoStock(0);
    const pizza = (await f.workspace()).published!.products.find((product) => product.id === generic.id)!;
    const selections = [...pizza.pizza!.defaultSelections, { optionId: "salsa-rimozioni", quantity: 1 }];
    const quote = await f.quote(pizza, selections);
    expect.soft(quote.statusCode, quote.body).toBe(200);
    if (quote.statusCode === 200) expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(870);
    const clientStore = (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>();
    const clientPizza = clientStore.products.find((product) => product.id === generic.id)!;
    expect(resolveMenuComposition(clientPizza, selections).valid).toBe(true);
  });

  it("pubblica un nuovo prodotto vuoto classificato pizza a partire dagli standard", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.defaults = { doughId: "classico", baseId: "rossa", formatId: "tonda" };
    candidate.products.push({ id: "nuova", name: "Nuova pizza", description: "", priceCents: 600, available: true, allergens: [], ingredients: {}, options: [] });
    candidate.sections[0].productIds.push("nuova");
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const plan = planProductClassification(candidate, "nuova", true, store.ingredients, { newProduct: true });
    expect(plan.errors).toEqual([]);
    const saved = await f.save(plan.draft!);
    expect(saved.statusCode, saved.body).toBe(200);
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const product = (await f.workspace()).published!.products.find((entry) => entry.id === "nuova")!;
    const quote = await f.quote(product);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(600);
    const current = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const changed = await f.request("PUT", "/v1/pilot/stores/roma", { ...current, ingredients: current.ingredients.map((ingredient) => ingredient.id === "farina" ? { ...ingredient, stock: 1 } : ingredient) });
    expect(changed.statusCode, changed.body).toBe(200);
    expect((await f.quote(product)).statusCode).toBe(409);
  });

  it.each(["residuo conversione", "defaults vuoti espliciti", "extra inutilizzato senza prezzo", "extra inutilizzato senza dose", "firma extra inutilizzato superata"])("pubblica un menu ordinario dopo on/off senza catalogo iniziale: %s", async (residual) => {
    const f = fixture();
    if (residual === "extra inutilizzato senza prezzo") await configureLatte(f, { enabled: true, priceCents: null, dose: 2 });
    if (residual === "extra inutilizzato senza dose") await configureLatte(f, { enabled: true, priceCents: 150, dose: null });
    if (residual === "firma extra inutilizzato superata") await configureLatte(f, { enabled: true, priceCents: 150, dose: 2 });
    const candidate: MenuDraft = {
      id: "ordinario", name: "Menu ordinario", sections: [{ id: "bevande", name: "Bevande", productIds: ["acqua"] }],
      products: [{ id: "acqua", name: "Acqua", description: "", priceCents: 200, available: true, allergens: [], ingredients: {}, options: [] }]
    };
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const asPizza = planProductClassification(candidate, "acqua", true, store.ingredients);
    expect(asPizza.errors).toEqual([]);
    const asOrdinary = planProductClassification(asPizza.draft!, "acqua", false, store.ingredients);
    expect(asOrdinary.errors).toEqual([]);
    const finalDraft = asOrdinary.draft!;
    if (residual === "defaults vuoti espliciti") finalDraft.pizzaCatalog = { doughs: [], bases: [], formats: [], toppings: [], tastes: [], formulas: [], defaults: { doughId: "", baseId: "", formatId: "" } };
    expect(finalDraft.products.some((product) => product.pizza)).toBe(false);
    const saved = await f.save(finalDraft);
    expect(saved.statusCode, saved.body).toBe(200);
    if (residual === "firma extra inutilizzato superata") await configureLatte(f, { enabled: true, priceCents: 300, dose: 3 });
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const product = (await f.workspace()).published!.products.find((entry) => entry.id === "acqua")!;
    expect(product.pizza).toBeUndefined();
    const quote = await f.quote(product, []);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(200);
  });

  it("conserva gli allergeni dichiarati senza food anche nel preventivo dopo conversione e pubblicazione", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.defaults = { doughId: "classico", baseId: "rossa", formatId: "tonda" };
    candidate.products.push({ id: "allergene", name: "Pizza con allergene dichiarato", description: "", priceCents: 600, available: true, allergens: ["Glutine"], ingredients: { farina: 2, pomodoro: 1 }, options: [] });
    candidate.sections[0].productIds.push("allergene");
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const plan = planProductClassification(candidate, "allergene", true, store.ingredients);
    expect(plan.errors).toEqual([]);
    const saved = await f.save(plan.draft!);
    expect(saved.statusCode, saved.body).toBe(200);
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const product = (await f.workspace()).published!.products.find((entry) => entry.id === "allergene")!;
    const quote = await f.quote(product);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].composition?.contains).toContain("Glutine");
  });

  async function configureLatte(f: ReturnType<typeof fixture>, extra: { enabled: boolean; priceCents: number | null; dose: number | null }, stock = 30) {
    const current = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const response = await f.request("PUT", "/v1/pilot/stores/roma", {
      ...current,
      ingredients: current.ingredients.map((ingredient) => ingredient.id === "latte" ? { ...ingredient, stock, extra } : ingredient)
    });
    expect(response.statusCode, response.body).toBe(200);
  }

  async function publicStore(f: ReturnType<typeof fixture>) {
    return (await f.request("GET", "/v1/pilot/stores/roma", undefined, "customer")).json<IndividualStore>();
  }

  it("pubblica extra con scorta da verificare quando prezzo e dose sono completi", async () => {
    const f = fixture();
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    Object.assign(store.ingredients.find(item => item.id === "latte")!, { stock: null, extra: { enabled: true, priceCents: 100, dose: 1 } });
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...store })).statusCode).toBe(200);
    expect((await f.save(inventoryDraft())).statusCode).toBe(200);
    const published = await f.publish("pizza");
    expect(published.statusCode, published.body).toBe(200);
  });

  it("aggiorna gli extra subito dal Magazzino e completa ordini con scorta ignota senza inventare giacenze", async () => {
    const f = fixture();
    const candidate = draft();
    expect((await f.save(candidate)).statusCode).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const published = (await f.workspace()).published;
    const current = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const extra = current.ingredients.find(item => item.id === "crusca")!;
    extra.stock = null;
    extra.extra = { enabled: true, priceCents: 120, dose: 2 };
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...current })).statusCode).toBe(200);
    const pizza = (await publicStore(f)).products.find(item => item.id === "margherita")!;
    const topping = pizza.options.find(option => option.pizza?.kind === "topping" && option.ingredientIds?.includes("crusca"))!;
    expect(topping).toMatchObject({ available: true, priceCents: 120 });
    const selections = [...pizza.pizza!.defaultSelections, { optionId: topping.id, quantity: 2 }];
    expect((await f.quote(pizza, selections)).statusCode).toBe(200);
    const cart = { storeId: "roma", mode: "pickup", slotId: "pranzo", notes: "", lines: [
      { productId: pizza.id, quantity: 1, optionIds: [], selections, notes: "" }
    ] };
    const quote = (await f.quote(pizza, selections)).json<IndividualQuote>();
    const checkout = await f.request("POST", "/v1/pilot/checkouts", { cart, fingerprint: quote.fingerprint, phone: "+393331234567", method: "cash", idempotencyKey: "unknown-extra-stock" }, "customer");
    expect(checkout.statusCode, checkout.body).toBe(200);
    const order = checkout.json<IndividualCheckoutResult>().order;
    const reserved = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    reserved.ingredients.find(item => item.id === "crusca")!.stock = 1;
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...reserved })).statusCode).toBe(200);
    for (const action of ["accept", "prepare", "ready", "complete"]) {
      const result = await f.request("POST", `/v1/pilot/orders/${order.id}/actions`, { action });
      expect(result.statusCode, result.body).toBe(200);
    }
    const updated = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    expect(updated.ingredients.find(item => item.id === "crusca")!.stock).toBe(1);
    expect((await f.workspace()).published).toEqual(published);
    updated.ingredients.find(item => item.id === "crusca")!.stock = 0;
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...updated })).statusCode).toBe(200);
    expect((await publicStore(f)).products.find(item => item.id === pizza.id)!.options.find(item => item.id === topping.id)).toMatchObject({ available: false });
    expect((await f.quote(pizza, selections)).statusCode).toBe(409);
  });

  it("offre extra del Magazzino su gusti senza custom o flag e mantiene la ricetta inclusa dopo disabilitazione", async () => {
    const f = fixture();
    await configureLatte(f, { enabled: true, priceCents: 150, dose: 2 });
    const candidate = draft();
    candidate.pizzaCatalog!.customEnabled = false;
    candidate.pizzaCatalog!.inventoryExtras = false;
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const pizza = (await f.workspace()).published!.products.find((product) => product.pizza?.sourceId === "margherita")!;
    const extra = pizza.options.find((option) => option.pizza?.kind === "topping" && option.ingredients.latte === 2);
    expect(extra).toMatchObject({ priceCents: 150, ingredients: { latte: 2 } });
    const selections = [...pizza.pizza!.defaultSelections, { optionId: extra!.id, quantity: 2 }];
    const quote = await f.quote(pizza, selections);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(900);

    await configureLatte(f, { enabled: true, priceCents: 150, dose: 2 }, 4);
    const insufficient = await f.quote(pizza, selections);
    expect(insufficient.statusCode, insufficient.body).toBe(409);
    await configureLatte(f, { enabled: true, priceCents: 150, dose: 2 }, 5);
    expect((await f.quote(pizza, selections)).statusCode).toBe(200);

    await configureLatte(f, { enabled: false, priceCents: 150, dose: 2 }, 1);
    const activeQuote = await f.quote(pizza);
    expect(activeQuote.statusCode, activeQuote.body).toBe(200);
    const withoutExtra = { ...saved.json<MenuWorkspace>().drafts.find((entry) => entry.id === candidate.id)!, id: "pizza-senza-extra" };
    const resaved = await f.save(withoutExtra);
    expect(resaved.statusCode, resaved.body).toBe(200);
    expect((await f.publish(withoutExtra.id)).statusCode).toBe(200);
    const updated = (await f.workspace()).published!.products.find((product) => product.id === pizza.id)!;
    expect(updated.options.filter((option) => option.pizza?.kind === "topping" && option.available !== false && option.ingredients.latte === 2)).toEqual([]);
    expect((await f.quote(updated)).statusCode).toBe(200);
    expect((await f.quote(updated, [...updated.pizza!.defaultSelections, { optionId: extra!.id, quantity: 1 }])).statusCode).toBe(409);
    await configureLatte(f, { enabled: false, priceCents: 150, dose: 2 }, 0);
    expect((await f.quote(updated)).statusCode).toBe(409);
  });

  it("converte, salva e pubblica scelte obbligatorie con ripetizioni e prezzi conservando il prodotto normale", async () => {
    const f = fixture();
    const candidate = draft();
    candidate.pizzaCatalog!.defaults = { doughId: "classico", baseId: "rossa", formatId: "tonda" };
    const generic: IndividualProduct = {
      id: "specialita", name: "Specialità", description: "Ricetta originale", priceCents: 800, available: true,
      allergens: ["Latte"], ingredients: { farina: 2, pomodoro: 1, latte: 1 },
      options: [{ id: "salsa", name: "Salsa", priceCents: 70, ingredients: { latte: 2 }, removesIngredientIds: ["pomodoro"] }],
      groups: [{ id: "salse", name: "Salse", kind: "selection", min: 1, max: 2, allowRepeat: true, optionIds: ["salsa"] }]
    };
    const ordinary: IndividualProduct = { id: "acqua", name: "Acqua", description: "", priceCents: 200, available: true, allergens: [], ingredients: {}, options: [] };
    candidate.products = [generic, ordinary];
    candidate.sections[0].productIds.push(generic.id, ordinary.id);
    const store = await publicStore(f);
    const plan = planProductClassification(candidate, generic.id, true, store.ingredients);
    expect(plan.errors).toEqual([]);
    expect(plan.draft).toBeDefined();
    const saved = await f.save(plan.draft!);
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await publicStore(f)).products.some((product) => product.id === generic.id)).toBe(false);
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(200);
    const active = await publicStore(f);
    expect(active.products.find((product) => product.id === ordinary.id)).toMatchObject(ordinary);
    const pizza = (await f.workspace()).published!.products.find((product) => product.id === generic.id)!;
    expect(pizza.options.find((option) => option.id === "salsa")).toMatchObject(generic.options[0]);
    expect((await f.quote(pizza)).statusCode).toBe(409);
    const selections = [...pizza.pizza!.defaultSelections, { optionId: "salsa", quantity: 2 }];
    const quote = await f.quote(pizza, selections);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(940);
    expect((await f.quote(pizza, [...pizza.pizza!.defaultSelections, { optionId: "salsa", quantity: 3 }])).statusCode).toBe(409);
  });

  it.each(["ingrediente sconosciuto", "gruppo incoerente", "ID automatico"])("rifiuta customizations non valide nella sorgente: %s", async (invalid) => {
    const f = fixture();
    const candidate = draft();
    const automatic = materializePizzaMenu(candidate).products.find((product) => product.pizza?.kind === "taste")!.options.find((option) => option.pizza?.kind === "dough")!;
    candidate.pizzaCatalog!.tastes[0].customizations = {
      options: [{ id: invalid === "ID automatico" ? automatic.id : "salsa", name: "Salsa", priceCents: 70, ingredients: invalid === "ingrediente sconosciuto" ? { sconosciuto: 1 } : { latte: 1 } }],
      groups: [{ id: "salse", name: "Salse", kind: "selection", min: 0, max: 2, allowRepeat: true, optionIds: [invalid === "gruppo incoerente" ? "inesistente" : invalid === "ID automatico" ? automatic.id : "salsa"] }]
    };
    const before = await f.workspace();
    const response = await f.save(candidate);
    expect(response.statusCode, response.body).toBe(400);
    expect(await f.workspace()).toEqual(before);
  });

  it("richiede un nuovo salvataggio della bozza obsoleta e applica subito il prezzo extra corrente", async () => {
    const f = fixture();
    await configureLatte(f, { enabled: true, priceCents: 150, dose: 2 });
    const candidate = draft();
    candidate.pizzaCatalog!.inventoryExtras = false;
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    expect((await f.publish(candidate.id)).statusCode).toBe(200);
    const active = (await f.workspace()).published!.products.find((product) => product.pizza?.sourceId === "margherita")!;
    const extra = active.options.find((option) => option.pizza?.kind === "topping" && option.ingredients.latte === 2)!;
    expect(extra).toMatchObject({ priceCents: 150, ingredients: { latte: 2 } });
    const revised = { ...saved.json<MenuWorkspace>().drafts.find((entry) => entry.id === candidate.id)!, id: "pizza-aggiornata" };
    const savedAgain = await f.save(revised);
    expect(savedAgain.statusCode, savedAgain.body).toBe(200);
    await configureLatte(f, { enabled: true, priceCents: 200, dose: 2 });
    const oldQuote = await f.quote(active, [...active.pizza!.defaultSelections, { optionId: extra.id, quantity: 1 }]);
    expect(oldQuote.statusCode, oldQuote.body).toBe(200);
    expect(oldQuote.json<IndividualQuote>().lines[0].unitCents).toBe(800);
    const stale = await f.publish(revised.id);
    expect([400, 409], stale.body).toContain(stale.statusCode);
    const resaved = await f.save(savedAgain.json<MenuWorkspace>().drafts.find((entry) => entry.id === revised.id)!);
    expect(resaved.statusCode, resaved.body).toBe(200);
    expect((await f.publish(revised.id)).statusCode).toBe(200);
    const updated = (await f.workspace()).published!.products.find((product) => product.id === active.id)!;
    const quote = await f.quote(updated, [...updated.pizza!.defaultSelections, { optionId: extra.id, quantity: 1 }]);
    expect(quote.statusCode, quote.body).toBe(200);
    expect(quote.json<IndividualQuote>().lines[0].unitCents).toBe(800);
  });

  it.each([{ enabled: true, priceCents: null, dose: 2 }])("non pubblica extra senza prezzo: %j", async (extra) => {
    const f = fixture();
    await configureLatte(f, extra);
    const candidate = draft();
    candidate.pizzaCatalog!.inventoryExtras = false;
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    const before = await f.workspace();
    const published = await f.publish(candidate.id);
    expect(published.statusCode, published.body).toBe(400);
    expect((await f.workspace()).published).toEqual(before.published);
  });
});
