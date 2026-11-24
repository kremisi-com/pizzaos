// @vitest-environment node

import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import {
  menuAllergenKey,
  type FoodPreferences,
  type GroupSnapshot,
  type IndividualActor,
  type IndividualCart,
  type IndividualCheckout,
  type IndividualCheckoutResult,
  type IndividualLine,
  type IndividualOrder,
  type IndividualProduct,
  type IndividualQuote,
  type IndividualStore,
  type MenuDraft,
  type MenuWorkspace,
} from "@pizzaos/domain";
import { createDiagnostics } from "./diagnostics";
import { registerGroupOrderingRoutes } from "./group/group-http";
import { createGroupOrderingService } from "./group/group-service";
import { buildOrderingApp, type OrderingHttpOptions } from "./http-app";
import type { OrderingRepository, OrderingState, ProviderPayment } from "./ordering-contract";
import { createOrderingService } from "./ordering-service";

const base = "/v1/pilot";
const stores = `${base}/stores`;
const catalog = `${stores}/roma`;
const menu = `${catalog}/menu-admin`;
const preferences = `${base}/food-preferences`;
const images = `${catalog}/menu-images`;
const origin = "https://ordering.example.test";
const accounts = {
  alice: { id: "alice", name: "Alice", email: "alice@example.test" },
  bob: { id: "bob", name: "Bob", email: "bob@example.test" },
  operator: { id: "roma-operator", name: "Operatrice di Roma", email: "roma@example.test" },
  outsider: { id: "torino-operator", name: "Operatore di Torino", email: "torino@example.test" },
} satisfies Record<string, IndividualActor>;
type TestAccount = keyof typeof accounts;
const now = () => new Date("2030-01-01T12:00:00Z");
const apps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

const legacyProduct: IndividualProduct = {
  id: "marinara", name: "Marinara", description: "Pomodoro e origano", priceCents: 800,
  available: true, allergens: ["Glutine"], ingredients: { impasto: 1 },
  options: [{ id: "olive", name: "Olive", priceCents: 100, ingredients: { olive: 1 } }],
};

function legacyStore(id: string): IndividualStore {
  return {
    id, name: id, latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    deliveryBands: [], slots: [{ id: "pranzo", startsAt: "2030-01-01T13:00:00Z", capacity: 30 }],
    ingredients: [
      { id: "impasto", name: "Impasto", stock: 30, food: { contains: ["Glutine"], mayContain: [] } },
      { id: "mozzarella", name: "Mozzarella", stock: 30, food: { contains: ["Latte"], mayContain: [] } },
      { id: "provola", name: "Provola", stock: 30, food: { contains: ["Latte"], mayContain: [] } },
      { id: "olive", name: "Olive", stock: 3, food: { contains: [], mayContain: [] } },
      { id: "speciale", name: "Ingrediente speciale", stock: 30 },
    ],
    products: [legacyProduct],
  };
}

