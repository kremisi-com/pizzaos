import { expect, test } from "@playwright/test";
import { formatOrderWindow, type IndividualStore } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3101";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3102";
const storeApi = "/api/pilot/v1/pilot/stores/roma";

test("la settimana tipo del Profilo governa entrambi i checkout", async ({ browser, page, context }, testInfo) => {
  const admin = await browser.newContext({ viewport: { width: 1536, height: 1000 } });
  try {
    await admin.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
    await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
    const operations = await admin.newPage();
    await operations.goto(`${adminOrigin}/operazioni`);
    await operations.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Profilo", exact: true }).click();
    const calendar = operations.getByRole("group", { name: "Fasce orarie e capacità" });
    await expect(calendar.getByRole("spinbutton")).toHaveCount(56);
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 11:00–12:00" })).toHaveValue("5");
    const separator = calendar.getByRole("button", { name: "Modifica separatore, Lunedì 12:00" });
    await separator.focus();
    await separator.press("Enter");
    await expect(calendar.getByLabel("Orario del separatore")).toBeFocused();
    await calendar.getByRole("button", { name: "Elimina separatore e unisci" }).click();
    const merged = calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 11:00–13:00" });
    await expect(merged).toHaveValue("10");
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Martedì 11:00–12:00" })).toHaveValue("5");
    await calendar.getByRole("button", { name: "Rimuovi fascia, Martedì 11:00–12:00" }).click();
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Martedì 11:00–12:00" })).toHaveCount(0);
    await calendar.getByRole("button", { name: "Dividi fascia, Lunedì 19:00–20:00" }).click();
    await expect(calendar.getByLabel("Orario del separatore")).toHaveValue("19:30");
    await calendar.getByRole("button", { name: "Applica", exact: true }).click();
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 19:00–19:30" })).toHaveValue("3");
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 19:30–20:00" })).toHaveValue("2");
    await calendar.getByRole("button", { name: "Modifica separatore, Lunedì 20:00" }).click();
    await calendar.getByLabel("Orario del separatore").fill("20:15");
    await calendar.getByRole("button", { name: "Applica", exact: true }).click();
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 19:30–20:15" })).toHaveValue("2");
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 20:15–21:00" })).toHaveValue("5");
    await calendar.getByRole("button", { name: "Aggiungi fascia, Lunedì" }).click();
    await calendar.getByLabel("Inizio", { exact: true }).fill("22:00");
    await calendar.getByLabel("Fine", { exact: true }).fill("22:30");
    await calendar.getByRole("button", { name: "Applica", exact: true }).click();
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Lunedì 22:00–22:30" })).toHaveValue("5");
    await merged.fill("1");
    await calendar.getByRole("button", { name: "Applica a tutta la settimana" }).click();
    await expect(calendar.getByRole("spinbutton", { name: "Massimo ordini, Domenica 11:00–13:00" })).toHaveValue("1");
    const saved = operations.waitForResponse(response => response.url().endsWith(storeApi) && response.request().method() === "PUT");
    await operations.getByRole("button", { name: "Salva configurazione" }).click();
    expect((await saved).ok()).toBe(true);
    const screenshot = testInfo.outputPath("settimana-tipo.png");
    await calendar.screenshot({ path: screenshot });
    await testInfo.attach("Settimana tipo", { path: screenshot, contentType: "image/png" });

    const catalog = await page.request.get(`${clientOrigin}${storeApi}`);
    expect(catalog.ok()).toBe(true);
    const store = await catalog.json() as IndividualStore;
    const exclusive = store.slots.find(slot => slot.capacity === 1 && Date.parse(slot.startsAt) > Date.now() + 3_600_000);
    const other = store.slots.find(slot => slot.capacity > 1 && Date.parse(slot.startsAt) > Date.parse(exclusive?.startsAt ?? ""));
    expect(exclusive).toBeDefined();
    expect(other).toBeDefined();
    const exclusiveLabel = formatOrderWindow(exclusive!.startsAt, exclusive!.endsAt, exclusive!.timeZone);
    const otherLabel = formatOrderWindow(other!.startsAt, other!.endsAt, other!.timeZone);

    await page.goto(`${clientOrigin}/ordina`);
    await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
    await page.getByRole("link", { name: /^Carrello/ }).click();
    await page.getByRole("link", { name: /Vai al checkout/ }).click();
    await page.getByLabel("Quando?").selectOption(exclusive!.id);
    await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
    await expect(page.getByText(`Orario: ${exclusiveLabel}`, { exact: true })).toBeVisible();
    await page.getByLabel(/Telefono per l.ordine/).fill("3331234567");
    await page.getByRole("button", { name: "Conferma e invia ordine" }).click();
    await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: `${exclusiveLabel} · Al completo`, exact: true })).toHaveJSProperty("disabled", true);

    await page.getByRole("link", { name: "Ordine di gruppo", exact: true }).click();
    await page.getByRole("button", { name: "Crea gruppo", exact: true }).click();
    await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
    await expect(page.getByLabel("Le mie scelte").getByRole("spinbutton")).toHaveValue("1");
    await page.getByRole("button", { name: "Chiudi raccolta", exact: true }).click();
    await expect(page.getByRole("option", { name: `${exclusiveLabel} · Al completo`, exact: true })).toHaveJSProperty("disabled", true);
    await page.getByLabel("Quando?").selectOption(other!.id);
    await page.getByRole("button", { name: "Verifica totale gruppo" }).click();
    await expect(page.getByText(`Orario: ${otherLabel}`, { exact: true })).toBeVisible();
    await page.getByLabel(/Telefono per l.ordine/).fill("3331234567");
    await page.getByRole("button", { name: "Conferma ordine di gruppo" }).click();
    await expect(page.getByRole("heading", { name: "Ordine di gruppo inviato", exact: true })).toBeVisible();
  } finally {
    await admin.close();
  }
});

