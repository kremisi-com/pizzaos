import { expect, test } from "@playwright/test";
import type { AdminDeliveryItem, DeliveryRider, IndividualCart, IndividualCheckoutResult, IndividualOrder, IndividualQuote, IndividualStore, PilotAnalyticsReport, RiderDelivery } from "@pizzaos/domain";

// Only the isolated harness authenticates these cookies; no production login bypass.
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3101";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3102";
const clientApi = `${clientOrigin}/api/pilot/v1/pilot`;
const adminApi = `${adminOrigin}/api/pilot/v1/pilot`;

test("operator enables a rider, resolves a delivery issue and completes one canonical cash sale", async ({ browser, context }) => {
  test.setTimeout(120_000);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  const operationsContext = await browser.newContext(); const riderContext = await browser.newContext();
  try {
    await operationsContext.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
    await riderContext.addCookies([{ name: "pizzaos-e2e-actor", value: "rider", url: adminOrigin, httpOnly: true, sameSite: "Lax" }]);
    const initialCatalogResponse = await operationsContext.request.get(`${adminApi}/stores/roma`);
    expect(initialCatalogResponse.ok()).toBe(true);
    const initialCatalog = await initialCatalogResponse.json() as IndividualStore;
    const initialStock = initialCatalog.ingredients.find(ingredient => ingredient.id === "dough")?.stock;
    expect(initialStock).toEqual(expect.any(Number));
    const initialAnalyticsResponse = await operationsContext.request.get(`${adminApi}/stores/roma/analytics?period=today`);
    expect(initialAnalyticsResponse.ok()).toBe(true);
    const initialAnalytics = await initialAnalyticsResponse.json() as PilotAnalyticsReport;

    // Prepare through public checkout/order endpoints; the extensions are exercised in the browser below.
    const cart: IndividualCart = { storeId: "roma", mode: "delivery", slotId: null, notes: "Citofono pilota",
      address: { text: "Via del Pilota 7, Roma", latitude: 41.9, longitude: 12.5 },
      lines: [{ productId: "pizza", quantity: 1, optionIds: [], notes: "" }] };
    const quotation = await context.request.post(`${clientApi}/quote`, { headers: { origin: clientOrigin }, data: { cart } });
    expect(quotation.ok()).toBe(true);
    const quote = await quotation.json() as IndividualQuote;
    expect(quote.totalCents).toBe(1000);
    const checkout = await context.request.post(`${clientApi}/checkouts`, { headers: { origin: clientOrigin },
      data: { cart, fingerprint: quote.fingerprint, phone: "+39 3331234567", method: "cash", idempotencyKey: `rider-e2e-${Date.now()}` } });
    expect(checkout.ok()).toBe(true);
    const { order } = await checkout.json() as IndividualCheckoutResult;
    for (const action of ["accept", "prepare", "ready"]) {
      const response = await operationsContext.request.post(`${adminApi}/orders/${order.id}/actions`, { headers: { origin: adminOrigin }, data: { action } });
      expect(response.ok(), action).toBe(true);
    }

    const operations = await operationsContext.newPage();
    await operations.goto(`${adminOrigin}/operazioni`);
    await expect(operations.getByLabel("Negozio Attivo", { exact: true })).toHaveValue("roma");
    const navigation = operations.getByRole("navigation", { name: "Navigazione admin" });
    await navigation.getByRole("button", { name: "Consegne", exact: true }).click();
    await operations.getByLabel("Email rider").fill("rider@example.test");
    await operations.getByLabel("Nome rider").fill("Rider Pilota");
    await operations.getByRole("button", { name: "Abilita rider", exact: true }).click();
    await expect(operations.getByRole("button", { name: "Disattiva Rider Pilota", exact: true })).toBeVisible();
    const ridersResponse = await operationsContext.request.get(`${adminApi}/stores/roma/riders`);
    expect(ridersResponse.ok()).toBe(true);
    const enabled = (await ridersResponse.json() as DeliveryRider[]).find(candidate => candidate.email === "rider@example.test");
    expect(enabled?.active).toBe(true);
    if (!enabled) throw new Error("Il rider abilitato non è presente nel port pubblico");
    await operations.getByLabel(`Rider per ordine ${order.id}`, { exact: true }).selectOption(enabled.id);
    await operations.getByRole("button", { name: `Assegna per ordine ${order.id}`, exact: true }).click();
    await expect.poll(async () => {
      const response = await operationsContext.request.get(`${adminApi}/stores/roma/deliveries`);
      return (await response.json() as AdminDeliveryItem[]).find(item => item.orderId === order.id)?.riderId;
    }).toBe(enabled.id);

    // The rider port provides just the operational delivery DTO, with no generic operator grants.
    const riderList = await riderContext.request.get(`${adminApi}/rider/deliveries`);
    expect(riderList.ok()).toBe(true);
    const dto = (await riderList.json() as RiderDelivery[]).find(item => item.orderId === order.id);
    expect(dto).toMatchObject({ cashDueCents: 1000, address: { text: cart.address?.text } });
    expect(await riderList.text()).not.toMatch(/customerId|providerIntentId|refundId|alice@example.test|fingerprint|"stock"/);
    const rawAction = await riderContext.request.post(`${adminApi}/orders/${order.id}/actions`, { headers: { origin: adminOrigin }, data: { action: "dispatch" } });
    expect(rawAction.status()).toBe(403);
    expect((await riderContext.request.get(`${adminApi}/stores/roma/analytics?period=today`)).status()).toBe(403);

    const riderPage = await riderContext.newPage();
    await riderPage.goto(`${adminOrigin}/rider`);
    await expect(riderPage.getByText("Via del Pilota 7, Roma", { exact: true })).toBeVisible();
    await riderPage.getByRole("button", { name: /avvia/i }).click();
    await expect(riderPage.getByRole("button", { name: /completa/i })).toBeVisible();
    const report = riderPage.getByRole("button", { name: /segnala.*problema/i });
    if (await riderPage.getByRole("textbox").count() === 0) await report.click();
    await riderPage.getByRole("textbox").fill("Cliente assente al primo tentativo");
    const submit = riderPage.getByRole("button", { name: /invia|conferma/i });
    if (await submit.count() > 0) await submit.click(); else await report.click();
    await expect(riderPage.getByText("Cliente assente al primo tentativo", { exact: true })).toBeVisible();
    await expect(riderPage.getByRole("button", { name: /completa/i })).toHaveCount(0);

    await operations.reload();
    await navigation.getByRole("button", { name: "Consegne", exact: true }).click();
    await expect(operations.getByText("Consegna da risolvere", { exact: true })).toBeVisible();
    await expect(operations.getByText("Cliente assente al primo tentativo", { exact: true })).toBeVisible();
    await operations.getByLabel(`Rider per ordine ${order.id}`, { exact: true }).selectOption(enabled.id);
    await operations.getByRole("button", { name: `Assegna per ordine ${order.id}`, exact: true }).click();
    await expect(operations.getByText("Consegna da risolvere", { exact: true })).toHaveCount(0);
    // Authenticated polling must discover the same-rider retry without a forced rider reload.
    await expect(riderPage.getByRole("button", { name: /completa/i })).toBeVisible();
    await riderPage.getByRole("button", { name: /completa/i }).click();
    await expect(riderPage.getByText("Via del Pilota 7, Roma", { exact: true })).toHaveCount(0);

    const customerOrders = await context.request.get(`${clientApi}/orders`);
    expect(customerOrders.ok()).toBe(true);
    expect((await customerOrders.json() as IndividualOrder[]).find(candidate => candidate.id === order.id)).toMatchObject({ status: "completed", payment: "cash_paid" });
    // Canonical completion retries must preserve both inventory and the analytics journal.
    for (let retry = 0; retry < 2; retry += 1) {
      const response = await operationsContext.request.post(`${adminApi}/orders/${order.id}/actions`, { headers: { origin: adminOrigin }, data: { action: "complete" } });
      expect(response.ok()).toBe(true);
    }
    const finalCatalogResponse = await operationsContext.request.get(`${adminApi}/stores/roma`);
    const finalCatalog = await finalCatalogResponse.json() as IndividualStore;
    expect(finalCatalog.ingredients.find(ingredient => ingredient.id === "dough")?.stock).toBe((initialStock ?? 0) - 1);
    const finalAnalyticsResponse = await operationsContext.request.get(`${adminApi}/stores/roma/analytics?period=today`);
    expect(finalAnalyticsResponse.ok()).toBe(true);
    const finalAnalytics = await finalAnalyticsResponse.json() as PilotAnalyticsReport;
    expect(finalAnalytics.completedOrders).toBe(initialAnalytics.completedOrders + 1);
    expect(finalAnalytics.salesCents).toBe(initialAnalytics.salesCents + 1000);
    expect(finalAnalytics.topProducts.find(product => product.productId === "pizza")).toMatchObject({ name: "Pizza", quantity: 1 });
    await operations.reload();
    await navigation.getByRole("button", { name: "Analytics & AI", exact: true }).click();
    await expect(operations.getByRole("heading", { name: "Vendite e ordini", exact: true })).toBeVisible();
    await expect(operations.getByText("10,00 €", { exact: true }).first()).toBeVisible();
  } finally {
    await operationsContext.close(); await riderContext.close();
  }
});