function fixture() {
  let state: OrderingState = {
    stores: { roma: legacyStore("roma"), torino: legacyStore("torino") },
    memberships: [
      { storeId: "roma", email: accounts.operator.email },
      { storeId: "torino", email: accounts.outsider.email },
    ],
    orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  let tail = Promise.resolve();
  let serial = 0;
  const repository: OrderingRepository = {
    transact<T>(work: (snapshot: OrderingState) => T | Promise<T>) {
      const operation = tail.then(async () => {
        const snapshot = structuredClone(state);
        const result = await work(snapshot);
        state = snapshot;
        return structuredClone(result);
      });
      tail = operation.then(() => undefined, () => undefined);
      return operation;
    },
  };
  const card: ProviderPayment = { id: "legacy-intent", status: "requires_action", clientSecret: "legacy-test-secret" };
  const media = new Map<string, { type: string; bytes: Buffer }>();
  const menuImages = {
    async save(storeId: string, image: { type: string; bytes: Buffer }) {
      const id = `image-${++serial}`;
      media.set(`${storeId}/${id}`, image);
      return id;
    },
    async get(storeId: string, imageId: string) {
      return media.get(`${storeId}/${imageId}`) ?? null;
    },
  };
  const authenticate: OrderingHttpOptions["authenticate"] = async (request) => {
    const account = request.headers["x-test-account"];
    return Object.values(accounts).find((actor) => actor.id === account) ?? null;
  };
  const id = () => `menu-test-${++serial}`;
  const createApp = () => {
    const diagnostics = createDiagnostics({ level: "silent" });
    const service = createOrderingService({
      repository, superadminEmails: [], now, id, diagnostics,
      payments: {
        async create() { return card; },
        async read() { return card; },
        async cancel(id) { return { id, status: "cancelled" }; },
        async refund() { return { id: "refund", status: "succeeded" }; },
        async readRefund(id) { return { id, status: "succeeded" }; },
      },
    });
    const app = buildOrderingApp({ service, authenticate, menuImages, diagnostics });
    const groups = createGroupOrderingService({ repository, ordering: service, now, id });
    registerGroupOrderingRoutes(app, { groups, authenticate });
    apps.push(app);
    return app;
  };
  let app = createApp();

  function request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    account?: TestAccount,
    payload?: Record<string, unknown> | Buffer,
    contentType?: string,
  ) {
    return app.inject({ method, url, payload, headers: {
      origin,
      "x-pizzaos-origin": origin,
      ...(account ? { "x-test-account": accounts[account].id } : {}),
      ...(contentType ? { "content-type": contentType } : {}),
    } });
  }

  const workspace = async () => json<MenuWorkspace>(await request("GET", menu, "operator"));
  const save = async (revision: number, draft: MenuDraft) => json<MenuWorkspace>(
    await request("PUT", `${menu}/drafts`, "operator", { revision, draft }),
  );
  const publish = async (revision: number, draftId: string) => json<MenuWorkspace>(
    await request("POST", `${menu}/publish`, "operator", { revision, draftId }),
  );
  const quoteRequest = (cart: IndividualCart) => request("POST", `${base}/quote`, "alice", { cart });
  const checkout = (input: IndividualCheckout) => request("POST", `${base}/checkouts`, "alice", { ...input });

  return {
    request, workspace, save, publish, quoteRequest, checkout,
    restart() { app = createApp(); },
    async deploy(draft: MenuDraft) {
      const saved = await save((await workspace()).revision, draft);
      return publish(saved.revision, draft.id);
    },
    async quote(cart: IndividualCart) { return json<IndividualQuote>(await quoteRequest(cart)); },
  };
}

function json<T>(response: { statusCode: number; body: string; json: <Data>() => Data }): T {
  expect(response.statusCode, response.body).toBeGreaterThanOrEqual(200);
  expect(response.statusCode, response.body).toBeLessThan(300);
  return response.json<T>();
}

function line(productId: string, ...selections: [optionId: string, quantity: number][]): IndividualLine {
  return { productId, quantity: 1, optionIds: [], notes: "", selections: selections.map(([optionId, quantity]) => ({ optionId, quantity })) };
}

function orderCart(...lines: IndividualLine[]): IndividualCart {
  return { storeId: "roma", lines, mode: "pickup", slotId: "pranzo", notes: "" };
}

function payment(cart: IndividualCart, quote: IndividualQuote, idempotencyKey: string): IndividualCheckout {
  return { cart, fingerprint: quote.fingerprint, phone: "+393331234567", method: "cash", idempotencyKey };
}

function draft(id: string, ...products: IndividualProduct[]): MenuDraft {
  return {
    id, name: `Menu ${id}`, products,
    sections: [{ id: "menu", name: "Menu", description: "Dal forno", productIds: products.map((product) => product.id) }],
  };
}

function product(id: string, details: Partial<IndividualProduct> = {}): IndividualProduct {
  return { id, name: id, description: "", priceCents: 500, available: true, allergens: [], ingredients: {}, options: [], ...details };
}

const pizza = product("crea-pizza", {
  name: "Crea la tua pizza", priceCents: 0,
  groups: [
    { id: "impasti", name: "Impasto", kind: "dough", min: 1, max: 1, optionIds: ["dough"] },
    { id: "ricette", name: "Ricetta", kind: "recipe", min: 1, max: 1, optionIds: ["recipe"] },
  ],
  options: [
    { id: "dough", name: "Impasto classico", priceCents: 250, ingredients: { impasto: 1 } },
    { id: "recipe", name: "Ricetta del giorno", priceCents: 1300, ingredients: { mozzarella: 1 } },
  ],
});

