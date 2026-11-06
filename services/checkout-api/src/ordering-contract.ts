import type { IndividualActor, IndividualApi, IndividualCart, IndividualCheckout, IndividualCheckoutResult, IndividualOrder, IndividualStore, IndividualSession, IndividualAction, IndividualQuote, IndividualEvent, IndividualAdditionQuote, IndividualAdditionRequest, IndividualLine, StoreAddressCandidate } from "@pizzaos/domain";
import type { StoreAddressGeocoder } from "./store-address";

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
  quote(cart: IndividualCart, actor?: IndividualActor | null): Promise<IndividualQuote>;
  checkout(actor: IndividualActor | null, input: IndividualCheckout): Promise<IndividualCheckoutResult>;
  orders(actor: IndividualActor | null, storeId?: string): Promise<IndividualOrder[]>;
  reconcile(actor: IndividualActor | null, orderId: string): Promise<IndividualCheckoutResult>;
  action(actor: IndividualActor | null, orderId: string, input: IndividualAction): Promise<IndividualOrder>;
  notes(actor: IndividualActor | null, orderId: string, notes: string): Promise<IndividualOrder>;
  additionQuote(actor: IndividualActor | null, orderId: string, lines: IndividualLine[]): Promise<IndividualAdditionQuote>;
  additions(actor: IndividualActor | null, orderId: string, input: IndividualAdditionRequest): Promise<IndividualCheckoutResult>;
  searchStoreAddresses(actor: IndividualActor | null, storeId: string, query: string): Promise<StoreAddressCandidate[]>;
  saveStore(actor: IndividualActor | null, store: IndividualStore, addressConfirmation?: string): Promise<IndividualStore>;
  invite(actor: IndividualActor | null, storeId: string, email: string): Promise<void>;
  events(actor: IndividualActor | null, cursor: number, storeId?: string): Promise<{ cursor: number; events: IndividualEvent[] }>;
  /** Reconcile remote operations and acceptance/reservation deadlines, safe across restarts. */
  tick(): Promise<void>;
}
export interface RiderOrderingService extends OrderingService {
  /** Server-only rider entry; generic action never grants rider privileges. */
  riderProgress(actor: IndividualActor | null, orderId: string, action: "dispatch" | "complete"): Promise<IndividualOrder>;
}
export interface OrderingServiceOptions {
  repository: OrderingRepository;
  payments: OrderingPayments;
  superadminEmails: string[];
  now?: () => Date;
  id?: () => string;
  reservationMs?: number;
  storeGeocoding?: StoreAddressGeocoder;
  /** Economic extension, evaluated within the canonical quote/checkout transaction. */
  priceQuote?: (state: OrderingState, cart: IndividualCart, quote: IndividualQuote, actor?: IndividualActor | null) => IndividualQuote;
  /** Evaluated under the canonical order write lock; absent means deny. */
  authorizeRiderProgress?: (state: OrderingState, actor: IndividualActor, order: IndividualOrder, action: "dispatch" | "complete") => boolean;
}
/** Structural compile-time compatibility with the browser port; no runtime dependency. */
export type IndividualBrowserPort = IndividualApi;
