import { expect, test } from "@playwright/test";
import type { IndividualStore, MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const storePath = "/api/pilot/v1/pilot/stores/roma";
const menuPath = `${storePath}/menu-admin`;

test("conferma gli extra correnti e pubblica senza aggiornare manualmente la bozza", async ({ context, page }, testInfo) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  const store = await (await context.request.get(`${adminOrigin}${storePath}`)).json() as IndividualStore;
  const extraId = "publication-olive";
  const configured = await context.request.put(`${adminOrigin}${storePath}`, { headers: { origin: adminOrigin }, data: {
    ...store, ingredients: [...store.ingredients, { id: extraId, name: "Olive", stock: 100,
      food: { contains: [], mayContain: [] }, extra: { enabled: true, priceCents: 100, dose: 1 } }]
  } });
  expect(configured.ok(), await configured.text()).toBe(true);
  const component = (id: string, name: string, ingredients: Record<string, number | null>) => ({ id, name, description: "", priceCents: 0, available: true, ingredients, food: { contains: [], mayContain: [] } });
  const draft: MenuDraft = { id: "publication-extras", name: "Menu", products: [],
    sections: [{ id: "pizze", name: "Pizze", productIds: ["pizza"] }], pizzaCatalog: {
      defaults: { doughId: "classico", baseId: "rossa", formatId: "tonda" },
      doughs: [component("classico", "Classico", { dough: null })],
      bases: [component("rossa", "Rossa", {})], formats: [component("tonda", "Tonda", {})], toppings: [], formulas: [],
      tastes: [{ id: "pizza", name: "Pizza", description: "", priceCents: 800, available: true,
        standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda",
        doughIds: ["classico"], baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [], includedToppingIds: [] }]
    } };
  const workspace = await (await context.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
  const saved = await context.request.put(`${adminOrigin}${menuPath}/drafts`, { headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft } });
  expect(saved.ok(), await saved.text()).toBe(true);
  const savedWorkspace = await saved.json() as MenuWorkspace;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${adminOrigin}/operazioni/menu`);
  await page.getByLabel("Menu da modificare").selectOption(draft.id);

  // Another operator changes the warehouse after this editor has loaded.
  const latest = await (await context.request.get(`${adminOrigin}${storePath}`)).json() as IndividualStore;
  const changed = await context.request.put(`${adminOrigin}${storePath}`, { headers: { origin: adminOrigin }, data: {
    ...latest, ingredients: latest.ingredients.map(item => item.id === extraId
      ? { ...item, extra: { enabled: true, priceCents: 150, dose: null }, food: { contains: ["Latte"], mayContain: [] } } : item)
  } });
  expect(changed.ok(), await changed.text()).toBe(true);
  await page.getByRole("button", { name: "Pubblica menu", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pubblicare Menu?" });
  const summary = dialog.getByRole("region", { name: "Modifiche agli extra" });
  await expect(summary).toContainText("1,50");
  await expect(summary).toContainText("Dose da verificare");
  await expect(summary).toContainText("Contiene: Latte");
  await dialog.screenshot({ path: testInfo.outputPath("conferma-extra-desktop.png") });
  await dialog.getByRole("button", { name: "Annulla", exact: true }).click();
  const cancelled = await (await context.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
  expect(cancelled.revision).toBe(savedWorkspace.revision);
  expect(cancelled.published.id).toBe(savedWorkspace.published.id);

  await page.getByRole("button", { name: "Pubblica menu", exact: true }).click();
  await expect(summary).toContainText("1,50");
  const publishing = page.waitForResponse(response => response.url().endsWith(`${menuPath}/publish`) && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
  const published = await publishing;
  expect(published.ok(), await published.text()).toBe(true);
  await expect(dialog).toHaveCount(0);
  const result = await (await context.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
  expect(result.published.id).toBe(draft.id);
  expect(result.published.pizzaCatalog?.doughs[0].ingredients.dough).toBeNull();
  const topping = result.published.pizzaCatalog?.toppings.find(item => item.inventoryIngredientId === extraId);
  expect(topping).toMatchObject({ priceCents: 150, ingredients: { [extraId]: null }, food: { contains: ["Latte"], mayContain: [] } });
});
