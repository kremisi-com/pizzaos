import type {
  Coupon,
  CustomerProfile,
  CustomerSession,
  DeliveryInstructions,
  EntityIdentifier,
  LoyaltyState,
  Menu,
  Money,
  Order,
  OrderContact,
  PaymentAttempt,
  Product,
  ProductStatus,
  SlotAvailability
} from "./model";

/**
 * Frontend boundary for the client ordering experience.
 *
 * The POC implements this boundary with local, deterministic state. A future
 * transport adapter can implement the same port without changing client UI.
 */
export interface ClientApiContract
{
  getSession(): Promise<ClientSessionResponse>;
  getCatalog(query: ClientCatalogQuery): Promise<ClientCatalogResponse>;
  getCart(query: ClientCartQuery): Promise<ClientCartResponse>;
  addCartLine(request: ClientAddCartLineRequest): Promise<ClientCartResponse>;
  updateCartLine(request: ClientUpdateCartLineRequest): Promise<ClientCartResponse>;
  removeCartLine(request: ClientRemoveCartLineRequest): Promise<ClientCartResponse>;
  checkout(request: ClientCheckoutRequest): Promise<ClientCheckoutResponse>;
  getCheckoutStatus(orderId: EntityIdentifier): Promise<ClientCheckoutStatusResponse>;
  listOrders(query: ClientOrdersQuery): Promise<ClientOrdersResponse>;
  reorder(request: ClientReorderRequest): Promise<ClientReorderResponse>;
  getLoyalty(query: ClientLoyaltyQuery): Promise<ClientLoyaltyResponse>;
  redeemReward(request: ClientRedeemRewardRequest): Promise<ClientRedeemRewardResponse>;
  applyCoupon(request: ClientApplyCouponRequest): Promise<ClientCouponApplicationResponse>;
  getGroupOrder(query: ClientGroupOrderQuery): Promise<ClientGroupOrderResponse>;
  addGroupOrderLine(request: ClientAddGroupOrderLineRequest): Promise<ClientGroupOrderResponse>;
  updateGroupOrderLine(request: ClientUpdateGroupOrderLineRequest): Promise<ClientGroupOrderResponse>;
  removeGroupOrderLine(request: ClientRemoveGroupOrderLineRequest): Promise<ClientGroupOrderResponse>;
  getTracking(query: ClientTrackingQuery): Promise<ClientTrackingResponse>;
  getLiveUpdates(query: ClientLiveUpdatesQuery): Promise<ClientLiveUpdatesResponse>;
}

export interface ClientCatalogQuery
{
  readonly fulfillment: ClientFulfillmentMethod;
}

export interface ClientSessionResponse
{
  readonly session: CustomerSession;
  readonly customer: CustomerProfile;
}

export interface ClientCatalogResponse
{
  readonly menu: Menu;
  readonly products: readonly Product[];
  readonly slots: readonly SlotAvailability[];
  readonly generatedAtIso: string;
}

export type ClientFulfillmentMethod = "delivery" | "pickup";

export interface ClientCartLine
{
  readonly id: EntityIdentifier;
  readonly productId: EntityIdentifier;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly notes: string;
  readonly customization: ClientProductCustomization | null;
}

/** Structured kitchen-facing pizza choices. Free text is deliberately limited
 * to the optional customer note, never used to encode menu selections. */
export interface ClientProductCustomization
{
  readonly doughId: EntityIdentifier;
  readonly baseId: EntityIdentifier;
  readonly variantId: EntityIdentifier;
  readonly ingredientSelections: readonly ClientIngredientSelection[];
  readonly extraIds: readonly EntityIdentifier[];
}

export type ClientIngredientSelectionMode = "standard" | "senza" | "extra";

export interface ClientIngredientSelection
{
  readonly ingredientId: EntityIdentifier;
  readonly mode: ClientIngredientSelectionMode;
}

export interface ClientCart
{
  readonly id: EntityIdentifier;
  readonly customerId: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly lines: readonly ClientCartLine[];
  readonly updatedAtIso: string;
}

export type ClientCartQuery = object;

export interface ClientCartResponse
{
  readonly cart: ClientCart;
}

