import type { Order, OrderStatus, Product } from "@pizzaos/domain";
import {
  advanceOrderSimulation,
  ORDER_SIMULATION_STEP_MS,
  type ClientSeed,
  type DemoStorage
} from "@pizzaos/mock-data";
import type { CartItem, CartState } from "../cart/cart-model";

export const CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY = "pizzaos:client:order-notifications:v1";
export const CLIENT_ORDER_SIMULATION_TICK_MS = 5000;

const TRACKING_BASE_MAP_POSITION = {
  xPercent: 52,
  yPercent: 54
} as const;

const ORDER_TIMELINE_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered"
];

const MAJOR_NOTIFICATION_STATUSES: readonly OrderStatus[] = [
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled"
];

export interface ClientOrderNotification
{
  readonly id: string;
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly title: string;
  readonly description: string;
  readonly createdAtIso: string;
  readonly isRead: boolean;
}

export interface OrderTimelineStep
{
  readonly status: OrderStatus;
  readonly label: string;
  readonly isCompleted: boolean;
  readonly isCurrent: boolean;
}

export interface TrackingSnapshotView
{
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly visibility: "hidden" | "active" | "delivered";
  readonly riderLabel: string;
  readonly summary: string;
  readonly lastUpdatedAtIso: string;
  readonly mapPosition: {
    readonly xPercent: number;
    readonly yPercent: number;
  };
}

export interface AdvanceClientOrderStateResult
{
  readonly seed: ClientSeed;
  readonly notifications: readonly ClientOrderNotification[];
}

export function cloneOrderForReorder(order: Order): Order
{
  return {
    ...order,
    lines: order.lines.map((line) => ({
      ...line,
      unitPrice: {
        ...line.unitPrice
      }
    })),
    subtotal: {
      ...order.subtotal
    },
    discountTotal: {
      ...order.discountTotal
    },
    deliveryFee: {
      ...order.deliveryFee
    },
    total: {
      ...order.total
    }
  };
}

export function createCartStateFromOrder(order: Order, products: readonly Product[]): CartState
{
  const clonedOrder = cloneOrderForReorder(order);
  const productsById = new Map(products.map((product) => [product.id, product]));

  return {
    items: clonedOrder.lines.map((line, lineIndex): CartItem => ({
      id: `cart-reorder-${clonedOrder.id}-${lineIndex + 1}`,
      productId: line.productId,
      productName: productsById.get(line.productId)?.name ?? line.productId,
      unitPriceCents: line.unitPrice.amountCents,
      quantity: Math.max(1, Math.round(line.quantity)),
      notes: line.notes,
      removedIngredients: []
    }))
  };
}

export function deriveLastReorderOrder(orderHistory: readonly Order[]): Order | null
{
  const latestDeliveredOrder = orderHistory.find((order) => order.status === "delivered");

  if (latestDeliveredOrder)
  {
    return latestDeliveredOrder;
  }

  return orderHistory.find((order) => order.status !== "cancelled") ?? null;
}

export function isArchivedOrder(order: Order): boolean
{
  return order.status === "delivered" || order.status === "cancelled";
}

export function loadOrderNotifications(storage?: DemoStorage): readonly ClientOrderNotification[]
{
  if (!storage)
  {
    return [];
  }

  const payload = storage.getItem(CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY);

  if (!payload)
  {
    return [];
  }

  try
  {
    const parsed = JSON.parse(payload) as unknown;

    if (!Array.isArray(parsed))
    {
      return [];
    }

    return parsed.filter((item): item is ClientOrderNotification => isClientOrderNotification(item));
  }
  catch
  {
    return [];
  }
}

export function saveOrderNotifications(
  notifications: readonly ClientOrderNotification[],
  storage?: DemoStorage
): readonly ClientOrderNotification[]
{
  if (!storage)
  {
    return notifications;
  }

  storage.setItem(CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));

  return notifications;
}

export function clearOrderNotifications(storage?: DemoStorage): readonly ClientOrderNotification[]
{
  if (storage)
  {
    storage.removeItem(CLIENT_ORDER_NOTIFICATIONS_STORAGE_KEY);
  }

  return [];
}

export function deriveUnreadOrderNotificationsCount(notifications: readonly ClientOrderNotification[]): number
{
  return notifications.filter((notification) => !notification.isRead).length;
}

