import { expect, test } from "@playwright/test";
import type { IndividualQuote, IndividualStore, MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const storePath = "/api/pilot/v1/pilot/stores/roma";
const menuPath = `${storePath}/menu-admin`;

test("cinque tipi espliciti in bozza e Menu pubblicato con sole rimozioni e note", async ({ browser, page, context }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  try {
    const storeResponse = await operator.request.get(`${adminOrigin}${storePath}`);
    expect(storeResponse.ok(), await storeResponse.text()).toBe(true);
    const store = await storeResponse.json() as IndividualStore;
    const configured = await operator.request.put(`${adminOrigin}${storePath}`, {
      headers: { origin: adminOrigin }, data: { ...store, ingredients: [
        ...store.ingredients,
        { id: "product-types-cheese", name: "Formaggio prova", stock: 100, food: { contains: ["Latte"], mayContain: [] } }
      ] }
    });
    expect(configured.ok(), await configured.text()).toBe(true);
    const component = (id: string, name: string, ingredients: Record<string, number>) => ({
      id, name, description: "", priceCents: 0, available: true, ingredients, food: { contains: [], mayContain: [] }
    });
    const seed: MenuDraft = {
      id: "product-types-browser", name: "Menu tipi prodotto", products: [],
      sections: [{ id: "proposte", name: "Proposte", productIds: [] }],
      pizzaCatalog: {
        doughs: [component("classico", "Classico", { dough: 1 })], bases: [component("rossa", "Rossa", {})],
        formats: [component("tonda", "Tonda", {})], toppings: [], tastes: [], formulas: [], customEnabled: false,
        defaults: { doughId: "classico", baseId: "rossa", formatId: "tonda" }
      }
    };
    const workspace = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const seeded = await operator.request.put(`${adminOrigin}${menuPath}/drafts`, {
      headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft: seed }
    });
    expect(seeded.ok(), await seeded.text()).toBe(true);
    const admin = await operator.newPage();
    admin.setDefaultTimeout(20_000);
    admin.setDefaultNavigationTimeout(60_000);
    page.setDefaultTimeout(20_000);
    page.setDefaultNavigationTimeout(60_000);
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(`${adminOrigin}/operazioni/menu`);
    await expect(async () => {
      await admin.getByLabel("Menu da modificare").selectOption(seed.id);
      await expect(admin.getByRole("combobox", { name: "Aggiungi prodotto", exact: true })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 60_000 });

    for (const [type, name] of [
      ["pizza", "Pizza prova"], ["sandwich", "Panino prova"], ["product", "Acqua prova"],
      ["box", "Box prova"], ["meal", "Menu prova"]
    ] as const) {
      await admin.getByRole("combobox", { name: "Aggiungi prodotto", exact: true }).selectOption(type);
      const nameInput = type === "pizza" ? admin.getByLabel("Nome pizza", { exact: true }) : admin.getByLabel(/^Nome prodotto/).last();
      await nameInput.fill(name);
      await admin.getByLabel(type === "pizza" ? "Prezzo in euro" : "Prezzo base in euro", { exact: true }).last().fill(type === "meal" ? "12" : "8");
      await admin.getByRole("heading", { name: "Il tuo menu", exact: true }).click();
      await expect.poll(async () => {
        const current = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
        const created = current.drafts.find(entry => entry.id === seed.id)?.products.find(product => product.name === name);
        return created ? { type: created.productType, priceCents: created.priceCents } : null;
      }).toEqual({ type, priceCents: type === "meal" ? 1200 : 800 });
      await expect(admin.getByRole("checkbox", { name: "Pizza", exact: true })).toHaveCount(0);
    }

    const savedWorkspace = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const draft = savedWorkspace.drafts.find(entry => entry.id === seed.id)!;
    expect(draft.products.map(product => product.productType).sort()).toEqual(["box", "meal", "pizza", "product", "sandwich"]);
    await admin.screenshot({ path: testInfo.outputPath("cinque-tipi-desktop.png"), fullPage: true });

    // The public draft API supplies exact recipes to keep this test independent of recipe-editor layout.
    const sandwich = draft.products.find(product => product.productType === "sandwich")!;
    const drink = draft.products.find(product => product.productType === "product")!;
    const parent = draft.products.find(product => product.productType === "meal")!;
    const box = draft.products.find(product => product.productType === "box")!;
    const complete: MenuDraft = { ...draft, products: draft.products.map(product => {
      if (product.id === sandwich.id) return { ...product, ingredients: { "product-types-cheese": 1 } };
      if (product.id === drink.id) return { ...product, priceCents: 9999 };
      if (product.id === box.id) return { ...product,
        groups: [{ id: "tre", name: "Tre scelte", kind: "selection", min: 3, max: 3, allowRepeat: true, optionIds: ["formaggio"] }],
        options: [{ id: "formaggio", name: "Formaggio prova", priceCents: 0, ingredients: { "product-types-cheese": 1 } }] };
      if (product.id === parent.id) return { ...product, meal: { steps: [
        { id: "portata", name: "Portata", alternatives: [{ productId: sandwich.id, priceCents: 0 }] },
        { id: "bibita", name: "Bibita", alternatives: [{ productId: drink.id, priceCents: -50 }] }
      ] } };
      return product;
    }) };
    const completed = await operator.request.put(`${adminOrigin}${menuPath}/drafts`, {
      headers: { origin: adminOrigin }, data: { revision: savedWorkspace.revision, draft: complete }
    });
    expect(completed.ok(), await completed.text()).toBe(true);
    await admin.reload();
    await expect(async () => {
      await admin.getByLabel("Menu da modificare").selectOption(seed.id);
      await expect(admin.getByRole("button", { name: "Modifica Box prova", exact: true })).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 60_000 });
    await admin.getByRole("button", { name: "Modifica Box prova", exact: true }).click();
    await expect(admin.getByRole("button", { name: "Aggiungi gruppo di scelte", exact: true })).toBeVisible();
    await admin.locator("summary").filter({ hasText: "Tre scelte" }).click();
    await admin.getByLabel("Quantità massima").fill("4");
    await admin.getByLabel("Quantità minima").fill("2");
    await admin.getByLabel("Consenti più unità della stessa scelta").uncheck();
    await admin.getByRole("heading", { name: "Il tuo menu", exact: true }).click();
    await expect.poll(async () => {
      const current = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
      const group = current.drafts.find(entry => entry.id === seed.id)?.products.find(product => product.id === box.id)?.groups?.[0];
      return group ? { min: group.min, max: group.max, allowRepeat: group.allowRepeat } : null;
    }).toEqual({ min: 2, max: 4, allowRepeat: false });
    await admin.getByLabel("Quantità minima").fill("3");
    await admin.getByLabel("Quantità massima").fill("3");
    await admin.getByLabel("Consenti più unità della stessa scelta").check();
    await admin.getByRole("heading", { name: "Il tuo menu", exact: true }).click();
    await expect.poll(async () => {
      const current = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
      const group = current.drafts.find(entry => entry.id === seed.id)?.products.find(product => product.id === box.id)?.groups?.[0];
      return group ? { min: group.min, max: group.max, allowRepeat: group.allowRepeat } : null;
    }).toEqual({ min: 3, max: 3, allowRepeat: true });
    await admin.getByRole("button", { name: "Modifica Menu prova", exact: true }).click();
    await expect(admin.getByRole("button", { name: "Aggiungi fase", exact: true })).toBeVisible();
    for (const [amount, cents] of [["0.50", 50], ["-0.50", -50]] as const) {
      await admin.getByLabel("Variazione Acqua prova in euro", { exact: true }).fill(amount);
      await admin.getByRole("heading", { name: "Il tuo menu", exact: true }).click();
      await expect.poll(async () => {
        const current = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
        return current.drafts.find(entry => entry.id === seed.id)?.products.find(product => product.id === parent.id)?.meal?.steps[1]?.alternatives[0]?.priceCents;
      }).toBe(cents);
    }
    await admin.screenshot({ path: testInfo.outputPath("configurazione-menu-desktop.png"), fullPage: true });
    await admin.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = admin.waitForResponse(response => response.url().endsWith(`${menuPath}/publish`) && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    const published = await publishing;
    expect(published.ok(), await published.text()).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${clientOrigin}/ordina`);
    await page.getByRole("button", { name: "Aggiungi Menu prova", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Menu prova", exact: true });
    await expect(editor.getByRole("radio", { name: /Panino prova/ })).not.toBeChecked();
    await editor.getByRole("radio", { name: /Panino prova/ }).check();
    await editor.getByRole("button", { name: "Personalizza Panino prova", exact: true }).click();
    await expect(editor.getByRole("checkbox", { name: "Formaggio prova", exact: true })).toBeChecked();
    await editor.getByRole("checkbox", { name: "Formaggio prova", exact: true }).uncheck();
    await editor.getByRole("textbox", { name: "Note per la cucina", exact: true }).fill("Ben caldo");
    for (const name of ["Impasto", "Formato", "Extra", "Abbinamenti"]) {
      await expect(editor.getByRole("heading", { name, exact: true })).toHaveCount(0);
    }
    await editor.getByRole("button", { name: "Avanti", exact: true }).click();
    await expect(editor.getByRole("radio", { name: /Acqua prova/ })).not.toBeChecked();
    await editor.getByRole("radio", { name: /Acqua prova/ }).check();
    await editor.getByRole("button", { name: "Indietro", exact: true }).click();
    await expect(editor.getByRole("radio", { name: /Panino prova/ })).toBeChecked();
    await editor.getByRole("button", { name: "Personalizza Panino prova", exact: true }).click();
    await expect(editor.getByRole("checkbox", { name: "Formaggio prova", exact: true })).not.toBeChecked();
    await expect(editor.getByRole("textbox", { name: "Note per la cucina", exact: true })).toHaveValue("Ben caldo");
    await editor.getByRole("button", { name: "Avanti", exact: true }).click();
    await editor.screenshot({ path: testInfo.outputPath("menu-cliente-mobile.png") });
    await editor.getByRole("button", { name: "Aggiungi", exact: true }).click();
    const quoting = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("link", { name: /^Carrello/ }).click();
    await page.getByRole("link", { name: /Vai al checkout/ }).click();
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quoted = await quoting;
    expect(quoted.ok(), await quoted.text()).toBe(true);
    const request = quoted.request().postDataJSON() as { cart: { lines: { productId: string; optionIds: string[]; selections?: unknown[]; mealSelections?: unknown[] }[] } };
    const sentLine = request.cart.lines.find(line => line.productId === parent.id)!;
    expect(sentLine.optionIds).toEqual([]);
    expect(sentLine.selections ?? []).toEqual([]);
    expect(sentLine.mealSelections).toEqual([
      { stepId: "portata", productId: sandwich.id, removedIngredientIds: ["product-types-cheese"], notes: "Ben caldo" },
      { stepId: "bibita", productId: drink.id, removedIngredientIds: [], notes: "" }
    ]);
    const quote = await quoted.json() as IndividualQuote;
    expect(quote.lines.find(line => line.productId === parent.id)).toMatchObject({ unitCents: 1150, composition: { mealSteps: [
      { stepId: "portata", productId: sandwich.id, removedIngredientIds: ["product-types-cheese"], notes: "Ben caldo" },
      { stepId: "bibita", productId: drink.id, priceCents: -50 }
    ] } });
  } finally {
    await operator.close();
  }
});
