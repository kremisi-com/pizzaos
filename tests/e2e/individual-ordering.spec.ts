import { expect, test } from "@playwright/test";
import type { IndividualCheckoutResult, IndividualStore } from "@pizzaos/domain";

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
    await navigation.getByRole("button", { name: "Ordini", exact: true }).click();
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
    await navigation.getByRole("button", { name: "Dashboard", exact: true }).click();
    await expect(awaiting.getByText("0", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Completato", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Annulla ordine/i })).toHaveCount(0);
  } finally {
    await operationsContext.close();
  }
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
    if (section === "Menu") await expect(page.getByLabel("Nome prodotto 1", { exact: true })).toHaveValue("Pizza");
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
    await management.getByRole("navigation", { name: "Navigazione admin" }).getByRole("button", { name: "Profilo", exact: true }).click();
    await expect(management.getByRole("button", { name: "Nuova sede", exact: true })).toBeVisible();
    await expect(management.getByRole("button", { name: "Invita operatore", exact: true })).toBeVisible();

    await page.reload();
    const storePicker = page.getByLabel("Negozio Attivo", { exact: true });
    await expect(storePicker).toHaveValue("roma");
    await expect(storePicker.getByRole("option", { name: store.name, exact: true, includeHidden: true })).toHaveCount(0);
    expect((await superadmin.request.post(`${storeEndpoint}/invitations`, { headers, data: { email: "operator@example.test" } })).ok()).toBe(true);

    await page.reload();
    await storePicker.selectOption({ label: store.name });
    const profile = navigation.getByRole("button", { name: "Profilo", exact: true });
    const storeName = page.getByLabel("Nome sede", { exact: true });
    await profile.click();
    await expect(storeName).toHaveValue(store.name);
    const updatedName = `${store.name} aggiornata`;
    await storeName.fill(updatedName);
    await page.getByRole("button", { name: "Salva configurazione", exact: true }).click();
    await expect(page.getByText("Configurazione salvata.", { exact: true })).toBeVisible();
    await navigation.getByRole("button", { name: "Dashboard", exact: true }).click();
    await profile.click();
    await expect(storeName).toHaveValue(updatedName);
    await storePicker.selectOption({ label: "Roma" });
    await expect(storeName).toHaveValue("Roma");
  } finally {
    await superadmin.close();
  }
});
