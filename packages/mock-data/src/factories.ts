import type { EntityIdentifier, InventoryItem, Money, Order } from "@pizzaos/domain";
import { DEFAULT_CURRENCY_CODE } from "./constants";

export interface OrderLineInput
{
  readonly productId: EntityIdentifier;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly notes: string;
}

export function toMoney(amountCents: number): Money
{
  return {
    amountCents,
    currencyCode: DEFAULT_CURRENCY_CODE
  };
}

export function createLine(
  productId: EntityIdentifier,
  quantity: number,
  unitPriceCents: number,
  notes: string
): OrderLineInput
{
  return {
    productId,
    quantity,
    unitPrice: toMoney(unitPriceCents),
    notes
  };
}

export function createOrder(
  id: EntityIdentifier,
  storeId: EntityIdentifier,
  customerId: EntityIdentifier,
  status: Order["status"],
  createdAtIso: string,
  scheduledSlot: string,
  lines: readonly OrderLineInput[],
  deliveryFeeCents: number
): Order
{
  const subtotalAmountCents = lines.reduce(
    (runningTotal, orderLine) => runningTotal + orderLine.quantity * orderLine.unitPrice.amountCents,
    0
  );

  return {
    id,
    storeId,
    customerId,
    lines,
    subtotal: toMoney(subtotalAmountCents),
    discountTotal: toMoney(0),
    deliveryFee: toMoney(deliveryFeeCents),
    total: toMoney(subtotalAmountCents + deliveryFeeCents),
    status,
    scheduledSlot,
    createdAtIso,
    updatedAtIso: createdAtIso
  };
}

export function createInventoryItem(
  id: EntityIdentifier,
  storeId: EntityIdentifier,
  sku: string,
  productId: EntityIdentifier,
  availableUnits: number,
  reorderThreshold: number
): InventoryItem
{
  return {
    id,
    storeId,
    sku,
    productId,
    availableUnits,
    reorderThreshold,
    status: getInventoryStatus(availableUnits, reorderThreshold)
  };
}

function getInventoryStatus(availableUnits: number, reorderThreshold: number): InventoryItem["status"]
{
  if (availableUnits <= 0)
  {
    return "out_of_stock";
  }

  if (availableUnits <= reorderThreshold)
  {
    return "low_stock";
  }

  return "in_stock";
}
