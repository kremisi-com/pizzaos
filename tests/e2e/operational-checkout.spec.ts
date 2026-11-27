import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { IndividualCart } from "@pizzaos/domain";

const origin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3921";
const cart: IndividualCart = { storeId: "roma", mode: "pickup", slotId: null, notes: "", lines: [
  { productId: "pizza", quantity: 2, optionIds: [], notes: "Ben cotta" },
] };

async function openCheckout(page: Page) {
  await page.goto(`${origin}/ordina`);
  await page.evaluate(value => localStorage.setItem("pizzaos.individual-cart.v1", JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), cart: value })), cart);
  await page.goto(`${origin}/ordina/checkout`);
  await expect(page.getByRole("radio", { name: "Ritiro in pizzeria" })).toBeChecked();
}

test("totale e prossimo passo restano fissi e il contenuto finale è raggiungibile", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: origin, httpOnly: true, sameSite: "Lax" }]);
  await openCheckout(page);
  const dock = page.getByTestId("checkout-dock");
  await expect(dock.getByText("Totale stimato", { exact: true })).toBeVisible();
  await expect(dock.getByText(/16,00\s*€/)).toBeVisible();
  await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
  const summary = page.getByRole("region", { name: "Riepilogo da confermare", exact: true });
  await expect(summary).toBeFocused();
  await expect(page.getByRole("button", { name: "Conferma e invia ordine", exact: true })).toBeDisabled();
  await expect(dock).toContainText(/Inserisci il telefono/);
  await page.getByRole("textbox", { name: "Telefono per l'ordine", exact: true }).fill("3331234567");
  await expect(page.getByRole("button", { name: "Conferma e invia ordine", exact: true })).toBeEnabled();
  await mkdir(".codex/evidence", { recursive: true });
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    if (viewport.width === 390) await page.screenshot({ path: ".codex/evidence/checkout-aligned-start-mobile.png" });
    const before = await dock.boundingBox();
    const navigation = page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Carrello", exact: true }) });
    const navBox = await navigation.boundingBox();
    if (!before || !navBox) throw new Error("Riepilogo o navbar senza dimensioni");
    expect(before.x).toBeGreaterThanOrEqual(0);
    expect(before.x + before.width).toBeLessThanOrEqual(viewport.width);
    expect(before.y).toBeGreaterThan(0);
    expect(before.y + before.height).toBeLessThanOrEqual(navBox.y);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(async () => (await dock.boundingBox())?.y).toBeCloseTo(before.y, 0);
    const summaryBox = await summary.boundingBox();
    if (!summaryBox) throw new Error("Riepilogo senza dimensioni");
    expect(summaryBox.y + summaryBox.height).toBeLessThanOrEqual(before.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `.codex/evidence/checkout-aligned-${viewport.width}x${viewport.height}.png` });
  }
  await page.getByRole("textbox", { name: "Note per l'ordine", exact: true }).fill("Citofono 4");
  await expect(dock).toContainText(/Verifica nuovamente/);
  await expect(dock.getByText("Totale stimato", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
  await expect(summary).toBeFocused();
  await page.getByRole("button", { name: "Conferma e invia ordine", exact: true }).click();
  await expect(page.getByRole("link", { name: "Segui l'ordine", exact: true })).toBeVisible();
  await expect(dock).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "I tuoi ordini", exact: true })).toHaveCount(0);
});

test("l'ospite verifica il totale e la consegna richiede un indirizzo selezionato", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCheckout(page);
  const dock = page.getByTestId("checkout-dock");
  await expect(dock.getByRole("link", { name: "Accedi per completare l'ordine", exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Consegna a domicilio", exact: true }).check();
  await expect(page.getByRole("combobox", { name: "Indirizzo completo", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true })).toBeDisabled();
  await expect(dock).toContainText(/indirizzo completo/);
  await page.getByRole("radio", { name: "Ritiro in pizzeria", exact: true }).check();
  await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
  await expect(page.getByRole("region", { name: "Riepilogo da confermare", exact: true })).toBeFocused();
  await expect(dock.getByText("Totale", { exact: true })).toBeVisible();
  await expect(dock.getByRole("link", { name: "Accedi per completare l'ordine", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Conferma e/ })).toHaveCount(0);
});
