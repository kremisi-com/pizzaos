export type { OrderSettlementSummary } from "./order-settlement";
import type { IndividualCart, IndividualCheckoutResult, IndividualLine, IndividualQuote } from "./individual-ordering";

export interface GroupCreate { storeId: string; lines: IndividualLine[]; fulfillment?: GroupFulfillment; idempotencyKey: string; }
export interface GroupSharePayment {
  id: string; participantId: string; amountCents: number;
  status: "processing" | "requires_action" | "failed" | "paid" | "refund_pending" | "refunded" | "refund_failed";
  canRefund?: boolean; own?: boolean; participantName?: string; method?: "card" | "cash";
}
export interface GroupParticipant {
  id: string; name: string; host: boolean; lines: IndividualLine[];
  payment?: GroupSharePayment; quotedLines?: IndividualQuote["lines"];
}
export interface GroupSnapshot {
  id: string; storeId: string; status: "open" | "closed" | "submitted" | "cancelled"; revision: number;
  participants: GroupParticipant[]; role: "host" | "participant" | "visitor"; participantId: string | null;
  inviteToken?: string; orderId?: string; checkoutPending?: boolean;
  /** Creator-only delivery preferences, order notes and benefit selection. Omitted for all invitees. */
  fulfillment?: GroupFulfillment;
  payments?: GroupSharePayment[];
}
export interface GroupContext { activeId: string | null; groups: GroupSnapshot[]; }
export interface GroupPaymentResult { group: GroupSnapshot; payment: GroupSharePayment; clientSecret?: string; }
export type GroupFulfillment = Pick<IndividualCart, "mode" | "slotId" | "notes" | "address" | "benefits">;
export interface GroupQuote { revision: number; quote: IndividualQuote; prepaidCents?: number; remainingCents?: number; }
export interface GroupCheckout {
  revision: number; fingerprint: string; fulfillment: GroupFulfillment;
  phone: string; method: "card" | "cash"; idempotencyKey: string;
}
export interface GroupOperationalOrder {
  id: string; storeId: string; revision: number; status: GroupSnapshot["status"];
  participants: GroupParticipant[]; payments: GroupSharePayment[]; orderId?: string;
}
export interface GroupOrderingApi {
  context(storeId: string): Promise<GroupContext>;
  activate(storeId: string, groupId: string | null): Promise<GroupContext>;
  create(input: GroupCreate): Promise<GroupSnapshot>;
  read(id: string, inviteToken?: string): Promise<GroupSnapshot>;
  join(id: string, input: { inviteToken: string; lines?: IndividualLine[]; idempotencyKey?: string }): Promise<GroupSnapshot>;
  rename(id: string, input: { name: string; revision: number }): Promise<GroupSnapshot>;
  replaceLines(id: string, input: { participantId: string; revision: number; lines: IndividualLine[] }): Promise<GroupSnapshot>;
  removeParticipant(id: string, input: { participantId: string; revision: number }): Promise<GroupSnapshot>;
  close(id: string, input: { revision: number }): Promise<GroupSnapshot>;
  quote(id: string, input: { revision: number; fulfillment: GroupFulfillment }): Promise<GroupQuote>;
  checkout(id: string, input: GroupCheckout): Promise<IndividualCheckoutResult>;
  recover(id: string): Promise<IndividualCheckoutResult>;
  payShare(id: string, input: { revision: number; idempotencyKey: string }): Promise<GroupPaymentResult>;
  reconcileShare(id: string, paymentId: string): Promise<GroupPaymentResult>;
  refundShare(id: string, input: { paymentId: string; idempotencyKey: string }): Promise<GroupSnapshot>;
}
export interface GroupOperationsApi {
  list(storeId: string): Promise<GroupOperationalOrder[]>;
  refund(id: string, input: { paymentId?: string; idempotencyKey: string; cashReturned?: boolean }): Promise<GroupOperationalOrder>;
}
