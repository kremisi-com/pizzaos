import { expect, test } from "@playwright/test";

test.describe("client order flow", () =>
{
  test("places a full mock order through cart and checkout confirmation", async ({ page }) =>
  {
    await page.goto("http://127.0.0.1:3001/product/product-margherita");

    for (let stepIndex = 0; stepIndex < 4; stepIndex += 1)
    {
      await page.getByRole("button", { name: "Continua" }).click();
    }

    await page.getByRole("button", { name: "Aggiungi al carrello" }).click();
    await page.getByRole("link", { name: "Vai al carrello" }).click();

    await expect(page.getByTestId("cart-checkout-link")).toBeVisible();
    await page.getByTestId("cart-checkout-link").click();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();

    await page.getByRole("button", { name: "10%" }).click();
    await page.getByLabel("Intestatario carta").fill("Mario Rossi");
    await page.getByLabel("Ultime 4 cifre").fill("1234");
    await page.getByTestId("checkout-submit-button").click();

    await expect(page.getByRole("heading", { name: "Ordine confermato" })).toBeVisible();
    await expect(page.getByText(/Pagamento mock completato/i)).toBeVisible();

    await page.getByTestId("checkout-orders-link").click();
    await expect(page.getByRole("heading", { name: "Stato ordine" })).toBeVisible();
    await expect(page.getByText(/order-client-mock-/i)).toBeVisible();
    await expect(page.getByTestId("orders-current-status")).toHaveText("Confermato");

    await page.getByTestId("orders-advance-button").click();
    await expect(page.getByTestId("orders-current-status")).toHaveText("In preparazione");
    await page.getByTestId("orders-advance-button").click();
    await expect(page.getByTestId("orders-current-status")).toHaveText("Pronto");
    await page.getByTestId("orders-advance-button").click();
    await expect(page.getByTestId("orders-current-status")).toHaveText("In consegna");

    await expect(page.getByTestId("tracking-visible")).toBeVisible();
    await expect(page.getByText(/notifiche non lette/i)).toBeVisible();
  });
});
