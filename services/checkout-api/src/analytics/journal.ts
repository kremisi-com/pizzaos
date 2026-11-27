import type { OrderingState } from "../ordering-contract";

export interface AnalyticsEntry {
  orderId: string;
  storeId: string;
  status: "completed" | "cancelled";
  occurredAt: string;
  totalCents: number;
  /** Actual group refunds; original value, products and terminal timestamp remain immutable. */
  refundedCents?: number;
  lines: { productId: string; name: string; quantity: number }[];
}

/** An optional JSON extension retained by the owning transactional repository. */
export interface AnalyticsState extends OrderingState {
  analytics?: { entries: Record<string, AnalyticsEntry> };
}