describe("Ricette importate da verificare", () => {
  it("salva dose e scorta sconosciute, blocca la pubblicazione finché non vengono confermate", async () => {
    const f = fixture();
    const store = json<IndividualStore>(await f.request("GET", catalog, "operator"));
    store.ingredients.push({ id: "pesto-importato", name: "Pesto di Pra’ senza aglio", stock: null });
    json<IndividualStore>(await f.request("PUT", catalog, "operator", { ...store }));
    const imported = draft("importato", product("speciale", { ingredients: { "pesto-importato": null } }));
    const saved = await f.save((await f.workspace()).revision, imported);
    expect(saved.drafts[0].products[0].ingredients).toEqual({ "pesto-importato": null });
    const blocked = await f.request("POST", `${menu}/publish`, "operator", { revision: saved.revision, draftId: imported.id });
    expect(blocked.statusCode).toBe(400);
    expect(blocked.json().message).toContain("verifica dosi e scorte");
    imported.products[0].ingredients["pesto-importato"] = 2;
    const dosed = await f.save(saved.revision, imported);
    expect((await f.request("POST", `${menu}/publish`, "operator", { revision: dosed.revision, draftId: imported.id })).statusCode).toBe(400);
    store.ingredients.find(item => item.id === "pesto-importato")!.stock = 8;
    json<IndividualStore>(await f.request("PUT", catalog, "operator", { ...store }));
    await f.publish((await f.workspace()).revision, imported.id);
    expect((await f.quoteRequest(orderCart(line("speciale")))).statusCode).toBe(200);
  });

  it("rifiuta il preventivo se una scorta pubblicata torna sconosciuta", async () => {
    const f = fixture();
    await f.deploy(draft("confermato", product("speciale", { ingredients: { mozzarella: 2 } })));
    const store = json<IndividualStore>(await f.request("GET", catalog, "operator"));
    store.ingredients.find(item => item.id === "mozzarella")!.stock = null;
    json<IndividualStore>(await f.request("PUT", catalog, "operator", { ...store }));
    expect((await f.quoteRequest(orderCart(line("speciale")))).statusCode).toBe(409);
  });
});

const box = product("box", {
  name: "Box mista",
  groups: [{ id: "porzioni", name: "Scegli tre porzioni", kind: "selection", min: 3, max: 3, allowRepeat: true, optionIds: ["olive", "patate", "pomodori"] }],
  options: [
    { id: "olive", name: "Olive", priceCents: 100, ingredients: { olive: 1 } },
    { id: "patate", name: "Patate", priceCents: 150, ingredients: {} },
    { id: "pomodori", name: "Pomodori", priceCents: 200, ingredients: {} },
  ],
});

