import type {
  Coupon,
  EntityIdentifier,
  LoyaltyState,
  Menu,
  Money,
  Order,
  Product,
  SlotAvailability
} from "./index";

/**
 * Frontend boundary for the client ordering experience.
 *
 * The POC implements this boundary with local, deterministic state. A future
 * transport adapter can implement the same port without changing client UI.
 */
export interface ClientApiContract
{
  getCatalog(query: ClientCatalogQuery): Promise<ClientCatalogResponse>;
  getCart(query: ClientCartQuery): Promise<ClientCartResponse>;
  addCartLine(request: ClientAddCartLineRequest): Promise<ClientCartResponse>;
  updateCartLine(request: ClientUpdateCartLineRequest): Promise<ClientCartResponse>;
  removeCartLine(request: ClientRemoveCartLineRequest): Promise<ClientCartResponse>;
  checkout(request: ClientCheckoutRequest): Promise<ClientCheckoutResponse>;
  listOrders(query: ClientOrdersQuery): Promise<ClientOrdersResponse>;
  reorder(request: ClientReorderRequest): Promise<ClientReorderResponse>;
  getLoyalty(query: ClientLoyaltyQuery): Promise<ClientLoyaltyResponse>;
  redeemReward(request: ClientRedeemRewardRequest): Promise<ClientRedeemRewardResponse>;
  getTracking(query: ClientTrackingQuery): Promise<ClientTrackingResponse>;
}

export interface ClientCatalogQuery
{
  readonly storeId: EntityIdentifier;
  readonly fulfillment: ClientFulfillmentMethod;
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
  readonly removedIngredientIds: readonly EntityIdentifier[];
}

export interface ClientCart
{
  readonly id: EntityIdentifier;
  readonly customerId: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly lines: readonly ClientCartLine[];
  readonly updatedAtIso: string;
}

export interface ClientCartQuery
{
  readonly customerId: EntityIdentifier;
  readonly storeId: EntityIdentifier;
}

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
  readonly removedIngredientIds?: readonly EntityIdentifier[];
}

export interface ClientUpdateCartLineRequest
{
  readonly cartId: EntityIdentifier;
  readonly lineId: EntityIdentifier;
  readonly quantity: number;
  readonly notes?: string;
  readonly removedIngredientIds?: readonly EntityIdentifier[];
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
  /** Last four digits only; raw card credentials must never enter this contract. */
  readonly cardLastDigits?: string;
}

export interface ClientCheckoutRequest
{
  readonly cartId: EntityIdentifier;
  readonly fulfillment: ClientFulfillmentMethod;
  readonly slotId: EntityIdentifier;
  readonly payment: ClientPaymentDetails;
  readonly tipPercent: number;
  readonly couponCode?: string;
}

export interface ClientCheckoutResponse
{
  readonly order: Order;
  readonly earnedLoyaltyPoints: number;
  readonly loyalty: LoyaltyState;
}

export interface ClientOrdersQuery
{
  readonly customerId: EntityIdentifier;
  readonly statuses?: readonly Order["status"][];
}

export interface ClientOrdersResponse
{
  readonly orders: readonly Order[];
}

export interface ClientReorderRequest
{
  readonly orderId: EntityIdentifier;
  readonly customerId: EntityIdentifier;
}

export interface ClientReorderResponse
{
  readonly cart: ClientCart;
  readonly unavailableProductIds: readonly EntityIdentifier[];
}

export interface ClientLoyaltyQuery
{
  readonly customerId: EntityIdentifier;
}

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
  readonly customerId: EntityIdentifier;
  readonly rewardId: EntityIdentifier;
}

export interface ClientRedeemRewardResponse
{
  readonly loyalty: LoyaltyState;
  readonly coupon: Coupon;
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
