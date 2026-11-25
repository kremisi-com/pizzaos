import { expect, test } from "@playwright/test";
import type { IndividualCheckoutResult, IndividualQuote, MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const workspacePath = "/api/pilot/v1/pilot/stores/roma/menu-admin";
const draft: MenuDraft = {
  id: "menu-impasti",
  name: "Menu degli impasti",
  sections: [{ id: "pizze", name: "Pizze componibili", productIds: ["pizza-al-taglio"] }],
  products: [{
    id: "pizza-al-taglio", name: "Pizza al taglio", description: "Scegli impasto e ricetta", available: true,
    priceCents: 0, ingredients: {}, allergens: [], food: { contains: [], mayContain: [] },
    groups: [
      { id: "impasti", name: "Scegli l’impasto", kind: "dough", min: 1, max: 1, optionIds: ["classico", "integrale"] },
      { id: "ricette", name: "Scegli la ricetta", kind: "recipe", min: 1, max: 1, optionIds: ["rossa", "bianca"] },
    ],
    options: [
      { id: "classico", name: "Impasto classico", priceCents: 250, ingredients: { dough: 1 } },
      { id: "integrale", name: "Impasto integrale", priceCents: 350, ingredients: { dough: 1 } },
      { id: "rossa", name: "Ricetta rossa", priceCents: 1300, ingredients: {} },
      { id: "bianca", name: "Ricetta bianca", priceCents: 1200, ingredients: {} },
    ],
  }],
};

test("la pubblicazione rende ordinabile la pizza componibile e la cucina riceve le scelte", async ({ browser, page, context }) => {
  const operatorContext = await browser.newContext();
  await operatorContext.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  try {
    const workspace = await operatorContext.request.get(`${adminOrigin}${workspacePath}`);
    expect(workspace.ok(), await workspace.text()).toBe(true);
    const { revision } = await workspace.json() as MenuWorkspace;
    const saved = await operatorContext.request.put(`${adminOrigin}${workspacePath}/drafts`, {
      headers: { origin: adminOrigin }, data: { revision, draft },
    });
    expect(saved.ok(), await saved.text()).toBe(true);

    await page.goto(`${clientOrigin}/ordina`);
    await expect(page.getByRole("button", { name: "Aggiungi Pizza", exact: true })).toBeVisible();
    await expect(page.getByText("Pizza al taglio", { exact: true })).toHaveCount(0);

    const admin = await operatorContext.newPage();
    await admin.goto(`${adminOrigin}/operazioni`);
    const operations = admin.getByRole("navigation", { name: "Navigazione admin" });
    await operations.getByRole("link", { name: "Menu", exact: true }).click();
    await admin.getByLabel("Menu da modificare").selectOption(draft.id);
    await admin.getByRole("button", { name: "Pubblica menu", exact: true }).click();
    const publishing = admin.waitForResponse((response) => response.url().endsWith(`${workspacePath}/publish`) && response.request().method() === "POST");
    await admin.getByRole("button", { name: "Conferma pubblicazione", exact: true }).click();
    const published = await publishing;
    expect(published.ok(), await published.text()).toBe(true);

    await page.reload();
    await expect(page.getByText("Pizze componibili", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(draft.name, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Scegli dal menu", exact: true })).toHaveCount(0);
    await expect(page.getByText("Scopri le proposte della pizzeria.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Allergeni e preferenze alimentari", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Aggiornamenti in tempo reale", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Aggiungi Pizza al taglio", exact: true }).click();
    const configurator = page.getByRole("dialog", { name: "Pizza al taglio", exact: true });
    await expect(configurator).toBeVisible();
    expect(await configurator.evaluate((element) => {
      const { left, right } = element.getBoundingClientRect();
      return left >= 0 && right <= window.innerWidth;
    })).toBe(true);
    await configurator.getByRole("radio", { name: /Impasto classico/ }).check();
    await configurator.getByRole("radio", { name: /Ricetta rossa/ }).check();
    await configurator.getByRole("button", { name: "Aggiungi", exact: true }).click();
    const quoting = page.waitForResponse((response) => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
    await page.getByRole("link", { name: "Vai a consegna e pagamento", exact: true }).click();
    await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
    const quote = await quoting;
    expect(quote.ok(), await quote.text()).toBe(true);
    expect((await quote.json() as IndividualQuote).totalCents).toBe(1550);
    await page.getByLabel(/Telefono per l.ordine/).fill("3331234567");
    await page.getByLabel("Come paghi?").selectOption("cash");
    const confirming = page.waitForResponse((response) => response.url().endsWith("/v1/pilot/checkouts") && response.request().method() === "POST");
    await page.getByRole("button", { name: "Conferma e invia ordine", exact: true }).click();
    const confirmed = await confirming;
    expect(confirmed.ok(), await confirmed.text()).toBe(true);
    const { order } = await confirmed.json() as IndividualCheckoutResult;
    await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();

    await operations.getByRole("link", { name: "Ordini", exact: true }).click();
    await admin.getByRole("button", { name: `Apri ordine ${order.id} di Alice`, exact: true }).click();
    const detail = admin.getByRole("article").filter({ hasText: order.id });
    await expect(detail).toContainText("Pizza al taglio");
    await expect(detail).toContainText("Impasto classico");
    await expect(detail).toContainText("Ricetta rossa");
  } finally {
    await operatorContext.close();
  }
});
