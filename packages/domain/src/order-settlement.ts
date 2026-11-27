export interface OrderSettlementSummary {
  groupId: string; prepaidCents: number; remainingCents: number; paidCents: number;
  cashDueCents: number; refundedProductCents?: number; refundedCents: number; refundPendingCents: number; refundFailedCents: number;
}