describe("menu publication and access", () => {
  it("keeps concurrent drafts private, rejects stale mutations, and restores the previous menu as a draft", async () => {
    const f = fixture();
    const before = await f.workspace();
    expect(before.published.products.map(({ id }) => id)).toEqual([legacyProduct.id]);
    const lunch = draft("pranzo", product("focaccia"), product("margherita"));
    lunch.sections[0].productIds.reverse();
    const evening = draft("sera", product("siciliana"));

    const concurrent = await Promise.all([lunch, evening].map((candidate) =>
      f.request("PUT", `${menu}/drafts`, "operator", { revision: before.revision, draft: candidate }),
    ));
    expect(concurrent.map(({ statusCode }) => statusCode).sort()).toEqual([200, 409]);
    const winner = json<MenuWorkspace>(concurrent.find(({ statusCode }) => statusCode === 200)!);
    expect(winner.drafts).toHaveLength(1);
    const missing = winner.drafts[0].id === lunch.id ? evening : lunch;
    const saved = await f.save(winner.revision, missing);
    expect(saved.drafts.map(({ id }) => id).sort()).toEqual([lunch.id, evening.id].sort());
    f.restart();
    expect(await f.workspace()).toEqual(saved);
    expect(json<IndividualStore>(await f.request("GET", catalog)).products.map(({ id }) => id)).toEqual([legacyProduct.id]);
    expect((await f.quoteRequest(orderCart(line("focaccia")))).statusCode).toBe(409);

    const stalePublish = await f.request("POST", `${menu}/publish`, "operator", { revision: before.revision, draftId: lunch.id });
    expect(stalePublish.statusCode).toBe(409);
    const published = await f.publish(saved.revision, lunch.id);
    expect(published.published.id).toBe(lunch.id);
    expect(published.drafts.map(({ id }) => id)).toEqual(expect.arrayContaining([before.published.id, evening.id]));
    const after = json<IndividualStore>(await f.request("GET", catalog));
    expect(after.menu?.sections).toEqual(lunch.sections);
    expect(after.products.map(({ id }) => id).sort()).toEqual(["focaccia", "margherita"]);
    expect((await f.quote(orderCart(line("focaccia")))).totalCents).toBe(500);

    await f.publish(published.revision, before.published.id);
    expect(json<IndividualStore>(await f.request("GET", catalog)).products.map(({ id }) => id)).toEqual([legacyProduct.id]);
  });

  it("denies workspace changes to anonymous customers and operators of another store", async () => {
    const f = fixture();
    const { revision } = await f.workspace();
    const candidate = draft("riservato", product("focaccia"));
    for (const [account, status] of [[undefined, 401], ["alice", 403], ["outsider", 403]] as const) {
      expect((await f.request("GET", menu, account)).statusCode).toBe(status);
      expect((await f.request("PUT", `${menu}/drafts`, account, { revision, draft: candidate })).statusCode).toBe(status);
      expect((await f.request("POST", `${menu}/publish`, account, { revision, draftId: candidate.id })).statusCode).toBe(status);
    }
    expect((await f.workspace()).drafts).toEqual([]);
    expect((await f.request("GET", `${stores}/torino/menu-admin`, "outsider")).statusCode).toBe(200);
  });

  it("deletes only the selected draft at the current revision", async () => {
    const f = fixture();
    const before = await f.workspace();
    const lunch = await f.save(before.revision, draft("pranzo", product("focaccia")));
    const saved = await f.save(lunch.revision, draft("sera", product("siciliana")));
    const deletion = `${menu}/drafts/pranzo`;
    expect((await f.request("DELETE", deletion, "outsider", { revision: saved.revision })).statusCode).toBe(403);
    expect((await f.request("DELETE", deletion, "operator", { revision: lunch.revision })).statusCode).toBe(409);
    const remaining = json<MenuWorkspace>(await f.request("DELETE", deletion, "operator", { revision: saved.revision }));
    expect(remaining.published).toEqual(before.published);
    expect(remaining.drafts.map(({ id }) => id)).toEqual(["sera"]);
    f.restart();
    expect(await f.workspace()).toEqual(remaining);
  });

  it("refuses publication when a section references a product outside its draft", async () => {
    const f = fixture();
    const before = await f.workspace();
    const invalid = draft("incompleto", product("focaccia"));
    invalid.sections[0].productIds.push(legacyProduct.id);
    const save = await f.request("PUT", `${menu}/drafts`, "operator", { revision: before.revision, draft: invalid });
    if (save.statusCode < 300) {
      const saved = json<MenuWorkspace>(save);
      const publish = await f.request("POST", `${menu}/publish`, "operator", { revision: saved.revision, draftId: invalid.id });
      expect(publish.statusCode).toBe(400);
    } else {
      expect(save.statusCode).toBe(400);
    }
    expect((await f.workspace()).published).toEqual(before.published);
    expect(json<IndividualStore>(await f.request("GET", catalog)).products.map(({ id }) => id)).toEqual([legacyProduct.id]);
  });

  it("explains which group setting to correct when saving or publishing a menu", async () => {
    const f = fixture();
    const before = await f.workspace();
    const unnamed = draft("gruppo-senza-nome", product("pizza", {
      groups: [{ id: "scelte", name: " ", kind: "selection", min: 0, max: 1, optionIds: [] }],
    }));
    const saveError = await f.request("PUT", `${menu}/drafts`, "operator", { revision: before.revision, draft: unnamed });
    expect(saveError.statusCode).toBe(400);
    expect(saveError.json<{ message: string }>().message).toBe("Inserisci un nome per il gruppo 1.");

    const empty = draft("gruppo-vuoto", product("pizza", {
      groups: [{ id: "impasto", name: "Impasto", kind: "dough", min: 1, max: 1, optionIds: [] }],
    }));
    const saved = await f.save(before.revision, empty);
    const publishError = await f.request("POST", `${menu}/publish`, "operator", { revision: saved.revision, draftId: empty.id });
    expect(publishError.statusCode).toBe(400);
    expect(publishError.json<{ message: string }>().message).toBe("Il gruppo «Impasto»: aggiungi almeno una scelta prima di pubblicare.");
  });

  it("serves draft photos only to the assigned operator until publication", async () => {
    const f = fixture();
    const invalidPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJ1sAAAAASUVORK5CYII=", "base64");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOY5qYMAAJ1AQAHRHR7AAAAAElFTkSuQmCC", "base64");
    expect((await f.request("POST", images, "operator", invalidPng, "image/png")).statusCode).toBe(400);
    expect((await f.request("POST", images, "outsider", png, "image/png")).statusCode).toBe(403);
    const { id } = json<{ id: string }>(await f.request("POST", images, "operator", png, "image/png"));
    const saved = await f.save((await f.workspace()).revision, draft("foto", product("focaccia", { imageId: id })));
    const path = `${images}/${encodeURIComponent(id)}`;
    for (const account of [undefined, "alice", "outsider"] as const) {
      expect([401, 403, 404]).toContain((await f.request("GET", path, account)).statusCode);
    }
    const visible = await f.request("GET", path, "operator");
    expect(visible.statusCode).toBe(200);
    expect(visible.headers["content-type"]).toBe("image/png");
    expect(visible.rawPayload).toEqual(png);

    const otherStoreImage = `${stores}/torino/menu-images/${encodeURIComponent(id)}`;
    expect([403, 404]).toContain((await f.request("GET", otherStoreImage, "outsider")).statusCode);
    const otherWorkspacePath = `${stores}/torino/menu-admin`;
    const torino = json<MenuWorkspace>(await f.request("GET", otherWorkspacePath, "outsider"));
    const foreignReference = await f.request("PUT", `${otherWorkspacePath}/drafts`, "outsider", {
      revision: torino.revision, draft: draft("foto-estranea", product("grissini", { imageId: id })),
    });
    expect(foreignReference.statusCode).toBe(400);

    await f.publish(saved.revision, "foto");
    f.restart();
    const published = await f.request("GET", path);
    expect(published.statusCode).toBe(200);
    expect(published.headers["content-type"]).toBe("image/png");
    expect(published.rawPayload).toEqual(png);
    expect(json<IndividualStore>(await f.request("GET", catalog)).products[0]?.imageId).toBe(id);
  });
});