export function markAllOrderNotificationsAsRead(
  notifications: readonly ClientOrderNotification[],
  storage?: DemoStorage
): readonly ClientOrderNotification[]
{
  const nextNotifications = notifications.map((notification) => ({
    ...notification,
    isRead: true
  }));

  return saveOrderNotifications(nextNotifications, storage);
}

export function mergeOrderNotifications(
  existingNotifications: readonly ClientOrderNotification[],
  incomingNotifications: readonly ClientOrderNotification[]
): readonly ClientOrderNotification[]
{
  if (incomingNotifications.length === 0)
  {
    return existingNotifications;
  }

  const existingById = new Map(existingNotifications.map((notification) => [notification.id, notification]));
  const merged = [...existingNotifications];

  for (const notification of incomingNotifications)
  {
    if (!existingById.has(notification.id))
    {
      merged.push(notification);
      existingById.set(notification.id, notification);
    }
  }

  return [...merged].sort((left, right) => Date.parse(right.createdAtIso) - Date.parse(left.createdAtIso));
}

export function advanceClientOrderState(
  seed: ClientSeed,
  notifications: readonly ClientOrderNotification[]
): AdvanceClientOrderStateResult
{
  const simulationOrders = seed.activeOrders.length > 0
    ? seed.activeOrders
    : seed.orderHistory.filter((order) => !isTerminalOrderStatus(order.status)).slice(0, 1);

  if (simulationOrders.length === 0)
  {
    return {
      seed,
      notifications
    };
  }

  const nextSimulationDate = deriveNextSimulationDate(seed.simulationCursorIso);
  const simulatedState = advanceOrderSimulation(
    {
      orders: simulationOrders,
      simulationCursorIso: seed.simulationCursorIso
    },
    nextSimulationDate
  );

  const progressedOrdersById = new Map(simulatedState.orders.map((order) => [order.id, order]));
  const changedOrders = simulationOrders.filter((previousOrder) =>
  {
    const progressedOrder = progressedOrdersById.get(previousOrder.id);

    if (!progressedOrder)
    {
      return false;
    }

    return progressedOrder.status !== previousOrder.status;
  });

  let updatedOrderHistory = seed.orderHistory.map((order) =>
  {
    const progressedOrder = progressedOrdersById.get(order.id);

    if (!progressedOrder)
    {
      return order;
    }

    return {
      ...order,
      status: progressedOrder.status,
      updatedAtIso: progressedOrder.updatedAtIso
    };
  });
  const historyOrderIds = new Set(updatedOrderHistory.map((order) => order.id));
  const missingHistoryOrders = simulatedState.orders.filter((order) => !historyOrderIds.has(order.id));

  if (missingHistoryOrders.length > 0)
  {
    updatedOrderHistory = [
      ...missingHistoryOrders,
      ...updatedOrderHistory
    ];
  }

  const updatedActiveOrders = simulatedState.orders.filter((order) => !isTerminalOrderStatus(order.status));
  const generatedNotifications = buildNotificationsFromOrderTransitions(changedOrders, simulatedState.orders);
  const nextNotifications = mergeOrderNotifications(notifications, generatedNotifications);

  return {
    seed: {
      ...seed,
      activeOrders: updatedActiveOrders,
      orderHistory: updatedOrderHistory,
      simulationCursorIso: simulatedState.simulationCursorIso
    },
    notifications: nextNotifications
  };
}

export function deriveOrderTimeline(status: OrderStatus): readonly OrderTimelineStep[]
{
  const currentIndex = ORDER_TIMELINE_STATUSES.indexOf(status);

  if (currentIndex >= 0)
  {
    return ORDER_TIMELINE_STATUSES.map((timelineStatus, statusIndex) => ({
      status: timelineStatus,
      label: getOrderStatusLabel(timelineStatus),
      isCompleted: statusIndex < currentIndex,
      isCurrent: statusIndex === currentIndex
    }));
  }

  return [
    ...ORDER_TIMELINE_STATUSES.map((timelineStatus) => ({
      status: timelineStatus,
      label: getOrderStatusLabel(timelineStatus),
      isCompleted: false,
      isCurrent: false
    })),
    {
      status: "cancelled",
      label: getOrderStatusLabel("cancelled"),
      isCompleted: false,
      isCurrent: true
    }
  ];
}

