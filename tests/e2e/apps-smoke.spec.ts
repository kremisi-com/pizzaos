import { expect, test } from "@playwright/test";
import { loginDemo } from "./demo-login";

const APP_ROUTES = [
  {
    name: "landing",
    url: "http://127.0.0.1:3010",
    title: /PizzaOS/
  },
  {
    name: "client",
    url: "http://127.0.0.1:3001",
    title: "PizzaOS Client"
  },
  {
    name: "admin",
    url: "http://127.0.0.1:3002",
    title: "PizzaOS Admin"
  }
] as const;

test.describe("apps smoke", () =>
{
  for (const route of APP_ROUTES)
  {
    test(`${route.name} root route loads shared shell`, async ({ page, context }) =>
    {
      if (route.name !== "landing") await loginDemo(context.request, route.url);
      await page.goto(route.url);

      await expect(page).toHaveTitle(route.title);
      if (route.name === "landing") await expect(page.getByRole("link", { name: "PizzaOS – torna alla home" })).toBeVisible();
      else {
        await expect(page.getByLabel("Modalità demo")).toBeVisible();
        if (route.name === "client") await expect(page.getByTestId("client-reset-button")).toBeVisible();
        else await expect(page.getByRole("button", { name: "Reset Demo", exact: true })).toBeVisible();
      }
    });
  }
});
