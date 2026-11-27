import { expect, test } from "@playwright/test";
import { materializePizzaMenu, type IndividualProduct, type IndividualStore, type MenuDraft, type MenuWorkspace, type PizzaComponent } from "@pizzaos/domain";

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
      { ...drink, id: "detail-meal", name: "Menu completo", productType: "meal", ingredients: {}, priceCents: 1200,
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
      await expect(extras).toHaveAttribute("aria-expanded", "false");
      await extras.click();
      await dialog.getByRole("button", { name: "Formaggio escluso", exact: true }).click();
      await dialog.getByRole("button", { name: "Aggiungi Formaggio", exact: true }).click();
      await expect(dialog.getByLabel("Quantità Formaggio")).toHaveText("2");
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
    await meal.getByRole("radio", { name: /^Pizza/ }).check();
    const customize = meal.getByRole("button", { name: "Personalizza Scelta", exact: true });
    const next = meal.getByRole("button", { name: "Scelta Successiva", exact: true });
    for (const button of [customize, next]) {
      const width = await button.evaluate(element => element.getBoundingClientRect().width);
      const containerWidth = await meal.locator('form > div').evaluate(element => element.clientWidth - 36);
      expect(Math.abs(width - containerWidth)).toBeLessThan(2);
    }
    await expect(next).toHaveCSS("background-color", "rgb(255, 255, 255)");
    expect(await next.evaluate(element => getComputedStyle(element).color)).not.toBe("rgb(255, 255, 255)");
    await customize.click();
    await expect(meal.getByText("Ingredienti inclusi", { exact: true })).toBeVisible();
    await meal.screenshot({ path: testInfo.outputPath("menu-personalizza.png") });
    await next.click();
    await meal.getByRole("radio", { name: /^Bibita/ }).check();
    await meal.getByRole("button", { name: "Personalizza Bibita" }).click();
    await expect(meal.getByText("Ingredienti inclusi", { exact: true })).toHaveCount(0);
    await expect(meal.getByRole("checkbox")).toHaveCount(0);
    await meal.getByLabel("Note per la cucina").fill("Fredda");
    await meal.getByRole("button", { name: "Aggiungi", exact: true }).click();
    await expect(meal).toHaveCount(0);
  } finally { await operator.close(); }
});
