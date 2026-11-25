import { expect, test } from "@playwright/test";
import { materializePizzaMenu, type IndividualStore, type MenuDraft, type MenuWorkspace, type PizzaComponent } from "@pizzaos/domain";

const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";

test("salva gli extra del Magazzino quando il campo perde il focus", async ({ context, page }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await page.goto(`${adminOrigin}/operazioni/magazzino`);
  const stock = page.getByLabel("Scorta Impasto", { exact: true });
  await stock.fill("15");
  const saved = page.waitForResponse(response => response.request().method() === "PUT" && response.url().endsWith("/stores/roma"));
  await stock.press("Tab");
  const response = await saved;
  expect(response.ok(), await response.text()).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Scorta Impasto", { exact: true })).toHaveValue("15");
  const enabled = page.waitForResponse(response => response.request().method() === "PUT" && response.url().endsWith("/stores/roma"));
  await page.getByLabel("Possibile extra Impasto", { exact: true }).check();
  expect((await enabled).ok()).toBe(true);
  for (const label of ["Prezzo extra Impasto in euro", "Dose per aggiunta Impasto"]) {
    const field = page.getByLabel(label, { exact: true });
    await field.fill("1");
    const savedExtra = page.waitForResponse(response => response.request().method() === "PUT" && response.url().endsWith("/stores/roma"));
    await page.getByRole("heading", { name: "Magazzino ingredienti", exact: true }).click();
    const response = await savedExtra;
    expect(response.ok(), await response.text()).toBe(true);
  }
  await page.reload();
  await expect(page.getByLabel("Prezzo extra Impasto in euro", { exact: true })).toHaveValue("1");
  await expect(page.getByLabel("Dose per aggiunta Impasto", { exact: true })).toHaveValue("1");
});

test("mostra subito gli extra con scorta ignota o positiva e nasconde lo zero", async ({ browser, context, page }) => {
  const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  try {
    const path = `${adminOrigin}/api/pilot/v1/pilot/stores/roma`;
    const headers = { origin: adminOrigin };
    const store = await (await operator.request.get(path)).json() as IndividualStore;
    store.ingredients.find(item => item.id === "dough")!.extra = undefined;
    store.ingredients.push({ id: "pomodoro", name: "Pomodoro", stock: null });
    expect((await operator.request.put(path, { headers, data: store })).ok()).toBe(true);
    const component = (id: string): PizzaComponent => ({ id, name: id, description: "", priceCents: 0, available: true, ingredients: {} });
    const draft: MenuDraft = materializePizzaMenu({ id: "extra-browser", name: "Menu", products: [],
      sections: [{ id: "pizze", name: "Pizze", productIds: ["pizza"] }], pizzaCatalog: {
        inventoryMode: "dough-format", bases: [], toppings: [], formulas: [],
        doughs: [{ ...component("classico"), inventoryIngredientId: "dough" }],
        formats: [{ ...component("tonda"), doughQuantity: 1 }],
        tastes: [{ id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true,
          standardDoughId: "classico", standardBaseId: "", standardFormatId: "tonda", doughIds: ["classico"], baseIds: [],
          formatIds: ["tonda"], toppingIds: [], includedToppingIds: [] }],
      } });
    let workspace = await (await operator.request.get(`${path}/menu-admin`)).json() as MenuWorkspace;
    const saved = await operator.request.put(`${path}/menu-admin/drafts`, { headers, data: { revision: workspace.revision, draft } });
    expect(saved.ok(), await saved.text()).toBe(true);
    workspace = await saved.json() as MenuWorkspace;
    const published = await operator.request.post(`${path}/menu-admin/publish`, { headers, data: { revision: workspace.revision, draftId: draft.id } });
    expect(published.ok(), await published.text()).toBe(true);
    for (const stock of [null, 5, 0]) {
      const current = await (await operator.request.get(path)).json() as IndividualStore;
      Object.assign(current.ingredients.find(item => item.id === "pomodoro")!, { stock, extra: { enabled: true, priceCents: 100, dose: 1 } });
      const response = await operator.request.put(path, { headers, data: current });
      expect(response.ok(), await response.text()).toBe(true);
      await page.goto(`${clientOrigin}/ordina`);
      await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "Pizza", exact: true });
      await dialog.getByRole("button", { name: "Extra Nessun extra", exact: true }).click();
      if (stock === 0) {
        await expect(dialog.getByText("Nessun extra disponibile.")).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Pomodoro escluso", exact: true })).toHaveCount(0);
      } else {
        await dialog.getByRole("button", { name: "Extra 1 opzioni disponibili", exact: true }).click();
        await expect(dialog.getByRole("button", { name: "Pomodoro escluso", exact: true })).toBeEnabled();
      }
    }
  } finally { await operator.close(); }
});
