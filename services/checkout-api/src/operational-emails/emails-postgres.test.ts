import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import type { OrderingRepository } from '../ordering-contract';
import { createPostgresOrderingRepository } from '../postgres-repository';
import { createOperationalEmailServices, type OperationalEmailMessage } from './index';
import { buyer, cart, fixture, root, store } from './emails.test-fixture';
const databaseUrl = process.env.PIZZAOS_TEST_DATABASE_URL;
function dedicatedTestUrl(value: string): string { const parsed = new URL(value); if (parsed.pathname !== '/pizzaos_individual_test') throw new Error('Database email test deve essere pizzaos_individual_test'); return value; }
const poolA = databaseUrl ? new Pool({ connectionString: dedicatedTestUrl(databaseUrl) }) : null;
const poolB = databaseUrl ? new Pool({ connectionString: dedicatedTestUrl(databaseUrl) }) : null;
describe.skipIf(!databaseUrl)('email operative: PostgreSQL persistente, due pool', () => {
  beforeEach(async () => { await poolA!.query('DELETE FROM individual_ordering_state'); });
  afterAll(async () => { await Promise.all([poolA!.end(), poolB!.end()]); });
  it('commit persistente e restart conservano record e deduplica', async () => {
    const f = await fixture({}, createPostgresOrderingRepository(poolA!)); const { order } = await f.checkout();
    const restart = createOperationalEmailServices({ ...f.options, repository: createPostgresOrderingRepository(poolB!) });
    expect((await restart.emails.list(root, store.id)).messages).toHaveLength(1); await restart.service.action(root, order.id, { action: 'accept' }); await restart.service.tick();
    expect((await f.emails.list(root, store.id)).messages.map((m) => m.event)).toEqual(['received', 'accepted']);
  });
  it('rollback SQL dopo mutazione non lascia ordine o mail orfani', async () => {
    const original = createPostgresOrderingRepository(poolA!); let rollback = false;
    const repository: OrderingRepository = { transact: (work) => original.transact(async (state) => { const value = await work(state); if (rollback) throw new Error('Rollback SQL intenzionale'); return value; }) };
    const f = await fixture({}, repository); const draft = cart(); const quote = await f.service.quote(draft, buyer); rollback = true; await expect(f.service.checkout(buyer, { cart: draft, fingerprint: quote.fingerprint, phone: '+393331234567', method: 'cash', idempotencyKey: 'rollback' })).rejects.toThrow('Rollback SQL intenzionale'); rollback = false;
    const restart = createOperationalEmailServices({ ...f.options, repository: createPostgresOrderingRepository(poolB!) }); expect(await restart.service.orders(root, store.id)).toEqual([]); expect((await restart.emails.list(root, store.id)).messages).toEqual([]);
  });
  it('due pool rispettano lease persistente e riprendono dopo scadenza', async () => {
    let release!: () => void; let entered!: () => void; const started = new Promise<void>((resolve) => { entered = resolve; }); const suspended = new Promise<void>((resolve) => { release = resolve; }); const documents: OperationalEmailMessage[] = [];
    const f = await fixture({ sender: { async send(message) { documents.push(message); entered(); await suspended; } } }, createPostgresOrderingRepository(poolA!)); await f.checkout(); const first = f.emails.dispatch(); await started;
    const restart = createOperationalEmailServices({ ...f.options, repository: createPostgresOrderingRepository(poolB!), email: { ...f.options.email, sender: { async send(message) { documents.push(message); } } } });
    await restart.emails.dispatch(); expect(documents).toHaveLength(1); f.advance(60001); await restart.emails.dispatch(); expect(documents).toHaveLength(2); expect(documents[1]!.messageId).toBe(documents[0]!.messageId); release(); await first; expect((await restart.emails.list(root, store.id)).messages[0]).toMatchObject({ status: 'sent', attempts: 2 });
  });
});

