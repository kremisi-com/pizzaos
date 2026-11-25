import { expect, test } from "@playwright/test";
import type { MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const menuPath = "/api/pilot/v1/pilot/stores/roma/menu-admin";

test("la scheda scorre senza spostare l'elenco, anche ai bordi; su mobile scorre la pagina", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  const response = await context.request.get(`${adminOrigin}${menuPath}`);
  expect(response.ok()).toBe(true);
  const workspace = await response.json() as MenuWorkspace;
  const products: MenuDraft["products"] = Array.from({ length: 30 }, (_, index) => ({
    id: `scroll-${index}`, name: `Prodotto ${index}`, description: "Descrizione prodotto",
    priceCents: 800, available: true, ingredients: {}, allergens: [], options: [],
  }));
  const draft: MenuDraft = {
    id: "menu-scroll", name: "Menu scroll", products,
    sections: [{ id: "scroll", name: "Prodotti", productIds: products.map(product => product.id) }],
  };
  const saved = await context.request.put(`${adminOrigin}${menuPath}/drafts`, {
    headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft },
  });
  expect(saved.ok(), await saved.text()).toBe(true);
  await page.setViewportSize({ width: 1600, height: 720 });
  await page.goto(`${adminOrigin}/operazioni/menu`);
  await page.getByLabel("Menu da modificare").selectOption(draft.id);
  const row = page.getByRole("button", { name: "Modifica Prodotto 0", exact: true });
  await row.click();
  const detail = page.getByRole("complementary", { name: "Scheda di modifica" });
  await expect.poll(() => detail.evaluate(element => element.scrollHeight - element.clientHeight)).toBeGreaterThan(0);
  await detail.hover();
  const initialY = (await row.boundingBox())!.y;
  await page.mouse.wheel(0, 300);
  await expect.poll(() => detail.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect((await row.boundingBox())!.y).toBeCloseTo(initialY, 0);
  await detail.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await page.mouse.wheel(0, 600);
  // Two animation frames allow the wheel event and its scroll chaining to settle.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect((await row.boundingBox())!.y).toBeCloseTo(initialY, 0);
  await detail.evaluate(element => { element.scrollTop = 0; });
  await page.mouse.wheel(0, -600);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect((await row.boundingBox())!.y).toBeCloseTo(initialY, 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => detail.evaluate(element => element.scrollHeight - element.clientHeight)).toBe(0);
  await detail.scrollIntoViewIfNeeded();
  await detail.hover();
  const mobileY = (await detail.boundingBox())!.y;
  await page.mouse.wheel(0, 300);
  await expect.poll(async () => (await detail.boundingBox())!.y).toBeLessThan(mobileY);
});
