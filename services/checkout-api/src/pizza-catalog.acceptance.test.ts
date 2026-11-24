// @vitest-environment node
import type { FastifyInstance } from "fastify";
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

  it("mantiene prezzo e dose pubblicati, blocca la bozza obsoleta e richiede nuovo salvataggio", async () => {
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
    expect((await f.quote(active, choices)).json<IndividualQuote>().totalCents).toBe(1080);
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

  it.each(["dose", "stock"])("blocca la pubblicazione con %s ignoto di un extra abilitato", async missing => {
    const f = fixture();
    const store = (await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>();
    const ingredient = store.ingredients.find(({ id }) => id === "latte")!;
    ingredient.extra = { enabled: true, priceCents: 200, dose: missing === "dose" ? null : 2 };
    if (missing === "stock") ingredient.stock = null;
    expect((await f.request("PUT", "/v1/pilot/stores/roma", { ...store })).statusCode).toBe(200);
    const before = (await f.workspace()).published;
    const saved = await f.save(inventoryDraft());
    expect(saved.statusCode, saved.body).toBe(200);
    const blocked = await f.publish("pizza");
    expect(blocked.statusCode, blocked.body).toBe(400);
    expect((await f.workspace()).published).toEqual(before);
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

  it("conserva dosi sconosciute in bozza e blocca la pubblicazione senza modificare il menu attivo", async () => {
    const f = fixture();
    const before = (await f.workspace()).published;
    const candidate = draft();
    candidate.pizzaCatalog!.doughs[0].ingredients.farina = null;
    const saved = await f.save(candidate);
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json<MenuWorkspace>().drafts[0].pizzaCatalog?.doughs[0].ingredients.farina).toBeNull();
    const blocked = await f.publish(candidate.id);
    expect(blocked.statusCode, blocked.body).toBe(400);
    expect((await f.workspace()).published).toEqual(before);
    expect((await f.request("GET", "/v1/pilot/stores/roma")).json<IndividualStore>().products).toEqual([]);
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
