import { createGroupOrderingService } from '../group/group-service';
import { createPromotionsOrderingServices } from '../promotions';
import { describe, expect, it } from 'vitest';
import { createOperationalEmailServices, readOperationalEmailConfiguration, type OperationalEmailMessage } from './index';
import { buyer, cart, fixture, MemoryRepository, operator, root, store } from './emails.test-fixture';

function deferred<T>() { let resolve!: (value: T | PromiseLike<T>) => void; let reject!: (reason?: unknown) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
async function progress(f: Awaited<ReturnType<typeof fixture>>, id: string, actions: ('accept' | 'prepare' | 'ready' | 'dispatch')[]) { for (const action of actions) await f.service.action(root, id, { action }); }

describe('email operative: eventi canonici e accesso', () => {
  it('attivare email su ordini già esistenti non produce backfill da letture o tick', async () => {
    const f = await fixture(); const legacy = createPromotionsOrderingServices(f.options);
    const draft = cart(); const quote = await legacy.service.quote(draft, buyer);
    const { order } = await legacy.service.checkout(buyer, { cart: draft, fingerprint: quote.fingerprint, phone: '+393331234567', method: 'cash', idempotencyKey: 'legacy-before-emails' });
    const activated = createOperationalEmailServices(f.options); await activated.service.orders(root, store.id); await activated.service.tick();
    expect((await activated.emails.list(root, store.id)).messages).toEqual([]);
    await activated.service.action(root, order.id, { action: 'accept' }); expect((await activated.emails.list(root, store.id)).messages.map((message) => message.event)).toEqual(['accepted']);
  });
  it('legge outbox vuota dopo una configurazione canonica senza eventi retroattivi', async () => {
    const f = await fixture(); expect(await f.emails.list(root, store.id)).toMatchObject({ messages: [] });
  });
  it('accoda ricevuta solo alla submission e deduplica checkout/action/restart', async () => {
    const f = await fixture(); const c = cart(); const q = await f.service.quote(c, buyer);
    const input = { cart: c, fingerprint: q.fingerprint, phone: '+393331234567', method: 'cash' as const, idempotencyKey: 'same-checkout' };
    const { order } = await f.service.checkout(buyer, input); await f.service.checkout(buyer, input);
    await f.service.action(root, order.id, { action: 'accept' }); await f.service.action(root, order.id, { action: 'accept' }).catch(() => undefined);
    const restarted = createOperationalEmailServices(f.options); await restarted.service.tick();
    expect((await restarted.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'accepted']);
    expect(f.messages).toHaveLength(0);
  });
  it('non accoda per quote o pagamento pending ma accoda alla conferma carta', async () => {
    const f = await fixture(); const { order } = await f.checkout('card');
    expect(order.status).toBe('pending_payment'); expect((await f.emails.list(root, store.id)).messages).toEqual([]);
    expect(order.providerIntentId).toBeTruthy(); f.payments.paid(order.providerIntentId!);
    await f.service.reconcile(buyer, order.id); await f.service.reconcile(buyer, order.id);
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received']);
  });
  it('pronto invia soltanto pickup e in consegna soltanto delivery', async () => {
    const f = await fixture(); const pickup = await f.checkout(); const delivery = await f.checkout('cash', 'delivery');
    await progress(f, pickup.order.id, ['accept', 'prepare', 'ready']);
    await progress(f, delivery.order.id, ['accept', 'prepare', 'ready', 'dispatch']);
    const overview = await f.emails.list(root, store.id);
    expect(overview.messages.filter((m) => m.orderId === pickup.order.id).map((m) => m.event)).toEqual(['received', 'accepted', 'ready']);
    expect(overview.messages.filter((m) => m.orderId === delivery.order.id).map((m) => m.event)).toEqual(['received', 'accepted', 'out_for_delivery']);
  });
  it('autorizza solo superadmin e operatore della sede, senza campi privati', async () => {
    const f = await fixture(); await f.checkout(); await f.service.invite(root, store.id, operator.email);
    const overview = await f.emails.list(operator, store.id); expect(overview.messages).toHaveLength(1);
    for (const actor of [null, buyer, { id: 'other', email: 'other@pizzaos.test', name: 'Altra sede' }]) await expect(f.emails.list(actor, store.id)).rejects.toMatchObject({ code: actor === null ? 'unauthorized' : 'forbidden' });
    const message = overview.messages[0]!;
    expect(Object.keys(message).sort()).toEqual(['attempts', 'createdAt', 'event', 'id', 'lastError', 'nextAttemptAt', 'orderId', 'recipient', 'sentAt', 'status', 'updatedAt'].sort());
    expect(message.recipient).toBe(buyer.email);
  });
  it('rollback del commit non lascia ordine o email, il retry committa entrambi', async () => {
    const repository = new MemoryRepository(); const f = await fixture({}, repository); const draft = cart(); const quote = await f.service.quote(draft, buyer); repository.failNextCommit = true;
    await expect(f.service.checkout(buyer, { cart: draft, fingerprint: quote.fingerprint, phone: '+393331234567', method: 'cash', idempotencyKey: 'atomic' })).rejects.toThrow('Commit interrotto');
    expect(await f.service.orders(root, store.id)).toEqual([]); expect((await f.emails.list(root, store.id)).messages).toEqual([]);
    await f.checkout('cash', 'pickup', 'atomic'); expect(await f.service.orders(root, store.id)).toHaveLength(1); expect((await f.emails.list(root, store.id)).messages).toHaveLength(1);
  });
  it('snapshot italiano resta immutabile dopo modifica catalogo e note ordine', async () => {
    const f = await fixture(); const { order } = await f.checkout('cash', 'delivery');
    await f.service.notes(buyer, order.id, 'Nota modificata'); const changed = structuredClone(store); changed.products[0]!.name = 'Nome nuovo'; changed.products[0]!.priceCents = 8800; await f.service.saveStore(root, changed);
    await f.emails.dispatch(); expect(f.messages).toHaveLength(1); const message = f.messages[0]!;
    expect(message.to).toBe(buyer.email); expect(message.text).toContain('Pizza Test'); expect(message.text).toContain('Ben cotta'); expect(message.text).toContain('Nota test'); expect(message.text).not.toContain('Nome nuovo'); expect(message.text).not.toContain('Nota modificata'); expect(message.text).toContain(order.id); expect(message.subject).toMatch(/ricevuto/i); expect(message.text).toMatch(/consegna/i); expect(message.text).toMatch(/12[,.]50/);
  });
  it('evento e slot usano italiano e fuso sede congelato, con fallback Europe/Rome', async () => {
    for (const timeZone of [undefined, 'Europe/Rome']) {
      const f = await fixture(); const original = { ...structuredClone(store), timeZone }; await f.service.saveStore(root, original); await f.checkout();
      await f.service.saveStore(root, { ...original, timeZone: 'Pacific/Honolulu' }); await f.emails.dispatch();
      const text = f.messages[0]!.text;
      expect(text).toMatch(/19[:.]00/); expect(text).toMatch(/20[:.]00/);
      expect(text).not.toMatch(/2026-11-05T(?:18|19):00/);
    }
  });
});

describe('email operative: worker, ordine e lease', () => {
  it('SMTP fuori lock: ordine può essere accettato mentre send è sospeso; due dispatcher non duplicano lease', async () => {
    const entered = deferred<void>(); const release = deferred<void>(); let calls = 0;
    const f = await fixture({ sender: { async send() { calls++; entered.resolve(); await release.promise; } } }); const { order } = await f.checkout();
    const running = f.emails.dispatch(); await entered.promise;
    expect((await f.emails.list(root, store.id)).messages[0]).toMatchObject({ status: 'sending', attempts: 1 });
    await f.service.action(root, order.id, { action: 'accept' }); await f.emails.dispatch(); expect(calls).toBe(1);
    release.resolve(); await running; expect((await f.service.orders(buyer))[0]).toMatchObject({ status: 'accepted', payment: 'cash_due' });
  });
  it('lease scaduto viene ripreso con Message-ID uguale e ACK vecchio non sovrascrive claim nuovo', async () => {
    const entered = deferred<void>(); const old = deferred<void>(); const sent: OperationalEmailMessage[] = [];
    const f = await fixture({ sender: { async send(message) { sent.push(message); entered.resolve(); await old.promise; } } }); await f.checkout(); const first = f.emails.dispatch(); await entered.promise;
    f.advance(60001); const secondEntered = deferred<void>(); const secondAck = deferred<void>();
    const restarted = createOperationalEmailServices({ ...f.options, email: { ...f.options.email, sender: { async send(message) { sent.push(message); secondEntered.resolve(); await secondAck.promise; } } } });
    const second = restarted.emails.dispatch(); await secondEntered.promise; old.resolve(); await first;
    expect((await restarted.emails.list(root, store.id)).messages[0]).toMatchObject({ status: 'sending', attempts: 2 });
    secondAck.resolve(); await second; expect(sent).toHaveLength(2); expect(sent[1]!.messageId).toBe(sent[0]!.messageId); expect((await restarted.emails.list(root, store.id)).messages[0]!.status).toBe('sent');
  });
  it('retry deterministico raddoppia, mantiene ordine per ordine e non blocca gli altri', async () => {
    const attempts: OperationalEmailMessage[] = []; let fail = true;
    const f = await fixture({ sender: { async send(message) { attempts.push(message); if (fail && message.to === buyer.email) throw new Error('smtp://user:secret@provider.invalid raw'); } } });
    const first = await f.checkout(); await f.service.action(root, first.order.id, { action: 'accept' });
    await f.emails.dispatch(); let overview = await f.emails.list(root, store.id); expect(overview.messages[0]).toMatchObject({ status: 'retrying', attempts: 1, nextAttemptAt: '2026-11-05T18:00:05.000Z', lastError: { code: 'smtp_unavailable' } });
    expect(overview.messages[1]!.attempts).toBe(0); expect(JSON.stringify(overview)).not.toMatch(/secret|provider.invalid|smtp:\/\//);
    await f.emails.dispatch(); f.advance(4999); await f.emails.dispatch(); expect(attempts).toHaveLength(1);
    f.advance(1); await f.emails.dispatch(); overview = await f.emails.list(root, store.id); expect(overview.messages[0]).toMatchObject({ attempts: 2, nextAttemptAt: '2026-11-05T18:00:15.000Z' });
    fail = false; const other = await f.checkout(); await f.emails.dispatch(); expect((await f.emails.list(root, store.id)).messages.find((m) => m.orderId === other.order.id)).toMatchObject({ status: 'sent' });
    expect(attempts.filter((m) => /accettato/i.test(m.subject))).toHaveLength(0);
    f.advance(10000); await f.emails.dispatch(); await f.emails.dispatch(); overview = await f.emails.list(root, store.id); expect(overview.messages.filter((m) => m.orderId === first.order.id).map((m) => m.status)).toEqual(['sent', 'sent']);
    const received = attempts.filter((m) => m.text.includes(first.order.id) && /ricevuto/i.test(m.subject)); expect(new Set(received.map((m) => m.messageId)).size).toBe(1);
  });
  it('perdita ACK non inventa successo; restart ritenta lo stesso documento', async () => {
    const messages: OperationalEmailMessage[] = []; const f = await fixture({ sender: { async send(message) { messages.push(message); throw new Error('ACK perso'); } } }); await f.checkout(); await f.emails.dispatch(); expect((await f.emails.list(root, store.id)).messages[0]!.status).toBe('retrying');
    f.advance(5000); const restart = createOperationalEmailServices({ ...f.options, email: { ...f.options.email, sender: { async send(message) { messages.push(message); } } } }); await restart.emails.dispatch(); expect(messages[1]).toEqual(messages[0]); expect((await restart.emails.list(root, store.id)).messages[0]!.status).toBe('sent');
  });
  it('batch predefinito non supera dieci tentativi per dispatch', async () => {
    const f = await fixture(); for (let i = 0; i < 12; i++) await f.checkout(); await f.emails.dispatch(); expect(f.messages).toHaveLength(10); await f.emails.dispatch(); expect(f.messages).toHaveLength(12);
  });
});

describe('email operative: policy e configurazione', () => {
  it('default test resta esplicito in production e richiede allowlist esatta', () => {
    expect(readOperationalEmailConfiguration({ PIZZAOS_ENVIRONMENT: 'production' })).toMatchObject({ mode: 'test' });
    expect(() => readOperationalEmailConfiguration({ OPERATIONAL_EMAIL_MODE: 'live', PIZZAOS_ENVIRONMENT: 'test', OPERATIONAL_SMTP_URL: 'smtp://secret:credential@provider.invalid', OPERATIONAL_EMAIL_FROM: 'a@pizzaos.test' })).toThrow();
  });
  it.each([{ testRecipients: [] }, { testRecipients: ['*@pizzaos.test'] }, { testRecipients: ['buyer+tag@pizzaos.test'] }, { testRecipients: ['other@pizzaos.test'] }])('blocca destinatari non autorizzati con allowlist $testRecipients', async ({ testRecipients }) => {
    const f = await fixture({ testRecipients }); await f.checkout(); await f.emails.dispatch(); expect(f.messages).toHaveLength(0); expect((await f.emails.list(root, store.id)).messages[0]).toMatchObject({ status: 'blocked', lastError: { code: 'recipient_not_allowed' } });
  });
  it('normalizza allowlist esatta e recupera configurazione al restart', async () => {
    const f = await fixture({ sender: undefined }); await f.checkout(); await f.emails.dispatch(); expect((await f.emails.list(root, store.id)).messages[0]).toMatchObject({ status: 'blocked', lastError: { code: 'not_configured' } });
    const retryAt = (await f.emails.list(root, store.id)).messages[0]!.nextAttemptAt; expect(retryAt).toBeTruthy(); const sent: OperationalEmailMessage[] = []; const restart = createOperationalEmailServices({ ...f.options, email: { from: 'orders@pizzaos.test', testRecipients: ['  BUYER@PIZZAOS.TEST  '], sender: { async send(message) { sent.push(message); } } } }); await restart.emails.dispatch(); expect(sent).toHaveLength(0); f.advance(Date.parse(retryAt!) - f.options.now().getTime()); await restart.emails.dispatch(); expect(sent).toHaveLength(1); expect((await restart.emails.list(root, store.id)).messages[0]!.status).toBe('sent');
  });
  it('mittente mancante o con CRLF non invia e non divulga valori', async () => {
    for (const from of [undefined, 'orders@pizzaos.test\r\nBcc: victim@pizzaos.test']) {
      const f = await fixture({ from }); await f.checkout(); await f.emails.dispatch(); expect(f.messages).toHaveLength(0); expect((await f.emails.list(root, store.id)).messages[0]).toMatchObject({ status: 'blocked', lastError: { code: 'not_configured' } });
    }
  });
});


describe('email operative: rimborsi reali', () => {
  it('cash annullato non inventa rimborso ed email ricevuta/annullamento rimangono ordinate', async () => {
    const f = await fixture(); const { order } = await f.checkout(); await f.service.action(root, order.id, { action: 'cancel' }); await f.service.tick();
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'cancelled']);
  });
  it('totale zero senza intento genera ricevuta ma nessun esito rimborso sintetico', async () => {
    const f = await fixture(); const zero = structuredClone(store); zero.products[0]!.priceCents = 0; await f.service.saveStore(root, zero);
    const { order } = await f.checkout('card'); expect(order.providerIntentId).toBeNull(); await f.service.action(root, order.id, { action: 'cancel' }); await f.service.tick();
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'cancelled']);
  });
  it('rimborso base fallito e retry reale riuscito generano due aggiornamenti distinti, replay non duplica', async () => {
    const f = await fixture(); f.payments.status = 'paid'; f.payments.refundStatus = 'failed'; const { order } = await f.checkout('card');
    await f.service.action(root, order.id, { action: 'cancel' }); await f.service.reconcile(buyer, order.id);
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'cancelled', 'refund_failed']);
    f.payments.refundStatus = 'succeeded'; await f.service.action(root, order.id, { action: 'retry_refund' }); await f.service.reconcile(buyer, order.id); await f.service.tick();
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'cancelled', 'refund_failed', 'refund_succeeded']);
  });
  it('addebiti delle aggiunte possiedono esiti rimborso distinti da quello base', async () => {
    const f = await fixture(); f.payments.status = 'paid'; const { order } = await f.checkout('card'); const lines = cart().lines;
    const quote = await f.service.additionQuote(buyer, order.id, lines); await f.service.additions(buyer, order.id, { lines, fingerprint: quote.fingerprint, idempotencyKey: 'addition-paid' });
    await f.service.action(root, order.id, { action: 'cancel' }); await f.service.reconcile(buyer, order.id); await f.service.tick();
    const overview = await f.emails.list(root, store.id); expect(overview.messages.filter((m) => m.event === 'refund_succeeded')).toHaveLength(2); expect(new Set(overview.messages.map((m) => m.id)).size).toBe(overview.messages.length);
    for (let index = 0; index < overview.messages.length; index++) await f.emails.dispatch();
    const refunds = f.messages.filter((message) => /rimborso/i.test(message.subject)); expect(refunds).toHaveLength(2);
    const base = refunds.find((message) => /pagamento (?:iniziale|originale)|rimborso base/i.test(message.text));
    const addition = refunds.find((message) => /rimborso[^\n]*aggiunta|aggiunta[^\n]*rimborso/i.test(message.text));
    expect(base).toBeTruthy(); expect(addition).toBeTruthy();
    for (const refund of [base!, addition!]) {
      expect(refund.text).toMatch(/rimborso[^\n]*10[,.]00|10[,.]00[^\n]*rimborso/i);
      expect(refund.text).not.toMatch(/rimborso[^\n]*20[,.]00|20[,.]00[^\n]*(?:rimborsat|rimborso)/i);
    }
  });
});


