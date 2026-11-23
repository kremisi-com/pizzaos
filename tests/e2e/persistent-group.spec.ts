import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import type { GroupFulfillment } from "@pizzaos/domain";

const clientOrigin = process.env.PIZZAOS_E2E_CLIENT_URL ?? "http://127.0.0.1:3501";
const adminOrigin = process.env.PIZZAOS_E2E_ADMIN_URL ?? "http://127.0.0.1:3502";
interface PublicGroup { id: string; storeId: string; revision: number; status: string; participantId: string | null; inviteToken?: string; participants: { id: string; name: string; lines: { productId: string; quantity: number; optionIds: string[]; notes: string }[] }[]; }

async function account(browser: Browser, identity?: "alice" | "operator", origin = clientOrigin) {
  const context = await browser.newContext();
  if (identity) await context.addCookies([{ name: "pizzaos-e2e-actor", value: identity, url: origin }]);
  return { context, page: await context.newPage() };
}
function localDeadline(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
async function groupSnapshot(page: Page, groupId: string): Promise<PublicGroup> {
  const response = await page.request.get(`${clientOrigin}/api/pilot/v1/pilot/groups/${groupId}`);
  expect(response.ok()).toBeTruthy(); return response.json() as Promise<PublicGroup>;
}
async function join(page: Page, link: string, name: string) {
  await page.goto(link); await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Entra nel gruppo", exact: true }).click();
  await expect(page.getByLabel("Le mie scelte", { exact: true })).toBeVisible();
}
async function addFirst(page: Page) {
  await page.getByRole("button", { name: /^Aggiungi/ }).first().click();
  await expect(page.getByLabel("Le mie scelte", { exact: true }).getByRole("spinbutton").first()).toBeVisible();
}

test("Alice, Marco and Giulia share durable collection; only host submits one attributed cash order", async ({ browser }, testInfo) => {
  const resources: BrowserContext[] = [];
  try {
    const alice = await account(browser, "alice"); const marco = await account(browser); const giulia = await account(browser); const operator = await account(browser, "operator", adminOrigin);
    resources.push(alice.context, marco.context, giulia.context, operator.context);
    await alice.page.goto(`${clientOrigin}/ordina`);
    await alice.page.getByRole("link", { name: "Ordine di gruppo", exact: true }).click();
    await alice.page.getByLabel("Nome", { exact: true }).fill("Alice");
    await alice.page.getByLabel("Scadenza raccolta", { exact: true }).fill(localDeadline(new Date(Date.now() + 60 * 60 * 1000)));
    await alice.page.getByRole("button", { name: "Crea gruppo", exact: true }).click();
    const invitation = alice.page.getByLabel("Link invito", { exact: true });
    await expect(invitation).toHaveValue(/#invito=/);
    const link = await invitation.inputValue(); const groupId = new URL(link).pathname.split("/").at(-1)!;
    expect(new URL(link).search).toBe("");
    await addFirst(alice.page);
    await join(marco.page, link, "Marco"); await addFirst(marco.page);
    await join(giulia.page, link, "Giulia"); await addFirst(giulia.page);
    await expect(alice.page.getByRole("article", { name: "Marco", exact: true })).toBeVisible();
    await expect(alice.page.getByRole("article", { name: "Giulia", exact: true })).toBeVisible();
    await expect.poll(async () => (await groupSnapshot(alice.page, groupId)).participants.filter((person) => person.lines.length > 0).length).toBe(3);
    await marco.page.reload(); await expect(marco.page.getByLabel("Le mie scelte", { exact: true }).getByRole("spinbutton").first()).toHaveValue("1");
    await giulia.page.reload();
    await expect(giulia.page.getByRole("article", { name: "Marco", exact: true }).getByRole("button")).toHaveCount(0);

    const current = await groupSnapshot(giulia.page, groupId);
    const marcoId = current.participants.find((person) => person.name === "Marco")!.id;
    const attack = await giulia.page.evaluate(async ({ id, participantId, revision }) => {
      const response = await fetch(`/api/pilot/v1/pilot/groups/${id}/lines`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ participantId, revision, lines: [] }) });
      return { status: response.status, body: await response.json() as { code: string } };
    }, { id: groupId, participantId: marcoId, revision: current.revision });
    expect(attack.status).toBe(403); expect(attack.body.code).toBe("forbidden");
    const cookie = (await giulia.context.cookies(clientOrigin)).find((value) => value.name === `pizzaos-group-${groupId}`);
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax" });
    expect(await giulia.page.evaluate(() => document.cookie)).not.toContain(`pizzaos-group-${groupId}`);

    await alice.page.reload(); await expect(alice.page.getByLabel("Link invito", { exact: true })).toHaveValue(link);
    await alice.page.getByRole("button", { name: "Rimuovi partecipante Giulia", exact: true }).click();
    await expect(alice.page.getByRole("article", { name: "Giulia", exact: true })).toHaveCount(0);
    await alice.page.getByRole("button", { name: "Chiudi raccolta", exact: true }).click();
    await marco.page.reload();
    const save = marco.page.getByRole("button", { name: "Salva le mie scelte", exact: true });
    if (await save.count()) await expect(save).toBeDisabled();
    await alice.page.getByLabel("Telefono per l'ordine", { exact: true }).fill("3331234567");
    await alice.page.getByLabel("Come paghi?", { exact: true }).selectOption("cash");
    await alice.page.getByRole("button", { name: "Verifica totale gruppo", exact: true }).click();
    await alice.page.getByRole("button", { name: "Conferma ordine di gruppo", exact: true }).click();
    await expect.poll(async () => (await groupSnapshot(alice.page, groupId)).status).toBe("submitted");
    await alice.page.reload();
    expect((await groupSnapshot(alice.page, groupId)).status).toBe("submitted");

    await operator.page.goto(`${adminOrigin}/operazioni`);
    const ordersResponse = await operator.page.request.get(`${adminOrigin}/api/pilot/v1/pilot/orders?storeId=${encodeURIComponent(current.storeId)}`);
    expect(ordersResponse.ok()).toBeTruthy();
    const orders = await ordersResponse.json() as { id: string; cart: { lines: { notes: string }[] }; method: string }[];
    const groupOrders = orders.filter((order) => order.cart.lines.some((row) => row.notes.startsWith("Per Alice")) && order.cart.lines.some((row) => row.notes.startsWith("Per Marco")));
    expect(groupOrders).toHaveLength(1); expect(groupOrders[0].method).toBe("cash");
    expect(groupOrders[0].cart.lines.some((row) => row.notes.startsWith("Per Giulia"))).toBe(false);
    await operator.page.getByRole("navigation", { name: "Navigazione admin" }).getByRole("button", { name: "Ordini", exact: true }).click();
    await operator.page.getByRole("button", { name: `Apri ordine ${groupOrders[0].id} di Alice`, exact: true }).click();
    await expect(operator.page.getByText(/Per Alice/).first()).toBeVisible();
    await expect(operator.page.getByText(/Per Marco/).first()).toBeVisible();
    for (const [name, page] of [["group-host-submitted", alice.page], ["group-admin-order", operator.page]] as const) {
      const path = testInfo.outputPath(`${name}.png`);
      await page.screenshot({ path, fullPage: true });
      await testInfo.attach(name, { path, contentType: "image/png" });
    }
  } finally { await Promise.all(resources.map((context) => context.close())); }
});

