import { expect, test } from "@playwright/test";

test("il form della landing apre entrambi i POC senza password", async ({ page, context }) => {
  await context.route(url => !url.hostname.endsWith(".localhost"), route => route.abort());
  await page.goto("http://landing.localhost:3903");
  await page.getByRole("banner").getByRole("button", { name: "Apri la demo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome e cognome").fill("Mario Demo");
  await dialog.getByLabel(/email/i).fill("mario@example.test");
  await dialog.getByLabel(/nome della pizzeria|nome pizzeria/i).fill("Pizzeria Demo");
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: /Apri la Demo/i }).click();
  await expect(dialog.getByRole("heading", { name: "Dati inviati!" })).toBeVisible();

  const destinations = [
    { button: "Demo Web-App Cliente", origin: "http://client.localhost:3901" },
    { button: "Demo Dashboard Admin", origin: "http://admin.localhost:3902" },
  ];
  for (const { button, origin } of destinations) {
    const opened = context.waitForEvent("page");
    await dialog.getByRole("button", { name: button }).click();
    const demo = await opened;
    await expect(demo).toHaveURL(`${origin}/poc`);
    await expect(demo.getByRole("complementary", { name: "Modalità demo" })).toBeVisible();
    await expect(demo.getByLabel("Password demo")).toHaveCount(0);
    const operations = await demo.evaluate(async () => {
      const response = await fetch("/api/pilot/v1/pilot/stores");
      return { status: response.status, body: await response.json() };
    });
    expect(operations.status).toBe(403);
    expect(operations.body).toMatchObject({ code: "demo_session" });
  }
});
