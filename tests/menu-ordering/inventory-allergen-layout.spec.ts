import { expect, test } from "@playwright/test";

const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3732";

test("aprire un multiselect allergeni non allunga quello accanto", async ({ context, page }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "operator", url: adminOrigin }]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${adminOrigin}/operazioni/magazzino`);
  const section = page.locator("details").filter({ has: page.locator("summary", { hasText: /^Allergeni$/ }) }).first();
  await section.locator("summary").click();
  const contains = section.getByRole("button", { name: "Seleziona allergeni: Contiene", exact: true });
  const traces = section.getByRole("button", { name: "Seleziona allergeni: Può contenere", exact: true });
  const initialContains = await contains.boundingBox();
  const initialTraces = await traces.boundingBox();
  expect(initialContains).not.toBeNull();
  expect(initialTraces).not.toBeNull();
  expect(initialTraces!.x).toBeGreaterThan(initialContains!.x);

  for (const [opened, adjacent, initial] of [
    [contains, traces, initialTraces],
    [traces, contains, initialContains],
  ] as const) {
    await opened.click();
    await expect(opened).toHaveAttribute("aria-expanded", "true");
    await expect(section.getByRole("searchbox")).toBeVisible();
    const actual = await adjacent.boundingBox();
    expect(actual).not.toBeNull();
    expect(actual!.height).toBeCloseTo(initial!.height, 1);
    expect(actual!.y).toBeCloseTo(initial!.y, 1);
    await opened.press("Escape");
    await expect(opened).toHaveAttribute("aria-expanded", "false");
  }
});
