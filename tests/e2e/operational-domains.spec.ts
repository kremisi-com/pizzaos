import { expect, test } from "@playwright/test";

const admin = "http://admin.localhost:3202";
const rider = "http://rider.localhost:3202";

test("dedicated homes and login ignore area and external callback overrides", async ({ page }) => {
  for (const [origin, title, callback] of [[admin, "Accesso ristorante", "/operazioni"], [rider, "Accesso rider", "/rider"]] as const) {
    await page.goto(origin);
    await expect(page.getByRole("link", { name: /Accedi/ }).first()).toBeVisible();
    await page.goto(`${origin}/accesso?area=${origin === admin ? "rider" : "admin"}&callbackUrl=https://evil.example`);
    await expect(page).toHaveTitle(origin === rider ? "PizzaOS Rider" : "PizzaOS Admin");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const form = page.locator('form[action="/api/pilot/auth/signin/google"]');
    await expect(form.locator('input[name="callbackUrl"]')).toHaveValue(callback);
    await expect(page.getByText(/carrello/i)).toHaveCount(0);
    await form.getByRole("button", { name: "Continua con Google" }).click();
    await expect(page).toHaveURL(`${origin}${callback}`);
  }
});

test("host-only login, explicit roles and direct navigation stay separated", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await context.addCookies([{ name: "host-test-role", value: "rider", url: rider }]);
  await page.goto(rider);
  await expect(page.getByRole("heading", { name: "Le mie consegne" })).toBeVisible();
  await expect(page.getByText("Nessuna consegna assegnata in questo momento.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Area ristorante" })).toHaveCount(0);
  await page.goto(`${rider}/operazioni`);
  await expect(page).toHaveURL(`${rider}/`);
  await expect(page.getByRole("heading", { name: "Le mie consegne" })).toBeVisible();
  await page.goto(admin);
  await expect(page.getByRole("link", { name: /Accedi/ }).first()).toBeVisible();
  await context.addCookies([{ name: "host-test-role", value: "rider", url: admin }]);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Accesso non abilitato" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toHaveCount(0);
  await context.addCookies([{ name: "host-test-role", value: "operator", url: admin }]);
  await page.reload();
  await expect(page.getByRole("button", { name: "Dashboard", exact: true })).toBeVisible();
  await context.addCookies([{ name: "host-test-role", value: "operator", url: rider }]);
  await page.goto(rider);
  await expect(page.getByRole("heading", { name: "Accesso non abilitato" })).toBeVisible();
  await context.close();
});

test("rider proxy blocks administrative paths and cross-host writes", async ({ request }) => {
  const blocked = await request.get("http://127.0.0.1:3202/api/pilot/v1/pilot/stores", { headers: { host: "rider.localhost:3202", cookie: "host-test-role=operator" } });
  expect(blocked.status()).toBe(403);
  const crossHost = await request.post("http://127.0.0.1:3202/api/pilot/v1/pilot/rider/deliveries/order/dispatch", {
    headers: { host: "rider.localhost:3202", origin: admin, cookie: "host-test-role=rider" }, data: {}
  });
  expect(crossHost.status()).toBe(403);
  const own = await request.get("http://127.0.0.1:3202/api/pilot/v1/pilot/rider/session", { headers: { host: "rider.localhost:3202", cookie: "host-test-role=rider" } });
  expect(own.ok()).toBe(true);
  expect(await own.json()).toMatchObject({ storeIds: ["roma"] });
  const demo = await request.get("http://127.0.0.1:3202/api/pilot/auth/demo", { headers: { host: "rider.localhost:3202" } });
  expect(demo.status()).toBe(403);
});
