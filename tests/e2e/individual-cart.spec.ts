import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type { IndividualCart, IndividualCheckoutResult, IndividualStore } from "@pizzaos/domain";

// Uses the isolated individual ordering harness and its public Roma/Pizza fixture.
const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3741";

async function expectMobileCheckoutAboveNavigation(page: Page) {
  const checkout = page.getByRole("link", { name: /Vai al checkout/ });
  const navigation = page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Carrello", exact: true }) });
  await expect(checkout).toBeVisible();
  const checkoutBox = await checkout.boundingBox();
  const navigationBox = await navigation.boundingBox();
  expect(checkoutBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  if (!checkoutBox || !navigationBox) throw new Error("CTA o navigazione prive di dimensioni visibili");
  expect(checkoutBox.y).toBeGreaterThanOrEqual(0);
  expect(checkoutBox.y + checkoutBox.height).toBeLessThanOrEqual(navigationBox.y);
  expect(checkoutBox.x).toBeGreaterThanOrEqual(0);
  expect(checkoutBox.x + checkoutBox.width).toBeLessThanOrEqual(390);
  // A filtered ancestor must not anchor the fixed dock to the summary section.
  expect(navigationBox.y - (checkoutBox.y + checkoutBox.height)).toBeLessThan(60);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await checkout.click({ trial: true });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

test("il checkout resta ancorato sopra la navigazione e il riepilogo è leggibile a fondo pagina", async ({ page }) => {
  await page.goto(`${clientOrigin}/ordina`);
  const cart: IndividualCart = { storeId: "roma", mode: "pickup", slotId: null, notes: "", lines:
    Array.from({ length: 8 }, () => ({ productId: "pizza", quantity: 1, optionIds: [], notes: "Ben cotta" }))
  };
  await page.evaluate(draft => {
    localStorage.setItem("pizzaos.individual-cart.v1", JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), cart: draft }));
  }, cart);
  await page.goto(`${clientOrigin}/ordina/carrello`);
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const checkout = page.getByRole("link", { name: /Vai al checkout/ });
    await expect(checkout).toBeVisible();
    const dock = checkout.locator("..");
    const navigation = page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Carrello", exact: true }) });
    await expect.poll(async () => {
      const dockBox = await dock.boundingBox();
      const navBox = await navigation.boundingBox();
      return dockBox && navBox ? navBox.y - dockBox.y - dockBox.height : -1;
    }).toBeGreaterThanOrEqual(0);
    const before = await dock.boundingBox();
    expect(before).not.toBeNull();
    if (!before) throw new Error("Checkout privo di dimensioni");
    expect(before.y).toBeGreaterThan(0);
    expect(before.x).toBeGreaterThanOrEqual(0);
    expect(before.x + before.width).toBeLessThanOrEqual(viewport.width);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(async () => (await dock.boundingBox())?.y).toBeCloseTo(before.y, 0);
    const clearBox = await page.getByRole("button", { name: "Svuota carrello", exact: true }).boundingBox();
    expect(clearBox).not.toBeNull();
    if (!clearBox) throw new Error("Svuota carrello privo di dimensioni");
    expect(clearBox.y + clearBox.height).toBeLessThanOrEqual(before.y);
    await page.screenshot({ path: `.codex/evidence/client-cart-${viewport.width}x${viewport.height}.png` });
  }
});

