import { expect, test } from "@playwright/test";

test.describe("client group order flow", () =>
{
  test("adds a personal contribution and places one shared mock order", async ({ page }) =>
  {
    await page.goto("http://127.0.0.1:3001/group-order");
    await expect(page.getByText("Nessuna scelta ancora")).toBeVisible();
    await page.getByRole("link", { name: "Aggiungi al tuo contributo" }).click();
    await page.locator('a[href="/product/product-margherita?order=group"]').click();
    await page.getByRole("button", { name: /Aggiungi al carrello/i }).click();
    await page.getByRole("link", { name: "Vai al gruppo" }).click();
    await expect(page.getByText("Margherita Classica").last()).toBeVisible();
    await page.getByRole("link", { name: "Checkout unico dell'host" }).click();
    await page.getByLabel("Contanti alla consegna (simulazione)").check();
    await page.getByTestId("checkout-submit-button").click();
    await expect(page.getByRole("heading", { name: "Il tuo ordine è confermato" })).toBeVisible();
  });
});
