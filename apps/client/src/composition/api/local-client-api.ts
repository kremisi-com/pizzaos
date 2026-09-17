import type {
  ClientAddCartLineRequest,
  ClientAddGroupOrderLineRequest,
  ClientApiContract,
  ClientApplyCouponRequest,
  ClientCart,
  ClientCartLine,
  ClientCartQuery,
  ClientCatalogQuery,
  ClientCheckoutRequest,
  ClientCheckoutStatusResponse,
  ClientCouponApplicationResponse,
  ClientGroupOrder,
  ClientGroupOrderQuery,
  ClientGroupOrderResponse,
  ClientLiveUpdatesQuery,
  ClientLiveUpdatesResponse,
  ClientLoyaltyQuery,
  ClientLoyaltyResponse,
  ClientRedeemRewardRequest,
  ClientRemoveCartLineRequest,
  ClientRemoveGroupOrderLineRequest,
  ClientReorderRequest,
  ClientTrackingQuery,
  ClientTrackingResponse,
  ClientUpdateCartLineRequest,
  ClientUpdateGroupOrderLineRequest,
  Coupon,
  EntityIdentifier,
  LoyaltyState
} from "@pizzaos/domain";
import type { DemoStorage } from "@pizzaos/mock-data";
import { createMockOrder, DELIVERY_FEE_CENTS, deriveCheckoutTotals } from "../../features/checkout/checkout-model";
import { deriveCustomizationPrice, type CustomizationState, type IngredientMode } from "../../features/customization/customization-model";
import {
  addCartItem,
  clearCartState,
  loadCartState,
  removeCartItem,
  saveCartState,
  type CartItem,
  type CartState
} from "../../features/cart/cart-model";
import {
  addGroupOrderItem,
  loadGroupOrderState,
  removeGroupOrderItem,
  saveGroupOrderState,
  type GroupOrderState
} from "../../features/group-order/group-order-model";
import { loadClientDemoState, saveClientDemoState } from "../client-demo-state";
import { applyCouponCode, deriveCheckoutCoupons, deriveEarnedLoyaltyPoints, deriveRedeemableRewards, resolveLoyaltyTierId } from "../../features/loyalty/loyalty-model";
import { createCartStateFromOrder, deriveTrackingSnapshot } from "../../features/orders/orders-model";

export const CLIENT_CART_ID = "client-cart";
export const DEFAULT_GROUP_ORDER_ID = "group-order-stasera";

export interface LocalClientApiOptions
{
  readonly storage?: DemoStorage;
  readonly now?: () => Date;
}

export const LOCAL_CART_ID = CLIENT_CART_ID;
export const LOCAL_GROUP_ORDER_ID = DEFAULT_GROUP_ORDER_ID;

/** Local repository implementing the same port an HTTP transport will implement later. */
export class LocalClientApi implements ClientApiContract
{
  private readonly storage: DemoStorage | undefined;
  private readonly now: () => Date;

  constructor(options: LocalClientApiOptions = {})
  {
    this.storage = options.storage ?? resolveBrowserStorage();
    this.now = options.now ?? (() => new Date());
  }

  async getCatalog(query: ClientCatalogQuery)
  {
    void query;
    const seed = this.loadSeed();
    return { menu: seed.menu, products: seed.products, slots: seed.slots, generatedAtIso: this.nowIso() };
  }

  async getSession()
  {
    const seed = this.loadSeed();
    return { session: seed.session, customer: seed.customer };
  }

  async getCart(query: ClientCartQuery)
  {
    void query;
    const seed = this.loadSeed();
    return { cart: this.toCart(loadCartState(this.storage), seed.session.customerId, seed.session.activeStoreId) };
  }

  async addCartLine(request: ClientAddCartLineRequest)
  {
    this.ensureCart(request.cartId);
    const seed = this.loadSeed();
    const product = this.getProduct(request.productId);
    const state = addCartItem({
      productId: product.id,
      productName: product.name,
      unitPriceCents: resolveUnitPrice(product.id, product.basePrice.amountCents, request.customization),
      quantity: request.quantity,
      notes: request.notes,
      customization: request.customization
    }, this.storage);
    return { cart: this.toCart(state, seed.session.customerId, seed.session.activeStoreId) };
  }

