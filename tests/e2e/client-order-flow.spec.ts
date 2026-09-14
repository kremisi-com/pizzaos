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
    await page.getByLabel("Ultime 4 cifre").fill("1234");
    await page.getByTestId("checkout-submit-button").click();

    await expect(page.getByRole("heading", { name: "Il tuo ordine è confermato" })).toBeVisible();
    await expect(page.getByText(/Preparazione confermata per lo slot/i)).toBeVisible();

    await page.getByTestId("checkout-orders-link").click();
    await expect(page.getByRole("heading", { name: "Ordini passati" })).toBeVisible();
    await expect(page.getByTestId("orders-active-order")).toBeVisible();
    await expect(page.getByTestId("orders-active-order")).toContainText("Confermato");

    await page.evaluate(() =>
    {
      const storageKey = "pizzaos:poc:state:client";
      const persistedSeedPayload = window.localStorage.getItem(storageKey);

      if (!persistedSeedPayload)
      {
        return;
      }

      const persistedSeed = JSON.parse(persistedSeedPayload) as {
        activeOrders?: Array<{
          id: string;
          status: string;
        }>;
        orderHistory?: Array<{
          id: string;
          status: string;
        }>;
      };
      const focusedOrder = persistedSeed.activeOrders?.[0] ?? persistedSeed.orderHistory?.[0];

      if (!focusedOrder)
      {
        return;
      }

      const deliveredOrder = {
        ...focusedOrder,
        status: "delivered"
      };

      persistedSeed.activeOrders = [];
      persistedSeed.orderHistory = [
        deliveredOrder,
        ...(persistedSeed.orderHistory ?? []).filter((order) => order.id !== deliveredOrder.id)
      ];

      window.localStorage.setItem(storageKey, JSON.stringify(persistedSeed));
    });

    await page.reload();

    await expect(page.getByTestId("orders-active-order")).toHaveCount(0);
    await expect(page.getByTestId("orders-history-list")).toContainText("Consegnato");
    await expect(page.getByTestId("order-feedback-prompt")).toBeVisible();
    await page.getByLabel("5 stelle").click();
    await page.getByRole("textbox").fill("Consegna perfetta e pizza calda.");
    await page.getByTestId("order-feedback-submit").click();
    await expect(page.getByTestId("order-feedback-thanks")).toBeVisible();
    await page.getByRole("button", { name: "Condividi anche su Google" }).click();
    await expect(page.getByText(/Recensione Google simulata/i)).toBeVisible();
  });

  test("supports pickup without delivery instructions or a delivery fee", async ({ page }) =>
  {
    await page.goto("http://127.0.0.1:3001");
    await page.getByTestId("client-quick-reorder-button").click();
    await page.getByRole("link", { name: "Vai al carrello" }).first().click();
    await page.getByTestId("cart-checkout-link").click();

    await page.getByLabel("Ritiro in pizzeria").check();
    await expect(page.getByLabel("Citofono")).toHaveCount(0);
    await expect(page.getByText("Consegna", { exact: true })).toHaveCount(0);
    await page.getByLabel("Contanti alla consegna (simulazione)").check();
    await page.getByTestId("checkout-submit-button").click();

    await expect(page.getByRole("heading", { name: "Il tuo ordine è confermato" })).toBeVisible();
  });

  test("shows selected edge states for sold-out slot and invalid coupon", async ({ page }) =>
  {
    await page.goto("http://127.0.0.1:3001");

    await page.getByTestId("client-quick-reorder-button").click();
    await page.getByRole("link", { name: "Vai al carrello" }).first().click();
    await page.getByTestId("cart-checkout-link").click();

    await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
    await expect(page.getByText(/Esaurito/i).first()).toBeVisible();

    await page.getByLabel("Inserisci coupon").fill("CODICENONVALIDO");
    await page.getByTestId("checkout-apply-coupon-button").click();

    await expect(page.getByTestId("checkout-coupon-feedback")).toContainText("Codice coupon non valido.");
  });
});
