import { expect, test } from "@playwright/test";
import type { IndividualQuote, IndividualStore, MenuDraft, MenuWorkspace, PizzaComponent } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const menuPath = "/api/pilot/v1/pilot/stores/roma/menu-admin";
const component = (id: string, name: string, priceCents = 0): PizzaComponent => ({ id, name, priceCents, description: "", available: true, ingredients: {} });

test("impasto dal Magazzino e consumo del formato arrivano dalla bozza al cliente", async ({ browser, context, page }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  try {
    const storeResponse = await operator.request.get(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`);
    expect(storeResponse.ok(), await storeResponse.text()).toBe(true);
    const store = await storeResponse.json() as IndividualStore;
    const ingredients = [
      { id: "panetto-classico", name: "Panetto classico", stock: 100, food: { contains: ["Glutine"], mayContain: [] } },
      { id: "panetto-integrale", name: "Panetto integrale", stock: 6, food: { contains: ["Glutine"], mayContain: [] } },
      { id: "pomodoro-stock", name: "Pomodoro", stock: 100, food: { contains: [], mayContain: [] } },
    ];
    const stored = await operator.request.put(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`, { headers: { origin: adminOrigin },
      data: { ...store, ingredients: [...store.ingredients.filter(item => !ingredients.some(next => next.id === item.id)), ...ingredients] } });
    expect(stored.ok(), await stored.text()).toBe(true);
    const candidate: MenuDraft = { id: "dough-stock-browser", name: "Menu impasti e formati", products: [],
      sections: [{ id: "pizze", name: "Pizze", productIds: ["pizza-magazzino"] }], pizzaCatalog: {
        inventoryMode: "dough-format", defaults: { doughId: "classico", baseId: "", formatId: "tonda" },
        doughs: [{ ...component("classico", "Classico"), inventoryIngredientId: "panetto-classico" }, component("integrale", "Integrale", 100)],
        formats: [{ ...component("tonda", "Tonda"), doughQuantity: 1 }, { ...component("maxi", "Maxi", 200), doughQuantity: null }], bases: [],
        toppings: [{ ...component("pomodoro", "Pomodoro"), category: "Ingredienti", ingredients: { "pomodoro-stock": 1 } }], formulas: [],
        tastes: [{ id: "pizza-magazzino", name: "Pizza magazzino", description: "Pomodoro e impasto a scelta", priceCents: 700, available: true,
          standardDoughId: "classico", standardBaseId: "", standardFormatId: "tonda", doughIds: ["classico", "integrale"], baseIds: [],
          formatIds: ["tonda", "maxi"], toppingIds: [], includedToppingIds: ["pomodoro"] }],
      } };
    const workspace = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const saved = await operator.request.put(`${adminOrigin}${menuPath}/drafts`, { headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft: candidate } });
    expect(saved.ok(), await saved.text()).toBe(true);
    const admin = await operator.newPage();
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(`${adminOrigin}/operazioni/menu`);
    await admin.getByLabel("Menu da modificare").selectOption(candidate.id);
    await admin.getByRole("button", { name: /Impasti e formati/ }).click();
    const settings = admin.getByRole("region", { name: "Impasti e formati", exact: true });
    await expect(settings.getByRole("heading", { name: "Basi", exact: true })).toHaveCount(0);
    await expect(settings.getByText("Ricette e dosi dal Magazzino")).toHaveCount(0);
    await settings.getByRole("button", { name: "Elemento di magazzino Integrale", exact: true }).click();
    await settings.getByLabel("Cerca elemento di magazzino Integrale").fill("integrale");
    await expect(settings.getByRole("button", { name: "Pomodoro", exact: true })).toHaveCount(0);
    await settings.getByRole("button", { name: "Panetto integrale", exact: true }).click();
    await settings.getByLabel("Quantità impasto Maxi", { exact: true }).fill("3");
    await settings.getByLabel("Quantità impasto Maxi", { exact: true }).blur();
    await expect(admin.getByText("Bozza salvata", { exact: true })).toBeVisible();
    const persisted = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const draft = persisted.drafts.find(item => item.id === candidate.id)!;
    expect(draft.pizzaCatalog?.doughs[1].inventoryIngredientId).toBe("panetto-integrale");
    expect(draft.pizzaCatalog?.formats[1].doughQuantity).toBe(3);
    await settings.screenshot({ path: testInfo.outputPath("impasti-formati-desktop.png") });
    await admin.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = admin.waitForResponse(response => response.url().endsWith(`${menuPath}/publish`) && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    const published = await publishing;
    expect(published.ok(), await published.text()).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${clientOrigin}/ordina`);
    await expect(page.getByRole("heading", { name: "Il menu", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "La pizza a modo tuo", exact: true })).toHaveCount(0);
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Base pizza", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Aggiungi Pizza magazzino", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Pizza magazzino", exact: true });
    await expect(dialog.getByRole("heading", { name: "Base", exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: /^Impasto/ }).click();
    await dialog.getByText("Integrale", { exact: true }).click();
    await expect(dialog.getByRole("radio", { name: /Integrale/ })).toBeChecked();
    await dialog.getByRole("button", { name: /^Formato/ }).click();
    await dialog.getByText("Maxi", { exact: true }).click();
    await expect(dialog.getByRole("radio", { name: /Maxi/ })).toBeChecked();
    const format = dialog.getByRole("radio", { name: /Maxi/ });
    await format.focus();
    const badge = format.locator("..").locator("span").filter({ hasText: /^\+2,00/ }).last();
    await expect(badge).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(dialog.getByRole("button", { name: "Informazioni ingredienti e allergeni" })).toHaveCount(0);
    await expect(dialog.getByRole("heading", { name: "Ingredienti e allergeni" })).toHaveCount(0);
    await expect(dialog.getByText(/Panetto integrale/)).toBeVisible();
    const gluten = dialog.getByRole("button", { name: "Glutine", exact: true });
    await expect(gluten).toHaveText("🌾");
    await gluten.focus();
    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("status")).toContainText("🌾 Glutine");
    await dialog.screenshot({ path: testInfo.outputPath("impasto-formato-mobile.png") });
    await dialog.getByRole("button", { name: /Aggiungi al carrello/ }).click();
    const quoting = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quoted = await quoting;
    expect(quoted.ok(), await quoted.text()).toBe(true);
    expect((await quoted.json() as IndividualQuote).lines[0].unitCents).toBe(1000);
  } finally { await operator.close(); }
});
