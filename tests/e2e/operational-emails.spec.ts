import { test, expect, type BrowserContext } from '@playwright/test';
import type { OperationalEmailOverview } from '@pizzaos/domain';
const clientUrl = process.env.PIZZAOS_E2E_CLIENT_URL ?? 'http://127.0.0.1:3701';
const adminUrl = process.env.PIZZAOS_E2E_ADMIN_URL ?? 'http://127.0.0.1:3702';
function localUrl(value: string): string { const parsed = new URL(value); if (parsed.hostname !== '127.0.0.1') throw new Error('Fixture email E2E deve essere locale'); return value; }
async function identify(context: BrowserContext, actor: 'alice' | 'operator', url: string) { await context.addCookies([{ name: 'pizzaos-e2e-actor', value: actor, url: localUrl(url) }]); }

test('cliente invia contanti, errore email non blocca accettazione e polling recupera retry automatico', async ({ browser }) => {
  const customerContext = await browser.newContext(); const adminContext = await browser.newContext();
  await identify(customerContext, 'alice', clientUrl); await identify(adminContext, 'operator', adminUrl);
  const client = await customerContext.newPage(); const admin = await adminContext.newPage();
  const marker = `email-e2e-failure-${Date.now()}`;
  try {
    await admin.goto(`${localUrl(adminUrl)}/operazioni`);
    const navigation = admin.getByRole('navigation', { name: 'Navigazione admin' });
    await navigation.getByRole('button', { name: 'Integrazioni', exact: true }).click();
    await expect(admin.getByRole('heading', { name: 'Email operative', exact: true })).toBeVisible();
    await client.goto(`${localUrl(clientUrl)}/ordina`); await client.getByRole('button', { name: 'Aggiungi Pizza', exact: true }).click();
    await client.getByLabel("Note per l'ordine").fill(marker); await client.getByRole('button', { name: 'Verifica disponibilità e totale', exact: true }).click();
    await client.getByLabel("Telefono per l'ordine").fill('+393331234567'); await client.getByLabel('Come paghi?').selectOption('cash');
    await client.getByRole('button', { name: 'Conferma e invia ordine', exact: true }).click();
    let storeId = ''; let emailId = ''; let orderId = '';
    await expect.poll(async () => {
      const storesResponse = await admin.request.get(`${adminUrl}/api/pilot/v1/pilot/stores`); const stores: { id: string }[] = await storesResponse.json(); storeId = stores[0]!.id;
      const response = await admin.request.get(`${adminUrl}/api/pilot/v1/pilot/stores/${encodeURIComponent(storeId)}/emails`); const overview: OperationalEmailOverview = await response.json();
      const messages = overview.messages.filter((message) => message.event === 'received' && message.status === 'retrying'); const record = messages.at(-1); if (record) { emailId = record.id; orderId = record.orderId; } return Boolean(record);
    }, { timeout: 10000, intervals: [100, 250] }).toBe(true);
    const record = admin.getByRole('article', { name: `Email ${emailId}`, exact: true }); await expect(record).toContainText('Nuovo tentativo'); await expect(record).toContainText(/temporaneamente|disponibile/i);
    await navigation.getByRole('button', { name: 'Ordini', exact: true }).click();
    await admin.getByRole('button', { name: `Apri ordine ${orderId} di Alice`, exact: true }).click();
    const order = admin.getByRole('article').filter({ hasText: marker });
    await order.getByRole('button', { name: 'Accetta ordine', exact: true }).click();
    await expect(client.getByText(/accettato/i).first()).toBeVisible();
    await navigation.getByRole('button', { name: 'Integrazioni', exact: true }).click();
    await expect(admin.getByRole('article', { name: `Email ${emailId}`, exact: true })).toContainText('Inviato', { timeout: 20000 });
    await expect(admin.getByRole('article').filter({ hasText: orderId }).filter({ hasText: 'Ordine ricevuto' })).toHaveCount(1);
    await expect(admin.getByRole('article').filter({ hasText: orderId }).filter({ hasText: 'Ordine accettato' })).toContainText('Inviato', { timeout: 20000 });
    const finalResponse = await admin.request.get(`${adminUrl}/api/pilot/v1/pilot/stores/${encodeURIComponent(storeId)}/emails`); const final: OperationalEmailOverview = await finalResponse.json(); expect(final.messages.filter((message) => message.id === emailId)).toHaveLength(1); expect(final.messages.find((message) => message.id === emailId)).toMatchObject({ status: 'sent', attempts: 2 });
  } finally { await customerContext.close(); await adminContext.close(); }
});

