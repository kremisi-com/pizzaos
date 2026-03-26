import { ORDER_STATUS, progressOrderStatus, type Order, type AnalyticsSnapshot } from "@pizzaos/domain";
import { ORDER_SIMULATION_STEP_MS } from "./constants";
import type { OrderSimulationState } from "./types";
import { cloneData } from "./utils";

export interface SimulationDataset extends OrderSimulationState
{
  readonly analytics?: AnalyticsSnapshot;
}

export function advanceOrderSimulation<State extends SimulationDataset>(
  state: State,
  now: Date | string
): State
{
  const nextCursorIso = toIsoString(now);
  const nextCursorMs = Date.parse(nextCursorIso);
  const previousCursorMs = Date.parse(state.simulationCursorIso);

  if (!Number.isFinite(nextCursorMs) || !Number.isFinite(previousCursorMs))
  {
    return cloneData(state);
  }

  if (nextCursorMs <= previousCursorMs)
  {
    return cloneData(state);
  }

  const elapsedSteps = Math.floor((nextCursorMs - previousCursorMs) / ORDER_SIMULATION_STEP_MS);

  if (elapsedSteps <= 0)
  {
    return {
      ...cloneData(state),
      simulationCursorIso: nextCursorIso
    };
  }

  const progressedOrders = state.orders.map((order) => progressOrderWithSteps(order, elapsedSteps, nextCursorIso));

  let nextAnalytics = state.analytics ? cloneData(state.analytics) : undefined;

  if (nextAnalytics)
  {
    // Update analytics based on newly delivered orders
    const newlyDelivered = progressedOrders.filter(
      (order, index) => order.status === "delivered" && state.orders[index].status !== "delivered"
    );

    if (newlyDelivered.length > 0)
    {
      const additionalRevenueCents = newlyDelivered.reduce((sum, order) => sum + order.total.amountCents, 0);

      const nextOrdersToday = nextAnalytics.ordersToday + newlyDelivered.length;
      const nextRevenueAmountCents = nextAnalytics.revenueToday.amountCents + additionalRevenueCents;

      nextAnalytics = {
        ...nextAnalytics,
        ordersToday: nextOrdersToday,
        revenueToday: {
          ...nextAnalytics.revenueToday,
          amountCents: nextRevenueAmountCents,
        },
        averageOrderValue: {
          ...nextAnalytics.averageOrderValue,
          amountCents: nextOrdersToday > 0 ? Math.round(nextRevenueAmountCents / nextOrdersToday) : 0,
        },
        generatedAtIso: nextCursorIso,
      };
    }
  }

  return {
    ...cloneData(state),
    orders: progressedOrders,
    analytics: nextAnalytics,
    simulationCursorIso: nextCursorIso
  };
}

export const SUPPORTED_ORDER_STATUSES = ORDER_STATUS;

function progressOrderWithSteps(order: Order, steps: number, updatedAtIso: string): Order
{
  let nextStatus = order.status;

  for (let stepIndex = 0; stepIndex < steps; stepIndex += 1)
  {
    nextStatus = progressOrderStatus(nextStatus);

    if (nextStatus === order.status || nextStatus === "cancelled" || nextStatus === "delivered")
    {
      break;
    }
  }

  if (nextStatus === order.status)
  {
    return order;
  }

  return {
    ...order,
    status: nextStatus,
    updatedAtIso
  };
}

function toIsoString(value: Date | string): string
{
  if (typeof value === "string")
  {
    const parsedTimestamp = Date.parse(value);

    if (!Number.isFinite(parsedTimestamp))
    {
      return value;
    }

    return new Date(parsedTimestamp).toISOString();
  }

  return value.toISOString();
}
