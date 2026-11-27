import { expect, test } from "@playwright/test";
import type { IndividualStore, MenuDraft, MenuWorkspace, OutOfStockBehavior } from "@pizzaos/domain";

const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:4032";
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:4031";
const storePath = "/api/pilot/v1/pilot/stores/roma";
const menuPath = `${storePath}/menu-admin`;

test("il Profilo governa prodotti con scorte zero, le scorte vuote consentono pubblicazione e ordine", async ({ page, context, browser }, testInfo) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  const customer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await customer.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  const client = await customer.newPage();
  try {
    const current = await (await context.request.get(`${adminOrigin}${storePath}`)).json() as IndividualStore;
    const configured = await context.request.put(`${adminOrigin}${storePath}`, { headers: { origin: adminOrigin }, data: {
      ...current, ingredients: [...current.ingredients, { id: "stock-policy-tomato", name: "Pomodoro", stock: null, food: { contains: [], mayContain: [] } }]
    } });
    expect(configured.ok(), await configured.text()).toBe(true);
    const draft: MenuDraft = { id: "stock-policy-menu", name: "Menu", sections: [{ id: "pizze", name: "Pizze", productIds: ["stock-policy-pizza"] }],
      products: [{ id: "stock-policy-pizza", name: "Pizza al pomodoro", description: "", priceCents: 800, available: true,
        allergens: [], ingredients: { "stock-policy-tomato": 1 }, options: [], food: { contains: [], mayContain: [] } }] };
    const workspace = await (await context.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const saved = await context.request.put(`${adminOrigin}${menuPath}/drafts`, { headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft } });
    expect(saved.ok(), await saved.text()).toBe(true);
    await page.goto(`${adminOrigin}/operazioni/menu`);
    await page.getByLabel("Menu da modificare").selectOption(draft.id);
    await page.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = page.waitForResponse(response => response.url().endsWith(`${menuPath}/publish`) && response.request().method() === "POST");
    await page.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    const published = await publishing;
    expect(published.ok(), await published.text()).toBe(true);
    await client.goto(`${clientOrigin}/ordina`);
    await expect(client.getByRole("button", { name: "Aggiungi Pizza al pomodoro", exact: true })).toBeEnabled();

    const store = await (await context.request.get(`${adminOrigin}${storePath}`)).json() as IndividualStore;
    const zero = await context.request.put(`${adminOrigin}${storePath}`, { headers: { origin: adminOrigin }, data: {
      ...store, ingredients: store.ingredients.map(item => item.id === "stock-policy-tomato" ? { ...item, stock: 0 } : item)
    } });
    expect(zero.ok(), await zero.text()).toBe(true);
    await client.reload();
    await expect(client.getByText("Esaurito", { exact: true })).toBeVisible();
    await expect(client.getByRole("button", { name: "Pizza al pomodoro non disponibile", exact: true })).toBeDisabled();

    async function choose(behavior: OutOfStockBehavior) {
      await page.goto(`${adminOrigin}/operazioni/profilo`);
      const saving = page.waitForResponse(response => response.url().endsWith(storePath) && response.request().method() === "PUT");
      await page.getByRole("combobox", { name: "Prodotti con ingredienti esauriti" }).selectOption(behavior);
      const response = await saving;
      expect(response.ok(), await response.text()).toBe(true);
      expect((await response.json()).outOfStockBehavior).toBe(behavior);
      await page.reload();
      await expect(page.getByRole("combobox", { name: "Prodotti con ingredienti esauriti" })).toHaveValue(behavior);
    }
    await choose("hide");
    await client.reload();
    await expect(client.getByRole("button", { name: /Pizza al pomodoro/ })).toHaveCount(0);
    const hidden = await (await customer.request.get(`${clientOrigin}${storePath}`)).json() as IndividualStore;
    expect(hidden.products).toHaveLength(0);

    await choose("allow");
    await page.goto(`${adminOrigin}/operazioni/menu`);
    await expect(page.getByRole("alert").filter({ hasText: "Scorte esaurite: Pomodoro" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("avviso-admin.png"), fullPage: true });
    await client.reload();
    await expect(client.getByRole("button", { name: "Aggiungi Pizza al pomodoro", exact: true })).toBeEnabled();
    await expect(client.getByText("Scorte esaurite", { exact: false })).toHaveCount(0);
    await client.getByRole("button", { name: "Aggiungi Pizza al pomodoro", exact: true }).click();
    await client.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
    await client.getByRole("link", { name: /^Carrello/ }).click();
    await client.getByRole("link", { name: /Vai al checkout/ }).click();
    const quoting = client.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await client.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quote = await quoting;
    expect(quote.ok(), await quote.text()).toBe(true);
    await client.screenshot({ path: testInfo.outputPath("cliente-ordinabile.png"), fullPage: true });

    await choose("disable");
    await page.screenshot({ path: testInfo.outputPath("profilo-policy.png"), fullPage: true });
    await client.reload();
    await expect(client.getByText("Esaurito", { exact: true })).toBeVisible();
    const publishedMenu = await (await context.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    expect(publishedMenu.published.id).toBe(draft.id);
  } finally { await customer.close(); }
});