describe("configured quotations and checkout", () => {
  it("prices mandatory scoped choices and rejects missing or foreign options", async () => {
    const f = fixture();
    await f.deploy(draft("componibile", pizza, box));
    const cart = orderCart(line(pizza.id, ["dough", 1], ["recipe", 1]));
    const quote = await f.quote(cart);
    expect(quote).toMatchObject({ totalCents: 1550, lines: [{ name: pizza.name, unitCents: 1550 }] });
    expect(quote.lines[0]?.composition?.choices).toEqual(expect.arrayContaining([
      { optionId: "dough", name: "Impasto classico", quantity: 1, subtotalCents: 250 },
      { optionId: "recipe", name: "Ricetta del giorno", quantity: 1, subtotalCents: 1300 },
    ]));

    for (const invalid of [
      line(pizza.id, ["dough", 1]),
      line(pizza.id, ["dough", 1], ["patate", 1]),
      line(pizza.id, ["dough", 2], ["recipe", 1]),
    ]) {
      const invalidCart = orderCart(invalid);
      const invalidQuote = await f.quoteRequest(invalidCart);
      expect(invalidQuote.statusCode).toBe(409);
      expect(invalidQuote.json()).toMatchObject({ code: "customization_changed" });
      const invalidCheckout = await f.checkout(payment(invalidCart, quote, "invalid-customization"));
      expect(invalidCheckout.statusCode).toBe(409);
      expect(invalidCheckout.json()).toMatchObject({ code: "customization_changed" });
    }
    expect(json<IndividualOrder[]>(await f.request("GET", `${base}/orders`, "alice"))).toEqual([]);
  });

  it("validates box quantities and aggregates stock again when checkout reserves ingredients", async () => {
    const f = fixture();
    const singleEach: IndividualProduct = {
      ...box, id: "box-distinta", groups: box.groups?.map((group) => ({ ...group, allowRepeat: false })),
    };
    await f.deploy(draft("porzioni", box, singleEach));
    for (const invalid of [
      line(box.id, ["olive", 1], ["patate", 1]),
      line(box.id, ["olive", 2], ["patate", 1], ["pomodori", 1]),
      line(singleEach.id, ["olive", 2], ["patate", 1]),
    ]) {
      const response = await f.quoteRequest(orderCart(invalid));
      expect(response.statusCode).toBe(409);
      expect(response.json()).toMatchObject({ code: "customization_changed" });
    }
    const cart = orderCart(line(box.id, ["olive", 2], ["patate", 1]));
    const first = await f.quote(cart);
    expect(first.totalCents).toBe(850);
    expect(first.lines[0]?.composition?.choices).toContainEqual({ optionId: "olive", name: "Olive", quantity: 2, subtotalCents: 200 });
    const bought = json<IndividualCheckoutResult>(await f.checkout(payment(cart, first, "prima-box")));
    expect(bought.order.quote.totalCents).toBe(850);
    for (const result of [await f.quoteRequest(cart), await f.checkout(payment(cart, first, "seconda-box"))]) {
      expect(result.statusCode).toBe(409);
      expect(result.json()).toMatchObject({ code: "inventory_changed" });
    }
    expect(json<IndividualOrder[]>(await f.request("GET", `${base}/orders`, "alice")).map(({ id }) => id)).toEqual([bought.order.id]);
  });

  it("totals the four extra example with a Simple offer", async () => {
    const f = fixture();
    const options = [220, 210, 190, 110].map((priceCents, index) => ({ id: `extra-${index}`, name: `Extra ${index}`, priceCents, ingredients: {} }));
    const simple = product("simple", {
      options, extraOffer: { quota: 3, percent: 20 },
      groups: [{ id: "extras", name: "Extra", kind: "extras", min: 0, max: 4, optionIds: options.map(({ id }) => id) }],
    });
    await f.deploy(draft("formula", simple));
    const quote = await f.quote(orderCart(line(simple.id, ...options.map(({ id }): [string, number] => [id, 1]))));
    expect(quote.totalCents).toBe(1106);
    expect(quote.lines[0]?.composition?.extraDiscountCents).toBe(124);
  });

  it.each([
    { name: "Simple", quota: 3, percent: 20, total: 1801, savings: 126 },
    { name: "Wild", quota: 5, percent: 40, total: 1589, savings: 338 },
    { name: "Savage", quota: 7, percent: 50, total: 1414, savings: 513 },
  ])("rounds each discounted extra under $name and charges full price for other choices", async ({ name, quota, percent, total, savings }) => {
    const f = fixture();
    const extras = [61, 221, 111, 213, 101, 197, 85, 105].map((priceCents, index) => ({
      id: `extra-${index}`, name: `Extra ${index + 1}`, priceCents, ingredients: {},
    }));
    const format = { id: "maxi", name: "Maxi", priceCents: 333, ingredients: {} };
    const offer = product(name.toLowerCase(), {
      name, extraOffer: { quota, percent }, options: [...extras, format],
      groups: [
        { id: "formati", name: "Formato", kind: "format", min: 1, max: 1, optionIds: [format.id] },
        { id: "extras", name: "Extra", kind: "extras", min: 0, max: 8, optionIds: extras.map(({ id }) => id) },
      ],
    });
    await f.deploy(draft("formula", offer));
    const quote = await f.quote(orderCart(line(offer.id, [format.id, 1], ...extras.map(({ id }): [string, number] => [id, 1]))));
    expect(quote.totalCents).toBe(total);
    expect(quote.lines[0]?.composition?.extraDiscountCents).toBe(savings);
    expect(quote.lines[0]?.composition?.choices).toContainEqual({ optionId: format.id, name: format.name, quantity: 1, subtotalCents: 333 });
  });

  it("revalidates stale prices and preserves the confirmed composition in customer and kitchen history", async () => {
    const f = fixture();
    await f.deploy(draft("originale", pizza));
    const cart = orderCart(line(pizza.id, ["dough", 1], ["recipe", 1]));
    const quote = await f.quote(cart);
    const originalAttempt = payment(cart, quote, "originale");
    const { order } = json<IndividualCheckoutResult>(await f.checkout(originalAttempt));
    expect(order.quote.lines[0]?.composition).toEqual(quote.lines[0]?.composition);

    await f.deploy(draft("nuovo", { ...pizza, name: "Nuova pizza", options: pizza.options.map((option) =>
      option.id === "recipe" ? { ...option, name: "Nuova ricetta", priceCents: 1450 } : option),
    }));
    const stale = await f.checkout(payment(cart, quote, "preventivo-obsoleto"));
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: "price_changed" });
    expect((await f.quote(cart)).totalCents).toBe(1700);
    expect(json<IndividualCheckoutResult>(await f.checkout(originalAttempt)).order.id).toBe(order.id);
    for (const [url, account] of [[`${base}/orders`, "alice"], [`${base}/orders?storeId=roma`, "operator"]] as const) {
      const orders = json<IndividualOrder[]>(await f.request("GET", url, account));
      expect(orders).toHaveLength(1);
      expect(orders[0]?.quote.lines).toEqual(order.quote.lines);
      expect(orders[0]?.quote.lines[0]?.composition?.choices).toContainEqual({
        optionId: "recipe", name: "Ricetta del giorno", quantity: 1, subtotalCents: 1300,
      });
    }
  });

  it("retains legacy optionIds and recovers an existing card attempt after publishing a new menu", async () => {
    const f = fixture();
    const cart = orderCart({ productId: legacyProduct.id, quantity: 1, optionIds: ["olive"], notes: "Ben cotta" });
    const quote = await f.quote(cart);
    expect(quote).toMatchObject({ totalCents: 900, lines: [{ productId: legacyProduct.id, optionIds: ["olive"], notes: "Ben cotta" }] });
    const attempt = { ...payment(cart, quote, "storico"), method: "card" as const };
    const initial = json<IndividualCheckoutResult>(await f.checkout(attempt));
    expect(initial.order.status).toBe("pending_payment");
    await f.deploy(draft("nuovo", pizza));
    f.restart();
    const recovered = json<IndividualCheckoutResult>(await f.request("POST", `${base}/orders/${initial.order.id}/reconcile`, "alice", {}));
    expect(recovered.order.id).toBe(initial.order.id);
    expect(recovered.order.quote.lines).toEqual(initial.order.quote.lines);
    expect(recovered.clientSecret).toBe(initial.clientSecret);
  });
});

