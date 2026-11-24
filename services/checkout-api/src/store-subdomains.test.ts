// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IndividualCart, IndividualCheckoutResult, IndividualEvent, IndividualOrder, IndividualQuote, IndividualStore } from "@pizzaos/domain";
import type { OrderingRepository, OrderingState } from "./ordering-contract";
import { createOrderingRuntime } from "./runtime";

const database = vi.hoisted(() => ({ repository: undefined as OrderingRepository | undefined }));
vi.mock("pg", async importOriginal => {
  const original = await importOriginal<typeof import("pg")>();
  return {
    ...original,
    Pool: class {
      on() { return this; }
      async query(sql: string, args: string[] = []) {
        if (sql.startsWith("SELECT snapshot_version")) return { rows: [] };
        if (sql.startsWith("select * from sessions")) {
          const [sessionToken] = args;
          if (![owner, operator].some(actor => actor.id === sessionToken)) return { rowCount: 0, rows: [] };
          const expires = new Date(Date.now() + 29.5 * 24 * 60 * 60 * 1000);
          return { rowCount: 1, rows: [{ sessionToken, userId: sessionToken, expires }] };
        }
        if (sql.startsWith("select * from users")) {
          const user = [owner, operator].find(actor => actor.id === args[0]);
          return user ? { rowCount: 1, rows: [user] } : { rowCount: 0, rows: [] };
        }
        throw new Error(`Unexpected query in test: ${sql}`);
      }
      async end() { /* The test owns no database connection. */ }
    }
  };
});
vi.mock("./postgres-repository", async importOriginal => ({
  ...await importOriginal<typeof import("./postgres-repository")>(),
  createPostgresOrderingRepository: () => database.repository
}));

const owner = { id: "owner", name: "Titolare", email: "owner@example.test" };
const operator = { id: "operator", name: "Operatore", email: "operator@example.test" };
const pilotOrigin = "https://client.pizzaos.app";
const adminOrigin = "https://admin.pizzaos.app";
const siteOrigin = "https://lapizzaspeciale.pizzaos.app";
const proxySecret = "local-test-proxy-secret-at-least-32-characters";
const base = "/v1/pilot";
const roma: IndividualStore = {
  id: "roma", name: "La Pizza Speciale", latitude: 41.9, longitude: 12.5, acceptingOrders: true,
  deliveryBands: [], ingredients: [],
  products: [{ id: "margherita", name: "Margherita", description: "", priceCents: 800, available: true, allergens: [], ingredients: {}, options: [] }], slots: []
};
const napoli = { ...roma, id: "napoli", name: "Napoli" };
const pizzaLine = { productId: "margherita", quantity: 1, optionIds: [], notes: "" };
const runtimes: Awaited<ReturnType<typeof createOrderingRuntime>>[] = [];
afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(runtimes.splice(0).map(runtime => runtime.close()));
});

function headers(origin: string, actor?: typeof owner) {
  return { origin, "x-pizzaos-origin": origin, "x-pizzaos-proxy-secret": proxySecret,
    ...(actor && { cookie: `__Secure-authjs.session-token=${actor.id}` }) };
}