describe('email operative: limiti retry e privacy', () => {
  it('limita backoff a 900000ms con clock server', async () => {
    const f = await fixture({ sender: { async send() { throw new Error('Provider indisponibile'); } } }); await f.checkout();
    let now = Date.parse('2026-11-05T18:00:00.000Z');
    for (let attempt = 1; attempt <= 11; attempt++) {
      await f.emails.dispatch(); const record = (await f.emails.list(root, store.id)).messages[0]!; const delay = Math.min(5000 * 2 ** (attempt - 1), 900000);
      expect(record.attempts).toBe(attempt); expect(record.nextAttemptAt).toBe(new Date(now + delay).toISOString()); f.advance(delay); now += delay;
    }
  });
  it('email cliente con header injection non arriva al sender', async () => {
    const hostile = { ...buyer, id: 'hostile', email: 'buyer@pizzaos.test\r\nBcc:victim@pizzaos.test' };
    const f = await fixture({ testRecipients: [hostile.email] }); const draft = cart();
    try { const quote = await f.service.quote(draft, hostile); await f.service.checkout(hostile, { cart: draft, fingerprint: quote.fingerprint, method: 'cash', idempotencyKey: 'hostile', phone: '+393331234567' }); await f.emails.dispatch(); } catch { /* Input canonico può rifiutare prima dell'outbox. */ }
    expect(f.messages).toHaveLength(0);
  });
});

