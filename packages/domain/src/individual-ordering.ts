import type {
  MenuComposition, MenuExtraOffer, MenuFoodInformation, MenuFoodIngredient, MenuOptionGroup, MenuSelection, PublishedMenu
} from "./menu-ordering";
import type { PromotionBreakdown, PromotionSelection } from "./promotions-loyalty";
import type { MenuSpecificOption } from "./menu-choice-types";

/** Durable pilot contracts. EUR amounts are integer cents, dates are UTC ISO strings. */
export interface IndividualActor { id: string; email: string; name: string; }
/** null means the stock has not been verified; it cannot fulfil an order. */
export interface IndividualIngredient {
  id: string; name: string; stock: number | null; food?: MenuFoodInformation;
  /** Commercial configuration is copied to a draft and becomes public only on publication. */
  extra?: { enabled: boolean; priceCents: number | null; dose: number | null };
}
export interface IndividualOption extends MenuSpecificOption {
  pizza?: import("./pizza-types").PizzaOptionIdentity;
  /** Public projection of recipe references and current availability. */
  ingredientIds?: string[];
}
export interface IndividualProduct {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  /** null keeps the ingredient reference while its recipe dose awaits verification. */
  allergens: string[]; ingredients: Record<string, number | null>; options: IndividualOption[];
  groups?: MenuOptionGroup[]; extraOffer?: MenuExtraOffer; pairingProductIds?: string[]; imageId?: string;
  food?: MenuFoodInformation;
  pizza?: import("./pizza-types").PizzaProductIdentity;
  /** Authoritative included topping recipes; omitted from public catalog responses. */
  pizzaRecipeSources?: { sourceId: string; ingredients: Record<string, number | null> }[];
  /** Public projection for menu presentation. Stock quantities and recipe units stay server-side. */
  foodIngredients?: MenuFoodIngredient[]; baseIngredientIds?: string[]; maxAvailable?: number;
}
export interface MenuDraft extends PublishedMenu {
  products: IndividualProduct[];
  pizzaCatalog?: import("./pizza-types").PizzaCatalog;
}

export interface MenuWorkspace {
  revision: number;
  published: MenuDraft;
  drafts: MenuDraft[];
}

export interface MenuAdminApi {
  workspace(storeId: string): Promise<MenuWorkspace>;
  saveDraft(storeId: string, revision: number, draft: MenuDraft): Promise<MenuWorkspace>;
  removeDraft(storeId: string, revision: number, draftId: string): Promise<MenuWorkspace>;
  publish(storeId: string, revision: number, draftId: string): Promise<MenuWorkspace>;
  uploadImage(storeId: string, image: File): Promise<{ id: string }>;
}

export interface IndividualSlot { id: string; startsAt: string; capacity: number; endsAt?: string; timeZone?: string; }
export interface WeeklyOrderWindow { startMinute: number; endMinute: number; capacity: number; }
export interface WeeklyOrderDay { weekday: number; windows: WeeklyOrderWindow[]; }
export interface WeeklyOrderSchedule { revision: number; days: WeeklyOrderDay[]; }