test("il Profilo conserva la bozza se una modifica arriva fra rilettura e salvataggio", async ({ browser }) => {
  const operator = await browser.newContext();
  try {
    await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
    const page = await operator.newPage();
    await page.goto(`${adminOrigin}/operazioni/profilo`);
    const name = page.getByLabel("Nome sede", { exact: true });
    await expect(name).toBeVisible();
    const originalName = await name.inputValue();
    await name.fill("Bozza concorrente");
    let injectChange = true;
    await page.route(`**${storeApi}`, async route => {
      if (route.request().method() !== "GET" || !injectChange) { await route.continue(); return; }
      injectChange = false;
      const response = await route.fetch();
      const current = await response.json() as IndividualStore;
      const remote = await operator.request.put(`${adminOrigin}${storeApi}`, {
        headers: { origin: adminOrigin }, data: { ...current, contactPhone: "0612345678" }
      });
      expect(remote.ok()).toBe(true);
      await route.fulfill({ response });
    });
    const rejected = page.waitForResponse(response => response.url().endsWith(storeApi) && response.request().method() === "PUT");
    await page.getByRole("button", { name: "Salva configurazione", exact: true }).click();
    expect((await rejected).status()).toBe(409);
    await expect(page.getByText("La configurazione è cambiata. Ricarica la sede e ripeti la modifica.", { exact: true })).toBeVisible();
    await expect(name).toHaveValue("Bozza concorrente");
    const canonical = await operator.request.get(`${adminOrigin}${storeApi}`);
    expect(await canonical.json()).toMatchObject({ name: originalName, contactPhone: "0612345678" });
    await page.unroute(`**${storeApi}`);
    await page.reload();
    await name.fill("Nome dopo rilettura");
    const saved = page.waitForResponse(response => response.url().endsWith(storeApi) && response.request().method() === "PUT");
    await page.getByRole("button", { name: "Salva configurazione", exact: true }).click();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByText("Configurazione salvata.", { exact: true })).toBeVisible();
    expect(await (await operator.request.get(`${adminOrigin}${storeApi}`)).json()).toMatchObject({ name: "Nome dopo rilettura", contactPhone: "0612345678" });
  } finally {
    await operator.close();
  }
});
