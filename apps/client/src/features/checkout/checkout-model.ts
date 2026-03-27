import type { Order, OrderLine, SlotAvailability } from "@pizzaos/domain";
import type { CartItem } from "../cart/cart-model";

export const TIP_PERCENT_OPTIONS = [
  0,
  5,
  10,
  15
] as const;

export const DELIVERY_FEE_CENTS = 200;
export const PAYMENT_SIMULATION_DELAY_MS = 450;

export type PaymentMethod = "card" | "cash";

export interface CheckoutTotals
{
  readonly subtotalCents: number;
  readonly tipCents: number;
  readonly deliveryFeeCents: number;
  readonly totalCents: number;
}

export interface CheckoutValidationInput
{
  readonly items: readonly CartItem[];
  readonly slots: readonly SlotAvailability[];
  readonly selectedSlotId: string;
  readonly paymentMethod: PaymentMethod;
  readonly cardholderName: string;
  readonly cardLastDigits: string;
}

export interface CheckoutValidationErrors
{
  cart?: string;
  selectedSlotId?: string;
  cardholderName?: string;
  cardLastDigits?: string;
}

export interface CreateMockOrderInput
{
  readonly storeId: string;
  readonly customerId: string;
  readonly items: readonly CartItem[];
  readonly selectedSlotLabel: string;
  readonly totals: CheckoutTotals;
  readonly createdAtIso: string;
}

export function deriveCartSubtotalCents(items: readonly CartItem[]): number
{
  return items.reduce((accumulator, item) => accumulator + item.unitPriceCents * item.quantity, 0);
}

export function deriveTipAmountCents(subtotalCents: number, tipPercent: number): number
{
  if (tipPercent <= 0)
  {
    return 0;
  }

  return Math.round(subtotalCents * (tipPercent / 100));
}

export function deriveCheckoutTotals(
  items: readonly CartItem[],
  options: {
    readonly tipPercent: number;
    readonly deliveryFeeCents?: number;
  }
): CheckoutTotals
{
  const subtotalCents = deriveCartSubtotalCents(items);
  const deliveryFeeCents = options.deliveryFeeCents ?? DELIVERY_FEE_CENTS;
  const tipCents = deriveTipAmountCents(subtotalCents, options.tipPercent);

  return {
    subtotalCents,
    tipCents,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents + tipCents
  };
}

export function resolveSlotSelection(slots: readonly SlotAvailability[], preferredSlotId?: string): string
{
  if (preferredSlotId)
  {
    const preferredSlot = slots.find((slot) => slot.slotId === preferredSlotId);

    if (preferredSlot && isSlotSelectable(preferredSlot))
    {
      return preferredSlot.slotId;
    }
  }

  const firstSelectableSlot = slots.find((slot) => isSlotSelectable(slot));

  return firstSelectableSlot?.slotId ?? "";
}

export function isSlotSelectable(slot: SlotAvailability): boolean
{
  return slot.status !== "sold_out";
}

export function validateCheckoutInput(input: CheckoutValidationInput): CheckoutValidationErrors
{
  const errors: CheckoutValidationErrors = {};

  if (input.items.length === 0)
  {
    return {
      cart: "Carrello vuoto. Aggiungi almeno un prodotto prima del checkout."
    };
  }

  const selectedSlot = input.slots.find((slot) => slot.slotId === input.selectedSlotId);

  if (!selectedSlot || !isSlotSelectable(selectedSlot))
  {
    errors.selectedSlotId = "Seleziona uno slot disponibile per continuare.";
  }

  if (input.paymentMethod === "card")
  {
    if (input.cardholderName.trim().length < 3)
    {
      errors.cardholderName = "Inserisci il nome intestatario della carta.";
    }

    if (!/^\d{4}$/.test(input.cardLastDigits))
    {
      errors.cardLastDigits = "Inserisci le ultime 4 cifre della carta.";
    }
  }

  return errors;
}

export function createMockOrder(input: CreateMockOrderInput): Order
{
  const orderId = `order-client-mock-${Date.now()}`;
  const orderLines = input.items.map((item): OrderLine => ({
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: {
      amountCents: item.unitPriceCents,
      currencyCode: "EUR"
    },
    notes: item.notes
  }));

  return {
    id: orderId,
    storeId: input.storeId,
    customerId: input.customerId,
    lines: orderLines,
    subtotal: {
      amountCents: input.totals.subtotalCents,
      currencyCode: "EUR"
    },
    discountTotal: {
      amountCents: 0,
      currencyCode: "EUR"
    },
    deliveryFee: {
      amountCents: input.totals.deliveryFeeCents,
      currencyCode: "EUR"
    },
    total: {
      amountCents: input.totals.totalCents,
      currencyCode: "EUR"
    },
    status: "confirmed",
    scheduledSlot: input.selectedSlotLabel,
    createdAtIso: input.createdAtIso,
    updatedAtIso: input.createdAtIso
  };
}
