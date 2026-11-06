import type { IndividualActor, IndividualCart, IndividualCheckout, IndividualOrder, IndividualStore, PromotionCouponInput } from "@pizzaos/domain";
import type { OrderingPayments, OrderingRepository, OrderingState, ProviderPayment, ProviderRefund } from "../ordering-contract";
import { createPromotionsOrderingServices } from "./index";

export const root: IndividualActor = { id: "root", email: "root@example.test", name: "Amministratore" };
export const operator: IndividualActor = { id: "operator", email: "operator@example.test", name: "Operatore" };
export const customer: IndividualActor = { id: "customer", email: "customer@example.test", name: "Cliente" };
export const otherCustomer: IndividualActor = { id: "other", email: "other@example.test", name: "Altro cliente" };
export const outsider: IndividualActor = { id: "outsider", email: "outsider@example.test", name: "Operatore altra sede" };
export const rider: IndividualActor = { id: "rider", email: "rider@example.test", name: "Rider" };

export function memoryRepository(): OrderingRepository {
  let state: OrderingState = { stores: {}, memberships: [{ storeId: "store-a", email: operator.email }, { storeId: "store-b", email: outsider.email }], orders: {}, idempotency: {}, events: [], cursor: 0 };
  let queue = Promise.resolve();
  return {
    transact<T>(work: (snapshot: OrderingState) => T | Promise<T>): Promise<T> {
      const pending = queue.then(async () => {
        const draft = structuredClone(state);
        const result = await work(draft);
        state = draft;
        return result;
      });
      queue = pending.then(() => undefined, () => undefined);
      return pending;
    },
  };
}

export class TestPayments implements OrderingPayments {
  readonly creates: { orderId: string; totalCents: number; key: string }[] = [];
  readonly intents = new Map<string, ProviderPayment>();
  readonly keys = new Map<string, string>();
  refundStatus: ProviderRefund["status"] = "succeeded";
  createStatus: ProviderPayment["status"] = "requires_action";
  failCreate = false;
  failRead = false;
  failCancel = false;
  onCreate?: () => Promise<void>;
  async create(input: { orderId: string; totalCents: number; key: string }): Promise<ProviderPayment> {
    this.creates.push(input);
    await this.onCreate?.();
    let id = this.keys.get(input.key);
    if (!id) {
      id = `intent-${this.intents.size + 1}`;
      this.keys.set(input.key, id);
      this.intents.set(id, { id, status: this.createStatus, clientSecret: `${id}-secret` });
    }
    if (this.failCreate) throw new Error("Connessione provider interrotta");
    const intent = this.intents.get(id);
    if (!intent) throw new Error("Intento non trovato");
    return { ...intent };
  }
  async read(id: string): Promise<ProviderPayment> {
    if (this.failRead) throw new Error("Provider temporaneamente irraggiungibile");
    const intent = this.intents.get(id);
    if (!intent) throw new Error("Intento non trovato");
    return { ...intent };
  }
  async cancel(id: string): Promise<ProviderPayment> {
    if (this.failCancel) throw new Error("Esito cancellazione incerto");
    const intent = await this.read(id);
    if (intent.status !== "paid") intent.status = "cancelled";
    this.intents.set(id, intent);
    return intent;
  }
  async refund(): Promise<ProviderRefund> { return { id: "refund", status: this.refundStatus }; }
  async readRefund(): Promise<ProviderRefund> { return { id: "refund", status: this.refundStatus }; }
  settle(id: string, status: ProviderPayment["status"]): void {
    const intent = this.intents.get(id);
    if (!intent) throw new Error("Intento non trovato");
    this.intents.set(id, { ...intent, status });
  }
}

export function store(id = "store-a"): IndividualStore {
  return {
    id, name: id === "store-a" ? "Sede A" : "Sede B", latitude: 45, longitude: 9, acceptingOrders: true,
    deliveryBands: [{ upToKm: 20, feeCents: 200, minimumCents: 0 }],
    ingredients: [{ id: "dough", name: "Impasto", stock: 1000 }],
    products: [
      { id: "a", name: "Pizza A", description: "", priceCents: 2000, available: true, allergens: [], ingredients: { dough: 1 }, options: [{ id: "extra", name: "Extra", priceCents: 100, ingredients: {} }] },
      { id: "b", name: "Pizza B", description: "", priceCents: 800, available: true, allergens: [], ingredients: { dough: 1 }, options: [] },
      { id: "cent", name: "Prodotto centesimo", description: "", priceCents: 1, available: true, allergens: [], ingredients: {}, options: [] },
    ],
    slots: [{ id: "slot", startsAt: "2030-01-01T12:30:00.000Z", capacity: 1000 }],
  };
}

export function cart(overrides: Partial<IndividualCart> = {}): IndividualCart {
  return { storeId: "store-a", lines: [{ productId: "a", quantity: 1, optionIds: [], notes: "" }], mode: "pickup", slotId: "slot", notes: "", ...overrides };
}

export function coupon(overrides: Partial<PromotionCouponInput> = {}): PromotionCouponInput {
  return { code: "SCONTO", active: true, kind: "fixed", value: 500, startsAt: null, endsAt: null, minimumCents: 0, productIds: [], globalLimit: null, perCustomerLimit: null, ...overrides };
}

export async function fixture(repository: OrderingRepository = memoryRepository(), payments = new TestPayments()) {
  let instant = new Date("2030-01-01T12:00:00.000Z");
  let sequence = 0;
  const options = { repository, payments, superadminEmails: [root.email], now: () => instant, id: () => `promotion-test-${++sequence}`, reservationMs: 60_000 };
  const services = createPromotionsOrderingServices(options);
  await services.service.saveStore(root, store());
  await services.service.saveStore(root, store("store-b"));
  const checkoutInput = async (selected: IndividualCart = cart(), method: "cash" | "card" = "cash", actor = customer): Promise<IndividualCheckout> => ({ cart: selected, fingerprint: (await services.service.quote(selected, actor)).fingerprint, phone: "+393331234567", method, idempotencyKey: `checkout-${++sequence}` });
  const submit = async (selected: IndividualCart = cart(), method: "cash" | "card" = "cash", actor = customer) => services.service.checkout(actor, await checkoutInput(selected, method, actor));
  const complete = async (order: IndividualOrder): Promise<IndividualOrder> => {
    for (const action of ["accept", "prepare", "ready", ...(order.cart.mode === "delivery" ? ["dispatch" as const] : []), "complete"] as const) order = await services.service.action(operator, order.id, { action });
    return order;
  };
  const earn = async () => {
    const program = (await services.promotions.configuration(operator, "store-a")).program;
    await services.promotions.saveProgram(operator, "store-a", { ...program, pointsPerEuro: 5 });
    await complete((await submit()).order);
    const current = (await services.promotions.configuration(operator, "store-a")).program;
    await services.promotions.saveProgram(operator, "store-a", { ...current, pointsPerEuro: 1 });
  };
  return { ...services, options, payments, checkoutInput, submit, complete, earn, advance: (milliseconds: number) => { instant = new Date(instant.getTime() + milliseconds); } };
}