test("the group organizer verifies delivery using the selected address", async ({ browser }) => {
  const { context, page } = await account(browser, "alice");
  try {
    const chosenAddress = { text: "Via Verdi 10, Roma", latitude: 41.91, longitude: 12.51 };
    await page.route("**/v1/pilot/stores/roma/delivery-address-search", async route => {
      expect(route.request().method()).toBe("POST");
      expect(route.request().postDataJSON()).toEqual({ query: "Via Verdi 10" });
      await route.fulfill({ json: [{ kind: "address", ...chosenAddress }] });
    });
    await page.goto(`${clientOrigin}/ordina/gruppo`);
    await page.getByLabel("Nome", { exact: true }).fill("Alice");
    await page.getByLabel("Scadenza raccolta", { exact: true }).fill(localDeadline(new Date(Date.now() + 60 * 60 * 1000)));
    await page.getByRole("button", { name: "Crea gruppo", exact: true }).click();
    await addFirst(page);
    await page.getByRole("button", { name: "Chiudi raccolta", exact: true }).click();
    await page.getByLabel("Modalità", { exact: true }).selectOption("delivery");
    const address = page.getByLabel("Indirizzo completo", { exact: true });
    const verify = page.getByRole("button", { name: "Verifica totale gruppo", exact: true });
    await expect(address).toHaveCount(1);
    await expect(page.getByLabel(/^(Latitudine|Longitudine)$/i)).toHaveCount(0);
    await expect(verify).toBeDisabled();

    await address.fill("Via Verdi 10");
    const option = page.getByRole("option", { name: chosenAddress.text, exact: true });
    await expect(option).toBeVisible();
    await expect(verify).toBeDisabled();
    await option.click();
    await expect(address).toHaveValue(chosenAddress.text);
    await expect(verify).toBeEnabled();
    const pendingQuote = page.waitForResponse(response => /\/v1\/pilot\/groups\/[^/]+\/quote$/.test(response.url()) && response.request().method() === "POST");
    await verify.click();
    const quote = await pendingQuote;
    const { fulfillment } = quote.request().postDataJSON() as { fulfillment: GroupFulfillment };
    expect(fulfillment.mode).toBe("delivery");
    expect(fulfillment.address).toEqual(chosenAddress);
    expect(quote.ok()).toBe(true);
    expect(await quote.json()).toMatchObject({ quote: { deliveryCents: 200, totalCents: 1000 } });
    await expect(page.getByRole("heading", { name: "Riepilogo da confermare" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("deadline closes collection without a browser timer and hostile guest writes fail", async ({ browser }) => {
  const alice = await account(browser, "alice"); const guest = await account(browser);
  try {
    const storesResponse = await alice.page.request.get(`${clientOrigin}/api/pilot/v1/pilot/stores`);
    expect(storesResponse.ok()).toBeTruthy(); const stores = await storesResponse.json() as { id: string }[];
    const response = await alice.page.request.post(`${clientOrigin}/api/pilot/v1/pilot/groups`, { headers: { origin: clientOrigin }, data: { storeId: stores[0].id, name: "Alice scadenza", deadline: new Date(Date.now() + 8000).toISOString() } });
    expect(response.ok()).toBeTruthy(); const created = await response.json() as PublicGroup;
    await join(guest.page, `${clientOrigin}/ordina/gruppo/${created.id}#invito=${created.inviteToken}`, "Ospite scadenza");
    await expect.poll(async () => (await groupSnapshot(guest.page, created.id)).status, { timeout: 20000 }).toBe("closed");
    await guest.page.reload();
    const group = await groupSnapshot(guest.page, created.id);
    const write = await guest.page.evaluate(async ({ id, participantId, revision }) => {
      const response = await fetch(`/api/pilot/v1/pilot/groups/${id}/lines`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ participantId, revision, lines: [] }) });
      return { status: response.status, code: (await response.json() as { code: string }).code };
    }, { id: group.id, participantId: group.participantId, revision: group.revision });
    expect(write).toEqual({ status: 409, code: "group_closed" });
    const checkout = guest.page.getByRole("button", { name: "Conferma ordine di gruppo", exact: true }); expect(await checkout.count()).toBe(0);
  } finally { await Promise.all([alice.context.close(), guest.context.close()]); }
});