describe('email operative: rider', () => {
  it('dispatch assegnato genera in consegna senza concedere al rider lettura email', async () => {
    const f = await fixture(); const { order } = await f.checkout('cash', 'delivery'); await progress(f, order.id, ['accept', 'prepare', 'ready']);
    const riderActor = { id: 'rider-email', email: 'rider@pizzaos.test', name: 'Rider' }; const rider = await f.delivery.inviteRider(root, store.id, riderActor.email, riderActor.name);
    await f.delivery.assign(root, order.id, rider.id); await f.delivery.dispatch(riderActor, order.id);
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'accepted', 'out_for_delivery']);
    await expect(f.emails.list(riderActor, store.id)).rejects.toMatchObject({ code: 'forbidden' });
  });
});


describe('email operative: raccolta gruppo', () => {
  it('nessun invio durante raccolta, submission unica e destinatario solo host canonico', async () => {
    const f = await fixture(); const groups = createGroupOrderingService({ repository: f.repository, ordering: f.service, now: f.options.now, id: f.options.id });
    let group = await groups.create(buyer, { storeId: store.id, name: 'Host', deadline: '2026-11-05T18:20:00.000Z' });
    const hostAccess = { actor: buyer }; const joined = await groups.join({ actor: null }, group.id, { inviteToken: group.inviteToken!, name: 'guest@external.test' });
    group = await groups.replaceLines({ actor: null, capability: joined.capability }, group.id, { participantId: joined.group.participantId!, revision: joined.group.revision, lines: cart().lines });
    expect((await f.emails.list(root, store.id)).messages).toEqual([]);
    group = await groups.close(hostAccess, group.id, { revision: group.revision }); const fulfillment = { mode: 'pickup' as const, slotId: 'slot', notes: 'Gruppo test' };
    const quote = await groups.quote(hostAccess, group.id, { revision: group.revision, fulfillment });
    await groups.checkout(hostAccess, group.id, { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment, phone: '+393331234567', method: 'cash', idempotencyKey: 'group-email' });
    const overview = await f.emails.list(root, store.id); expect(overview.messages).toHaveLength(1); expect(overview.messages[0]).toMatchObject({ event: 'received', recipient: buyer.email });
    await f.emails.dispatch(); expect(f.messages.map((m) => m.to)).toEqual([buyer.email]);
  });
});

describe('email operative: revisioni e isolamento sedi', () => {
  it('revisioni monotone per sede, letture stabili e nessun dettaglio di altri tenant', async () => {
    const f = await fixture(); const empty = await f.emails.list(root, store.id); await f.checkout(); const queued = await f.emails.list(root, store.id);
    expect(queued.revision).toBeGreaterThan(empty.revision); expect((await f.emails.list(root, store.id)).revision).toBe(queued.revision);
    const otherStore = { ...structuredClone(store), id: 'other-store' }; await f.service.saveStore(root, otherStore); await f.service.invite(root, otherStore.id, operator.email);
    expect((await f.emails.list(operator, otherStore.id)).messages).toEqual([]); await expect(f.emails.list(operator, store.id)).rejects.toMatchObject({ code: 'forbidden' });
    await f.emails.dispatch(); const sent = await f.emails.list(root, store.id); expect(sent.revision).toBeGreaterThan(queued.revision); expect(sent.messages[0]!.id).toBe(queued.messages[0]!.id);
    await expect(f.emails.list(root, 'nonexistent')).rejects.toMatchObject({ code: 'not_found' });
  });
});
