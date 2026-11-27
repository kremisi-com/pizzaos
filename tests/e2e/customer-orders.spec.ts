import { expect, test } from "@playwright/test";
import type { IndividualCheckoutResult } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3761";
const serviceOrigin = "http://127.0.0.1:3764";

test("Ordini ospite è una pagina dedicata, con accesso e navigazione persistente", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/ordina/ordini`);
  await expect(page.getByRole("heading", { name: "Ordini passati", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Accedi", exact: true })).toHaveAttribute("href", "/accesso?ritorno=%2Fordina%2Fordini");
  await expect(page.getByRole("heading", { name: "Il menu", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conferma e invia ordine", exact: true })).toHaveCount(0);
  await page.goto(`${clientOrigin}/orders`);
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini`);
  await page.goto(`${clientOrigin}/ordina#i-tuoi-ordini`);
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini`);
  await page.getByRole("button", { name: "Ordina", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina`);
  await page.getByRole("button", { name: "Ordini", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ordini passati", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(`${clientOrigin}/ordina`);
  await page.goForward();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini`);
});

test("checkout reale, avanzamento, storico e riordino mantengono un solo ordine", async ({ page, context }, testInfo) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
  await page.getByRole("button", { name: "Carrello", exact: true }).click();
  await page.getByRole("link", { name: /Vai al checkout/ }).click();
  await page.getByLabel(/Telefono per l.ordine/).fill("3331234567");
  const cash = page.getByRole("radio", { name: "Contanti al ritiro o alla consegna", exact: true });
  if (await cash.count()) await cash.check();
  else await page.getByLabel("Come paghi?", { exact: true }).selectOption("cash");
  await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
  const sent = page.waitForResponse(response => response.url().endsWith("/v1/pilot/checkouts") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Conferma e invia ordine", exact: true }).click();
  const response = await sent;
  expect(response.ok()).toBe(true);
  const { order } = await response.json() as IndividualCheckoutResult;
  await page.getByRole("link", { name: "Segui l'ordine", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini#ordine-${order.id}`);
  await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "Avanzamento ordine" })).toBeVisible();
  await expect(page.getByText(/Stima:|Rider in avvicinamento|Com’è andato/)).toHaveCount(0);
  await page.getByLabel(`Note ordine ${order.id}`, { exact: true }).fill("Citofono aggiornato");
  const updatedNotes = page.waitForResponse(result => result.url().endsWith(`/orders/${order.id}/notes`) && result.request().method() === "PATCH");
  await page.getByRole("button", { name: "Aggiorna note", exact: true }).click();
  expect((await updatedNotes).ok()).toBe(true);
  await expect(page.getByLabel(`Note ordine ${order.id}`, { exact: true })).toHaveValue("Citofono aggiornato");
  for (const width of [375, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`ordine-in-corso-${width}.png`), fullPage: true });
  }
  for (const action of ["accept", "prepare", "ready", "complete"]) {
    const changed = await page.request.post(`${serviceOrigin}/v1/pilot/orders/${order.id}/actions`, {
      headers: { "x-pizzaos-proxy-secret": "individual-e2e-proxy-secret-32-characters", "x-pizzaos-origin": clientOrigin, origin: clientOrigin, cookie: "pizzaos-e2e-actor=operator" }, data: { action }
    });
    expect(changed.ok(), await changed.text()).toBe(true);
  }
  const history = page.getByRole("region", { name: "Storico", exact: true });
  await expect(history.getByRole("button", { name: "Riordina", exact: true })).toBeVisible();
  await page.reload();
  await expect(history.getByText("Completato", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("storico-mobile.png"), fullPage: true });
  await history.getByRole("button", { name: "Riordina", exact: true }).click();
  await expect(page.getByRole("link", { name: "Vai al carrello", exact: true })).toBeVisible();
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("pizzaos.individual-cart.v1") ?? "null") as { cart: { slotId: string | null; notes: string; lines: { quantity: number }[] } } | null);
  expect(draft?.cart.slotId).toBeNull();
  expect(draft?.cart.notes).toBe("Citofono aggiornato");
  expect(draft?.cart.lines).toHaveLength(1);
  await page.getByRole("link", { name: "Vai al carrello", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  const orders = await page.request.get(`${clientOrigin}/api/pilot/v1/pilot/orders`);
  expect(await orders.json()).toHaveLength(1);
});
