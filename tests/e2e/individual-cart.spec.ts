import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { IndividualCheckoutResult } from "@pizzaos/domain";

// Uses the isolated individual ordering harness and its public Roma/Pizza fixture.
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3741";

async function expectMobileCheckoutAboveNavigation(page: Page) {
  const checkout = page.getByRole("link", { name: /Vai al checkout/ });
  const navigation = page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Carrello", exact: true }) });
  await expect(checkout).toBeVisible();
  const checkoutBox = await checkout.boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect(checkoutBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  if (!checkoutBox || !navigationBox) throw new Error("CTA o navigazione prive di dimensioni visibili");
  expect(checkoutBox.y).toBeGreaterThanOrEqual(0);
  expect(checkoutBox.y + checkoutBox.height).toBeLessThanOrEqual(navigationBox.y);
  expect(checkoutBox.x).toBeGreaterThanOrEqual(0);
  expect(checkoutBox.x + checkoutBox.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await checkout.click({ trial: true });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

test("menu, carrello e checkout condividono il draft attraverso navigazione e reload", async ({ page }) => {
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByLabel("Scegli la sede").selectOption({ label: "Roma" });
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
  const cartNavigation = page.getByRole("link", { name: /^Carrello/ });
  await expect(cartNavigation).toHaveAttribute("href", "/ordina/carrello");
  await cartNavigation.click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await expect(page.getByRole("button", { name: "Aggiungi Pizza", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Aumenta quantità Pizza", exact: true }).click();
  const quantity = () => page.evaluate(() => {
    const raw = localStorage.getItem("pizzaos.individual-cart.v1");
    const draft = raw ? JSON.parse(raw) as { cart: { lines: { quantity: number }[] } } : null;
    return draft?.cart.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
  });
  await expect.poll(quantity).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectMobileCheckoutAboveNavigation(page);
  await mkdir(".codex/evidence", { recursive: true });
  await page.screenshot({ path: ".codex/evidence/client-cart-mobile.png" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Diminuisci quantità Pizza", exact: true })).toBeVisible();
  await expect.poll(quantity).toBe(2);
  await expectMobileCheckoutAboveNavigation(page);
  await page.getByRole("link", { name: /Vai al checkout/ }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/checkout`);
  await expect(page.getByRole("region", { name: "Consegna e pagamento", exact: true })).toBeVisible();
  await expect(page.getByLabel("Modalità", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Consegna e pagamento", exact: true })).toBeVisible();
  await expect.poll(quantity).toBe(2);
  await page.getByRole("link", { name: /Menu$/ }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina#il-menu`);
  await page.getByRole("link", { name: /^Carrello/ }).click();
  await page.getByRole("button", { name: "Svuota carrello", exact: true }).click();
  await expect.poll(quantity).toBe(0);
  await expect(page.getByRole("link", { name: /Sfoglia il menu/ })).toHaveAttribute("href", "/ordina#il-menu");
  await expect(page.getByRole("link", { name: /Vai al checkout/ })).toHaveCount(0);
});

test("i percorsi legacy aprono carrello e checkout operativi", async ({ page }) => {
  await page.goto(`${clientOrigin}/cart`);
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await expect(page.getByRole("link", { name: /Sfoglia il menu/ })).toBeVisible();
  await page.goto(`${clientOrigin}/checkout`);
  await expect(page).toHaveURL(`${clientOrigin}/ordina/checkout`);
  await expect(page.getByRole("region", { name: "Consegna e pagamento", exact: true })).toBeVisible();
});

test("il checkout del carrello invia un ordine contanti tramite IndividualApi", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByLabel("Scegli la sede").selectOption({ label: "Roma" });
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
  await page.getByRole("button", { name: "Carrello", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await page.getByRole("link", { name: /Vai al checkout/ }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/checkout`);
  await page.getByLabel("Modalità", { exact: true }).selectOption("pickup");
  await page.getByLabel(/Telefono per l.ordine/).fill("+39 3331234567");
  await page.getByLabel("Come paghi?").selectOption("cash");
  await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
  await expect(page.getByRole("heading", { name: "Riepilogo da confermare" })).toBeVisible();
  const response = page.waitForResponse(result => result.url().endsWith("/v1/pilot/checkouts") && result.request().method() === "POST");
  await page.getByRole("button", { name: "Conferma e invia ordine" }).click();
  const checkout = await response;
  expect(checkout.ok()).toBe(true);
  const { order } = await checkout.json() as IndividualCheckoutResult;
  expect(order.method).toBe("cash");
  expect(order.cart.lines).toEqual([expect.objectContaining({ productId: "pizza", quantity: 1 })]);
  await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
});