  async updateCartLine(request: ClientUpdateCartLineRequest)
  {
    this.ensureCart(request.cartId);
    const state = loadCartState(this.storage);
    const nextState: CartState = {
      items: state.items.map((line) => line.id === request.lineId
        ? { ...line, quantity: Math.max(1, Math.round(request.quantity)), notes: request.notes ?? line.notes, customization: request.customization ?? line.customization }
        : line)
    };
    const seed = this.loadSeed();
    return { cart: this.toCart(saveCartState(nextState, this.storage), seed.session.customerId, seed.session.activeStoreId) };
  }

  async removeCartLine(request: ClientRemoveCartLineRequest)
  {
    this.ensureCart(request.cartId);
    const seed = this.loadSeed();
    return { cart: this.toCart(removeCartItem(request.lineId, this.storage), seed.session.customerId, seed.session.activeStoreId) };
  }

  async checkout(request: ClientCheckoutRequest)
  {
    this.ensureCart(request.cartId);
    const seed = this.loadSeed();
    const cartState = loadCartState(this.storage);
    const couponResult = request.couponCode
      ? this.applyCoupon({ cartId: request.cartId, couponCode: request.couponCode, referenceIso: this.nowIso() })
      : null;
    const coupon = couponResult ? await couponResult : null;
    const order = createMockOrder({
      storeId: seed.session.activeStoreId,
      customerId: seed.session.customerId,
      contact: request.contact,
      fulfillment: request.fulfillment.method === "delivery"
        ? { method: "delivery", address: this.getDefaultDeliveryAddress(seed), instructions: request.fulfillment.instructions }
        : { method: "pickup", storeId: seed.session.activeStoreId },
      items: cartState.items,
      selectedSlotId: request.fulfillment.slotId,
      totals: deriveCheckoutTotals(cartState.items, { tipPercent: request.tipPercent, deliveryFeeCents: request.fulfillment.method === "delivery" ? DELIVERY_FEE_CENTS : 0, discountCents: coupon?.discount.amountCents ?? 0 }),
      createdAtIso: this.nowIso()
    });
    const earnedLoyaltyPoints = deriveEarnedLoyaltyPoints(order.subtotal.amountCents - order.discountTotal.amountCents);
    const loyalty: LoyaltyState = { ...seed.loyalty, pointsBalance: seed.loyalty.pointsBalance + earnedLoyaltyPoints, currentTierId: resolveLoyaltyTierId(seed.loyalty.pointsBalance + earnedLoyaltyPoints) };
    saveClientDemoState({ ...seed, loyalty, activeOrders: [order, ...seed.activeOrders], orderHistory: [order, ...seed.orderHistory] }, this.storage);
    clearCartState(this.storage);
    return {
      order,
      payment: {
        id: `payment-local-${order.id}`,
        orderId: order.id,
        idempotencyKey: request.idempotencyKey,
        provider: request.payment.method === "cash" ? "cash" as const : "stripe" as const,
        status: request.payment.method === "cash" ? "cash_due" as const : "succeeded" as const,
        summary: { method: request.payment.method },
        createdAtIso: order.createdAtIso,
        updatedAtIso: order.updatedAtIso
      },
      earnedLoyaltyPoints,
      loyalty
    };
  }

  async getCheckoutStatus(orderId: EntityIdentifier): Promise<ClientCheckoutStatusResponse>
  {
    const result = await this.listOrders({});
    const order = result.orders.find((candidate) => candidate.id === orderId);
    if (!order)
    {
      throw new Error("Ordine non trovato.");
    }
    const seed = this.loadSeed();
    return {
      order,
      payment: {
        id: `payment-local-${order.id}`,
        orderId: order.id,
        idempotencyKey: "local-confirmed",
        provider: "cash",
        status: "cash_due",
        summary: { method: "cash" },
        createdAtIso: order.createdAtIso,
        updatedAtIso: order.updatedAtIso
      },
      earnedLoyaltyPoints: 0,
      loyalty: seed.loyalty
    };
  }

  async listOrders(query: { readonly statuses?: readonly import("@pizzaos/domain").Order["status"][] })
  {
    const seed = this.loadSeed();
    const uniqueOrders = new Map([...seed.activeOrders, ...seed.orderHistory].map((order) => [order.id, order]));
    const orders = [...uniqueOrders.values()].filter((order) => !query.statuses || query.statuses.includes(order.status));
    return { orders };
  }

