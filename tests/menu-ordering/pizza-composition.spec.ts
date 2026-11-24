import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import type { IndividualCheckoutResult, IndividualQuote, IndividualStore, MenuDraft, MenuWorkspace, PizzaComponent, PizzaEntry } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const menuPath = "/api/pilot/v1/pilot/stores/roma/menu-admin";
const component = (id: string, name: string, priceCents = 0): PizzaComponent => ({ id, name, priceCents, description: "", available: true, ingredients: {}, food: { contains: [], mayContain: [] } });
const entry = (id: string, name: string): PizzaEntry => ({ id, name, priceCents: 600, description: "Pizza componibile", available: true,
  standardDoughId: "classico", standardBaseId: "rossa", standardFormatId: "tonda", doughIds: ["classico", "integrale"],
  baseIds: ["rossa", "bianca"], formatIds: ["tonda"], toppingIds: ["olive"], previewImages: [
    { doughId: "classico", baseId: "rossa", imagePath: "/images/pizza/rossa-classica.png" },
    { doughId: "integrale", baseId: "rossa", imagePath: "/images/pizza/rossa-integrale.png" },
    { doughId: "classico", baseId: "bianca", imagePath: "/images/pizza/bianca-classica.png" },
    { doughId: "integrale", baseId: "bianca", imagePath: "/images/pizza/bianca-integrale.png" }
  ] });
const draft: MenuDraft = { id: "pizza-composition", name: "Menu pizza strutturato", products: [],
  sections: [{ id: "gusti", name: "Pizze", productIds: ["margherita"] },
    { id: "formule", name: "Crea la tua pizza", productIds: ["simple", "wild", "savage"] }],
  pizzaCatalog: {
    doughs: [{ ...component("classico", "Classico", 200), ingredients: { dough: 1 } }, { ...component("integrale", "Integrale", 320), ingredients: { dough: 1 } }],
    bases: [component("rossa", "Rossa"), component("bianca", "Bianca")], formats: [component("tonda", "Tonda")],
    toppings: [{ ...component("olive", "Olive", 100), category: "Vegetali", ingredients: { dough: 1 } }],
    tastes: [{ ...entry("margherita", "Margherita"), includedToppingIds: ["olive"], toppingImagePath: "/images/topping/margherita.png" }],
    formulas: (["Simple", "Wild", "Savage"] as const).map(offer => ({ ...entry(offer.toLowerCase(), offer), offer }))
  }
};

