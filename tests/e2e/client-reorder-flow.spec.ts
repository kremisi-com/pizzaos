import { expect, test } from "@playwright/test";

test.describe("client reorder flow", () =>
{
  test("orders like last time and completes checkout from quick reorder", async ({ page }) =>
  {
    await page.goto("http://127.0.0.1:3001");

    await expect(page.getByTestId("client-last-order-prompt")).toBeVisible();

    await page.getByTestId("client-order-like-last-time-button").click();

    await expect(page.getByTestId("client-quick-reorder-notice")).toBeVisible();
    await page.getByRole("link", { name: "Vai al carrello" }).first().click();

    await expect(page.getByTestId("cart-checkout-link")).toBeVisible();
    await expect(page.getByText("Capricciosa")).toBeVisible();

    await page.getByTestId("cart-checkout-link").click();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

    await page.getByLabel("Intestatario carta").fill("Giulia Verdi");
    await page.getByLabel("Ultime 4 cifre").fill("5678");
    await page.getByTestId("checkout-submit-button").click();

    await expect(page.getByRole("heading", { name: "Ordine confermato" })).toBeVisible();
  });
});
