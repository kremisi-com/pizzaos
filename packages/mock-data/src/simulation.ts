import { ORDER_STATUS, progressOrderStatus, type Order } from "@pizzaos/domain";
import { ORDER_SIMULATION_STEP_MS } from "./constants";
import type { OrderSimulationState } from "./types";
import { cloneData } from "./utils";

export function advanceOrderSimulation<State extends OrderSimulationState>(
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

  return {
    ...cloneData(state),
    orders: progressedOrders,
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