  async reorder(request: ClientReorderRequest)
  {
    const seed = this.loadSeed();
    const order = [...seed.activeOrders, ...seed.orderHistory].find((candidate) => candidate.id === request.orderId);
    if (!order)
    {
      throw new Error("Ordine non trovato.");
    }
    const unavailableProductIds = order.lines
      .map((line) => line.productId)
      .filter((productId) => this.getProduct(productId).status !== "available");
    const cart = createCartStateFromOrder({ ...order, lines: order.lines.filter((line) => !unavailableProductIds.includes(line.productId)) }, seed.products);
    saveCartState(cart, this.storage);
    return { cart: this.toCart(cart, seed.session.customerId, seed.session.activeStoreId), unavailableProductIds };
  }

  async getLoyalty(query: ClientLoyaltyQuery): Promise<ClientLoyaltyResponse>
  {
    void query;
    const seed = this.loadSeed();
    return { loyalty: seed.loyalty, rewards: deriveRedeemableRewards(seed.loyalty.pointsBalance).map((reward) => ({ id: reward.id, title: reward.title, requiredPoints: reward.requiredPoints, couponCode: reward.couponCode })), coupons: deriveCheckoutCoupons(seed.coupons, seed.loyalty) };
  }

  async redeemReward(request: ClientRedeemRewardRequest)
  {
    const seed = this.loadSeed();
    const reward = deriveRedeemableRewards(seed.loyalty.pointsBalance).find((candidate) => candidate.id === request.rewardId);
    if (!reward || !reward.isRedeemable)
    {
      throw new Error("Reward non disponibile.");
    }
    const loyalty = { ...seed.loyalty, pointsBalance: seed.loyalty.pointsBalance - reward.requiredPoints, currentTierId: resolveLoyaltyTierId(seed.loyalty.pointsBalance - reward.requiredPoints) };
    const coupon: Coupon = { id: `coupon-reward-${reward.id}-${this.now().getTime()}`, code: reward.couponCode, status: "active", discountAmount: { amountCents: reward.discountCents, currencyCode: "EUR" }, minOrderAmount: { amountCents: reward.minimumOrderCents, currencyCode: "EUR" }, validFromIso: this.nowIso(), validUntilIso: "2026-12-31T23:59:59.000Z", maxRedemptions: 1 };
    saveClientDemoState({ ...seed, loyalty, coupons: [...seed.coupons, coupon] }, this.storage);
    return { loyalty, coupon };
  }