describe("food classifications and personal preferences", () => {
  it("removes an allergen only when its last source is removed and leaves warnings intact", async () => {
    const f = fixture();
    const removable = product("due-formaggi", {
      ingredients: { impasto: 1, mozzarella: 1, provola: 1 },
      food: { contains: [], mayContain: ["Senape"] },
      options: [
        { id: "senza-mozzarella", name: "Senza mozzarella", priceCents: 0, ingredients: {}, removesIngredientIds: ["mozzarella"] },
        { id: "senza-provola", name: "Senza provola", priceCents: 0, ingredients: {}, removesIngredientIds: ["provola"] },
        { id: "extra-speciale", name: "Ingrediente speciale", priceCents: 100, ingredients: { speciale: 1 } },
      ],
      groups: [
        { id: "modifiche", name: "Ingredienti", kind: "ingredients", min: 0, max: 2, optionIds: ["senza-mozzarella", "senza-provola"] },
        { id: "extras", name: "Extra", kind: "extras", min: 0, max: 1, optionIds: ["extra-speciale"] },
      ],
    });
    await f.deploy(draft("ingredienti", removable));
    const first = await f.quote(orderCart(line(removable.id, ["senza-mozzarella", 1])));
    const removedOne = first.lines[0]?.composition;
    expect(removedOne?.contains.map(menuAllergenKey).sort()).toEqual(["glutine", "latte"]);
    expect(removedOne?.ingredients).toEqual(expect.arrayContaining(["Impasto", "Provola"]));
    expect(removedOne?.ingredients).not.toContain("Mozzarella");

    const removedBoth = await f.quote(orderCart(line(removable.id, ["senza-mozzarella", 1], ["senza-provola", 1])));
    expect(removedBoth.lines[0]?.composition).toMatchObject({ foodComplete: true, ingredients: ["Impasto"] });
    expect(removedBoth.lines[0]?.composition?.contains.map(menuAllergenKey)).toEqual(["glutine"]);
    expect(removedBoth.lines[0]?.composition?.mayContain.map(menuAllergenKey)).toEqual(["senape"]);

    const incomplete = await f.quote(orderCart(line(removable.id, ["extra-speciale", 1])));
    expect(incomplete.lines[0]?.composition).toMatchObject({ foodComplete: false });
  });

  it("persists only the signed-in customer's preferences and clears them on saving an empty list", async () => {
    const f = fixture();
    expect((await f.request("GET", preferences)).statusCode).toBe(401);
    expect((await f.request("PUT", preferences, undefined, { avoid: ["Latte"] })).statusCode).toBe(401);
    expect(json<FoodPreferences>(await f.request("GET", preferences, "alice"))).toEqual({ avoid: [] });
    const saved = json<FoodPreferences>(await f.request("PUT", preferences, "alice", { avoid: ["Latte"] }));
    expect(saved.avoid.map(menuAllergenKey)).toEqual(["latte"]);
    f.restart();
    expect(json<FoodPreferences>(await f.request("GET", preferences, "alice"))).toEqual(saved);
    expect(json<FoodPreferences>(await f.request("GET", preferences, "bob"))).toEqual({ avoid: [] });
    const cleared = json<FoodPreferences>(await f.request("PUT", preferences, "alice", { avoid: [] }));
    expect(cleared).toEqual({ avoid: [] });
    f.restart();
    expect(json<FoodPreferences>(await f.request("GET", preferences, "alice"))).toEqual(cleared);
  });

  it("uses the same configured quote for a group's choices without exposing customer preferences", async () => {
    const f = fixture();
    await f.deploy(draft("gruppo", pizza));
    json<FoodPreferences>(await f.request("PUT", preferences, "alice", { avoid: ["Molluschi"] }));
    const created = json<GroupSnapshot>(await f.request("POST", `${base}/groups`, "alice", {
      storeId: "roma", name: "Alice", deadline: "2030-01-01T12:30:00.000Z",
    }));
    const groupPath = `${base}/groups/${created.id}`;
    const chosen = line(pizza.id, ["dough", 1], ["recipe", 1]);
    const updated = json<GroupSnapshot>(await f.request("PUT", `${groupPath}/lines`, "alice", {
      participantId: created.participantId, revision: created.revision, lines: [chosen],
    }));
    expect(updated.participants[0]?.lines).toEqual([chosen]);
    const closed = json<GroupSnapshot>(await f.request("POST", `${groupPath}/close`, "alice", { revision: updated.revision }));
    const fulfillment = { mode: "pickup", slotId: "pranzo", notes: "" };
    const groupQuote = json<{ quote: IndividualQuote }>(await f.request("POST", `${groupPath}/quote`, "alice", {
      revision: closed.revision, fulfillment,
    }));
    const individual = await f.quote(orderCart(chosen));
    expect(groupQuote.quote.lines).toEqual(individual.lines.map((line) => ({ ...line, notes: "Per Alice" })));
    expect(groupQuote.quote.totalCents).toBe(1550);
    const checkedOut = json<IndividualCheckoutResult>(await f.request("POST", `${groupPath}/checkout`, "alice", {
      revision: closed.revision, fingerprint: groupQuote.quote.fingerprint, fulfillment,
      phone: "+393331234567", method: "cash", idempotencyKey: "gruppo-configurato",
    }));
    expect(checkedOut.order.quote.lines).toEqual(groupQuote.quote.lines);
    for (const response of [created, updated, closed, groupQuote, checkedOut]) {
      expect(JSON.stringify(response)).not.toMatch(/avoid|Molluschi/i);
    }
  });
});