async function fixture() {
  let state: OrderingState = {
    stores: { roma, napoli }, memberships: [{ storeId: roma.id, email: operator.email }],
    orders: {}, idempotency: {}, events: [], cursor: 0
  };
  let pending = Promise.resolve();
  database.repository = {
    transact(work) {
      const transaction = pending.then(async () => {
        const candidate = structuredClone(state);
        const result = await work(candidate);
        state = candidate;
        return structuredClone(result);
      });
      pending = transaction.then(() => undefined, () => undefined);
      return transaction;
    }
  };
  const runtime = await createOrderingRuntime({
    DATABASE_URL: "postgres://unused:unused@127.0.0.1/pizzaos_individual_test",
    AUTH_SECRET: "local-test-auth-secret-at-least-32-characters",
    PIZZAOS_PROXY_SECRET: proxySecret,
    PIZZAOS_ALLOWED_ORIGINS: `${pilotOrigin},${adminOrigin}`,
    PIZZAOS_ORDERING_DOMAIN: "pizzaos.app",
    PIZZAOS_ORDERING_AUTH_ORIGIN: pilotOrigin,
    PIZZAOS_SUPERADMIN_EMAILS: owner.email,
    AUTH_GOOGLE_ID: "local-google-test-id",
    AUTH_GOOGLE_SECRET: "local-google-test-secret",
    SMTP_URL: "smtp://127.0.0.1:1025",
    AUTH_EMAIL_FROM: "ordini@example.test",
    STRIPE_SECRET_KEY: "sk_test_local",
    STRIPE_WEBHOOK_SECRET: "whsec_local",
    PIZZAOS_ENVIRONMENT: "test",
    LOG_LEVEL: "silent"
  });
  runtimes.push(runtime);
  const { app } = runtime;
  const save = (store: IndividualStore & { orderingSubdomain?: string }, actor = owner) => app.inject({
    method: "PUT", url: `${base}/stores/${store.id}`, headers: headers(adminOrigin, actor), payload: store
  });
  return { app, save };
}