test("menu, carrello e checkout condividono il draft attraverso navigazione e reload", async ({ page }) => {
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByLabel("Scegli la sede").selectOption({ label: "Roma" });
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
  const cartNavigation = page.getByRole("link", { name: /^Carrello/ });
  await expect(cartNavigation).toHaveAttribute("href", "/ordina/carrello");
  await cartNavigation.click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await expect(page.getByRole("button", { name: "Aggiungi Pizza", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Aumenta quantità Pizza", exact: true }).click();
  const quantity = () => page.evaluate(() => {
    const raw = localStorage.getItem("pizzaos.individual-cart.v1");
    const draft = raw ? JSON.parse(raw) as { cart: { lines: { quantity: number }[] } } : null;
    return draft?.cart.lines.reduce((total, line) => total + line.quantity, 0) ?? 0;
  });
  await expect.poll(quantity).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expectMobileCheckoutAboveNavigation(page);
  await mkdir(".codex/evidence", { recursive: true });
  await page.screenshot({ path: ".codex/evidence/client-cart-mobile.png" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Diminuisci quantità Pizza", exact: true })).toBeVisible();
  await expect.poll(quantity).toBe(2);
  await expectMobileCheckoutAboveNavigation(page);
  await page.getByRole("link", { name: /Vai al checkout/ }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/checkout`);
  await expect(page.getByRole("region", { name: "Consegna e pagamento", exact: true })).toBeVisible();
  await expect(page.getByLabel("Modalità", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Consegna e pagamento", exact: true })).toBeVisible();
  await expect.poll(quantity).toBe(2);
  await page.getByRole("link", { name: /Menu$/ }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina#il-menu`);
  await page.getByRole("link", { name: /^Carrello/ }).click();
  await page.getByRole("button", { name: "Svuota carrello", exact: true }).click();
  await expect.poll(quantity).toBe(0);
  await expect(page.getByRole("link", { name: /Sfoglia il menu/ })).toHaveAttribute("href", "/ordina#il-menu");
  await expect(page.getByRole("link", { name: /Vai al checkout/ })).toHaveCount(0);
});

test("i percorsi legacy aprono carrello e checkout operativi", async ({ page }) => {
  await page.goto(`${clientOrigin}/cart`);
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await expect(page.getByRole("link", { name: /Sfoglia il menu/ })).toBeVisible();
  await page.goto(`${clientOrigin}/checkout`);
  await expect(page).toHaveURL(`${clientOrigin}/ordina/checkout`);
  await expect(page.getByRole("region", { name: "Consegna e pagamento", exact: true })).toBeVisible();
});

test("Ordini resta evidenziato nella pagina dedicata, al reload e nella cronologia", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  const orders = page.getByRole("button", { name: "Ordini", exact: true });
  const order = page.getByRole("button", { name: "Ordina", exact: true });
  await page.goto(`${clientOrigin}/ordina/ordini`);
  const activeColor = await order.evaluate(button => getComputedStyle(button).backgroundColor);
  await expect(orders).toHaveCSS("color", activeColor);
  await page.reload();
  await expect(orders).toHaveCSS("color", activeColor);
  await order.click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina`);
  await expect(orders).not.toHaveCSS("color", activeColor);
  await orders.click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini`);
  await expect(orders).toHaveCSS("color", activeColor);
  await page.goBack();
  await expect(page).toHaveURL(`${clientOrigin}/ordina`);
  await expect(orders).not.toHaveCSS("color", activeColor);
  await page.goForward();
  await expect(orders).toHaveCSS("color", activeColor);
  await page.getByRole("button", { name: "Carrello", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await orders.click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/ordini`);
  await expect(orders).toHaveCSS("color", activeColor);
});

test("il checkout del carrello invia un ordine contanti tramite IndividualApi", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByLabel("Scegli la sede").selectOption({ label: "Roma" });
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
  await page.getByRole("button", { name: "Carrello", exact: true }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
  await page.getByRole("link", { name: /Vai al checkout/ }).click();
  await expect(page).toHaveURL(`${clientOrigin}/ordina/checkout`);
  const history = page.getByRole("heading", { name: "Ordini passati", exact: true });
  const refreshOrders = page.getByRole("button", { name: "Aggiorna ordini", exact: true });
  await expect(history).toHaveCount(0);
  await expect(refreshOrders).toHaveCount(0);
  await page.getByRole("radio", { name: "Ritiro in pizzeria", exact: true }).check();
  await page.getByLabel(/Telefono per l.ordine/).fill("+39 3331234567");
  await page.getByRole("radio", { name: "Contanti al ritiro o alla consegna", exact: true }).check();
  await page.getByRole("button", { name: "Verifica disponibilità e totale" }).click();
  await expect(page.getByRole("heading", { name: "Riepilogo da confermare" })).toBeVisible();
  const response = page.waitForResponse(result => result.url().endsWith("/v1/pilot/checkouts") && result.request().method() === "POST");
  await page.getByRole("button", { name: "Conferma e invia ordine" }).click();
  const checkout = await response;
  expect(checkout.ok()).toBe(true);
  const { order } = await checkout.json() as IndividualCheckoutResult;
  expect(order.method).toBe("cash");
  expect(order.cart.lines).toEqual([expect.objectContaining({ productId: "pizza", quantity: 1 })]);
  await expect(page.getByRole("heading", { name: "Ordine inviato", exact: true })).toBeVisible();
  await expect(history).toHaveCount(0);
  await expect(refreshOrders).toHaveCount(0);
  await page.getByRole("link", { name: "Segui l'ordine", exact: true }).click();
  await expect(history).toBeVisible();
  await expect(refreshOrders).toBeVisible();
  await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "In attesa del ristorante", exact: true })).toBeVisible();
});

test("recupera un extra rimosso dal carrello soltanto dopo conferma e conserva il risultato al reload", async ({ page }) => {
  // Current public catalog: every former option has disappeared and the price changed.
  await page.route(/\/v1\/pilot\/stores(?:\/roma)?$/, async route => {
    const response = await route.fetch();
    const body = await response.json() as IndividualStore | IndividualStore[];
    const current = (store: IndividualStore): IndividualStore => ({ ...store, products: store.products.map(product =>
      product.id === "pizza" ? { ...product, priceCents: 900, options: [] } : product) });
    await route.fulfill({ response, json: Array.isArray(body) ? body.map(current) : current(body) });
  });
  await page.goto(`${clientOrigin}/ordina`);
  const original: IndividualCart = { storeId: "roma", mode: "pickup", slotId: null, notes: "", lines: [
    { productId: "pizza", quantity: 2, optionIds: ["extra-rimosso"], notes: "Ben cotta" }
  ] };
  await page.evaluate(cart => {
    localStorage.setItem("pizzaos.individual-cart.v1", JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), cart }));
  }, original);
  const persisted = () => page.evaluate(() => {
    const raw = localStorage.getItem("pizzaos.individual-cart.v1");
    return raw ? (JSON.parse(raw) as { cart: IndividualCart }).cart : null;
  });
  await page.goto(`${clientOrigin}/ordina/carrello`);
  await page.getByRole("button", { name: "Modifica Pizza", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Pizza", exact: true });
  await expect(dialog.getByText(/rimo|eliminat|esaurit|non.*disponibil/i)).toBeVisible();
  await expect(dialog.getByText(/18,00\s*€/)).toBeVisible();
  await expect.poll(persisted).toEqual(original);
  await dialog.getByRole("button", { name: "Chiudi personalizzazione", exact: true }).click();
  await expect.poll(persisted).toEqual(original);
  await page.reload();
  await expect.poll(persisted).toEqual(original);
  await page.getByRole("button", { name: "Modifica Pizza", exact: true }).click();
  await dialog.getByRole("button", { name: "Conferma modifica", exact: true }).click();
  const corrected = { ...original, lines: [{ ...original.lines[0], optionIds: [] }] };
  await expect.poll(persisted).toMatchObject(corrected);
  await page.reload();
  await expect.poll(persisted).toMatchObject(corrected);
  await expect(page.getByLabel("Note per Pizza", { exact: true })).toHaveValue("Ben cotta");
  await expect(page.getByText(/18,00\s*€/).first()).toBeVisible();
});

test("il fondo del menu distanzia il carrello e la navbar apre lo storico dedicato", async ({ page, context }) => {
  await context.addCookies([{ name: "pizzaos-e2e-actor", value: "alice", url: clientOrigin, httpOnly: true, sameSite: "Lax" }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${clientOrigin}/ordina`);
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
  const history = page.getByRole("heading", { name: "Ordini passati", exact: true });
  await expect(history).toBeHidden();
  await expect(page.getByRole("button", { name: "Aggiorna ordini", exact: true })).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const menuBox = await page.locator("#il-menu").boundingBox();
  const cartBox = await page.getByRole("link", { name: /^Carrello/ }).boundingBox();
  if (!menuBox || !cartBox) throw new Error("Menu o pulsante Carrello privo di dimensioni");
  expect(cartBox.y - menuBox.y - menuBox.height).toBeGreaterThanOrEqual(24);
  await mkdir(".codex/evidence", { recursive: true });
  await page.screenshot({ path: ".codex/evidence/menu-cart-spacing.png" });
  await page.getByRole("button", { name: "Ordini", exact: true }).click();
  await expect(history).toBeVisible();
  await page.reload();
  await expect(history).toBeVisible();
  await page.getByRole("button", { name: "Ordina", exact: true }).click();
  await expect(history).toBeHidden();
  await page.goBack();
  await expect(history).toBeVisible();
  await page.goForward();
  await expect(history).toBeHidden();
  await page.getByRole("button", { name: "Carrello", exact: true }).click();
  await page.getByRole("button", { name: "Ordini", exact: true }).click();
  await expect(history).toBeVisible();
});
