import { expect, test } from "@playwright/test";
import type { IndividualQuote, IndividualStore, MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const menuPath = "/api/pilot/v1/pilot/stores/roma/menu-admin";

test("classificazione confermata in bozza, extra comuni e scelte specifiche arrivano al cliente", async ({ browser, page, context }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    const storeResponse = await operator.request.get(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`);
    expect(storeResponse.ok(), await storeResponse.text()).toBe(true);
    const store = await storeResponse.json() as IndividualStore;
    const ingredient = store.ingredients.find((entry) => entry.id === "dough")!;
    expect(ingredient).toBeDefined();
    const configured = await operator.request.put(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`, {
      headers: { origin: adminOrigin },
      data: { ...store, ingredients: store.ingredients.map((entry) => ({
        ...entry, stock: 100,
        extra: { enabled: entry.id === ingredient.id, priceCents: entry.id === ingredient.id ? 150 : null, dose: entry.id === ingredient.id ? 2 : null }
      })) }
    });
    expect(configured.ok(), await configured.text()).toBe(true);
    const component = (id: string, name: string, ingredients: Record<string, number>) => ({ id, name, description: "", priceCents: 0, available: true, ingredients, food: { contains: [], mayContain: [] } });
    const candidate: MenuDraft = {
      id: "classification-browser", name: "Menu classificazione", sections: [{ id: "specialita", name: "Specialità e bevande", productIds: ["specialita-classificata", "birra-classificazione"] }],
      products: [
        { id: "specialita-classificata", name: "Specialità classificata", description: "Ricetta con salsa a scelta", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, food: { contains: [], mayContain: [] },
          options: [{ id: "salsa-specifica", name: "Salsa speciale", priceCents: 70, ingredients: {}, food: { contains: [], mayContain: [] } }],
          groups: [{ id: "salse-specifiche", name: "Salse speciali", kind: "selection", min: 1, max: 2, allowRepeat: true, optionIds: ["salsa-specifica"] }] },
        { id: "birra-classificazione", name: "Birra classificazione", description: "Bevanda", priceCents: 300, available: true, allergens: [], ingredients: {}, options: [], food: { contains: [], mayContain: [] } }
      ],
      pizzaCatalog: {
        doughs: [component("classico", "Classico", { dough: 1 })], bases: [component("rossa", "Rossa", {})], formats: [component("tonda", "Tonda", {})],
        toppings: [], tastes: [], formulas: [], customEnabled: false, defaults: { doughId: "classico", baseId: "rossa", formatId: "tonda" }
      }
    };
    const workspace = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const seeded = await operator.request.put(`${adminOrigin}${menuPath}/drafts`, { headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft: candidate } });
    expect(seeded.ok(), await seeded.text()).toBe(true);

    const admin = await operator.newPage();
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(`${adminOrigin}/operazioni/menu`);
    await admin.getByLabel("Menu da modificare").selectOption(candidate.id);
    await admin.getByRole("button", { name: "Modifica Specialità classificata", exact: true }).click();
    await expect(admin.getByRole("checkbox", { name: "Pizza", exact: true })).not.toBeChecked();
    await admin.getByRole("checkbox", { name: "Pizza", exact: true }).click();
    await expect(admin.getByRole("button", { name: "Conferma cambio tipo", exact: true })).toBeVisible();
    await admin.screenshot({ path: testInfo.outputPath("classificazione-riepilogo-desktop.png"), fullPage: true });
    await admin.getByRole("button", { name: "Annulla cambio tipo", exact: true }).click();
    await expect(admin.getByRole("checkbox", { name: "Pizza", exact: true })).not.toBeChecked();
    await admin.getByRole("checkbox", { name: "Pizza", exact: true }).click();
    await admin.getByRole("button", { name: "Conferma cambio tipo", exact: true }).click();
    await expect(admin.getByRole("checkbox", { name: "Pizza", exact: true })).toBeChecked();
    await expect(admin.getByText("Extra comuni dal Magazzino", { exact: false })).toBeVisible();
    await admin.screenshot({ path: testInfo.outputPath("classificazione-pizza-desktop.png"), fullPage: true });
    const saving = admin.waitForResponse((response) => response.url().endsWith(`${menuPath}/drafts`) && response.request().method() === "PUT");
    await admin.getByRole("button", { name: "Salva bozza", exact: true }).click();
    const saved = await saving;
    expect(saved.ok(), await saved.text()).toBe(true);
    const savedWorkspace = await saved.json() as MenuWorkspace;
    expect(savedWorkspace.drafts.find((entry) => entry.id === candidate.id)?.sections).toEqual(candidate.sections);
    await admin.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = admin.waitForResponse((response) => response.url().endsWith(`${menuPath}/publish`) && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    const published = await publishing;
    expect(published.ok(), await published.text()).toBe(true);

    await page.goto(`${clientOrigin}/ordina`);
    await page.getByRole("button", { name: "Aggiungi Specialità classificata", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Specialità classificata", exact: true });
    await expect(editor).toBeVisible();
    await expect(editor.getByText("Salse speciali", { exact: true })).toBeVisible();
    await expect(editor.getByRole("button", { name: /Aggiungi al carrello/ })).toBeDisabled();
    await editor.getByRole("button", { name: /^Aggiungi Salsa speciale$/ }).click();
    await editor.getByRole("heading", { name: "Extra", exact: true }).first().locator("..").click();
    const publicStore = await (await context.request.get(`${clientOrigin}/api/pilot/v1/pilot/stores/roma`)).json() as IndividualStore;
    const pizza = publicStore.products.find((entry) => entry.id === "specialita-classificata")!;
    const extra = pizza.options.find((option) => option.pizza?.kind === "topping" && option.name === ingredient.name)!;
    expect(extra).toMatchObject({ priceCents: 150 });
    await editor.getByRole("heading", { name: extra.pizza!.category!, exact: true }).last().locator("..").click();
    await editor.getByRole("button", { name: `${ingredient.name} escluso`, exact: true }).click();
    await expect(editor.getByTestId("customization-total-value")).toContainText("10,20");
    await editor.screenshot({ path: testInfo.outputPath("classificazione-scelte-cliente-mobile.png") });
    await editor.getByRole("button", { name: /Aggiungi al carrello/ }).click();
    const quoting = page.waitForResponse((response) => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("link", { name: "Vai a consegna e pagamento", exact: true }).click();
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quoted = await quoting;
    expect(quoted.ok(), await quoted.text()).toBe(true);
    const quote = await quoted.json() as IndividualQuote;
    expect(quote.lines.find((line) => line.productId === pizza.id)?.unitCents).toBe(1020);
    expect(quote.lines.find((line) => line.productId === pizza.id)?.composition?.choices.map((choice) => choice.name)).toEqual(expect.arrayContaining(["Salsa speciale", ingredient.name]));
    await page.getByRole("button", { name: "Aggiungi Birra classificazione", exact: true }).click();
    const drink = page.getByRole("dialog", { name: "Birra classificazione", exact: true });
    await expect(drink).toBeVisible();
    await expect(drink.getByRole("button", { name: /^Impasto/ })).toHaveCount(0);
    await drink.getByRole("button", { name: "Aggiungi", exact: true }).click();
    await expect(drink).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Specialità classificata", exact: true })).toHaveCount(0);
  } finally {
    await operator.close();
  }
});
