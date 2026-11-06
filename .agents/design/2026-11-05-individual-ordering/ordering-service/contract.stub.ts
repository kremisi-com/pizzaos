import type Stripe from "stripe";
// Public SDD stub; deliberately outside the build.
/** Durable pilot contracts. EUR amounts are integer cents, dates are UTC ISO strings. */
export interface IndividualActor { id: string; email: string; name: string; }
export interface IndividualIngredient { id: string; name: string; stock: number; }
export interface IndividualOption { id: string; name: string; priceCents: number; ingredients: Record<string, number>; }
export interface IndividualProduct {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  allergens: string[]; ingredients: Record<string, number>; options: IndividualOption[];
}
export interface IndividualSlot { id: string; startsAt: string; capacity: number; }
export interface IndividualStore {
  id: string; name: string; latitude: number; longitude: number; acceptingOrders: boolean;
  contactEmail?: string; contactPhone?: string;
  deliveryBands: { upToKm: number; feeCents: number; minimumCents: number }[];
  ingredients: IndividualIngredient[]; products: IndividualProduct[]; slots: IndividualSlot[];
}
export interface IndividualLine { productId: string; quantity: number; optionIds: string[]; notes: string; }
export interface IndividualCart {
  storeId: string; lines: IndividualLine[]; mode: "pickup" | "delivery"; slotId: string | null;
  notes: string; address?: { text: string; latitude: number; longitude: number };
}
export interface IndividualDraft { version: 1; updatedAt: string; cart: IndividualCart; }
export interface IndividualQuote {
  fingerprint: string; subtotalCents: number; deliveryCents: number; totalCents: number;
  slotId: string; slotStartsAt: string;
  lines: { productId: string; name: string; quantity: number; unitCents: number; optionIds: string[]; notes: string }[];
}
export type IndividualOrderStatus = "pending_payment" | "awaiting_acceptance" | "awaiting_customer" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
export type IndividualPaymentStatus = "requires_action" | "processing" | "failed" | "paid" | "cash_due" | "cash_paid" | "refund_pending" | "refunded" | "refund_failed";
export interface IndividualAdditionQuote { fingerprint: string; deltaCents: number; quote: IndividualQuote; }
export interface IndividualAdditionRequest { lines: IndividualLine[]; fingerprint: string; idempotencyKey: string; }
/** Every increase is separately settled; no provider secrets are persisted. */
export interface IndividualAddition {
  id: string; lines: IndividualLine[]; quote: IndividualQuote; deltaCents: number;
  method: "card" | "cash"; payment: IndividualPaymentStatus; applied: boolean;
  providerIntentId: string | null; refundId: string | null; refundAttempt: number;
  reservationExpiresAt: string | null; reservationReleased: boolean; createdAt: string;
}
export interface IndividualOrder {
  id: string; storeId: string; customerId: string; cart: IndividualCart; quote: IndividualQuote;
  contact: { name: string; email: string; phone: string }; status: IndividualOrderStatus;
  payment: IndividualPaymentStatus; method: "card" | "cash"; notes: string;
  createdAt: string; submittedAt: string | null; acceptanceDeadline: string | null;
  reservationExpiresAt: string | null; reservationReleased: boolean;
  unavailableProductIds: string[]; providerIntentId: string | null; refundId: string | null;
  refundAttempt: number; revision: number;
  additions?: IndividualAddition[];
}
export interface IndividualCheckout {
  cart: IndividualCart; fingerprint: string; phone: string; method: "card" | "cash";
  /** Reused for retries of identical input; never replaced after an uncertain result. */
  idempotencyKey: string;
}
export interface IndividualCheckoutResult { order: IndividualOrder; clientSecret?: string; }
export type IndividualOrderAction = "accept" | "wait_for_customer" | "cancel" | "prepare" | "ready" | "dispatch" | "complete" | "retry_refund";
export interface IndividualAction { action: IndividualOrderAction; unavailableProductIds?: string[]; }
export interface IndividualSession { actor: IndividualActor | null; superadmin: boolean; storeIds: string[]; }
export interface IndividualEvent { cursor: number; storeId: string; orderId: string; revision: number; }
/** Public error payload, shared by HTTP and direct service callers. */
export type IndividualErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "product_unavailable" | "inventory_changed" | "slot_unavailable" | "price_changed" | "outside_delivery_area" | "minimum_not_met" | "idempotency_conflict" | "payment_unresolved" | "invalid_transition" | "service_unavailable";
export interface IndividualApi {
  session(): Promise<IndividualSession>;
  stores(): Promise<IndividualStore[]>;
  catalog(storeId: string): Promise<IndividualStore>;
  quote(cart: IndividualCart): Promise<IndividualQuote>;
  checkout(input: IndividualCheckout): Promise<IndividualCheckoutResult>;
  orders(storeId?: string): Promise<IndividualOrder[]>;
  reconcile(orderId: string): Promise<IndividualCheckoutResult>;
  action(orderId: string, input: IndividualAction): Promise<IndividualOrder>;
  notes(orderId: string, notes: string): Promise<IndividualOrder>;
  additionQuote?(orderId: string, lines: IndividualLine[]): Promise<IndividualAdditionQuote>;
  additions?(orderId: string, input: IndividualAdditionRequest): Promise<IndividualCheckoutResult>;
  saveStore(store: IndividualStore): Promise<IndividualStore>;
  invite(storeId: string, email: string): Promise<void>;
  events(cursor: number, storeId?: string): Promise<{ cursor: number; events: IndividualEvent[] }>;
}


