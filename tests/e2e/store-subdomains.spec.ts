import { expect, test } from "@playwright/test";
import type { GroupOrderingApi } from "@pizzaos/domain";

const client = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3901";
const admin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3902";
const assigned = "https://lapizzaspeciale.pizzaos.app";
const unassigned = "https://sede-non-configurata.pizzaos.app";
const legacy = "https://bella-napoli.pizzaos.app";

test.beforeEach(async ({ context }) => {
  // The browser uses the actual public URL shape. Route the fixture hosts only
  // to the isolated local app, with the Host it would receive from Vercel.
  await context.route(url => [assigned, unassigned, legacy].includes(url.origin), async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/pilot/v1/pilot/stream") {
      await route.abort();
      return;
    }
    const response = await route.fetch({
      url: `${client}${url.pathname}${url.search}`,
      headers: { ...await request.allHeaders(), host: url.host },
      maxRedirects: 0
    });
    await route.fulfill({ response });
  });
});

test("il superadmin pubblica Roma e il link apre menu e gruppo della stessa sede", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "superadmin", url: admin, httpOnly: true }]);
  await page.goto(`${admin}/operazioni`);
  await page.getByLabel("Negozio Attivo", { exact: true }).selectOption({ label: "Roma" });
  await page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Profilo", exact: true }).click();
  await page.getByRole("textbox", { name: /^Sottodominio ordini/ }).fill("lapizzaspeciale");
  await page.getByRole("button", { name: "Salva configurazione" }).click();

  const link = page.getByRole("link", { name: "lapizzaspeciale.pizzaos.app" });
  await expect(link).toHaveAttribute("href", assigned);
  await link.click();
  await expect(page).toHaveURL(`${assigned}/`);
  await expect(page.getByText("Roma · Ordini aperti")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Il menu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggiungi Pizza", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Marinara" })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Scegli la sede" })).toHaveCount(0);
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await expect(page.getByRole("spinbutton", { name: "Quantità Pizza" })).toHaveValue("1");

  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: assigned, httpOnly: true, secure: true }]);
  await page.getByRole("navigation", { name: "Inizia a ordinare" }).getByRole("link", { name: "Ordine di gruppo" }).click();
  await expect(page.getByRole("heading", { name: "Ordine di gruppo" })).toBeVisible();
  await expect(page.getByText("Sede Roma")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Sede", exact: true })).toHaveCount(0);
  const creation = page.waitForResponse(response => response.url() === `${assigned}/api/pilot/v1/pilot/groups` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Crea gruppo" }).click();
  const created = await creation;
  expect(created.ok()).toBe(true);
  const submitted: Parameters<GroupOrderingApi["create"]>[0] = created.request().postDataJSON();
  expect(submitted.storeId).toBe("roma");
  await expect(page.getByRole("heading", { name: "Raccolta aperta" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Link invito" })).toHaveValue(new RegExp(`^${assigned}/ordina/gruppo/`));
});

test("il dominio non associato mostra il messaggio e il pilota conserva la selezione sede", async ({ page }) => {
  await page.goto(`${unassigned}/`);
  await expect(page.getByRole("heading", { name: "Sito ordini non configurato" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Il menu" })).toHaveCount(0);
  await page.goto(`${client}/ordina`);
  const selector = page.getByRole("combobox", { name: "Scegli la sede" });
  await expect(selector.getByRole("option", { name: "Roma" })).toBeAttached();
  await expect(selector.getByRole("option", { name: "Napoli" })).toBeAttached();
});

test("Bella Napoli conserva il pilota fino all’assegnazione e poi apre solo la sede Napoli", async ({ page, context }) => {
  await page.goto(`${legacy}/`);
  await expect(page).toHaveURL(`${legacy}/`);
  const selector = page.getByRole("combobox", { name: "Scegli la sede" });
  await expect(selector.getByRole("option", { name: "Roma" })).toBeAttached();
  await expect(selector.getByRole("option", { name: "Napoli" })).toBeAttached();
  await selector.selectOption({ label: "Roma" });
  await expect(page.getByRole("button", { name: "Aggiungi Pizza", exact: true })).toBeVisible();

  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "superadmin", url: admin, httpOnly: true }]);
  await page.goto(`${admin}/operazioni`);
  await page.getByLabel("Negozio Attivo", { exact: true }).selectOption({ label: "Napoli" });
  await page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Profilo", exact: true }).click();
  await page.getByRole("textbox", { name: /^Sottodominio ordini/ }).fill("bella-napoli");
  await page.getByRole("button", { name: "Salva configurazione" }).click();
  const link = page.getByRole("link", { name: "bella-napoli.pizzaos.app" });
  await expect(link).toHaveAttribute("href", legacy);
  await link.click();

  await expect(page).toHaveURL(`${legacy}/`);
  await expect(page.getByText("Napoli · Ordini aperti")).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggiungi Marinara", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aggiungi Pizza", exact: true })).toHaveCount(0);
  await expect(selector).toHaveCount(0);
});
