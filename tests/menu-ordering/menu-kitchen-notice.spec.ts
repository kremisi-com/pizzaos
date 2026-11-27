import { expect, test } from "@playwright/test";
import type { IndividualStore, MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const menuPath = `${adminOrigin}/api/pilot/v1/pilot/stores/roma/menu-admin`;
const kitchenNotice = "Avvertenza cucina salvata nel menu";

test("le avvertenze salvate restano nei dati ma non compaiono nel cliente", async ({ browser, page, context }) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  try {
    const workspaceResponse = await operator.request.get(menuPath);
    expect(workspaceResponse.ok(), await workspaceResponse.text()).toBe(true);
    const workspace = await workspaceResponse.json() as MenuWorkspace;
    const draft: MenuDraft = {
      id: "menu-avvertenze", name: "Menu", kitchenNotice,
      sections: [{ id: "prodotti", name: "Prodotti", productIds: ["prodotto"] }],
      products: [{ id: "prodotto", name: "Prodotto", description: "", priceCents: 800, available: true,
        ingredients: {}, allergens: [], food: { contains: ["Latte"], mayContain: ["Soia"] }, options: [] }]
    };
    const saved = await operator.request.put(`${menuPath}/drafts`, {
      headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft }
    });
    expect(saved.ok(), await saved.text()).toBe(true);
    const published = await operator.request.post(`${menuPath}/publish`, {
      headers: { origin: adminOrigin }, data: { revision: (await saved.json() as MenuWorkspace).revision, draftId: draft.id }
    });
    expect(published.ok(), await published.text()).toBe(true);
    const catalogResponse = await context.request.get(`${clientOrigin}/api/pilot/v1/pilot/stores/roma`);
    expect(catalogResponse.ok(), await catalogResponse.text()).toBe(true);
    expect((await catalogResponse.json() as IndividualStore).menu?.kitchenNotice).toBe(kitchenNotice);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${clientOrigin}/ordina`);
    await expect(page.getByRole("button", { name: "Aggiungi Prodotto", exact: true })).toBeVisible();
    await expect(page.getByText(kitchenNotice, { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Aggiungi Prodotto", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Prodotto", exact: true });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(kitchenNotice, { exact: true })).toHaveCount(0);
    await dialog.getByRole("button", { name: "Aggiungi", exact: true }).click();
    await page.getByRole("link", { name: /^Carrello/ }).click();
    await expect(page.getByRole("button", { name: "Aumenta quantità Prodotto" })).toBeVisible();
    await expect(page.getByText(kitchenNotice, { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Vai al checkout/ })).toHaveAttribute("href", "/ordina/checkout");
    await page.goto(`${clientOrigin}/ordina/checkout`);
    await expect(page.getByRole("heading", { name: "Consegna e pagamento", exact: true })).toBeVisible();
    await expect(page.getByText(kitchenNotice, { exact: true })).toHaveCount(0);
  } finally {
    await operator.close();
  }
});
