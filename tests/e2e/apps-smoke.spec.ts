import { expect, test } from "@playwright/test";

const APP_ROUTES = [
  {
    name: "landing",
    url: "http://127.0.0.1:3000",
    title: "PizzaOS Landing",
    resetButtonTestId: "landing-reset-button"
  },
  {
    name: "client",
    url: "http://127.0.0.1:3001",
    title: "PizzaOS Client",
    resetButtonTestId: "client-reset-button"
  },
  {
    name: "admin",
    url: "http://127.0.0.1:3002",
    title: "PizzaOS Admin",
    resetButtonTestId: "admin-reset-button"
  }
] as const;

test.describe("apps smoke", () =>
{
  for (const route of APP_ROUTES)
  {
    test(`${route.name} root route loads shared shell`, async ({ page }) =>
    {
      await page.goto(route.url);

      await expect(page.getByRole("heading", { name: route.title })).toBeVisible();
      await expect(page.getByTestId(route.resetButtonTestId)).toBeVisible();
      await expect(page.getByText("Storage key:")).toBeVisible();
    });
  }
});