export interface OrderingState {
  stores: Record<string, IndividualStore>;
  memberships: { storeId: string; email: string }[];
  orders: Record<string, IndividualOrder>;
  idempotency: Record<string, { hash: string; orderId: string }>;
  events: IndividualEvent[];
  cursor: number;
}
/** Transactions serialize all reads/writes; a thrown callback rolls back changes. */
export interface OrderingRepository {
  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T>;
}
export interface ProviderPayment {
  id: string;
  status: "requires_action" | "processing" | "failed" | "paid" | "cancelled";
  clientSecret?: string;
}
export interface ProviderRefund { id: string; status: "pending" | "failed" | "succeeded"; }
export interface OrderingPayments {
  create(input: { orderId: string; totalCents: number; key: string }): Promise<ProviderPayment>;
  read(intentId: string): Promise<ProviderPayment>;
  cancel(intentId: string): Promise<ProviderPayment>;
  refund(input: { intentId: string; key: string }): Promise<ProviderRefund>;
  readRefund(refundId: string): Promise<ProviderRefund>;
}
export interface OrderingService {
  session(actor: IndividualActor | null): Promise<IndividualSession>;
  stores(actor?: IndividualActor | null): Promise<IndividualStore[]>;
  catalog(storeId: string, actor?: IndividualActor | null): Promise<IndividualStore>;
  quote(cart: IndividualCart): Promise<IndividualQuote>;
  checkout(actor: IndividualActor | null, input: IndividualCheckout): Promise<IndividualCheckoutResult>;
  orders(actor: IndividualActor | null, storeId?: string): Promise<IndividualOrder[]>;
  reconcile(actor: IndividualActor | null, orderId: string): Promise<IndividualCheckoutResult>;
  action(actor: IndividualActor | null, orderId: string, input: IndividualAction): Promise<IndividualOrder>;
  notes(actor: IndividualActor | null, orderId: string, notes: string): Promise<IndividualOrder>;
  additionQuote(actor: IndividualActor | null, orderId: string, lines: IndividualLine[]): Promise<IndividualAdditionQuote>;
  additions(actor: IndividualActor | null, orderId: string, input: IndividualAdditionRequest): Promise<IndividualCheckoutResult>;
  saveStore(actor: IndividualActor | null, store: IndividualStore): Promise<IndividualStore>;
  invite(actor: IndividualActor | null, storeId: string, email: string): Promise<void>;
  events(actor: IndividualActor | null, cursor: number, storeId?: string): Promise<{ cursor: number; events: IndividualEvent[] }>;
  /** Reconcile remote operations and acceptance/reservation deadlines, safe across restarts. */
  tick(): Promise<void>;
}
export interface OrderingServiceOptions {
  repository: OrderingRepository;
  payments: OrderingPayments;
  superadminEmails: string[];
  now?: () => Date;
  id?: () => string;
  reservationMs?: number;
}
/** Structural compile-time compatibility with the browser port; no runtime dependency. */
export type IndividualBrowserPort = IndividualApi;

export declare function createOrderingService(options: OrderingServiceOptions): OrderingService;

export declare function createStripeOrderingPayments(stripe: Stripe): OrderingPayments;