test("gusti e formule usano la scheda PoC, il prezzo server e l'ordine cucina", async ({ browser, page, context }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    const workspace = await operator.request.get(`${adminOrigin}${menuPath}`);
    const { revision } = await workspace.json() as MenuWorkspace;
    const saved = await operator.request.put(`${adminOrigin}${menuPath}/drafts`, { headers: { origin: adminOrigin }, data: { revision, draft } });
    expect(saved.ok(), await saved.text()).toBe(true);
    const admin = await operator.newPage();
    await admin.goto(`${adminOrigin}/operazioni/menu`);
    await admin.getByLabel("Menu da modificare").selectOption(draft.id);
    await expect(admin.getByLabel("Nome combinazione").first()).toHaveValue("Simple");
    await expect(admin.getByLabel("Prezzo base in euro").first()).toHaveValue("6");
    await admin.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = admin.waitForResponse(response => response.url().endsWith(`${menuPath}/publish`));
    await admin.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    expect((await publishing).ok()).toBe(true);
    await page.goto(`${clientOrigin}/ordina`);
    for (const name of ["Simple", "Wild", "Savage", "Margherita"]) {
      await page.getByRole("button", { name: `Aggiungi ${name}`, exact: true }).click();
      const dialog = page.getByRole("dialog", { name, exact: true });
      await expect(dialog).toBeVisible();
      for (const section of ["Impasto", "Base", "Formato", "Ingredienti", "Extra"]) {
        await expect(dialog.getByRole("heading", { name: section, exact: true })).toBeVisible();
      }
      await expect(dialog.getByRole("heading", { name: "Note per la cucina" })).toBeVisible();
      await dialog.screenshot({ path: testInfo.outputPath(`${name.toLowerCase()}-mobile.png`) });
      await dialog.getByRole("button", { name: "Chiudi personalizzazione" }).click();
    }
    await page.getByRole("button", { name: "Aggiungi Wild", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Wild", exact: true });
    await editor.getByRole("button", { name: /Impasto/ }).click();
    await editor.getByText("Integrale", { exact: true }).click();
    await expect(editor.getByRole("radio", { name: /Integrale/ })).toBeChecked();
    await editor.getByRole("button", { name: /Aggiungi al carrello/ }).click();
    const quoting = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const response = await quoting;
    expect(response.ok(), await response.text()).toBe(true);
    expect((await response.json() as IndividualQuote).totalCents).toBe(720);
    await page.getByLabel(/Telefono per l.ordine/).fill("3331234567");
    await page.getByLabel("Come paghi?").selectOption("cash");
    const confirming = page.waitForResponse(response => response.url().endsWith("/v1/pilot/checkouts") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Conferma e invia ordine", exact: true }).click();
    const confirmed = await confirming;
    expect(confirmed.ok(), await confirmed.text()).toBe(true);
    const { order } = await confirmed.json() as IndividualCheckoutResult;
    expect(order.quote.lines[0].unitCents).toBe(720);
    expect(order.quote.lines[0].composition?.choices.map(choice => choice.name)).toContain("Integrale");
    await admin.goto(`${adminOrigin}/operazioni/ordini`);
    await admin.getByRole("button", { name: `Apri ordine ${order.id} di Alice`, exact: true }).click();
    const detail = admin.getByRole("article").filter({ hasText: order.id });
    await expect(detail).toContainText("Wild");
    await expect(detail).toContainText("Integrale");
  } finally { await operator.close(); }
});

test("Magazzino e formula libera arrivano al preventivo con impasto e base scelti dal menu", async ({ browser, page, context }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    const storeResponse = await operator.request.get(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`);
    expect(storeResponse.ok(), await storeResponse.text()).toBe(true);
    const store = await storeResponse.json() as IndividualStore;
    const additions = [
      { id: "extra-peperoni", name: "Peperoni", price: "3" },
      { id: "extra-zucchine", name: "Zucchine", price: "2" },
      { id: "extra-cipolle", name: "Cipolle", price: "1" },
    ];
    store.ingredients.push(...additions.map(({ id, name }) => ({ id, name, stock: 100, food: { contains: [], mayContain: [] } })));
    const seeded = await operator.request.put(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`, {
      headers: { origin: adminOrigin }, data: store,
    });
    expect(seeded.ok(), await seeded.text()).toBe(true);

    const admin = await operator.newPage();
    await admin.setViewportSize({ width: 1440, height: 1000 });
    await admin.goto(`${adminOrigin}/operazioni`);
    await admin.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Magazzino", exact: true }).click();
    for (const { name, price } of additions) {
      await admin.getByRole("checkbox", { name: `Possibile extra ${name}`, exact: true }).check();
      await admin.getByLabel(`Prezzo extra ${name} in euro`, { exact: true }).fill(price);
      await admin.getByLabel(`Dose per aggiunta ${name}`, { exact: true }).fill("2");
    }
    const storing = admin.waitForResponse(response => response.url().endsWith("/v1/pilot/stores/roma") && response.request().method() === "PUT");
    await admin.getByRole("button", { name: "Salva configurazione", exact: true }).click();
    const stored = await storing;
    expect(stored.ok(), await stored.text()).toBe(true);
    const updatedStore = await (await operator.request.get(`${adminOrigin}/api/pilot/v1/pilot/stores/roma`)).json() as IndividualStore;
    for (const { id, price } of additions) {
      expect(updatedStore.ingredients.find(ingredient => ingredient.id === id)?.extra).toEqual({ enabled: true, priceCents: Number(price) * 100, dose: 2 });
    }

    const candidate = structuredClone(draft);
    candidate.id = "menu-formula-libera";
    candidate.name = "Menu delle combinazioni";
    candidate.pizzaCatalog!.inventoryExtras = true;
    candidate.pizzaCatalog!.customEnabled = true;
    candidate.pizzaCatalog!.tastes = [];
    candidate.pizzaCatalog!.toppings = [];
    candidate.pizzaCatalog!.formulas = [{ ...entry("libera", "Combinazione di prova"), toppingIds: [], extraOffer: { quota: 0, percent: 0 } }];
    candidate.sections = [{ id: "combinazioni", name: "Le tue combinazioni", productIds: ["libera"] }];
    const { revision } = await (await operator.request.get(`${adminOrigin}${menuPath}`)).json() as MenuWorkspace;
    const saved = await operator.request.put(`${adminOrigin}${menuPath}/drafts`, { headers: { origin: adminOrigin }, data: { revision, draft: candidate } });
    expect(saved.ok(), await saved.text()).toBe(true);
    await admin.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Menu", exact: true }).click();
    await admin.getByLabel("Menu da modificare").selectOption(candidate.id);
    await admin.getByLabel("Nome combinazione", { exact: true }).fill("La mia pizza");
    await admin.getByLabel("Prezzo base in euro", { exact: true }).fill("9");
    await admin.getByLabel("Numero di extra scontati", { exact: true }).fill("2");
    await admin.getByLabel("Sconto sugli extra %", { exact: true }).fill("40");
    await admin.evaluate(() => {
      for (const element of document.querySelectorAll("*")) if (element instanceof HTMLElement) element.scrollTo(0, 0);
      window.scrollTo(0, 0);
    });
    await expect(admin.getByRole("heading", { name: "Il tuo menu", exact: true })).toBeInViewport();
    await admin.screenshot({ path: testInfo.outputPath("menu-editor-desktop.png"), fullPage: true });
    await admin.getByRole("button", { name: /Impasti, basi e formati/ }).click();
    await expect(admin.getByRole("region", { name: "Impasti, basi e formati", exact: true })).toBeVisible();
    await admin.evaluate(() => {
      for (const element of document.querySelectorAll("*")) if (element instanceof HTMLElement) element.scrollTo(0, 0);
      window.scrollTo(0, 0);
    });
    await expect(admin.getByRole("heading", { name: "Il tuo menu", exact: true })).toBeInViewport();
    await admin.screenshot({ path: testInfo.outputPath("menu-settings-desktop.png"), fullPage: true });
    await admin.getByRole("button", { name: "Annulla", exact: true }).click();
    const saving = admin.waitForResponse(response => response.url().endsWith(`${menuPath}/drafts`) && response.request().method() === "PUT");
    await admin.getByRole("button", { name: "Salva bozza", exact: true }).click();
    expect((await saving).ok()).toBe(true);
    await admin.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = admin.waitForResponse(response => response.url().endsWith(`${menuPath}/publish`) && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    expect((await publishing).ok()).toBe(true);

    await page.goto(`${clientOrigin}/ordina`);
    await page.getByRole("radio", { name: /^Integrale/ }).check();
    await page.getByRole("radio", { name: "Bianca", exact: true }).check();
    const menuPreview = page.getByRole("img", { name: "Anteprima pizza La mia pizza", exact: true });
    await menuPreview.scrollIntoViewIfNeeded();
    await expect(menuPreview).toBeVisible();
    await expect.poll(() => menuPreview.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("menu-client-mobile.png"), fullPage: true });
    await page.getByRole("button", { name: "Aggiungi La mia pizza", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "La mia pizza", exact: true });
    const layout = await editor.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return { dialogScrollWidth: element.scrollWidth, dialogClientWidth: element.clientWidth, dialogLeft: bounds.left, dialogRight: bounds.right,
        documentScrollWidth: document.documentElement.scrollWidth, documentClientWidth: document.documentElement.clientWidth,
        overflowingElements: [...element.querySelectorAll("*")].map(child => ({ tag: child.tagName, text: child.textContent?.slice(0, 60), left: child.getBoundingClientRect().left, right: child.getBoundingClientRect().right }))
          .filter(child => child.left < -1 || child.right > window.innerWidth + 1) };
    });
    await writeFile(testInfo.outputPath("pizza-editor-layout.json"), JSON.stringify({ initial: layout }, null, 2));
    expect(layout.dialogScrollWidth).toBeLessThanOrEqual(layout.dialogClientWidth);
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth);
    expect(layout.dialogLeft).toBeGreaterThanOrEqual(0);
    expect(layout.dialogRight).toBeLessThanOrEqual(390);
    await editor.evaluate(element => {
      for (const child of [element, ...element.querySelectorAll("*")]) if (child instanceof HTMLElement) child.scrollTo(0, 0);
    });
    const editorPreview = editor.getByRole("img", { name: "Anteprima pizza La mia pizza", exact: true });
    await expect.poll(() => editorPreview.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("pizza-editor-mobile.png") });
    await editor.getByRole("button", { name: /Impasto/ }).click();
    await expect(editor.getByRole("radio", { name: /Integrale/ })).toBeChecked();
    await editor.getByRole("button", { name: /Base/ }).click();
    await expect(editor.getByRole("radio", { name: /Bianca/ })).toBeChecked();
    await expect(editor.getByTestId("customization-total-value")).toContainText("10,20");
    await editor.getByRole("heading", { name: "Extra", exact: true }).first().locator("..").click();
    const publicStore = await (await context.request.get(`${clientOrigin}/api/pilot/v1/pilot/stores/roma`)).json() as IndividualStore;
    const extraCategory = publicStore.products.find(({ id }) => id === "libera")!.options.find(({ pizza }) => pizza?.kind === "topping")!.pizza!.category!;
    await editor.getByRole("heading", { name: extraCategory, exact: true }).last().locator("..").click();
    for (const { name } of additions) await editor.getByRole("button", { name: `${name} escluso`, exact: true }).click();
    await expect(editor.getByTestId("customization-total-value")).toContainText("14,20");
    await editor.getByRole("heading", { name: extraCategory, exact: true }).last().scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("pizza-editor-extra-mobile.png") });
    const expandedLayout = await editor.evaluate(element => ({
      dialogScrollWidth: element.scrollWidth, dialogClientWidth: element.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth, documentClientWidth: document.documentElement.clientWidth,
      overflowingElements: [element, ...element.querySelectorAll("*")].map(child => ({ tag: child.tagName, className: child.className,
        text: child.textContent?.slice(0, 60), scrollWidth: child.scrollWidth, clientWidth: child.clientWidth, scrollLeft: child.scrollLeft,
        left: child.getBoundingClientRect().left, right: child.getBoundingClientRect().right }))
        .filter(child => child.scrollWidth > child.clientWidth || child.scrollLeft !== 0 || child.left < -1 || child.right > window.innerWidth + 1),
    }));
    await writeFile(testInfo.outputPath("pizza-editor-layout.json"), JSON.stringify({ initial: layout, expanded: expandedLayout }, null, 2));
    await testInfo.attach("pizza-editor-layout.json", { path: testInfo.outputPath("pizza-editor-layout.json"), contentType: "application/json" });
    expect(expandedLayout.dialogScrollWidth).toBeLessThanOrEqual(expandedLayout.dialogClientWidth);
    expect(expandedLayout.documentScrollWidth).toBeLessThanOrEqual(expandedLayout.documentClientWidth);
    expect(expandedLayout.overflowingElements.filter(element => element.tag !== "INPUT" && element.tag !== "TEXTAREA" && element.scrollLeft !== 0)).toEqual([]);
    await editor.getByRole("button", { name: /Aggiungi al carrello/ }).click();
    const quoting = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quoted = await quoting;
    expect(quoted.ok(), await quoted.text()).toBe(true);
    const quote = await quoted.json() as IndividualQuote;
    expect(quote.totalCents).toBe(1420);
    expect(quote.lines[0].composition?.choices.map(({ name }) => name)).toEqual(expect.arrayContaining(["Integrale", "Bianca", "Peperoni", "Zucchine", "Cipolle"]));
  } finally {
    await operator.close();
  }
});
