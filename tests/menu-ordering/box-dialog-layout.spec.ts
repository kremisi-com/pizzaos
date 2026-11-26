import { expect, test } from "@playwright/test";
import type { MenuDraft, MenuWorkspace } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";
const menuPath = `${adminOrigin}/api/pilot/v1/pilot/stores/roma/menu-admin`;

test("il configuratore box mantiene opzioni e comandi entro il dialog", async ({ page, context, browser }, testInfo) => {
  const operator = await browser.newContext();
  await operator.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  try {
    const workspace = await (await operator.request.get(menuPath)).json() as MenuWorkspace;
    const draft: MenuDraft = {
      id: "box-layout", name: "Menu box", sections: [{ id: "birre", name: "Birre", productIds: ["box"] }],
      products: [{
        id: "box", name: "Componi la tua box (3 birre)",
        description: "Scegli 3 birre da 33 cl, anche ripetute. In omaggio un apribottiglie.",
        priceCents: 1650, available: true, ingredients: {}, allergens: [],
        groups: [{ id: "birre", name: "Birre della box", kind: "selection", min: 3, max: 3, allowRepeat: true,
          optionIds: ["chiara", "ambrata", "ipa"] }],
        options: ["Chiara", "Ambrata", "IPA"].map((name, index) => ({
          id: ["chiara", "ambrata", "ipa"][index]!, name: `${name} artigianale`, priceCents: 0, ingredients: {},
        })),
      }],
    };
    const saved = await operator.request.put(`${menuPath}/drafts`, {
      headers: { origin: adminOrigin }, data: { revision: workspace.revision, draft },
    });
    expect(saved.ok(), await saved.text()).toBe(true);
    const published = await operator.request.post(`${menuPath}/publish`, {
      headers: { origin: adminOrigin }, data: { revision: (await saved.json() as MenuWorkspace).revision, draftId: draft.id },
    });
    expect(published.ok(), await published.text()).toBe(true);

    for (const viewport of [{ width: 400, height: 700 }, { width: 320, height: 568 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${clientOrigin}/ordina`);
      await page.getByRole("button", { name: "Aggiungi Componi la tua box (3 birre)", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: draft.products[0]!.name, exact: true });
      const header = dialog.locator("header");
      const body = dialog.locator("form > div");
      const footer = dialog.locator("footer");
      const legend = dialog.locator("legend");
      const close = dialog.getByRole("button", { name: "Chiudi personalizzazione" });
      await expect(dialog).toBeVisible();
      await expect.poll(() => dialog.evaluate(element => element.scrollTop)).toBe(0);
      await expect.poll(() => body.evaluate(element => element.scrollTop)).toBe(0);
      const headerBox = (await header.boundingBox())!;
      const legendBox = (await legend.boundingBox())!;
      expect(legendBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
      const dialogBox = (await dialog.boundingBox())!;
      await dialog.screenshot({ path: testInfo.outputPath(`box-initial-${viewport.width}.png`) });
      expect(dialogBox.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
      if (viewport.width <= 480) expect(dialogBox.width).toBe(viewport.width);
      expect(await body.evaluate(element => element.scrollWidth - element.clientWidth)).toBe(0);
      await dialog.getByRole("button", { name: "Aggiungi Chiara artigianale", exact: true }).click();
      await dialog.getByRole("button", { name: "Aggiungi Chiara artigianale", exact: true }).click();
      await dialog.getByRole("button", { name: "Aggiungi IPA artigianale", exact: true }).click();
      const notes = dialog.getByRole("textbox", { name: "Note per la cucina" });
      await notes.fill("Messaggio di test");
      await body.evaluate(element => { element.scrollTop = element.scrollHeight; });
      const footerBox = (await footer.boundingBox())!;
      const notesBox = (await notes.boundingBox())!;
      expect(notesBox.y + notesBox.height).toBeLessThanOrEqual(footerBox.y);
      expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(viewport.height);
      expect((await close.boundingBox())!.y).toBeGreaterThanOrEqual(headerBox.y);
      expect((await close.boundingBox())!.width).toBeGreaterThanOrEqual(44);
      expect((await header.boundingBox())!.y).toBeCloseTo(headerBox.y, 0);
      await expect(dialog.getByRole("button", { name: "Aggiungi", exact: true })).toBeEnabled();
      await dialog.screenshot({ path: testInfo.outputPath(`box-${viewport.width}.png`) });
      await close.click();
    }
  } finally {
    await operator.close();
  }
});
