import { expect, test } from "@playwright/test";
import type { IndividualCheckoutResult, IndividualQuote, MenuDraft, MenuWorkspace, PizzaComponent, PizzaEntry } from "@pizzaos/domain";

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
    await admin.getByRole("button", { name: draft.name, exact: true }).click();
    await admin.getByRole("button", { name: "Modifica Simple", exact: true }).click();
    await expect(admin.getByLabel("Prezzo completo in euro")).toHaveValue("6");
    await expect(admin.getByText("Questa formula parte senza gusto predefinito.")).toBeVisible();
    await admin.getByRole("button", { name: "Chiudi scheda", exact: true }).click();
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
