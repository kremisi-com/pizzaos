import type { IndividualActor } from '@pizzaos/domain';
import { describe, expect, it } from 'vitest';
import { buildOrderingApp } from '../http-app';
import { registerOperationalEmailRoutes } from './index';
import { buyer, fixture, operator, root, store } from './emails.test-fixture';

describe('HTTP email operative', () => {
  async function appFor(actor: IndividualActor | null = root, proxy = true, demo = false) {
    const f = await fixture(); await f.checkout(); await f.service.invite(root, store.id, operator.email);
    const authenticate = async () => actor;
    const app = buildOrderingApp({ service: f.service, authenticate, authorizeProxy: () => proxy, isDemoRequest: () => demo });
    registerOperationalEmailRoutes(app, { emails: f.emails, authenticate }); return app;
  }
  it('espone snapshot completo no-store soltanto a operatore della sede', async () => {
    const app = await appFor(operator); try { const res = await app.inject({ method: 'GET', url: `/v1/pilot/stores/${store.id}/emails`, headers: { 'x-pizzaos-origin': 'http://127.0.0.1:3702' } }); expect(res.statusCode).toBe(200); expect(res.headers['cache-control']).toContain('no-store'); expect(res.json()).toMatchObject({ revision: expect.any(Number), messages: [{ recipient: buyer.email, status: 'pending' }] }); expect(res.body).not.toMatch(/claimToken|smtpUrl|password|clientSecret/); } finally { await app.close(); }
  });
  it.each([['buyer', true, false, 403], ['root', false, false, 403], ['root', true, true, 403]] as const)('rifiuta accesso %s proxy=%s demo=%s', async (actor, proxy, demo, status) => {
    const app = await appFor(actor === 'buyer' ? buyer : root, proxy, demo); try { expect((await app.inject({ method: 'GET', url: `/v1/pilot/stores/${store.id}/emails` })).statusCode).toBe(status); } finally { await app.close(); }
  });
  it('rifiuta ospite con 401 e sede inesistente con 404', async () => {
    const guest = await appFor(null); const operatorApp = await appFor(); try { expect((await guest.inject({ method: 'GET', url: `/v1/pilot/stores/${store.id}/emails` })).statusCode).toBe(401); expect((await operatorApp.inject({ method: 'GET', url: '/v1/pilot/stores/nonexistent/emails' })).statusCode).toBe(404); } finally { await guest.close(); await operatorApp.close(); }
  });
  it('rifiuta query extra e non espone invio/simulazione browser', async () => {
    const app = await appFor(); try {
      for (const query of ['?recipient=other@pizzaos.test', '?send=true', '?cursor=1']) expect((await app.inject({ method: 'GET', url: `/v1/pilot/stores/${store.id}/emails${query}` })).statusCode).toBe(400);
      for (const suffix of ['', '/dispatch', '/simulate']) expect((await app.inject({ method: 'POST', url: `/v1/pilot/stores/${store.id}/emails${suffix}`, headers: { origin: 'http://127.0.0.1:3702', 'x-pizzaos-origin': 'http://127.0.0.1:3702' }, payload: { to: buyer.email } })).statusCode).toBe(404);
    } finally { await app.close(); }
  });
});