export function deriveTrackingSnapshot(order?: Order): TrackingSnapshotView | null
{
  if (!order)
  {
    return null;
  }

  if (order.status === "out_for_delivery")
  {
    return {
      orderId: order.id,
      status: order.status,
      visibility: "active",
      riderLabel: "Rider PizzaOS",
      summary: "Tracking rider attivo.",
      lastUpdatedAtIso: order.updatedAtIso,
      mapPosition: deriveRiderMapPosition(order)
    };
  }

  if (order.status === "delivered")
  {
    return {
      orderId: order.id,
      status: order.status,
      visibility: "delivered",
      riderLabel: "Rider PizzaOS",
      summary: "Ordine consegnato.",
      lastUpdatedAtIso: order.updatedAtIso,
      mapPosition: TRACKING_BASE_MAP_POSITION
    };
  }

  return {
    orderId: order.id,
    status: order.status,
    visibility: "hidden",
    riderLabel: "Rider PizzaOS",
    summary: "Tracking disponibile dopo la partenza del rider.",
    lastUpdatedAtIso: order.updatedAtIso,
    mapPosition: TRACKING_BASE_MAP_POSITION
  };
}

export function getOrderStatusLabel(status: OrderStatus): string
{
  const labels: Record<OrderStatus, string> = {
    received: "Ricevuto",
    confirmed: "Confermato",
    preparing: "In preparazione",
    ready: "Pronto",
    out_for_delivery: "In consegna",
    delivered: "Consegnato",
    cancelled: "Annullato"
  };

  return labels[status];
}

function buildNotificationsFromOrderTransitions(
  previousOrders: readonly Order[],
  nextOrders: readonly Order[]
): readonly ClientOrderNotification[]
{
  const nextOrdersById = new Map(nextOrders.map((order) => [order.id, order]));

  return previousOrders.flatMap((previousOrder) =>
  {
    const nextOrder = nextOrdersById.get(previousOrder.id);

    if (!nextOrder)
    {
      return [];
    }

    if (nextOrder.status === previousOrder.status)
    {
      return [];
    }

    if (!MAJOR_NOTIFICATION_STATUSES.includes(nextOrder.status))
    {
      return [];
    }

    return [
      createOrderNotification(nextOrder)
    ];
  });
}

function createOrderNotification(order: Order): ClientOrderNotification
{
  return {
    id: `order-notification-${order.id}-${order.status}`,
    orderId: order.id,
    status: order.status,
    title: `Ordine ${getOrderStatusLabel(order.status).toLowerCase()}`,
    description: getOrderNotificationDescription(order.status),
    createdAtIso: order.updatedAtIso,
    isRead: false
  };
}

function getOrderNotificationDescription(status: OrderStatus): string
{
  if (status === "preparing")
  {
    return "La cucina ha iniziato la preparazione.";
  }

  if (status === "ready")
  {
    return "Ordine pronto. Stiamo preparando la consegna.";
  }

  if (status === "out_for_delivery")
  {
    return "Il rider e partito. Puoi seguire il tracking.";
  }

  if (status === "delivered")
  {
    return "Consegna completata. Buon appetito.";
  }

  return "Ordine annullato.";
}

function deriveRiderMapPosition(order: Order): { readonly xPercent: number; readonly yPercent: number }
{
  const hashedValue = hashString(`${order.id}:${order.updatedAtIso}`);
  const xOffset = (hashedValue % 18) - 9;
  const yOffset = ((Math.floor(hashedValue / 18) % 18) - 9);

  return {
    xPercent: clamp(TRACKING_BASE_MAP_POSITION.xPercent + xOffset, 16, 86),
    yPercent: clamp(TRACKING_BASE_MAP_POSITION.yPercent + yOffset, 18, 82)
  };
}

function isTerminalOrderStatus(status: OrderStatus): boolean
{
  return status === "delivered" || status === "cancelled";
}

function isClientOrderNotification(value: unknown): value is ClientOrderNotification
{
  if (!isRecord(value))
  {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.orderId === "string" &&
    typeof value.status === "string" &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    typeof value.createdAtIso === "string" &&
    typeof value.isRead === "boolean"
  );
}

function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number): number
{
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string): number
{
  let hash = 0;

  for (let index = 0; index < value.length; index += 1)
  {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function deriveNextSimulationDate(simulationCursorIso: string): Date
{
  const cursorTimestamp = Date.parse(simulationCursorIso);

  if (!Number.isFinite(cursorTimestamp))
  {
    return new Date();
  }

  return new Date(cursorTimestamp + ORDER_SIMULATION_STEP_MS);
}