describe("sottodomini di ordinazione per sede", () => {
  it("assegna solo come superadmin e conserva l'indirizzo nei salvataggi senza il nuovo campo", async () => {
    const { app, save } = await fixture();
    const publication = { ...roma, orderingSubdomain: "lapizzaspeciale" };
    expect((await save(publication, operator)).statusCode).toBe(403);
    const created = await save(publication);
    expect(created.statusCode).toBe(200);
    expect(created.json()).toMatchObject({ orderingSubdomain: "lapizzaspeciale" });
    expect((await save(publication)).statusCode).toBe(200);
    expect((await save({ ...roma, name: "La Pizza Speciale aggiornata" }, operator)).statusCode).toBe(200);
    const site = await app.inject({ url: `${base}/ordering-site`, headers: headers(siteOrigin) });
    expect(site.statusCode).toBe(200);
    expect(site.json()).toEqual({ storeId: roma.id, name: "La Pizza Speciale aggiornata" });
  });

  it("riserva le etichette tecniche e rifiuta indirizzi completi, duplicati e riassegnazioni", async () => {
    const { save } = await fixture();
    for (const label of ["admin", "rider", "client", "api", "landing", "www", "a.pizzaos.app", "-a", "a_1"]) {
      const invalid = await save({ ...roma, orderingSubdomain: label });
      expect(invalid.statusCode, label).toBe(400);
      expect(invalid.json()).toMatchObject({ code: "invalid_input" });
    }
    const newStore = { ...roma, id: "torino", orderingSubdomain: "lapizzaspeciale" };
    expect((await save(newStore)).statusCode).toBe(200);
    for (const store of [{ ...napoli, orderingSubdomain: "lapizzaspeciale" }, { ...newStore, orderingSubdomain: "nuovo" }]) {
      const conflict = await save(store);
      expect(conflict.statusCode).toBe(409);
      expect(conflict.json()).toMatchObject({ code: "revision_conflict" });
    }
  });

  it("assegna il nome a una sola sede quando arrivano due salvataggi concorrenti", async () => {
    const { app, save } = await fixture();
    const claimed = [roma, napoli];
    const responses = await Promise.all(claimed.map(store => save({ ...store, orderingSubdomain: "lapizzaspeciale" })));
    expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409]);
    const winner = claimed[responses.findIndex(response => response.statusCode === 200)];
    const site = await app.inject({ url: `${base}/ordering-site`, headers: headers(siteOrigin) });
    expect(site.statusCode).toBe(200);
    expect(site.json()).toEqual({ storeId: winner.id, name: winner.name });
  });

  it("lega l'elenco al sito e nega catalogo, preventivo e wallet di un'altra sede", async () => {
    const { app, save } = await fixture();
    expect((await save({ ...roma, orderingSubdomain: "lapizzaspeciale" })).statusCode).toBe(200);
    const own = headers(siteOrigin);
    const stores = await app.inject({ url: `${base}/stores`, headers: own });
    expect(stores.statusCode).toBe(200);
    expect(stores.json<IndividualStore[]>().map(store => store.id)).toEqual([roma.id]);
    expect((await app.inject({ url: `${base}/stores/${roma.id}`, headers: own })).statusCode).toBe(200);
    const cart: IndividualCart = { storeId: napoli.id, mode: "pickup", slotId: null, notes: "", lines: [pizzaLine] };
    const offsite = await Promise.all([
      app.inject({ url: `${base}/stores/${napoli.id}`, headers: own }),
      app.inject({ method: "POST", url: `${base}/quote`, headers: own, payload: { cart } }),
      app.inject({ url: `${base}/stores/${napoli.id}/loyalty`, headers: own })
    ]);
    for (const response of offsite) {
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: "not_found" });
    }
    const adminWrite = await app.inject({ method: "PUT", url: `${base}/stores/${roma.id}`,
      headers: headers(siteOrigin, owner), payload: { ...roma, name: "Aggiornamento dal sito cliente" } });
    expect([403, 404]).toContain(adminWrite.statusCode);
    expect((await app.inject({ url: `${base}/ordering-site`, headers: own })).json()).toMatchObject({ name: roma.name });
    expect((await app.inject({ url: `${base}/stores`, headers: headers(pilotOrigin) })).json<IndividualStore[]>()).toHaveLength(2);
  });

  it("distingue un indirizzo non assegnato da un'origine non autorizzata", async () => {
    const { app } = await fixture();
    const unassigned = await app.inject({ url: `${base}/ordering-site`, headers: headers(siteOrigin) });
    expect(unassigned.statusCode).toBe(404);
    expect(unassigned.json()).toMatchObject({ code: "not_found" });
    for (const denied of [headers("https://unrelated.example"), headers("https://evil.lapizzaspeciale.pizzaos.app"), { "x-pizzaos-origin": siteOrigin }]) {
      const response = await app.inject({ url: `${base}/ordering-site`, headers: denied });
      expect(response.statusCode).toBe(403);
    }
  });

  it("isola raccolte, storico ed eventi anche per la stessa identità su due sedi", async () => {
    const { app, save } = await fixture();
    expect((await save({ ...roma, orderingSubdomain: "lapizzaspeciale" })).statusCode).toBe(200);
    const own = headers(siteOrigin, operator);
    const pilot = headers(pilotOrigin, operator);
    const groupInput = { storeId: napoli.id, name: "Cena a Napoli", deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    const offsiteCreation = await app.inject({ method: "POST", url: `${base}/groups`, headers: own, payload: groupInput });
    expect(offsiteCreation.statusCode).toBe(404);
    const group = await app.inject({ method: "POST", url: `${base}/groups`, headers: pilot, payload: groupInput });
    expect(group.statusCode).toBe(200);
    const groupRead = await app.inject({ url: `${base}/groups/${group.json<{ id: string }>().id}`, headers: own });
    expect(groupRead.statusCode).toBe(404);

    async function place(storeId: string, requestHeaders: typeof pilot) {
      const catalog = await app.inject({ url: `${base}/stores/${storeId}`, headers: requestHeaders });
      expect(catalog.statusCode).toBe(200);
      const slotId = catalog.json<IndividualStore>().slots.find(slot => slot.capacity > 0)?.id;
      expect(slotId).toBeTruthy();
      const cart: IndividualCart = { storeId, mode: "pickup", slotId: slotId ?? null, notes: "", lines: [pizzaLine] };
      const quote = await app.inject({ method: "POST", url: `${base}/quote`, headers: requestHeaders, payload: { cart } });
      expect(quote.statusCode).toBe(200);
      const order = await app.inject({ method: "POST", url: `${base}/checkouts`, headers: requestHeaders, payload: {
        cart, fingerprint: quote.json<IndividualQuote>().fingerprint, phone: "+390612345678", method: "cash", idempotencyKey: `test-${storeId}`
      } });
      expect(order.statusCode).toBe(200);
      return order.json<IndividualCheckoutResult>().order;
    }
    const offsiteOrder = await place(napoli.id, pilot);
    const ownOrder = await place(roma.id, own);
    const history = await app.inject({ url: `${base}/orders`, headers: own });
    expect(history.statusCode).toBe(200);
    expect(history.json<IndividualOrder[]>().map(order => order.id)).toEqual([ownOrder.id]);
    const eventResponse = await app.inject({ url: `${base}/events?cursor=0`, headers: own });
    expect(eventResponse.statusCode).toBe(200);
    const events = eventResponse.json<{ events: IndividualEvent[] }>().events;
    expect(events.map(event => event.orderId)).toContain(ownOrder.id);
    expect(events.every(event => event.storeId === roma.id)).toBe(true);
    const foreignNotes = await app.inject({ method: "PATCH", url: `${base}/orders/${offsiteOrder.id}/notes`, headers: own, payload: { notes: "Altra sede" } });
    expect(foreignNotes.statusCode).toBe(404);
  });

  it("usa la callback Google stabile e restituisce il browser al sottodominio di partenza", async () => {
    const { app, save } = await fixture();
    expect((await save({ ...roma, orderingSubdomain: "lapizzaspeciale" })).statusCode).toBe(200);
    vi.stubGlobal("fetch", vi.fn(async (resource: URL | Request | string) => {
      const url = resource instanceof Request ? resource.url : String(resource);
      if (url !== "https://accounts.google.com/.well-known/openid-configuration") throw new Error(`Unexpected provider request: ${url}`);
      return Response.json({
        issuer: "https://accounts.google.com",
        authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        token_endpoint: "https://oauth2.googleapis.com/token",
        jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
        code_challenge_methods_supported: ["S256"]
      });
    }));

    const path = "/api/pilot/auth";
    const csrf = await app.inject({ url: `${path}/csrf`, headers: headers(siteOrigin) });
    expect(csrf.statusCode).toBe(200);
    const setCookies = csrf.headers["set-cookie"];
    const cookie = (Array.isArray(setCookies) ? setCookies : [setCookies]).filter(Boolean).map(value => String(value).split(";", 1)[0]).join("; ");
    const signIn = await app.inject({ method: "POST", url: `${path}/signin/google`, headers: {
      ...headers(siteOrigin), cookie, "content-type": "application/x-www-form-urlencoded"
    }, payload: new URLSearchParams({ csrfToken: csrf.json<{ csrfToken: string }>().csrfToken, callbackUrl: `${siteOrigin}/ordina` }).toString() });
    expect(signIn.statusCode).toBe(302);
    const google = new URL(String(signIn.headers.location));
    expect(google.origin).toBe("https://accounts.google.com");
    expect(google.searchParams.get("redirect_uri")).toBe(`${pilotOrigin}${path}/callback/google`);
    const state = google.searchParams.get("state");
    expect(state).toBeTruthy();
    const callbackQuery = new URLSearchParams({ state: state ?? "", code: "provider-code-test" });
    const relay = await app.inject({ url: `${path}/callback/google?${callbackQuery}`, headers: headers(pilotOrigin) });
    expect(relay.statusCode).toBe(302);
    const returnUrl = new URL(String(relay.headers.location));
    expect(returnUrl.origin).toBe(siteOrigin);
    expect(returnUrl.pathname).toBe(`${path}/callback/google`);
    expect(returnUrl.searchParams.get("state")).toBe(state);
    expect(returnUrl.searchParams.get("code")).toBe("provider-code-test");
  });
});