  async applyCoupon(request: ClientApplyCouponRequest): Promise<ClientCouponApplicationResponse>
  {
    this.ensureCart(request.cartId);
    const seed = this.loadSeed();
    const result = applyCouponCode({ rawCode: request.couponCode, coupons: deriveCheckoutCoupons(seed.coupons, seed.loyalty), subtotalCents: loadCartState(this.storage).items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0), referenceIso: request.referenceIso });
    return { status: result.status, message: result.message, normalizedCode: result.normalizedCode, coupon: result.coupon, discount: { amountCents: result.discountCents, currencyCode: "EUR" as const } };
  }

  async getGroupOrder(query: ClientGroupOrderQuery): Promise<ClientGroupOrderResponse>
  {
    const seed = this.loadSeed();
    this.ensureGroupOrder(query.groupOrderId);
    return { groupOrder: this.toGroupOrder(loadGroupOrderState(this.storage), seed.store.id) };
  }

  async addGroupOrderLine(request: ClientAddGroupOrderLineRequest)
  {
    this.ensureGroupOrder(request.groupOrderId);
    const product = this.getProduct(request.productId);
    const state = addGroupOrderItem({ productId: product.id, productName: product.name, unitPriceCents: resolveUnitPrice(product.id, product.basePrice.amountCents, request.customization), quantity: request.quantity, notes: request.notes, customization: request.customization }, this.storage);
    return { groupOrder: this.toGroupOrder(state, this.loadSeed().store.id) };
  }

  async updateGroupOrderLine(request: ClientUpdateGroupOrderLineRequest)
  {
    this.ensureGroupOrder(request.groupOrderId);
    const state = loadGroupOrderState(this.storage);
    const nextState: GroupOrderState = { ...state, items: state.items.map((line) => line.id === request.lineId ? { ...line, quantity: Math.max(1, Math.round(request.quantity)), notes: request.notes ?? line.notes, customization: request.customization ?? line.customization } : line) };
    return { groupOrder: this.toGroupOrder(saveGroupOrderState(nextState, this.storage), this.loadSeed().store.id) };
  }

  async removeGroupOrderLine(request: ClientRemoveGroupOrderLineRequest)
  {
    this.ensureGroupOrder(request.groupOrderId);
    return { groupOrder: this.toGroupOrder(removeGroupOrderItem(request.lineId, this.storage), this.loadSeed().store.id) };
  }

  async getTracking(query: ClientTrackingQuery): Promise<ClientTrackingResponse>
  {
    const order = (await this.listOrders({})).orders.find((candidate) => candidate.id === query.orderId);
    if (!order)
    {
      throw new Error("Ordine non trovato.");
    }
    const snapshot = deriveTrackingSnapshot(order);
    if (!snapshot || snapshot.visibility === "hidden")
    {
      return { orderId: order.id, status: "waiting_for_dispatch", updatedAtIso: order.updatedAtIso, rider: null };
    }
    return { orderId: order.id, status: snapshot.visibility === "delivered" ? "delivered" : "out_for_delivery", updatedAtIso: snapshot.lastUpdatedAtIso, rider: { id: order.riderId ?? "rider-pizzaos", name: snapshot.riderLabel, position: { lat: 41.9028, lng: 12.4964 } } };
  }

  async getLiveUpdates(query: ClientLiveUpdatesQuery): Promise<ClientLiveUpdatesResponse>
  {
    void query;
    const seed = this.loadSeed();
    const generatedAtIso = this.nowIso();

    return {
      events: [],
      nextCursor: `local-${seed.simulationCursorIso}`,
      generatedAtIso
    };
  }

  private loadSeed() { return loadClientDemoState(this.storage); }
  private nowIso(): string { return this.now().toISOString(); }
  private ensureCart(cartId: EntityIdentifier): void { if (cartId !== CLIENT_CART_ID) throw new Error("Carrello non trovato."); }
  private ensureGroupOrder(groupOrderId: EntityIdentifier): void { if (groupOrderId !== DEFAULT_GROUP_ORDER_ID) throw new Error("Ordine di gruppo non trovato."); }
  private getDefaultDeliveryAddress(seed: ReturnType<typeof loadClientDemoState>) { const address = seed.customer.deliveryAddresses.find((candidate) => candidate.id === seed.customer.defaultDeliveryAddressId); if (!address) throw new Error("Indirizzo di consegna non trovato."); return address; }
  private getProduct(productId: EntityIdentifier) { const product = this.loadSeed().products.find((candidate) => candidate.id === productId); if (!product) throw new Error("Prodotto non trovato."); return product; }
  private toCart(state: CartState, customerId: EntityIdentifier, storeId: EntityIdentifier): ClientCart { return { id: CLIENT_CART_ID, customerId, storeId, lines: state.items.map((item) => this.toCartLine(item)), updatedAtIso: this.nowIso() }; }
  private toCartLine(item: CartItem): ClientCartLine { return { id: item.id, productId: item.productId, quantity: item.quantity, unitPrice: { amountCents: item.unitPriceCents, currencyCode: "EUR" }, notes: item.notes, customization: item.customization ?? null }; }
  private toGroupOrder(state: GroupOrderState, storeId: EntityIdentifier): ClientGroupOrder { return { id: DEFAULT_GROUP_ORDER_ID, storeId, name: state.name, participants: state.participants, lines: state.items.map((item) => ({ ...this.toCartLine(item), participantId: item.participantId })), updatedAtIso: this.nowIso() }; }
}

export function createLocalClientApi(options?: LocalClientApiOptions | DemoStorage): ClientApiContract
{
  return new LocalClientApi(isDemoStorage(options) ? { storage: options } : options);
}

function resolveBrowserStorage(): DemoStorage | undefined
{
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function isDemoStorage(value: LocalClientApiOptions | DemoStorage | undefined): value is DemoStorage
{
  return Boolean(value && "getItem" in value && "setItem" in value && "removeItem" in value);
}

function resolveUnitPrice(productId: string, basePriceCents: number, customization: import("@pizzaos/domain").ClientProductCustomization | null | undefined): number
{
  if (!customization)
  {
    return basePriceCents;
  }

  const ingredientModes = Object.fromEntries(customization.ingredientSelections.map((selection) => [
    selection.ingredientId,
    selection.mode === "standard" ? "normale" : selection.mode
  ])) as Readonly<Record<string, IngredientMode>>;
  const state: CustomizationState = { currentStepIndex: 0, selectedDoughId: customization.doughId, selectedBaseId: customization.baseId, selectedVariantId: customization.variantId, ingredientModes, selectedExtraIds: customization.extraIds };
  return deriveCustomizationPrice(productId, basePriceCents, state).totalCents;
}
