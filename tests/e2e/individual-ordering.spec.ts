import { expect, test } from "@playwright/test";
import type { IndividualCart, IndividualCheckoutResult, IndividualDraft, IndividualStore } from "@pizzaos/domain";

// Runs against two real Next applications and a seeded, isolated service.
// The harness alone authenticates pizzaos-e2e-actor cookies (never production auth).
// Seed contract: an accepting store 'Roma', available product 'Pizza', future slots,
// customer actor 'alice' and an operator of Roma named 'operator'.
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3001";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3002";

test("guest draft survives reload and sign-in, cash pickup reaches completed in operations", async ({ browser, page, context }) => {
  await page.goto(`${clientOrigin}/ordina`);
  await expect(page.getByRole("heading", { name: "La tua prossima pizza." })).toBeVisible();
  await expect(page.getByLabel("Scegli la sede")).toBeVisible();
  await page.getByLabel("Scegli la sede").selectOption({ label: "Roma" });
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => {
    const raw = window.localStorage.getItem("pizzaos.individual-cart.v1");
    if (!raw) return 0;
    const draft: { cart: { lines: { quantity: number }[] } } = JSON.parse(raw);
    return draft.cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  })).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
  await expect(page.getByRole("heading", { name: "Riepilogo da confermare" })).toBeVisible();

  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.reload();
  await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
  await page.getByLabel(/Telefono per l.ordine/).fill("+39 3331234567");
  await page.getByLabel("Come paghi?").selectOption({ label: "Contanti al ritiro o alla consegna" });

  const operationsContext = await browser.newContext();
  try {
    await operationsContext.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
    const operations = await operationsContext.newPage();
    await operations.goto(`${adminOrigin}/operazioni`);
    await expect(operations.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await operations.getByLabel("Negozio Attivo", { exact: true }).selectOption({ label: "Roma" });
    const awaiting = operations.getByRole("group", { name: "Da accettare", exact: true });
    await expect(awaiting.getByText("0", { exact: true })).toBeVisible();

    const checkoutResponse = page.waitForResponse(response => response.url().endsWith("/v1/pilot/checkouts") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Conferma e invia ordine" }).click();
    const checkout = await checkoutResponse;
    expect(checkout.ok()).toBe(true);
    const { order } = await checkout.json() as IndividualCheckoutResult;
    await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
    await expect(awaiting.getByText("1", { exact: true })).toBeVisible();

    const navigation = operations.getByRole("navigation", { name: "Navigazione admin" });
    await navigation.getByRole("link", { name: "Ordini", exact: true }).click();
    const orderButton = operations.getByRole("button", { name: `Apri ordine ${order.id} di Alice`, exact: true });
    const orderRow = operations.getByRole("row").filter({ has: orderButton });
    await expect(orderRow.getByText("Alice", { exact: true })).toBeVisible();
    await expect(orderRow.getByText("Da accettare", { exact: true })).toBeVisible();
    await orderButton.click();
    const detail = operations.getByRole("article").filter({ hasText: order.id });
    await expect(detail).toContainText("Pizza");
    await expect(detail).toContainText(/contanti|da incassare/i);
    await detail.getByRole("button", { name: "Accetta ordine", exact: true }).click();
    await expect(detail.getByText("Accettato", { exact: true })).toBeVisible();
    for (const label of ["Inizia preparazione", "Segna pronto", "Completa ordine"]) {
      await detail.getByRole("button", { name: label, exact: true }).click();
    }
    await expect(detail.getByText("Completato", { exact: true })).toBeVisible();
    await navigation.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(awaiting.getByText("0", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Completato", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Annulla ordine/i })).toHaveCount(0);
  } finally {
    await operationsContext.close();
  }
});

test("guest delivery requires a selected street number and sends its point to the quote", async ({ page }) => {
  const chosenAddress = { text: "Via Verdi 10, Roma", latitude: 41.91, longitude: 12.51 };
  await page.route("**/v1/pilot/stores/roma/delivery-address-search", async route => {
    expect(route.request().method()).toBe("POST");
    const { query } = route.request().postDataJSON() as { query: string };
    if (query === "Via Ricerca Interrotta") {
      await route.fulfill({ status: 503, json: { code: "unavailable", message: "Ricerca indirizzi non disponibile." } });
      return;
    }
    const results = query === "Via Ver"
      ? [{ kind: "street", text: "Via Verdi, Roma" }]
      : query === "Via Verdi 10"
        ? [{ kind: "address", ...chosenAddress }]
        : [];
    await route.fulfill({ json: results });
  });

  await page.goto(`${clientOrigin}/ordina`);
  await page.getByLabel("Scegli la sede").selectOption("roma");
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByLabel("Modalità", { exact: true }).selectOption("delivery");
  const address = page.getByLabel("Indirizzo completo", { exact: true });
  const verify = page.getByRole("button", { name: "Verifica disponibilità e totale" });
  await expect(address).toHaveCount(1);
  await expect(page.getByLabel(/^(Latitudine|Longitudine)$/i)).toHaveCount(0);
  await expect(verify).toBeDisabled();

  await address.fill("Via Ver");
  await expect(page.getByRole("option", { name: /^Via Verdi, Roma\b/ })).toBeVisible();
  await address.press("ArrowDown");
  await address.press("Enter");
  await expect(address).toHaveValue(/^Via Verdi/);
  await expect(page.getByText(/(?:aggiungi|inserisci|indica).*civico/i).first()).toBeVisible();
  await expect(verify).toBeDisabled();

  await address.fill("Via Verdi 10");
  const option = page.getByRole("option", { name: chosenAddress.text, exact: true });
  await expect(option).toBeVisible();
  await expect(verify).toBeDisabled();
  await option.click();
  await expect(address).toHaveValue(chosenAddress.text);
  await expect(verify).toBeEnabled();

  const pendingQuote = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
  await verify.click();
  const quote = await pendingQuote;
  const { cart } = quote.request().postDataJSON() as { cart: IndividualCart };
  expect(cart.mode).toBe("delivery");
  expect(cart.address).toEqual(chosenAddress);
  expect(quote.ok()).toBe(true);
  expect(await quote.json()).toMatchObject({ deliveryCents: 200, totalCents: 1000 });
  const summary = page.getByRole("heading", { name: "Riepilogo da confermare" });
  await expect(summary).toBeVisible();

  await address.fill("Via Inventata 99");
  await expect(verify).toBeDisabled();
  await expect(summary).toHaveCount(0);
  await expect(page.getByText(/via.*civico.*comune/i).first()).toBeVisible();

  const unavailable = page.waitForResponse(response => response.url().endsWith("/roma/delivery-address-search") && response.status() === 503);
  await address.fill("Via Ricerca Interrotta");
  await unavailable;
  await expect(address).toBeEditable();
  await expect(verify).toBeDisabled();
  await address.fill("Via Verdi 10");
  await expect(option).toBeVisible();
  await page.getByLabel("Modalità", { exact: true }).selectOption("pickup");
  await expect(address).toHaveCount(0);
  await expect(verify).toBeEnabled();
});

test("delivery reuses an older cart and recovers the original checkout request", async ({ context, page }) => {
  const savedAddress = { text: "Via Verdi 10, Roma", latitude: 41.91, longitude: 12.51 };
  const draft: IndividualDraft = {
    version: 1,
    updatedAt: new Date().toISOString(),
    cart: {
      storeId: "roma", mode: "delivery", slotId: null, notes: "",
      lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "" }],
      address: savedAddress,
    },
  };
  const replacement = { text: "Via Verdi 20, Roma", latitude: 41.92, longitude: 12.51 };
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.addInitScript(savedCart => {
    const key = "pizzaos.individual-cart.v1";
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(savedCart));
  }, draft);
  await page.route("**/v1/pilot/stores/roma/delivery-address-search", route =>
    route.fulfill({ json: [{ kind: "address", ...replacement }] }));
  const checkout = "**/v1/pilot/checkouts";
  await page.route(checkout, route => route.fulfill({
    status: 503, json: { code: "unavailable", message: "Invio temporaneamente non disponibile." },
  }));

  await page.goto(`${clientOrigin}/ordina`);
  const address = page.getByLabel("Indirizzo completo", { exact: true });
  await expect(address).toHaveValue(savedAddress.text);
  await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
  await expect(page.getByRole("heading", { name: "Riepilogo da confermare" })).toBeVisible();
  await page.getByLabel(/Telefono per l.ordine/).fill("+39 3331234567");
  const original = page.waitForRequest(checkout);
  await page.getByRole("button", { name: "Conferma e invia ordine" }).click();
  const originalBody = (await original).postDataJSON() as { cart: IndividualCart };
  expect(originalBody.cart.address).toEqual(savedAddress);

  const recover = page.getByRole("button", { name: "Recupera tentativo ordine" });
  await expect(recover).toBeEnabled();
  await address.fill("Via Verdi 20");
  await page.getByRole("option", { name: replacement.text, exact: true }).click();
  await page.reload();
  await expect(address).toHaveValue(replacement.text);
  const retry = page.waitForRequest(checkout);
  await recover.click();
  expect((await retry).postDataJSON()).toEqual(originalBody);
});