export interface ClientAddCartLineRequest
{
  readonly cartId: EntityIdentifier;
  readonly productId: EntityIdentifier;
  readonly quantity: number;
  readonly notes?: string;
  readonly customization?: ClientProductCustomization | null;
}

export interface ClientUpdateCartLineRequest
{
  readonly cartId: EntityIdentifier;
  readonly lineId: EntityIdentifier;
  readonly quantity: number;
  readonly notes?: string;
  readonly customization?: ClientProductCustomization | null;
}

export interface ClientRemoveCartLineRequest
{
  readonly cartId: EntityIdentifier;
  readonly lineId: EntityIdentifier;
}

export type ClientPaymentMethod = "card" | "cash";

export interface ClientPaymentDetails
{
  readonly method: ClientPaymentMethod;
  /** Stripe PaymentMethod id only; raw card credentials never enter this contract. */
  readonly paymentMethodId?: string;
}

export interface ClientDeliveryCheckoutFulfillment
{
  readonly method: "delivery";
  readonly slotId: EntityIdentifier;
  readonly instructions: DeliveryInstructions;
}

export interface ClientPickupCheckoutFulfillment
{
  readonly method: "pickup";
  readonly slotId: EntityIdentifier;
}

export type ClientCheckoutFulfillment = ClientDeliveryCheckoutFulfillment | ClientPickupCheckoutFulfillment;

export interface ClientCheckoutRequest
{
  readonly cartId: EntityIdentifier;
  readonly contact: OrderContact;
  readonly fulfillment: ClientCheckoutFulfillment;
  readonly payment: ClientPaymentDetails;
  readonly tipPercent: number;
  readonly couponCode?: string;
  /** UUID retained for a single network retry; a declined card gets a fresh attempt/key. */
  readonly idempotencyKey: string;
}

export interface ClientCheckoutResponse
{
  readonly order: Order;
  readonly payment: PaymentAttempt;
  /** Present only for a card PaymentIntent and passed directly to Stripe.js. */
  readonly paymentClientSecret?: string;
  readonly earnedLoyaltyPoints: number;
  readonly loyalty: LoyaltyState;
}

export interface ClientCheckoutStatusResponse
{
  readonly order: Order;
  readonly payment: PaymentAttempt;
  readonly earnedLoyaltyPoints: number;
  readonly loyalty: LoyaltyState;
}

export interface ClientOrdersQuery
{
  readonly statuses?: readonly Order["status"][];
}

export interface ClientOrdersResponse
{
  readonly orders: readonly Order[];
}

export interface ClientReorderRequest
{
  readonly orderId: EntityIdentifier;
}

export interface ClientReorderResponse
{
  readonly cart: ClientCart;
  readonly unavailableProductIds: readonly EntityIdentifier[];
}

export type ClientLoyaltyQuery = object;

export interface ClientReward
{
  readonly id: EntityIdentifier;
  readonly title: string;
  readonly requiredPoints: number;
  readonly couponCode?: string;
}

export interface ClientLoyaltyResponse
{
  readonly loyalty: LoyaltyState;
  readonly rewards: readonly ClientReward[];
  readonly coupons: readonly Coupon[];
}

export interface ClientRedeemRewardRequest
{
  readonly rewardId: EntityIdentifier;
}

export interface ClientRedeemRewardResponse
{
  readonly loyalty: LoyaltyState;
  readonly coupon: Coupon;
}

export interface ClientApplyCouponRequest
{
  readonly cartId: EntityIdentifier;
  readonly couponCode: string;
  readonly referenceIso: string;
}

export type ClientCouponApplicationStatus = "applied" | "empty_code" | "not_found" | "inactive" | "minimum_not_met";

export interface ClientCouponApplicationResponse
{
  readonly status: ClientCouponApplicationStatus;
  readonly message: string;
  readonly normalizedCode: string;
  readonly coupon: Coupon | null;
  readonly discount: Money;
}

export interface ClientGroupOrderParticipant
{
  readonly id: EntityIdentifier;
  readonly name: string;
  readonly emoji: string;
  readonly isHost: boolean;
}

export interface ClientGroupOrderLine extends ClientCartLine
{
  readonly participantId: EntityIdentifier;
}

