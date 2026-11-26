import { expect, test } from "@playwright/test";
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3731";

test("la card compatta apre il dettaglio da descrizione, prezzo, spazio e tastiera", async ({ page, context }, testInfo) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/ordina`);
  const trigger = page.getByRole("button", { name: "Aggiungi Pizza", exact: true });
  const card = page.getByRole("article").filter({ has: trigger });
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveText("Pizza");
  expect(await trigger.evaluate(element => getComputedStyle(element).color)).not.toBe("rgb(255, 255, 255)");
  const heading = card.getByRole("heading", { name: "Pizza", exact: true });
  const price = heading.locator("strong");
  const titleBox = await trigger.boundingBox();
  const priceBox = await price.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(priceBox).not.toBeNull();
  expect(Math.abs(titleBox!.y - priceBox!.y)).toBeLessThan(5);
  expect(priceBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
  const cardBox = await card.boundingBox();
  expect(cardBox!.height).toBeLessThan(110);
  await card.screenshot({ path: testInfo.outputPath("menu-card-mobile.png") });
  const dialog = page.getByRole("dialog", { name: "Pizza", exact: true });
  async function confirmProduct() {
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Note per la cucina")).toBeVisible();
    await dialog.getByRole("button", { name: "Aggiungi", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await trigger.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Chiudi personalizzazione" }).click();
  await expect(page.getByText("Il carrello è vuoto. Scegli dal menu.")).toBeVisible();
  const descriptionBox = await card.getByText("Pizza del pilota", { exact: true }).boundingBox();
  await card.click({ position: { x: descriptionBox!.x - cardBox!.x + 10, y: descriptionBox!.y - cardBox!.y + 5 } });
  await confirmProduct();
  await card.click({ position: { x: priceBox!.x - cardBox!.x + 5, y: priceBox!.y - cardBox!.y + 5 } });
  await confirmProduct();
  await card.click({ position: { x: cardBox!.width - 22, y: cardBox!.height - 12 } });
  await confirmProduct();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await confirmProduct();
  await page.keyboard.press("Space");
  await confirmProduct();
  const quoting = page.waitForResponse(response => response.url().endsWith("/v1/pilot/quote") && response.request().method() === "POST");
  await page.getByRole("link", { name: "Vai a consegna e pagamento", exact: true }).click();
  await page.getByRole("button", { name: "Verifica disponibilità e totale", exact: true }).click();
  const response = await quoting;
  expect(response.ok(), await response.text()).toBe(true);
  expect((await response.json()).totalCents).toBe(4000);
});

test("il gruppo conferma il prodotto dalla scheda prima di aggiungerlo alle scelte", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/ordina/gruppo`);
  await page.getByRole("button", { name: "Crea gruppo", exact: true }).click();
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pizza", exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Note per la cucina").fill("Da dividere");
  await dialog.getByRole("button", { name: "Aggiungi", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByLabel("Le mie scelte").getByRole("spinbutton")).toHaveValue("1");
  await expect(page.getByLabel("Le mie scelte").getByRole("textbox", { name: "Note per Pizza" })).toHaveValue("Da dividere");
});