test("the live admin sidebar switches tools and restricts store management to superadmin", async ({ browser, context, page }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(adminOrigin);
  const navigation = page.getByRole("navigation", { name: "Navigazione admin" });
  const sections = ["Dashboard", "Ordini", "Menu", "Magazzino", "Marketing", "Analytics & AI", "Consegne", "Integrazioni", "Profilo"];
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(navigation.getByRole("button")).toHaveText(sections);

  await page.getByRole("button", { name: "Nascondi sidebar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mostra sidebar", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mostra sidebar", exact: true }).click();
  await expect(navigation.getByRole("button")).toHaveText(sections);

  for (const section of sections.slice(2)) {
    await navigation.getByRole("button", { name: section, exact: true }).click();
    await expect(page.getByRole("heading", { name: section, exact: true })).toBeVisible();
    if (section === "Menu") {
      await expect(page.getByRole("heading", { name: "Menu pubblicato", exact: true })).toBeVisible();
      await expect(page.getByText("Pizza", { exact: true })).toBeVisible();
    }
    if (section === "Magazzino") await expect(page.getByLabel("Nome ingrediente 1", { exact: true })).toHaveValue("Impasto");
  }
  await expect(page.getByLabel("Nome sede", { exact: true })).toHaveValue("Roma");
  await expect(page.getByRole("button", { name: "Nuova sede", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Invita operatore", exact: true })).toHaveCount(0);

  const superadmin = await browser.newContext();
  try {
    await superadmin.addCookies([{ name: "pizzaos-e2e-actor", value: "superadmin", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
    const romaResponse = await superadmin.request.get(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`);
    expect(romaResponse.ok()).toBe(true);
    const roma = await romaResponse.json() as IndividualStore;
    const runId = Date.now();
    const store: IndividualStore = { ...roma, id: `torino-${runId}`, name: `Torino ${runId}`, acceptingOrders: false };
    const storeEndpoint = `${adminOrigin}/api/pilot/v1/pilot/stores/${store.id}`;
    const headers = { origin: adminOrigin };
    expect((await superadmin.request.put(storeEndpoint, { headers, data: store })).ok()).toBe(true);

    const management = await superadmin.newPage();
    await management.goto(`${adminOrigin}/operazioni`);
    await management.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Profilo", exact: true }).click();
    await expect(management.getByRole("button", { name: "Nuova sede", exact: true })).toBeVisible();
    await expect(management.getByRole("button", { name: "Invita operatore", exact: true })).toBeVisible();

    await page.reload();
    const storePicker = page.getByLabel("Negozio Attivo", { exact: true });
    await expect(storePicker).toHaveValue("roma");
    await expect(storePicker.getByRole("option", { name: store.name, exact: true, includeHidden: true })).toHaveCount(0);
    expect((await superadmin.request.post(`${storeEndpoint}/invitations`, { headers, data: { email: "operator@example.test" } })).ok()).toBe(true);

    await page.reload();
    await storePicker.selectOption({ label: store.name });
    const profile = navigation.getByRole("link", { name: "Profilo", exact: true });
    const storeName = page.getByLabel("Nome sede", { exact: true });
    await profile.click();
    await expect(storeName).toHaveValue(store.name);
    const updatedName = `${store.name} aggiornata`;
    await storeName.fill(updatedName);
    await page.getByRole("button", { name: "Salva configurazione", exact: true }).click();
    await expect(page.getByText("Configurazione salvata.", { exact: true })).toBeVisible();
    await navigation.getByRole("link", { name: "Dashboard", exact: true }).click();
    await profile.click();
    await expect(storeName).toHaveValue(updatedName);
    await storePicker.selectOption({ label: "Roma" });
    await expect(storeName).toHaveValue("Roma");
  } finally {
    await superadmin.close();
  }
});

test("admin creates a store only after explicitly confirming a candidate and reloads the chosen address", async ({ context, page }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "superadmin", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${adminOrigin}/operazioni`);
  const profile = page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Profilo", exact: true });
  await profile.click();
  await page.getByRole("button", { name: "Nuova sede", exact: true }).click();
  const storeId = `torino-indirizzo-${Date.now()}`;
  await page.getByLabel("Identificativo sede", { exact: true }).fill(storeId);
  await page.getByLabel("Nome sede", { exact: true }).fill("Torino Via Verdi");
  await expect(page.getByLabel("Latitudine della sede", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Longitudine della sede", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Geoapify", exact: true })).toHaveAttribute("href", "https://www.geoapify.com/");
  await expect(page.getByRole("link", { name: "OpenStreetMap", exact: true })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");

  const address = page.getByRole("textbox", { name: "Indirizzo della sede", exact: true });
  const search = page.getByRole("button", { name: "Cerca indirizzo", exact: true });
  const create = page.getByRole("button", { name: "Crea sede", exact: true });
  const first = page.getByRole("button", { name: "Conferma Via Verdi 10, Torino", exact: true });
  const second = page.getByRole("button", { name: "Conferma Via Verdi 20, Torino", exact: true });
  await expect(create).toBeDisabled();
  await address.fill("Via Verdi, Torino");
  await search.click();
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(create).toBeDisabled();
  await first.click();
  await expect(create).toBeEnabled();

  await address.fill("Via Verdi 20, Torino");
  await expect(create).toBeDisabled();
  await search.click();
  await expect(second).toBeVisible();
  await expect(first).toHaveCount(0);
  await expect(create).toBeDisabled();
  await second.click();
  const write = page.waitForResponse(response => response.url().endsWith(`/v1/pilot/stores/${storeId}`) && response.request().method() === "PUT");
  await create.click();
  expect((await write).ok()).toBe(true);
  await expect(page.getByText("Configurazione salvata.", { exact: true })).toBeVisible();

  await page.reload();
  await page.getByLabel("Negozio Attivo", { exact: true }).selectOption(storeId);
  await profile.click();
  await expect(address).toHaveValue("Via Verdi 20, Torino");
});

test("admin discards address results for an edited search and can still save a legacy profile", async ({ context, page }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${adminOrigin}/operazioni`);
  await page.getByLabel("Negozio Attivo", { exact: true }).selectOption("roma");
  await page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Profilo", exact: true }).click();
  const address = page.getByRole("textbox", { name: "Indirizzo della sede", exact: true });
  const search = page.getByRole("button", { name: "Cerca indirizzo", exact: true });
  const save = page.getByRole("button", { name: "Salva configurazione", exact: true });
  const endpoint = "**/v1/pilot/stores/roma/address-search";
  await expect(address).toHaveValue("");
  await expect(save).toBeEnabled();

  let releaseResponse = () => {};
  const waitForEdit = new Promise<void>(resolve => { releaseResponse = resolve; });
  await page.route(endpoint, async route => {
    const response = await route.fetch();
    await waitForEdit;
    await route.fulfill({ response });
  }, { times: 1 });
  const request = page.waitForRequest(endpoint);
  try {
    await address.fill("Via Verdi, Torino");
    await search.click();
    await request;
    await address.fill("Località inesistente");
    await expect(save).toBeDisabled();
  } finally {
    releaseResponse();
  }

  const noMatches = page.waitForResponse(response => response.url().endsWith("/roma/address-search") && response.request().postData()?.includes("Località inesistente") === true);
  await search.click();
  expect(await (await noMatches).json()).toEqual([]);
  await expect(page.getByRole("button", { name: /^Conferma Via Verdi/ })).toHaveCount(0);
  await expect(save).toBeDisabled();

  await address.clear();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Configurazione salvata.", { exact: true })).toBeVisible();
  const saved = await context.request.get(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`);
  expect(saved.ok()).toBe(true);
  expect(await saved.json()).toMatchObject({ latitude: 41.9, longitude: 12.5 });
});


test("admin sidebar restores every section and the active store after reload", async ({ page, context }) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${adminOrigin}/operazioni`);
  const selector = page.getByLabel("Negozio Attivo", { exact: true });
  await expect(selector).toHaveValue("roma");
  for (const [label, path] of [
    ["Ordini", "ordini"], ["Menu", "menu"], ["Magazzino", "magazzino"],
    ["Marketing", "marketing"], ["Analytics & AI", "analytics"], ["Consegne", "consegne"],
    ["Integrazioni", "integrazioni"], ["Profilo", "profilo"], ["Dashboard", "dashboard"]
  ]) {
    await page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${adminOrigin}/operazioni/${path}`);
    await page.reload();
    await expect(page.getByRole("heading", { name: label, exact: true }).first()).toBeVisible();
    await expect(selector).toHaveValue("roma");
  }
  await expect.poll(() => page.evaluate(() => localStorage.getItem("pizzaos:admin:active-store:v1"))).toBe("roma");
  await page.getByRole("link", { name: "Ordini", exact: true }).click();
  await page.getByRole("link", { name: "Menu", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Ordini", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Menu", exact: true })).toBeVisible();
  const missing = await page.goto(`${adminOrigin}/operazioni/inesistente`);
  expect(missing?.status()).toBe(404);
});
