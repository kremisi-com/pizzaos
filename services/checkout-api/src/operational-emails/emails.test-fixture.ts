import type { IndividualActor, IndividualCart, IndividualStore } from '@pizzaos/domain';
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment, ProviderRefund } from '../ordering-contract';
import { createOperationalEmailServices, type OperationalEmailOptions, type OperationalEmailMessage } from './index';

export const root: IndividualActor = { id: 'root', email: 'root@pizzaos.test', name: 'Responsabile' };
export const buyer: IndividualActor = { id: 'buyer', email: 'buyer@pizzaos.test', name: 'Cliente Test' };
export const operator: IndividualActor = { id: 'operator', email: 'operator@pizzaos.test', name: 'Operatore' };
export const store: IndividualStore = {
  id: 'email-store', name: 'Sede Test', latitude: 45, longitude: 9, acceptingOrders: true,
  deliveryBands: [{ upToKm: 20, feeCents: 250, minimumCents: 0 }],
  ingredients: [{ id: 'dough', name: 'Impasto', stock: 1000 }],
  products: [{ id: 'pizza', name: 'Pizza Test', description: '', priceCents: 1000, available: true, allergens: [], ingredients: { dough: 1 }, options: [] }],
  slots: [{ id: 'slot', startsAt: '2026-11-05T19:00:00.000Z', capacity: 100 }],
};
export function cart(mode: 'pickup' | 'delivery' = 'pickup'): IndividualCart {
  return { storeId: store.id, lines: [{ productId: 'pizza', quantity: 1, optionIds: [], notes: 'Ben cotta' }], mode, slotId: 'slot', notes: 'Nota test', ...(mode === 'delivery' ? { address: { text: 'Via Test 1', latitude: 45, longitude: 9 } } : {}) };
}
export class MemoryRepository implements OrderingRepository {
  private state: OrderingState = { stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0 };
  private tail: Promise<unknown> = Promise.resolve();
  failNextCommit = false;
  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      const draft = structuredClone(this.state);
      const value = await work(draft);
      if (this.failNextCommit) { this.failNextCommit = false; throw new Error('Commit interrotto'); }
      this.state = draft;
      return value;
    });
    this.tail = result.catch(() => undefined);
    return result;
  }
}
export class TestPayments implements OrderingPayments {
  status: ProviderPayment['status'] = 'requires_action';
  refundStatus: ProviderRefund['status'] = 'succeeded';
  intents = new Map<string, ProviderPayment>();
  refunds = new Map<string, ProviderRefund>();
  async create(input: { orderId: string; totalCents: number; key: string }): Promise<ProviderPayment> {
    const result: ProviderPayment = { id: `intent-${input.key}`, status: this.status };
    this.intents.set(result.id, result); return result;
  }
  async read(id: string): Promise<ProviderPayment> { return this.intents.get(id) ?? { id, status: this.status }; }
  async cancel(id: string): Promise<ProviderPayment> { const result: ProviderPayment = { id, status: 'cancelled' }; this.intents.set(id, result); return result; }
  async refund(input: { intentId: string; key: string }): Promise<ProviderRefund> { const result = { id: `refund-${input.key}`, status: this.refundStatus }; this.refunds.set(result.id, result); return result; }
  async readRefund(id: string): Promise<ProviderRefund> { return this.refunds.get(id) ?? { id, status: this.refundStatus }; }
  paid(id: string) { this.intents.set(id, { id, status: 'paid' }); }
}
export async function fixture(email: OperationalEmailOptions = {}, repository: OrderingRepository = new MemoryRepository()) {
  let time = Date.parse('2026-11-05T18:00:00.000Z'); let sequence = 0;
  const messages: OperationalEmailMessage[] = [];
  const payments = new TestPayments();
  const options = { repository, payments, superadminEmails: [root.email], now: () => new Date(time), id: () => `email-test-${++sequence}`, email: { from: 'PizzaOS <orders@pizzaos.test>', testRecipients: [buyer.email], sender: { async send(message: OperationalEmailMessage) { messages.push(structuredClone(message)); } }, ...email } };
  const services = createOperationalEmailServices(options);
  await services.service.saveStore(root, structuredClone(store));
  return { ...services, repository, payments, messages, options, advance(ms: number) { time += ms; }, async checkout(method: 'cash' | 'card' = 'cash', mode: 'pickup' | 'delivery' = 'pickup', key = `checkout-${++sequence}`) { const draft = cart(mode); const quote = await services.service.quote(draft, buyer); return services.service.checkout(buyer, { cart: draft, fingerprint: quote.fingerprint, phone: '+393331234567', method, idempotencyKey: key }); } };
}
