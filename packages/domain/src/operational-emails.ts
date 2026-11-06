export type OperationalEmailEvent = "received" | "accepted" | "ready" | "out_for_delivery" | "cancelled" | "refund_succeeded" | "refund_failed";
export type OperationalEmailStatus = "pending" | "sending" | "retrying" | "blocked" | "sent";
export type OperationalEmailErrorCode = "smtp_unavailable" | "not_configured" | "recipient_not_allowed";
export interface OperationalEmailDelivery {
  id: string; orderId: string; event: OperationalEmailEvent; recipient: string; status: OperationalEmailStatus;
  attempts: number; createdAt: string; updatedAt: string; sentAt: string | null; nextAttemptAt: string | null;
  lastError: { code: OperationalEmailErrorCode; message: string } | null;
}
export interface OperationalEmailOverview { revision: number; messages: OperationalEmailDelivery[]; }
export interface OperationalEmailApi { list(storeId: string): Promise<OperationalEmailOverview>; }
