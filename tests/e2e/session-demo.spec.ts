import { expect, test, type Page } from "@playwright/test";

// Runs only with playwright.session-demo.config.ts and its isolated service fixture.
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3301";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3302";
const demoPassword = "session-demo-browser-password";
const surfaces = [{ name: "client", origin: clientOrigin }, { name: "admin", origin: adminOrigin }];

async function signInDemo(page: Page, origin: string) {
  await page.goto(`${origin}/accesso`);
  await expect(page.getByText(/Google/).first()).toBeVisible();
  const email = page.getByLabel(/e-?mail/i);
  const password = page.getByLabel(/password/i);
  await expect(email).toBeVisible();
  await expect(password).toHaveCount(0);
  await email.fill("poc@pizzaos.app");
  await expect(password).toBeVisible();
  await password.fill(demoPassword);
  await page.locator("form").filter({ has: password }).locator('button[type="submit"]').click();
  await expect(page).toHaveURL(`${origin}/`);
  await expect(page.getByText(/demo/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Esci", exact: true })).toBeVisible();
  const mode = await page.request.get(`${origin}/api/pilot/auth/mode`);
  expect(mode.status()).toBe(200);
  expect(await mode.json()).toEqual({ mode: "demo" });
}

for (const surface of surfaces) {
  test(`${surface.name}: login verifies mode, persistent routes are isolated and logout revokes access`, async ({ page }) => {
    await signInDemo(page, surface.origin);
    if (surface.name === "admin") {
      await expect(page.getByRole("button", { name: "Analytics and AI", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Reset Demo", exact: true })).toBeVisible();
    }
    const liveRoutes = surface.name === "client" ? ["/ordina"] : ["/operazioni", "/rider"];
    for (const route of liveRoutes) {
      await page.goto(`${surface.origin}${route}`);
      await expect(page).toHaveURL(`${surface.origin}/`);
      await expect(page.getByRole("button", { name: "Esci", exact: true })).toBeVisible();
    }
    for (const path of ["session", "stores", "orders", "events?cursor=0"]) {
      const response = await page.request.get(`${surface.origin}/api/pilot/v1/pilot/${path}`);
      expect(response.status()).toBe(403);
      expect(await response.json()).toMatchObject({ code: "demo_session" });
    }
    const quote = await page.request.post(`${surface.origin}/api/pilot/v1/pilot/quote`, { headers: { origin: surface.origin }, data: {} });
    expect(quote.status()).toBe(403);
    expect(await quote.json()).toMatchObject({ code: "demo_session" });
    await page.getByRole("button", { name: "Esci", exact: true }).click();
    await expect(page).toHaveURL(`${surface.origin}/accesso`);
    const mode = await page.request.get(`${surface.origin}/api/pilot/auth/mode`);
    expect(await mode.json()).toEqual({ mode: "live" });
    await page.goto(`${surface.origin}/`);
    if (surface.name === "client") {
      await expect(page.getByRole("heading", { name: "La tua prossima pizza." })).toBeVisible();
      await page.goto(`${surface.origin}/menu`);
      await expect(page).toHaveURL(`${surface.origin}/ordina`);
    } else {
      await expect(page.getByRole("button", { name: "Esci", exact: true })).toHaveCount(0);
    }
  });
}

test("client: guest and forged browser state cannot open any protected POC route", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos.demo-session", value: "forged", url: clientOrigin }]);
  await page.goto(`${clientOrigin}/ordina`);
  await page.evaluate(() => {
    window.localStorage.setItem("PIZZAOS_MODE", "demo");
    window.localStorage.setItem("pizzaos:mode", "demo");
  });
  for (const path of ["/menu", "/products", "/product/product-margherita", "/cart", "/checkout", "/orders", "/group-order", "/rewards", "/profile"]) {
    await page.goto(`${clientOrigin}${path}`);
    await expect(page).toHaveURL(`${clientOrigin}/ordina`);
    await expect(page.getByRole("heading", { name: "La tua prossima pizza." })).toBeVisible();
  }
});

test("client: simulated card checkout confirms an order without card data or Stripe traffic", async ({ page }) => {
  const stripeRequests: string[] = [];
  page.on("request", (request) => {
    if (/https?:\/\/[^/]*stripe\.(com|network)\//i.test(request.url())) stripeRequests.push(request.url());
  });
  await signInDemo(page, clientOrigin);
  await page.goto(`${clientOrigin}/product/product-margherita`);
  await page.getByRole("button", { name: "Aggiungi al carrello" }).click();
  await page.getByRole("link", { name: "Vai al carrello" }).click();
  await page.getByTestId("cart-checkout-link").click();
  await expect(page.getByRole("heading", { name: "Checkout", exact: true })).toBeVisible();
  await page.getByLabel(/carta/i).check();
  await expect(page.getByLabel(/Ultime 4 cifre|Numero carta|Scadenza|CVC/i)).toHaveCount(0);
  await expect(page.locator('iframe[src*="stripe"], script[src*="stripe"]')).toHaveCount(0);
  await page.getByTestId("checkout-submit-button").click();
  await expect(page.getByRole("heading", { name: "Il tuo ordine è confermato" })).toBeVisible();
  expect(stripeRequests).toEqual([]);
});