export function createDefaultWeeklyOrderSchedule(): WeeklyOrderSchedule {
  const startHours = [11, 12, 13, 14, 18, 19, 20, 21];
  return { revision: 0, days: Array.from({ length: 7 }, (_, index) => ({
    weekday: index + 1,
    windows: startHours.map(hour => ({ startMinute: hour * 60, endMinute: (hour + 1) * 60, capacity: 5 }))
  })) };
}
export interface IndividualStore {
  /** Opaque operator-only version. Required when saving an existing store. */
  configurationRevision?: string;
  orderingSubdomain?: string;
  menu?: PublishedMenu;
  id: string; name: string; latitude: number; longitude: number; acceptingOrders: boolean;
  /** Confirmed store address, present only in the operator catalog. */
  address?: string;
  /** IANA zone for store-local reporting and ordering; legacy pilot stores use Europe/Rome. */
  timeZone?: string;
  contactEmail?: string; contactPhone?: string;
  deliveryBands: { upToKm: number; feeCents: number; minimumCents: number }[];
  ingredients: IndividualIngredient[]; products: IndividualProduct[]; slots: IndividualSlot[];
  /** Operator-only settings. Omit when updating other settings. */
  orderSchedule?: WeeklyOrderSchedule;
  /** Operator-only list of protected local dates, read-only. */
  protectedOrderDates?: string[];
}
export type IndividualLineKind = "product" | "pizza_taste" | "pizza_formula";
export interface IndividualLine { kind?: IndividualLineKind; productId: string; quantity: number; optionIds: string[]; notes: string; selections?: MenuSelection[]; }
export interface IndividualDeliveryAddress { text: string; latitude: number; longitude: number; }
export const DELIVERY_ADDRESS_QUERY_MIN_LENGTH = 3;
export const DELIVERY_ADDRESS_QUERY_MAX_LENGTH = 200;
export type DeliveryAddressSuggestion =
  | { kind: "street"; text: string }
  | ({ kind: "address" } & IndividualDeliveryAddress);
export interface IndividualCart {
  storeId: string; lines: IndividualLine[]; mode: "pickup" | "delivery"; slotId: string | null;
  notes: string; address?: IndividualDeliveryAddress;
  benefits?: PromotionSelection;
}
export interface IndividualDraft { version: 1; updatedAt: string; cart: IndividualCart; }
export interface IndividualQuote {
  fingerprint: string; subtotalCents: number; deliveryCents: number; totalCents: number;
  slotId: string; slotStartsAt: string; slotEndsAt?: string; slotTimeZone?: string;
  lines: { productId: string; name: string; quantity: number; unitCents: number; optionIds: string[]; notes: string; composition?: MenuComposition }[];
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
export interface StoreAddressCandidate { address: string; confirmation: string; }
export interface StoreAddressApi {
  searchStoreAddresses(storeId: string, query: string): Promise<StoreAddressCandidate[]>;
}
/** Public error payload, shared by HTTP and direct service callers. */
export type IndividualErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "product_unavailable" | "customization_changed" | "inventory_changed" | "slot_unavailable" | "price_changed" | "outside_delivery_area" | "minimum_not_met" | "idempotency_conflict" | "payment_unresolved" | "invalid_transition" | "service_unavailable" | "internal_error" | "revision_conflict" | "coupon_unavailable" | "coupon_limit_reached" | "loyalty_insufficient" | "loyalty_unavailable";
export interface IndividualApi {
  session(): Promise<IndividualSession>;
  stores(): Promise<IndividualStore[]>;
  catalog(storeId: string): Promise<IndividualStore>;
  searchDeliveryAddresses?(storeId: string, query: string, signal?: AbortSignal): Promise<DeliveryAddressSuggestion[]>;
  quote(cart: IndividualCart): Promise<IndividualQuote>;
  checkout(input: IndividualCheckout): Promise<IndividualCheckoutResult>;
  orders(storeId?: string): Promise<IndividualOrder[]>;
  reconcile(orderId: string): Promise<IndividualCheckoutResult>;
  action(orderId: string, input: IndividualAction): Promise<IndividualOrder>;
  notes(orderId: string, notes: string): Promise<IndividualOrder>;
  additionQuote?(orderId: string, lines: IndividualLine[]): Promise<IndividualAdditionQuote>;
  additions?(orderId: string, input: IndividualAdditionRequest): Promise<IndividualCheckoutResult>;
  saveStore(store: IndividualStore, addressConfirmation?: string): Promise<IndividualStore>;
  invite(storeId: string, email: string): Promise<void>;
  events(cursor: number, storeId?: string): Promise<{ cursor: number; events: IndividualEvent[] }>;
}
