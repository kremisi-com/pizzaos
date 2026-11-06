import type { PromotionBreakdown, PromotionSelection } from "./promotions-loyalty";

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
  /** IANA zone for store-local reporting; legacy pilot stores use Europe/Rome. */
  timeZone?: string;
  contactEmail?: string; contactPhone?: string;
  deliveryBands: { upToKm: number; feeCents: number; minimumCents: number }[];
  ingredients: IndividualIngredient[]; products: IndividualProduct[]; slots: IndividualSlot[];
}
export interface IndividualLine { productId: string; quantity: number; optionIds: string[]; notes: string; }
export interface IndividualCart {
  storeId: string; lines: IndividualLine[]; mode: "pickup" | "delivery"; slotId: string | null;
  notes: string; address?: { text: string; latitude: number; longitude: number };
  benefits?: PromotionSelection;
}
export interface IndividualDraft { version: 1; updatedAt: string; cart: IndividualCart; }
export interface IndividualQuote {
  fingerprint: string; subtotalCents: number; deliveryCents: number; totalCents: number;
  slotId: string; slotStartsAt: string;
  lines: { productId: string; name: string; quantity: number; unitCents: number; optionIds: string[]; notes: string }[];
  promotions?: PromotionBreakdown;
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
export type IndividualErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "product_unavailable" | "inventory_changed" | "slot_unavailable" | "price_changed" | "outside_delivery_area" | "minimum_not_met" | "idempotency_conflict" | "payment_unresolved" | "invalid_transition" | "service_unavailable" | "revision_conflict" | "coupon_unavailable" | "coupon_limit_reached" | "loyalty_insufficient" | "loyalty_unavailable";
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