export interface ClientGroupOrder
{
  readonly id: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly name: string;
  readonly participants: readonly ClientGroupOrderParticipant[];
  readonly lines: readonly ClientGroupOrderLine[];
  readonly updatedAtIso: string;
}

export interface ClientGroupOrderQuery
{
  readonly groupOrderId: EntityIdentifier;
}

export interface ClientGroupOrderResponse
{
  readonly groupOrder: ClientGroupOrder;
}

export interface ClientAddGroupOrderLineRequest
{
  readonly groupOrderId: EntityIdentifier;
  readonly participantId: EntityIdentifier;
  readonly productId: EntityIdentifier;
  readonly quantity: number;
  readonly notes?: string;
  readonly customization?: ClientProductCustomization | null;
}

export interface ClientUpdateGroupOrderLineRequest
{
  readonly groupOrderId: EntityIdentifier;
  readonly lineId: EntityIdentifier;
  readonly quantity: number;
  readonly notes?: string;
  readonly customization?: ClientProductCustomization | null;
}

export interface ClientRemoveGroupOrderLineRequest
{
  readonly groupOrderId: EntityIdentifier;
  readonly lineId: EntityIdentifier;
}

export interface ClientTrackingQuery
{
  readonly orderId: EntityIdentifier;
}

export type ClientTrackingStatus = "waiting_for_dispatch" | "out_for_delivery" | "delivered";

export interface ClientTrackingResponse
{
  readonly orderId: EntityIdentifier;
  readonly status: ClientTrackingStatus;
  readonly updatedAtIso: string;
  readonly rider: ClientTrackingRider | null;
}

export interface ClientTrackingRider
{
  readonly id: EntityIdentifier;
  readonly name: string;
  readonly position: {
    readonly lat: number;
    readonly lng: number;
  };
}

/**
 * Pull-compatible live-update boundary. The same cursor and event envelopes
 * can be delivered by polling, Server-Sent Events, or WebSocket transports.
 * The client never advances an operational timeline by itself in production:
 * it renders the revision received from this boundary.
 */
export interface ClientLiveUpdatesQuery
{
  /** Omit on first load; return this value as `cursor` on the next request. */
  readonly cursor?: string;
  /** Limits a delivery stream without excluding stock and slot availability. */
  readonly orderIds?: readonly EntityIdentifier[];
}

export interface ClientLiveUpdatesResponse
{
  readonly events: readonly ClientLiveUpdateEvent[];
  readonly nextCursor: string;
  readonly generatedAtIso: string;
}

export interface ClientUpdateEnvelope
{
  readonly eventId: EntityIdentifier;
  /** Monotonic revision of the affected aggregate, assigned by the server. */
  readonly revision: number;
  readonly occurredAtIso: string;
}

export interface ClientOrderUpdatedEvent extends ClientUpdateEnvelope
{
  readonly type: "order_updated";
  readonly order: Order;
}

export interface ClientProductAvailabilityUpdatedEvent extends ClientUpdateEnvelope
{
  readonly type: "product_availability_updated";
  readonly productId: EntityIdentifier;
  readonly status: ProductStatus;
}

export interface ClientSlotAvailabilityUpdatedEvent extends ClientUpdateEnvelope
{
  readonly type: "slot_availability_updated";
  readonly slot: SlotAvailability;
}

export interface ClientTrackingUpdatedEvent extends ClientUpdateEnvelope
{
  readonly type: "tracking_updated";
  readonly tracking: ClientTrackingResponse;
}

export type ClientLiveUpdateEvent =
  | ClientOrderUpdatedEvent
  | ClientProductAvailabilityUpdatedEvent
  | ClientSlotAvailabilityUpdatedEvent
  | ClientTrackingUpdatedEvent;

/**
 * A server-authoritative availability rejection. It maps naturally to HTTP
 * 409, but remains transport-neutral for SSE and WebSocket implementations.
 */
export interface ClientAvailabilityConflict
{
  readonly code: "slot_unavailable" | "product_unavailable" | "inventory_changed";
  readonly message: string;
  readonly affectedProductIds: readonly EntityIdentifier[];
  readonly affectedSlotId?: EntityIdentifier;
  readonly availabilityRevision: number;
}
