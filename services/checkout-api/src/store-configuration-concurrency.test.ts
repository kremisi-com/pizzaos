import { describe, expect, it } from 'vitest';
import type { IndividualActor, IndividualCart, IndividualStore } from '@pizzaos/domain';
import type { OrderingRepository, OrderingState } from './ordering-contract';
import { createOrderingService } from './ordering-service';
import { buildOrderingApp } from './http-app';

const owner: IndividualActor = { id: 'owner', email: 'owner@example.test', name: 'Titolare' };
const operator: IndividualActor = { id: 'operator', email: 'operator@example.test', name: 'Operatore' };
const customer: IndividualActor = { id: 'customer', email: 'customer@example.test', name: 'Cliente' };

function fixture(id = 'roma'): IndividualStore {
  return {
    id, name: 'Roma', latitude: 41.9, longitude: 12.5, acceptingOrders: true,
    deliveryBands: [], ingredients: [{ id: 'dough', name: 'Impasto', stock: 20 }],
    products: [{ id: 'pizza', name: 'Pizza', description: '', priceCents: 800,
      available: true, allergens: [], ingredients: { dough: 1 }, options: [] }],
    slots: [{ id: 'evening', startsAt: '2026-11-25T19:00:00Z', capacity: 20 }],
  };
}

function normalized<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => normalized(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalized(item)])) as T;
  }
  return value;
}

class TestRepository implements OrderingRepository {
  private state: OrderingState = {
    stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0,
  };
  private queue: Promise<unknown> = Promise.resolve();

  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
    const result = this.queue.then(async () => {
      const draft = structuredClone(this.state);
      const value = await work(draft);
      this.state = normalized(structuredClone(draft));
      return structuredClone(value);
    });
    this.queue = result.catch(() => undefined);
    return result;
  }
}

function serviceFor(repository: OrderingRepository) {
  return createOrderingService({
    repository, superadminEmails: [owner.email], now: () => new Date('2026-11-25T18:00:00Z'),
    payments: {
      create: async ({ orderId }) => ({ id: orderId, status: 'paid' as const }),
      read: async id => ({ id, status: 'paid' as const }),
      cancel: async id => ({ id, status: 'cancelled' as const }),
      refund: async ({ intentId }) => ({ id: intentId, status: 'succeeded' as const }),
      readRefund: async id => ({ id, status: 'succeeded' as const }),
    },
  });
}

async function setup() {
  const repository = new TestRepository();
  const service = serviceFor(repository);
  const created = await service.saveStore(owner, fixture());
  return { repository, service, created };
}

