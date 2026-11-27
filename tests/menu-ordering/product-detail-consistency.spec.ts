import { expect, test } from "@playwright/test";
import { materializePizzaMenu, type IndividualQuote, type IndividualProduct, type IndividualStore, type MenuDraft, type MenuWorkspace, type PizzaComponent } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";

test("schede coerenti, abbinamenti interni e personalizzazione delle fasi secondo il tipo", async ({ browser, page, context }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  const path = `${adminOrigin}/api/pilot/v1/pilot/stores/roma`;
  const headers = { origin: adminOrigin };
  try {
    const store = await (await operator.request.get(path)).json() as IndividualStore;
    store.ingredients.push({ id: "detail-cheese", name: "Formaggio", stock: 100, food: { contains: ["Latte"], mayContain: [] } });
    expect((await operator.request.put(path, { headers, data: store })).ok()).toBe(true);
    const drink: IndividualProduct = { id: "detail-drink", name: "Bibita", description: "Fresca", productType: "product",
      priceCents: 200, available: true, ingredients: { "detail-cheese": 1 }, allergens: [], options: [] };
    const sandwich: IndividualProduct = { ...drink, id: "detail-sandwich", name: "Panino", productType: "sandwich",
      priceCents: 900, pairingProductIds: [drink.id] };
    const component = (id: string, name: string): PizzaComponent => ({ id, name, description: "", priceCents: 0, available: true, ingredients: {} });
    const draft: MenuDraft = materializePizzaMenu({ id: "detail-consistency", name: "Menu", products: [drink, sandwich,
      { ...drink, id: "detail-meal", name: "Menu completo", productType: "meal", ingredients: {}, priceCents: 1200, pairingProductIds: [drink.id],
        meal: { steps: [{ id: "portata", name: "Portata", alternatives: [{ productId: "detail-pizza", priceCents: 0 }] },
          { id: "bibita", name: "Bibita", alternatives: [{ productId: drink.id, priceCents: 0 }] }] } }
    ], sections: [{ id: "proposte", name: "Proposte", productIds: ["detail-pizza", sandwich.id, drink.id, "detail-meal"] }],
      pizzaCatalog: { doughs: [{ ...component("classico", "Classico"), ingredients: { dough: 1 } }],
        bases: [component("rossa", "Rossa")], formats: [component("tonda", "Tonda")], toppings: [], formulas: [],
        tastes: [{ id: "detail-pizza", name: "Pizza", description: "", priceCents: 800, available: true,
          standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico"],
          baseIds: ["rossa"], formatIds: ["tonda"], toppingIds: [], includedToppingIds: [], pairingProductIds: [drink.id] }] }
    });
    const workspace = await (await operator.request.get(`${path}/menu-admin`)).json() as MenuWorkspace;
    const saved = await operator.request.put(`${path}/menu-admin/drafts`, { headers, data: { revision: workspace.revision, draft } });
    expect(saved.ok(), await saved.text()).toBe(true);
    const published = await operator.request.post(`${path}/menu-admin/publish`, { headers,
      data: { revision: (await saved.json() as MenuWorkspace).revision, draftId: draft.id } });
    expect(published.ok(), await published.text()).toBe(true);
    const current = await (await operator.request.get(path)).json() as IndividualStore;
    current.ingredients.find(item => item.id === "detail-cheese")!.extra = { enabled: true, priceCents: 100, dose: 1 };
    expect((await operator.request.put(path, { headers, data: current })).ok()).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${clientOrigin}/ordina`);
    await expect(page.getByText("Abbinamenti consigliati", { exact: true })).toHaveCount(0);
    for (const name of ["Panino", "Pizza"]) {
      await page.getByRole("button", { name: `Aggiungi ${name}`, exact: true }).click();
      const dialog = page.getByRole("dialog", { name, exact: true });
      const extras = dialog.getByRole("button", { name: /^Extra/ });
      await dialog.getByRole("button", { name: /^Ingredienti/ }).click();
      await expect(dialog.getByRole("button", { name: / extra$/ })).toHaveCount(0);
      await expect(extras).toHaveAttribute("aria-expanded", "false");
      await extras.click();
      const extraPanel = dialog.locator(`[id="${await extras.getAttribute("aria-controls")}"]`);
      await extraPanel.getByRole("button", { name: "Formaggio escluso", exact: true }).click();
      await expect(extraPanel.getByRole("button", { name: "Formaggio incluso", exact: true })).toHaveAttribute("aria-pressed", "true");
      const pairing = dialog.getByRole("region", { name: "Abbinamenti consigliati" });
      const headings = await dialog.locator("h2").allTextContents();
      expect(headings.indexOf("Abbinamenti consigliati")).toBeGreaterThan(headings.indexOf("Extra"));
      expect(headings.indexOf("Abbinamenti consigliati")).toBeLessThan(headings.indexOf("Note per la cucina"));
      const notes = dialog.getByLabel("Messaggio opzionale");
      await notes.fill("Da dividere");
      await pairing.getByRole("button", { name: "Aggiungi Bibita al carrello" }).click();
      await expect(notes).toHaveValue("Da dividere");
      await pairing.scrollIntoViewIfNeeded();
      await dialog.screenshot({ path: testInfo.outputPath(`${name.toLowerCase()}-abbinamenti.png`) });
      await dialog.getByRole("button", { name: "Chiudi personalizzazione" }).click();
      await expect(page.getByText("Abbinamenti consigliati", { exact: true })).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Aggiungi Menu completo", exact: true }).click();
    const meal = page.getByRole("dialog", { name: "Menu completo", exact: true });
    const main = meal.getByRole("button", { name: /^Portata/ });
    const beverage = meal.getByRole("button", { name: /^Bibita / });
    const add = meal.getByRole("button", { name: /[0-9].*Aggiungi al carrello/ });
    await expect(meal).toHaveCSS("height", "844px");
    await expect(add).toBeDisabled();
    await expect(main).toHaveAttribute("aria-expanded", "true");
    await meal.getByRole("radio", { name: /^Pizza/ }).locator("..").click();
    await expect(main).toHaveAttribute("aria-expanded", "false");
    await expect(main).toContainText("Pizza");
    await expect(beverage).toHaveAttribute("aria-expanded", "true");
    const mainPanel = meal.locator(`[id="${await main.getAttribute("aria-controls")}"]`);
    const beveragePanel = meal.locator(`[id="${await beverage.getAttribute("aria-controls")}"]`);
    await expect(mainPanel).toHaveAttribute("inert", "");
    await meal.getByRole("radio", { name: /^Bibita/ }).locator("..").click();
    await expect(beveragePanel.getByRole("button", { name: /incluso|escluso/ })).toHaveCount(0);
    await beveragePanel.getByRole("textbox", { name: "Note per la cucina", exact: true }).fill("Fredda");
    await meal.screenshot({ path: testInfo.outputPath("menu-fase-aperta-mobile.png"), animations: "disabled" });
    await expect(add).toBeEnabled();
    await main.click();
    await expect(meal.getByRole("radio", { name: /^Pizza/ })).toBeChecked();
    await beverage.click();
    await expect(beveragePanel.getByRole("textbox", { name: "Note per la cucina", exact: true })).toHaveValue("Fredda");
    await beverage.click();
    const finalNotes = meal.getByLabel("Messaggio opzionale");
    await finalNotes.fill("Da dividere");
    const pairings = meal.getByRole("region", { name: "Abbinamenti consigliati" });
    const headings = await meal.locator("h2").allTextContents();
    expect(headings.indexOf("Abbinamenti consigliati")).toBeGreaterThan(headings.indexOf("Bibita"));
    expect(headings.indexOf("Abbinamenti consigliati")).toBeLessThan(headings.indexOf("Note per la cucina"));
    await expect(pairings.getByRole("button")).toHaveCount(1);
    await pairings.getByRole("button", { name: "Aggiungi Bibita al carrello" }).click();
    await expect(finalNotes).toHaveValue("Da dividere");
    await expect(beverage).toContainText("Bibita");
    await expect(meal.getByRole("button", { name: "Scelta Successiva" })).toHaveCount(0);
    await pairings.scrollIntoViewIfNeeded();
    await meal.screenshot({ path: testInfo.outputPath("menu-completo-mobile.png"), animations: "disabled" });
    await add.click();
    await expect(meal).toHaveCount(0);
    await page.getByRole("link", { name: /^Carrello/ }).click();
    await page.getByRole("link", { name: /Vai al checkout/ }).click();
    const quoting = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quoted = await quoting;
    expect(quoted.ok(), await quoted.text()).toBe(true);
    const quote = await quoted.json() as IndividualQuote;
    expect(quote.lines.find(line => line.productId === "detail-meal")).toMatchObject({ unitCents: 1200,
      composition: { mealSteps: [ { stepId: "portata", productId: "detail-pizza", removedIngredientIds: [] },
        { stepId: "bibita", productId: "detail-drink", notes: "Fredda", removedIngredientIds: [] } ] } });
    const request = quoted.request().postDataJSON() as { cart: { lines: { productId: string; notes: string }[] } };
    expect(request.cart.lines.find(line => line.productId === "detail-meal")?.notes).toBe("Da dividere");
  } finally { await operator.close(); }
});
