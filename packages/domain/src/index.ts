export const APP_SURFACES = [
  "landing",
  "client",
  "admin"
] as const;

export type AppSurface = (typeof APP_SURFACES)[number];

export interface AppShellSeed
{
  readonly surface: AppSurface;
  readonly title: string;
  readonly subtitle: string;
}

export type EntityIdentifier = string;

export interface Money
{
  readonly amountCents: number;
  readonly currencyCode: "EUR";
}

export const PRODUCT_STATUS = [
  "available",
  "unavailable",
  "sold_out"
] as const;

export type ProductStatus = (typeof PRODUCT_STATUS)[number];

export interface ProductAllergen
{
  readonly code: string;
  readonly label: string;
}

export interface Product
{
  readonly id: EntityIdentifier;
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly basePrice: Money;
  readonly status: ProductStatus;
  readonly tags: readonly string[];
  readonly allergens: readonly ProductAllergen[];
}

export interface MenuProductRef
{
  readonly productId: EntityIdentifier;
  readonly isFeatured: boolean;
}

export interface MenuSection
{
  readonly id: EntityIdentifier;
  readonly name: string;
  readonly productRefs: readonly MenuProductRef[];
}

export const MENU_STATUS = [
  "draft",
  "scheduled",
  "active",
  "archived"
] as const;

export type MenuStatus = (typeof MENU_STATUS)[number];

export interface Menu
{
  readonly id: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly name: string;
  readonly status: MenuStatus;
  readonly sections: readonly MenuSection[];
}

export const ORDER_STATUS = [
  "received",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled"
] as const;

export type OrderStatus = (typeof ORDER_STATUS)[number];

export interface OrderLine
{
  readonly productId: EntityIdentifier;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly notes: string;
}

export interface Order
{
  readonly id: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly customerId: EntityIdentifier;
  readonly lines: readonly OrderLine[];
  readonly subtotal: Money;
  readonly discountTotal: Money;
  readonly deliveryFee: Money;
  readonly total: Money;
  readonly status: OrderStatus;
  readonly scheduledSlot: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface StoreProfile
{
  readonly id: EntityIdentifier;
  readonly code: string;
  readonly displayName: string;
  readonly city: string;
  readonly timezone: string;
  readonly isOpen: boolean;
}

export const INVENTORY_STATUS = [
  "in_stock",
  "low_stock",
  "out_of_stock"
] as const;

export type InventoryStatus = (typeof INVENTORY_STATUS)[number];

export interface InventoryItem
{
  readonly id: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly sku: string;
  readonly productId: EntityIdentifier;
  readonly availableUnits: number;
  readonly reorderThreshold: number;
  readonly status: InventoryStatus;
}

export const COUPON_STATUS = [
  "active",
  "inactive",
  "expired"
] as const;

export type CouponStatus = (typeof COUPON_STATUS)[number];

export interface Coupon
{
  readonly id: EntityIdentifier;
  readonly code: string;
  readonly status: CouponStatus;
  readonly discountAmount: Money;
  readonly minOrderAmount: Money;
  readonly validFromIso: string;
  readonly validUntilIso: string;
  readonly maxRedemptions: number;
}

export interface LoyaltyState
{
  readonly customerId: EntityIdentifier;
  readonly tier: "bronze" | "silver" | "gold";
  readonly pointsBalance: number;
  readonly nextTierPoints: number;
  readonly availableRewards: readonly string[];
}

export interface AnalyticsSnapshot
{
  readonly storeId: EntityIdentifier;
  readonly generatedAtIso: string;
  readonly ordersToday: number;
  readonly revenueToday: Money;
  readonly averageOrderValue: Money;
  readonly topProductIds: readonly EntityIdentifier[];
  readonly cancellationRate: number;
}

export const AI_INSIGHT_STATUS = [
  "new",
  "acknowledged",
  "dismissed"
] as const;

export type AiInsightStatus = (typeof AI_INSIGHT_STATUS)[number];

export interface AiInsight
{
  readonly id: EntityIdentifier;
  readonly storeId: EntityIdentifier;
  readonly title: string;
  readonly summary: string;
  readonly confidenceScore: number;
  readonly status: AiInsightStatus;
  readonly generatedAtIso: string;
}

export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  received: [
    "confirmed",
    "cancelled"
  ],
  confirmed: [
    "preparing",
    "cancelled"
  ],
  preparing: [
    "ready",
    "cancelled"
  ],
  ready: [
    "out_for_delivery",
    "delivered"
  ],
  out_for_delivery: [
    "delivered"
  ],
  delivered: [],
  cancelled: []
};

export function getNextOrderStatuses(status: OrderStatus): readonly OrderStatus[]
{
  return ORDER_STATUS_TRANSITIONS[status];
}

export function isOrderStatusTransitionAllowed(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean
{
  return ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

export function progressOrderStatus(currentStatus: OrderStatus): OrderStatus
{
  const nextStatuses = getNextOrderStatuses(currentStatus);

  if (nextStatuses.length === 0)
  {
    return currentStatus;
  }

  return nextStatuses[0];
}
