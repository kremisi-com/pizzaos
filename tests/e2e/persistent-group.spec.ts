import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from "@playwright/test";
import type { GroupFulfillment, GroupPaymentResult, GroupSnapshot, IndividualCart } from "@pizzaos/domain";
import jsQR from "jsqr";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3501";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3502";

async function account(browser: Browser, identity?: "alice" | "bob" | "operator", origin = clientOrigin) {
  const context = await browser.newContext();
  if (identity) await context.addCookies([{ name: "pizzaos-e2e-actor", value: identity, url: origin }]);
  return { context, page: await context.newPage() };
}
async function snapshot(page: Page, groupId: string): Promise<GroupSnapshot> {
  const response = await page.request.get(`${clientOrigin}/api/pilot/v1/pilot/groups/${groupId}`);
  expect(response.ok()).toBeTruthy();
  return response.json() as Promise<GroupSnapshot>;
}
async function addProduct(page: Page) {
  await page.goto(`${clientOrigin}/ordina#il-menu`);
  await page.getByRole("button", { name: "Aggiungi Pizza", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aggiungi", exact: true }).click();
}
async function invitation(page: Page) {
  await expect(page.getByLabel("Link invito", { exact: true })).toHaveValue(/#invito=/);
  const link = await page.getByLabel("Link invito", { exact: true }).inputValue();
  return { link, id: new URL(link).pathname.split("/").at(-1)! };
}
async function resetActive(page: Page) {
  const context = await page.request.get(`${clientOrigin}/api/pilot/v1/pilot/groups/context?storeId=roma`);
  expect(context.ok()).toBe(true);
  const response = await page.request.post(`${clientOrigin}/api/pilot/v1/pilot/groups/context`, { headers: { origin: clientOrigin }, data: { storeId: "roma", groupId: null } });
  expect(response.ok()).toBe(true);
}
async function rename(page: Page, name: string) {
  await page.goto(`${clientOrigin}/ordina/carrello`);
  await page.getByRole("button", { name: "Modifica nome", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Salva nome", exact: true }).click();
  await expect(page.getByRole("button", { name: "Salva nome", exact: true })).toHaveCount(0);
}
async function checkout(page: Page) {
  await page.goto(`${clientOrigin}/ordina/checkout`);
  await expect(page.getByLabel(/Telefono per l[’']ordine/)).toBeVisible();
}

async function expectFixedAction(page: Page, finalContent?: Locator) {
  const dock = page.getByRole("complementary");
  const navigation = page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Carrello", exact: true }) });
  await expect(dock).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  const before = await dock.boundingBox();
  const navbar = await navigation.boundingBox();
  const viewport = page.viewportSize();
  if (!before || !navbar || !viewport) throw new Error("Azione fissa o navigazione senza dimensioni");
  expect(before.x).toBeGreaterThanOrEqual(0);
  expect(before.x + before.width).toBeLessThanOrEqual(viewport.width);
  expect(before.y).toBeGreaterThan(0);
  expect(before.y + before.height).toBeLessThanOrEqual(navbar.y);
  expect(navbar.y - before.y - before.height).toBeLessThan(60);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(async () => (await dock.boundingBox())?.y).toBeCloseTo(before.y, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (finalContent) {
    const finalBox = await finalContent.boundingBox();
    if (!finalBox) throw new Error("Contenuto finale senza dimensioni");
    expect(finalBox.y + finalBox.height).toBeLessThanOrEqual(before.y);
    // A long summary may exceed the viewport: both ends must be readable separately.
    await finalContent.evaluate(element => window.scrollBy(0, element.getBoundingClientRect().top - 16));
    const start = await finalContent.boundingBox();
    if (!start) throw new Error("Inizio contenuto finale senza dimensioni");
    expect(start.y).toBeGreaterThanOrEqual(0);
    expect(start.y).toBeLessThan(before.y);
  }
}

test("il carrello corrente diventa condiviso e il QR ammette un altro browser senza form", async ({ browser }, testInfo) => {
  test.setTimeout(150_000);
  const resources: BrowserContext[] = [];
  try {
    const alice = await account(browser, "alice");
    const marco = await account(browser);
    const operator = await account(browser, "operator", adminOrigin);
    resources.push(alice.context, marco.context, operator.context);
    await resetActive(alice.page);
    await addProduct(alice.page);
    await alice.page.getByRole("link", { name: "Ordine di gruppo", exact: true }).click();
    const { link, id } = await invitation(alice.page);
    await expect(alice.page.getByRole("heading", { level: 1, name: "Ordine di gruppo", exact: true })).toBeVisible();
    await expect(alice.page.getByText("Pensa solo a cosa vuoi mangiare, mentre i tuoi amici scelgono.", { exact: true })).toBeVisible();
    await expect(alice.page.getByLabel("Nome", { exact: true })).toHaveCount(0);
    await expect(alice.page.getByText(/raccolta/i)).toHaveCount(0);
    await expect(alice.page.getByRole("button", { name: "Mostra QR" })).toHaveCount(0);
    const qr = alice.page.getByRole("img", { name: "QR code per entrare nel gruppo", exact: true });
    const pixels = await qr.evaluate(async element => {
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(element))}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 256;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas non disponibile");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return { data: Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data), width: canvas.width, height: canvas.height };
    });
    const decoded = jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height);
    expect(decoded?.data).toBe(link);
    expect((await snapshot(alice.page, id)).participants[0].lines).toHaveLength(1);
    expect(await alice.page.evaluate(() => localStorage.getItem("pizzaos.individual-cart.v1"))).toBeNull();
    await alice.page.setViewportSize({ width: 375, height: 812 });
    await expect(qr).toBeVisible();
    expect(await alice.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const imagePath = testInfo.outputPath("shared-cart-mobile.png");
    await alice.page.screenshot({ path: imagePath, fullPage: true });
    await testInfo.attach("shared-cart-mobile", { path: imagePath, contentType: "image/png" });

    await marco.page.goto(decoded!.data);
    await expect(marco.page.getByRole("heading", { level: 1, name: "Ordine di gruppo" })).toBeVisible();
    await rename(marco.page, "Marco");
    await addProduct(marco.page);
    await expect.poll(async () => (await snapshot(alice.page, id)).participants.filter(person => person.lines.length).length).toBe(2);
    await alice.page.goto(`${clientOrigin}/ordina/carrello`);
    await alice.page.locator("details").filter({ hasText: "Marco" }).locator("summary").click();
    const marcoChoices = alice.page.getByRole("region", { name: "Marco", exact: true });
    await marcoChoices.getByLabel("Note per Pizza di Marco", { exact: true }).fill("Senza sale");
    await marcoChoices.getByLabel("Note per Pizza di Marco", { exact: true }).blur();
    await expect.poll(async () => (await snapshot(alice.page, id)).participants.find(person => person.name === "Marco")?.lines[0]?.notes).toBe("Senza sale");
    await marco.page.goto(`${clientOrigin}/ordina/carrello`);
    await marco.page.locator("details").filter({ hasText: "Alice" }).locator("summary").click();
    await expect(marco.page.getByRole("region", { name: "Alice", exact: true }).getByRole("textbox")).toHaveCount(0);
    const privateCookies = (await marco.context.cookies(clientOrigin)).filter(cookie => cookie.name.startsWith("pizzaos-group"));
    expect(privateCookies.length).toBeGreaterThan(0);
    expect(privateCookies.every(cookie => cookie.httpOnly && cookie.sameSite === "Lax")).toBe(true);
    expect(await marco.page.evaluate(() => document.cookie)).not.toContain("pizzaos-group");

    await checkout(alice.page);
    await alice.page.getByLabel(/Telefono per l[’']ordine/).fill("3331234567");
    await alice.page.getByRole("button", { name: "Verifica totale gruppo", exact: true }).click();
    await expect(alice.page.getByLabel("Riepilogo da confermare", { exact: true })).toBeVisible();
    await alice.page.getByRole("button", { name: "Conferma ordine di gruppo", exact: true }).click();
    await expect.poll(async () => (await snapshot(alice.page, id)).status).toBe("submitted");
    await operator.page.goto(`${adminOrigin}/operazioni`);
    const response = await operator.page.request.get(`${adminOrigin}/api/pilot/v1/pilot/orders?storeId=roma`);
    const orders = await response.json() as { id: string; cart: { lines: { notes: string }[] } }[];
    const matching = orders.filter(order => order.cart.lines.some(line => line.notes.startsWith("Per Alice")) && order.cart.lines.some(line => line.notes.startsWith("Per Marco")));
    expect(matching).toHaveLength(1);
    expect(matching[0].cart.lines.some(line => line.notes.includes("Senza sale"))).toBe(true);
  } finally { await Promise.all(resources.map(context => context.close())); }
});

test("il creatore verifica la consegna nel checkout separato usando il civico selezionato", async ({ browser }) => {
  const { context, page } = await account(browser, "alice");
  try {
    await resetActive(page);
    const chosenAddress = { text: "Via Verdi 10, Roma", latitude: 41.91, longitude: 12.51 };
    await page.route("**/v1/pilot/stores/roma/delivery-address-search", async route => {
      expect(route.request().postDataJSON()).toEqual({ query: "Via Verdi 10" });
      await route.fulfill({ json: [{ kind: "address", ...chosenAddress }] });
    });
    await page.goto(`${clientOrigin}/ordina/gruppo`);
    await invitation(page);
    await addProduct(page);
    await checkout(page);
    await page.getByRole("radio", { name: "Consegna a domicilio", exact: true }).check();
    const address = page.getByLabel("Indirizzo completo", { exact: true });
    const verify = page.getByRole("button", { name: "Verifica totale gruppo", exact: true });
    await expect(verify).toBeDisabled();
    await address.fill("Via Verdi 10");
    await page.getByRole("option", { name: chosenAddress.text, exact: true }).click();
    await expect(verify).toBeEnabled();
    const pending = page.waitForResponse(response => /\/v1\/pilot\/groups\/[^/]+\/quote$/.test(response.url()) && response.request().method() === "POST");
    await verify.click();
    const response = await pending;
    expect((response.request().postDataJSON() as { fulfillment: GroupFulfillment }).fulfillment.address).toEqual(chosenAddress);
    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({ quote: { deliveryCents: 200, totalCents: 1000 }, remainingCents: 1000 });
    const suspended = await page.request.post(`${clientOrigin}/api/pilot/v1/pilot/groups/context`, { headers: { origin: clientOrigin }, data: { storeId: "roma", groupId: null } });
    expect(suspended.ok()).toBe(true);
  } finally { await context.close(); }
});

test("menu, carrello e checkout del creatore mantengono le azioni fisse su mobile e desktop", async ({ browser }, testInfo) => {
  test.setTimeout(150_000);
  const { context, page } = await account(browser, "alice");
  try {
    await resetActive(page);
    await page.goto(`${clientOrigin}/ordina`);
    const cart: IndividualCart = { storeId: "roma", mode: "pickup", slotId: null, notes: "", lines:
      Array.from({ length: 8 }, (_, index) => ({ productId: "pizza", quantity: 1, optionIds: [], notes: `Ben cotta ${index + 1}` }))
    };
    await page.evaluate(draft => localStorage.setItem("pizzaos.individual-cart.v1", JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), cart: draft })), cart);
    await page.goto(`${clientOrigin}/ordina/gruppo`);
    await invitation(page);
    await page.goto(`${clientOrigin}/ordina#il-menu`);
    const menuCart = page.getByRole("link", { name: /^Carrello/ });
    await expect(menuCart).toContainText("8");
    for (const viewport of [{ width: 375, height: 667 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      for (const position of ["start", "end"] as const) {
        await page.evaluate(edge => window.scrollTo(0, edge === "start" ? 0 : document.documentElement.scrollHeight), position);
        await expect(menuCart).toBeInViewport();
        const cartBox = await menuCart.boundingBox();
        const navBox = await page.getByRole("navigation").filter({ has: page.getByRole("button", { name: "Carrello", exact: true }) }).boundingBox();
        if (!cartBox || !navBox) throw new Error("Carrello menu o navbar senza dimensioni");
        expect(cartBox.y).toBeGreaterThanOrEqual(0);
        expect(cartBox.y + cartBox.height).toBeLessThanOrEqual(navBox.y);
        expect(cartBox.x).toBeGreaterThanOrEqual(0);
        expect(cartBox.x + cartBox.width).toBeLessThanOrEqual(viewport.width);
      }
    }
    await menuCart.click();
    await expect(page).toHaveURL(`${clientOrigin}/ordina/carrello`);
    const dock = page.getByRole("complementary");
    await expect(dock.getByRole("link", { name: "Vai al checkout →", exact: true })).toBeVisible();
    await expect(dock).toContainText(/64,00\s*€/);
    for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await expectFixedAction(page, page.getByRole("region", { name: "Le mie scelte", exact: true }).getByRole("textbox").last());
      await page.screenshot({ path: testInfo.outputPath(`group-cart-${viewport.width}.png`), fullPage: true });
    }
    await dock.getByRole("link", { name: "Vai al checkout →", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Ritiro in pizzeria", exact: true })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Contanti al ritiro o alla consegna", exact: true })).toBeVisible();
    await dock.getByRole("button", { name: "Verifica totale gruppo", exact: true }).click();
    const summary = page.getByRole("region", { name: "Riepilogo da confermare", exact: true });
    await expect(summary).toBeFocused();
    await expect(dock.getByRole("button", { name: "Conferma ordine di gruppo", exact: true })).toBeDisabled();
    await expect(dock).toContainText(/telefono/i);
    await page.getByLabel("Telefono per l'ordine", { exact: true }).fill("3331234567");
    await expect(dock.getByRole("button", { name: "Conferma ordine di gruppo", exact: true })).toBeEnabled();
    for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await expectFixedAction(page, summary);
      await page.screenshot({ path: testInfo.outputPath(`group-checkout-${viewport.width}.png`), fullPage: true });
    }
  } finally { await context.close(); }
});

test("il dock dell’invitato distingue accesso e anticipo facoltativo senza conferma finale", async ({ browser }) => {
  test.setTimeout(150_000);
  const alice = await account(browser, "alice");
  const guest = await account(browser);
  const bob = await account(browser, "bob");
  try {
    await resetActive(alice.page);
    await alice.page.goto(`${clientOrigin}/ordina/gruppo`);
    const { link } = await invitation(alice.page);
    for (const person of [guest, bob]) {
      await person.page.goto(link);
      await expect(person.page.getByRole("heading", { name: "Ordine di gruppo", exact: true })).toBeVisible();
      await addProduct(person.page);
      await person.page.goto(`${clientOrigin}/ordina/carrello`);
      const dock = person.page.getByRole("complementary");
      await expect(dock).toContainText(/8,00\s*€/);
      if (person === guest) await expect(dock.getByRole("link", { name: "Accedi per pagare la tua quota", exact: true })).toBeVisible();
      else await expect(dock.getByRole("button", { name: "Paga la mia quota", exact: true })).toBeVisible();
      await expect(person.page.getByRole("link", { name: "Vai al checkout →", exact: true })).toHaveCount(0);
      await expect(person.page.getByRole("button", { name: "Conferma ordine di gruppo", exact: true })).toHaveCount(0);
      for (const viewport of [{ width: 375, height: 667 }, { width: 1280, height: 800 }]) {
        await person.page.setViewportSize(viewport);
        await expectFixedAction(person.page);
      }
    }
  } finally { await Promise.all([alice.context.close(), guest.context.close(), bob.context.close()]); }
});

test("una quota pagata arriva alla pizzeria e il suo rimborso richiede un nuovo ingresso", async ({ browser }) => {
  const alice = await account(browser, "alice");
  const bob = await account(browser, "bob");
  const operator = await account(browser, "operator", adminOrigin);
  try {
    await resetActive(alice.page);
    await alice.page.goto(`${clientOrigin}/ordina/gruppo`);
    const { link, id } = await invitation(alice.page);
    await bob.page.goto(link);
    await expect(bob.page.getByRole("heading", { level: 1, name: "Ordine di gruppo" })).toBeVisible();
    await addProduct(bob.page);
    const before = await snapshot(bob.page, id);
    const paidResponse = await bob.page.request.post(`${clientOrigin}/api/pilot/v1/pilot/groups/${id}/pay-share`, {
      headers: { origin: clientOrigin }, data: { revision: before.revision, idempotencyKey: `e2e-quota-${id}` }
    });
    expect(paidResponse.ok()).toBe(true);
    const paid = await paidResponse.json() as GroupPaymentResult;
    expect(paid.payment.status).toBe("paid");
    await operator.page.goto(`${adminOrigin}/operazioni`);
    await operator.page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("link", { name: "Ordini", exact: true }).click();
    await expect(operator.page.getByText("Ordine di gruppo ancora in corso", { exact: true }).first()).toBeVisible();

    const forbidden = await alice.page.request.post(`${clientOrigin}/api/pilot/v1/pilot/groups/${id}/refund-share`, {
      headers: { origin: clientOrigin }, data: { paymentId: paid.payment.id, idempotencyKey: `forbidden-${id}` }
    });
    expect(forbidden.status()).toBe(403);
    await bob.page.goto(`${clientOrigin}/ordina/carrello`);
    await expect(bob.page.getByRole("button", { name: "Aumenta quantità Pizza di Bob", exact: true })).toHaveCount(0);
    await bob.page.getByRole("button", { name: "Rimborsa la mia quota", exact: true }).click();
    await expect.poll(async () => (await snapshot(bob.page, id)).payments?.find(payment => payment.id === paid.payment.id)?.status).toBe("refunded");
    const after = await snapshot(bob.page, id);
    expect(after.participantId).toBeNull();
    expect(after.participants.find(person => person.id === before.participantId)).toBeUndefined();
    expect(after.status).toBe("open");
    await bob.page.goto(link);
    await expect(bob.page.getByRole("heading", { name: "Ordine di gruppo", exact: true })).toBeVisible();
    const rejoined = await snapshot(bob.page, id);
    expect(rejoined.participantId).not.toBe(before.participantId);
    expect(rejoined.participants.find(person => person.id === rejoined.participantId)?.lines).toEqual([]);
  } finally { await Promise.all([alice.context.close(), bob.context.close(), operator.context.close()]); }
});