describe('store configuration optimistic concurrency public contract', () => {
  it('creates without a revision and exposes a stable opaque revision to operators only', async () => {
    const { service, created } = await setup();
    expect(created.configurationRevision).toEqual(expect.any(String));
    expect(created.configurationRevision?.length).toBeGreaterThan(0);
    expect((await service.catalog('roma', owner)).configurationRevision).toBe(created.configurationRevision);
    expect((await service.stores(owner))[0]?.configurationRevision).toBe(created.configurationRevision);
    for (const actor of [undefined, null, customer]) {
      expect(await service.catalog('roma', actor)).not.toHaveProperty('configurationRevision');
      for (const store of await service.stores(actor)) expect(store).not.toHaveProperty('configurationRevision');
    }
  });

  it('does not overwrite an existing ID with an unversioned create or update', async () => {
    const { service, created } = await setup();
    await expect(service.saveStore(owner, { ...fixture(), name: 'Sovrascritta' }))
      .rejects.toMatchObject({ code: 'revision_conflict' });
    expect(await service.catalog('roma', owner)).toEqual(created);
  });

  it('rejects malformed revisions without altering the current configuration', async () => {
    const { service, created } = await setup();
    await expect(service.saveStore(owner, { ...created, name: 'Non salvata', configurationRevision: '' }))
      .rejects.toMatchObject({ code: 'invalid_input' });
    expect(await service.catalog('roma', owner)).toEqual(created);
  });

  it('rejects stale stock edits, then allows a deliberate edit after rereading', async () => {
    const { service, created } = await setup();
    const first = await service.saveStore(owner, { ...created, name: 'Roma Centro' });
    expect(first.configurationRevision).not.toBe(created.configurationRevision);
    await expect(service.saveStore(owner, { ...created, ingredients: [{ id: 'dough', name: 'Impasto', stock: 50 }] }))
      .rejects.toMatchObject({ code: 'revision_conflict' });
    expect(await service.catalog('roma', owner)).toEqual(first);
    const reread = await service.catalog('roma', owner);
    const saved = await service.saveStore(owner, { ...reread, acceptingOrders: false });
    expect(saved).toMatchObject({ name: 'Roma Centro', acceptingOrders: false });
    expect(saved.ingredients[0]?.stock).toBe(20);
  });

  it('allows exactly one of two concurrent changes with the same revision', async () => {
    const { service, created } = await setup();
    const attempts = await Promise.allSettled([
      service.saveStore(owner, { ...created, name: 'Prima modifica' }),
      service.saveStore(owner, { ...created, name: 'Seconda modifica' }),
    ]);
    expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find(result => result.status === 'rejected');
    expect(rejected).toMatchObject({ status: 'rejected', reason: { code: 'revision_conflict' } });
    const winner = attempts.find(result => result.status === 'fulfilled');
    if (winner?.status !== 'fulfilled') throw new Error('Nessun salvataggio riuscito');
    expect(await service.catalog('roma', owner)).toEqual(winner.value);
  });

  it('keeps a revision valid across JSON key normalization and service reconstruction', async () => {
    const { repository, service, created } = await setup();
    expect(created.configurationRevision).toEqual(expect.any(String));
    const reconstructed = serviceFor(repository);
    expect((await reconstructed.catalog('roma', owner)).configurationRevision).toBe(created.configurationRevision);
    const reordered = normalized({ ...created, name: 'Dopo ricostruzione' });
    const saved = await reconstructed.saveStore(owner, reordered);
    expect(saved.name).toBe('Dopo ricostruzione');
    expect((await service.catalog('roma', owner)).configurationRevision).toBe(saved.configurationRevision);
  });

  it('accepts a revision from legacy data without a stored version or migration', async () => {
    const repository = new TestRepository();
    await repository.transact(state => { state.stores.roma = fixture(); });
    const service = serviceFor(repository);
    const legacy = await service.catalog('roma', owner);
    expect(legacy.configurationRevision).toEqual(expect.any(String));
    const saved = await service.saveStore(owner, { ...legacy, name: 'Sede aggiornata' });
    expect(saved.name).toBe('Sede aggiornata');
  });

  it('does not restore consumed stock with a configuration read before order completion', async () => {
    const { service, created } = await setup();
    const cart: IndividualCart = {
      storeId: 'roma', lines: [{ productId: 'pizza', quantity: 1, optionIds: [], notes: '' }],
      mode: 'pickup', slotId: 'evening', notes: '',
    };
    const { fingerprint } = await service.quote(cart, customer);
    const { order } = await service.checkout(customer, {
      cart, fingerprint, phone: '3331234567', method: 'cash', idempotencyKey: 'configuration-stock-order',
    });
    for (const action of ['accept', 'prepare', 'ready', 'complete'] as const) {
      await service.action(owner, order.id, { action });
    }
    const current = await service.catalog('roma', owner);
    expect(current.ingredients[0]?.stock).toBe(19);
    expect(current.configurationRevision).not.toBe(created.configurationRevision);
    await expect(service.saveStore(owner, { ...created, name: 'Vecchia lettura' }))
      .rejects.toMatchObject({ code: 'revision_conflict' });
    expect(await service.catalog('roma', owner)).toEqual(current);
  });

  it('preserves authorization for anonymous, customer and another-store operators', async () => {
    const { service, created } = await setup();
    await service.saveStore(owner, fixture('milano'));
    await service.invite(owner, 'milano', operator.email);
    for (const actor of [null, customer, operator]) {
      await expect(service.saveStore(actor, { ...created, name: 'Accesso non consentito' })).rejects.toBeDefined();
    }
    expect(await service.catalog('roma', owner)).toEqual(created);
  });

  it('returns HTTP 409 for missing and stale revisions without changing saved data', async () => {
    const { service, created } = await setup();
    const app = buildOrderingApp({ service, authenticate: async () => owner });
    try {
      const write = await app.inject({ method: 'PUT', url: '/v1/pilot/stores/roma', payload: { ...created, name: 'HTTP' } });
      expect(write.statusCode).toBe(200);
      for (const payload of [fixture(), created]) {
        const response = await app.inject({ method: 'PUT', url: '/v1/pilot/stores/roma', payload });
        expect(response.statusCode).toBe(409);
        expect(response.json()).toMatchObject({ code: 'revision_conflict', message: expect.any(String), requestId: expect.any(String) });
      }
      expect((await service.catalog('roma', owner)).name).toBe('HTTP');
    } finally {
      await app.close();
    }
  });

  it('returns HTTP 400 for malformed revisions without changing saved data', async () => {
    const { service, created } = await setup();
    const app = buildOrderingApp({ service, authenticate: async () => owner });
    try {
      for (const configurationRevision of ['', 42, {}, []]) {
        const response = await app.inject({ method: 'PUT', url: '/v1/pilot/stores/roma',
          payload: { ...created, name: 'Non salvata', configurationRevision } });
        expect(response.statusCode).toBe(400);
        expect(response.json()).toMatchObject({ code: 'invalid_input', message: expect.any(String), requestId: expect.any(String) });
      }
      expect(await service.catalog('roma', owner)).toEqual(created);
    } finally {
      await app.close();
    }
  });

  it('exposes the revision through operator HTTP reads and hides it from customer reads', async () => {
    const { service, created } = await setup();
    for (const actor of [owner, customer]) {
      const app = buildOrderingApp({ service, authenticate: async () => actor });
      try {
        const response = await app.inject({ method: 'GET', url: '/v1/pilot/stores/roma' });
        expect(response.statusCode).toBe(200);
        if (actor === owner) {
          expect(response.json()).toMatchObject({ configurationRevision: expect.any(String) });
          expect(response.json().configurationRevision).toBe(created.configurationRevision);
        } else {
          expect(response.json()).not.toHaveProperty('configurationRevision');
        }
      } finally {
        await app.close();
      }
    }
  });
});
