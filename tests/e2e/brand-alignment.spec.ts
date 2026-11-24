import { expect, test, type Page } from "@playwright/test";

const client = "http://127.0.0.1:3301";
const admin = "http://127.0.0.1:3302";

async function checkIdentity(page: Page) {
  const logo = page.getByRole("img", { name: "PizzaOS", exact: true }).first();
  await expect(logo).toBeVisible();
  await expect(logo).toHaveJSProperty("complete", true);
  expect(await logo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).filter(image => image.complete || image.loading !== "lazy").map(image => image.decode().catch(() => undefined)));
  });
  const body = page.locator("body");
  await expect(body).toHaveCSS("font-family", /Poppins/);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Poppins"'))).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--pizzaos-brand-orange").trim())).toBe("#CF5430");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(2);
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
}

async function demo(page: Page, origin: string) {
  await page.goto(`${origin}/poc`);
  await checkIdentity(page);
  await page.getByLabel(/password/i).fill("session-demo-browser-password");
  await page.getByRole("button", { name: "Entra nella demo" }).click();
  await expect(page.getByRole("complementary", { name: "Modalità demo" })).toBeVisible();
}

test("client mobile: official kit loads on ordinary login, real ordering and demo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${client}/accesso`);
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/client-login.png", fullPage: true });
  await page.goto(`${client}/ordina`);
  await expect(page.getByRole("heading", { name: "La tua prossima pizza." })).toBeVisible();
  await expect(page.getByLabel("Scegli la sede")).toBeVisible();
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/client-live.png", fullPage: true });
  await demo(page, client);
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/client-demo.png", fullPage: true });
  await page.goto(`${client}/product/product-margherita`);
  await page.getByRole("button", { name: "Aggiungi al carrello" }).click();
  await page.getByRole("link", { name: "Vai al carrello" }).click();
  await expect(page.getByTestId("cart-checkout-link")).toBeVisible();
  await page.screenshot({ path: ".codex/brand-alignment/client-cart.png", fullPage: true });
});

test("admin desktop: official kit survives demo and operational navigation", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${admin}/accesso`);
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/admin-login.png", fullPage: true });
  await demo(page, admin);
  await checkIdentity(page);
  const bannerBounds = await page.getByRole("complementary", { name: /Modalit.*demo/ }).boundingBox();
  const logoBounds = await page.getByRole("img", { name: "PizzaOS", exact: true }).boundingBox();
  expect(bannerBounds).not.toBeNull();
  expect(logoBounds).not.toBeNull();
  expect(logoBounds!.y).toBeGreaterThanOrEqual(bannerBounds!.y + bannerBounds!.height);
  await expect(page.getByRole("heading", { name: "Ordini Live", exact: true })).toBeInViewport();
  await page.screenshot({ path: ".codex/brand-alignment/admin-demo.png", fullPage: true });
  await context.clearCookies();
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: admin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${admin}/operazioni`);
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/admin-live.png", fullPage: true });
  await page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Ordini", exact: true }).click();
  await expect(page).toHaveURL(/\/operazioni\/ordini$/);
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/admin-orders.png", fullPage: true });
});

test("rider mobile login displays the official identity without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${admin}/accesso?area=rider`);
  await checkIdentity(page);
  await page.screenshot({ path: ".codex/brand-alignment/rider-login.png", fullPage: true });
});
