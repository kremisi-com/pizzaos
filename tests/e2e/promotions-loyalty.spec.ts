import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import type { IndividualOrder, IndividualQuote, IndividualStore, LoyaltyWallet, PromotionConfiguration } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3601";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3602";
const endpoint = (origin: string, path: string) => `${origin}/api/pilot/v1/pilot${path}`;
test.use({ actionTimeout: 20_000 });
function localDeadline() {
  const date = new Date(Date.now() + 60 * 60_000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
async function identity(context: BrowserContext, origin: string, value: "alice" | "operator") {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value, url: origin }]);
}
async function wallet(page: Page): Promise<LoyaltyWallet> {
  const storesResponse = await page.request.get(endpoint(clientOrigin, "/stores"));
  const stores = await storesResponse.json() as IndividualStore[];
  const response = await page.request.get(endpoint(clientOrigin, `/stores/${stores[0]!.id}/loyalty`));
  expect(response.ok(), `${response.status()} ${await response.text()}`).toBe(true);
  return response.json() as Promise<LoyaltyWallet>;
}
function availablePoints(page: Page) {
  return page.getByText("Punti disponibili", { exact: true }).locator("xpath=following-sibling::dd[1]");
}
async function completeOrder(admin: Page, customer: Page, note: string, id: string) {
  await admin.goto(`${adminOrigin}/operazioni`);
  await admin.getByRole("navigation", { name: "Navigazione admin" }).getByRole("button", { name: "Ordini", exact: true }).click();
  await admin.getByRole("button", { name: `Apri ordine ${id} di Alice`, exact: true }).click();
  const article = admin.getByRole("article").filter({ hasText: note }).last();
  for (const action of ["Accetta ordine", "Inizia preparazione", "Segna pronto", "Completa ordine"]) await article.getByRole("button", { name: action, exact: true }).click();
  await expect.poll(async () => {
    const response = await customer.request.get(endpoint(clientOrigin, "/orders"));
    const orders = await response.json() as IndividualOrder[];
    return orders.find(order => order.id === id)?.status;
  }).toBe("completed");
}
async function createIndividual(page: Page, note: string, code?: string) {
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.locator("textarea").first().fill(note);
  if (code) {
    await page.getByLabel("Codici coupon").fill(code);
    await page.getByRole("button", { name: "Applica coupon" }).click();
    await page.getByLabel("Usa premio fedeltà").check();
  }
  const quoteResponse = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
  const quote = await (await quoteResponse).json() as IndividualQuote;
  await page.getByLabel("Telefono per l'ordine").fill("+393331234567");
  await page.getByLabel("Come paghi?").selectOption("cash");
  const checkoutResponse = page.waitForResponse(response => response.url().endsWith("/v1/pilot/checkouts") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Conferma e invia ordine", exact: true }).click();
  const response = await checkoutResponse;
  expect(response.ok()).toBe(true);
  const result = await response.json() as { order: IndividualOrder };
  return { order: result.order, quote };
}

test("programma e coupon configurati nel browser, credito al completamento e ripristino annullamento", async ({ browser }, testInfo) => {
  const operatorContext = await browser.newContext();
  const customerContext = await browser.newContext();
  await identity(operatorContext, adminOrigin, "operator");
  await identity(customerContext, clientOrigin, "alice");
  const admin = await operatorContext.newPage();
  const client = await customerContext.newPage();
  const code = `PROMO_${Date.now()}`;
  const marker = `Fedeltà ${Date.now()}`;
  try {
    await admin.goto(`${adminOrigin}/operazioni`);
    await admin.getByRole("navigation", { name: "Navigazione admin" }).getByRole("button", { name: "Marketing", exact: true }).click();
    await admin.getByLabel("Punti per euro").fill("1");
    await admin.getByLabel("Punti per premio").fill("1");
    await admin.getByLabel("Valore premio (€)").fill("1");
    const programSaved = admin.waitForResponse(response => response.url().endsWith("/promotions/program") && response.request().method() === "PUT");
    await admin.getByRole("button", { name: "Salva programma" }).click();
    expect((await programSaved).ok()).toBe(true);
    await admin.getByRole("button", { name: "Nuovo coupon" }).click();
    await admin.getByLabel("Codice coupon").fill(code);
    await admin.getByLabel("Tipo coupon").selectOption("fixed");
    await admin.getByLabel("Valore coupon").fill("1");
    await admin.getByLabel("Limite totale").fill("10");
    const couponSaved = admin.waitForResponse(response => response.url().endsWith("/promotions/coupons") && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Salva coupon" }).click();
    expect((await couponSaved).ok()).toBe(true);
    await expect(admin.getByRole("button", { name: `Modifica ${code}` })).toBeVisible();
    const before = await wallet(client);
    const first = await createIndividual(client, `${marker} primo`);
    expect((await wallet(client)).balancePoints).toBe(before.balancePoints);
    await completeOrder(admin, client, `${marker} primo`, first.order.id);
    const firstEarned = Math.floor(first.quote.subtotalCents / 100);
    await expect.poll(async () => (await wallet(client)).balancePoints).toBe(before.balancePoints + firstEarned);
    await expect(availablePoints(client)).toHaveText(String(before.balancePoints + firstEarned));
    const second = await createIndividual(client, `${marker} scontato`, code);
    expect(second.quote.promotions).toMatchObject({ rewardDiscountCents: 100, redeemedPoints: 1, coupons: [{ code, discountCents: 100 }] });
    expect(second.quote.subtotalCents).toBe(second.quote.promotions!.originalSubtotalCents - 200);
    await completeOrder(admin, client, `${marker} scontato`, second.order.id);
    const earnedSecond = Math.floor(second.quote.subtotalCents / 100);
    const afterSecond = before.balancePoints + firstEarned - 1 + earnedSecond;
    await expect.poll(async () => (await wallet(client)).balancePoints).toBe(afterSecond);
    await expect(availablePoints(client)).toHaveText(String(afterSecond));
    const reloaded = await wallet(client);
    expect(reloaded.movements.filter(movement => movement.orderId === second.order.id && movement.kind === "earn")).toHaveLength(1);
    const third = await createIndividual(client, `${marker} annullato`, code);
    const article = client.getByRole("article").filter({ hasText: `${marker} annullato` }).last();
    await article.getByRole("button", { name: "Annulla ordine", exact: true }).click();
    await expect.poll(async () => (await wallet(client)).availablePoints).toBe(afterSecond);
    await expect(availablePoints(client)).toHaveText(String(afterSecond));
    const screenshot = testInfo.outputPath("wallet-individuale-ripristinato.png");
    await client.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach("Wallet individuale ripristinato", { path: screenshot, contentType: "image/png" });
    const movements = (await wallet(client)).movements.filter(movement => movement.orderId === third.order.id);
    expect(movements.filter(movement => movement.kind === "reward")).toMatchObject([{ status: "released" }]);
    expect(movements.some(movement => movement.kind === "earn")).toBe(false);
    const configurationResponse = await admin.request.get(endpoint(adminOrigin, `/stores/${first.order.storeId}/promotions`));
    const configuration = await configurationResponse.json() as PromotionConfiguration;
    const coupon = configuration.coupons.find(item => item.code === code);
    expect(configuration.usage.find(usage => usage.couponId === coupon?.id)).toMatchObject({ reserved: 0, consumed: 1 });
  } finally {
    await operatorContext.close();
    await customerContext.close();
  }
});

test("host gruppo applica benefici al solo wallet personale e annullamento ripristina punti e utilizzo", async ({ browser }, testInfo) => {
  const operatorContext = await browser.newContext();
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  await identity(operatorContext, adminOrigin, "operator");
  await identity(hostContext, clientOrigin, "alice");
  const admin = await operatorContext.newPage();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const marker = `Gruppo fedeltà ${Date.now()}`;
  const code = `GRUPPO_${Date.now()}`;
  try {
    const initial = await wallet(host);
    const configResponse = await admin.request.get(endpoint(adminOrigin, `/stores/${initial.storeId}/promotions`));
    const configuration = await configResponse.json() as PromotionConfiguration;
    const program = await admin.request.put(endpoint(adminOrigin, `/stores/${initial.storeId}/promotions/program`), { headers: { Origin: adminOrigin }, data: { ...configuration.program, enabled: true, pointsPerEuro: 1, rewardPoints: 1, rewardCents: 100 } });
    expect(program.ok()).toBe(true);
    const saved = await admin.request.post(endpoint(adminOrigin, `/stores/${initial.storeId}/promotions/coupons`), { headers: { Origin: adminOrigin }, data: { code, active: true, kind: "fixed", value: 100, startsAt: null, endsAt: null, minimumCents: 0, productIds: [], globalLimit: 1, perCustomerLimit: 1 } });
    expect(saved.ok()).toBe(true);
    if ((await wallet(host)).availablePoints < 1) {
      const earned = await createIndividual(host, `${marker} maturazione`);
      await completeOrder(admin, host, `${marker} maturazione`, earned.order.id);
    }
    const before = await wallet(host);
    await host.goto(`${clientOrigin}/ordina/gruppo`);
    await host.getByLabel("Nome", { exact: true }).fill(marker);
    await host.getByLabel("Scadenza raccolta").fill(localDeadline());
    await host.getByRole("button", { name: "Crea gruppo", exact: true }).click();
    const link = await host.getByLabel("Link invito").inputValue();
    await host.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
    await guest.goto(link);
    await guest.getByLabel("Nome", { exact: true }).fill("Invitato fedeltà");
    await guest.getByRole("button", { name: "Entra nel gruppo", exact: true }).click();
    await guest.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
    await expect(guest.getByText(/Saldo punti/)).toHaveCount(0);
    await expect(guest.getByLabel("Usa premio fedeltà")).toHaveCount(0);
    await expect(host.getByText("Invitato fedeltà", { exact: true })).toBeVisible();
    await expect(host.getByRole("article", { name: "Invitato fedeltà", exact: true })).toContainText("Pizza");
    await host.getByRole("button", { name: "Chiudi raccolta", exact: true }).click();
    await host.getByLabel("Codici coupon").fill(code);
    await host.getByRole("button", { name: "Applica coupon", exact: true }).click();
    await host.getByLabel("Usa premio fedeltà").check();
    const quoteResponse = host.waitForResponse(response => /\/groups\/[^/]+\/quote$/.test(response.url()) && response.request().method() === "POST");
    await host.getByRole("button", { name: "Verifica totale gruppo", exact: true }).click();
    const quoted = await (await quoteResponse).json() as { quote: IndividualQuote };
    expect(quoted.quote.promotions).toMatchObject({ coupons: [{ code, discountCents: 100 }], rewardDiscountCents: 100, redeemedPoints: 1 });
    await host.getByLabel("Telefono per l'ordine").fill("+393331234567");
    await host.getByLabel("Come paghi?").selectOption("cash");
    const checkoutResponse = host.waitForResponse(response => /\/groups\/[^/]+\/checkout$/.test(response.url()) && response.request().method() === "POST");
    await host.getByRole("button", { name: "Conferma ordine di gruppo", exact: true }).click();
    const checkout = await checkoutResponse;
    expect(checkout.ok()).toBe(true);
    const result = await checkout.json() as { order: IndividualOrder };
    expect(result.order.cart.lines.some(line => line.notes.includes(marker))).toBe(true);
    expect(result.order.cart.lines.some(line => line.notes.includes("Invitato fedeltà"))).toBe(true);
    expect((await wallet(host)).availablePoints).toBe(before.availablePoints - 1);
    await guest.reload();
    await expect(guest.getByText(/Saldo punti/)).toHaveCount(0);
    await expect(guest.getByLabel("Usa premio fedeltà")).toHaveCount(0);
    await admin.goto(`${adminOrigin}/operazioni`);
    await admin.getByRole("navigation", { name: "Navigazione admin" }).getByRole("button", { name: "Ordini", exact: true }).click();
    await admin.getByRole("button", { name: `Apri ordine ${result.order.id} di Alice`, exact: true }).click();
    const article = admin.getByRole("article").filter({ hasText: marker }).last();
    await expect(article.getByLabel("Benefici applicati all'ordine")).toBeVisible();
    await expect(article).toContainText(code);
    await admin.screenshot({ path: testInfo.outputPath("ordine-gruppo-promozioni.png"), fullPage: true });
    await host.goto(`${clientOrigin}/ordina`);
    await host.getByRole("article").filter({ hasText: marker }).last().getByRole("button", { name: "Annulla ordine", exact: true }).click();
    await expect.poll(async () => (await wallet(host)).availablePoints).toBe(before.availablePoints);
    await expect(availablePoints(host)).toHaveText(String(before.availablePoints));
    const response = await admin.request.get(endpoint(adminOrigin, `/stores/${initial.storeId}/promotions`));
    const restored = await response.json() as PromotionConfiguration;
    const restoredCoupon = restored.coupons.find(coupon => coupon.code === code);
    expect(restored.usage.find(usage => usage.couponId === restoredCoupon?.id)).toMatchObject({ reserved: 0, consumed: 0 });
    const screenshot = testInfo.outputPath("wallet-ripristinato.png");
    await host.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach("Wallet ripristinato", { path: screenshot, contentType: "image/png" });
  } finally {
    await Promise.all([operatorContext.close(), hostContext.close(), guestContext.close()]);
  }
});
