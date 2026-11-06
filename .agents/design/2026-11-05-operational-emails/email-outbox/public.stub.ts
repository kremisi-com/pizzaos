import type { IndividualActor } from "@pizzaos/domain";
export type OperationalEmailEvent = "received" | "accepted" | "ready" | "out_for_delivery" | "cancelled" | "refund_succeeded" | "refund_failed";
export type OperationalEmailStatus = "pending" | "sending" | "retrying" | "blocked" | "sent";
export interface OperationalEmailDelivery { id: string; orderId: string; event: OperationalEmailEvent; recipient: string; status: OperationalEmailStatus; attempts: number; createdAt: string; updatedAt: string; sentAt: string | null; nextAttemptAt: string | null; lastError: { code: "smtp_unavailable" | "not_configured" | "recipient_not_allowed"; message: string } | null; }
export interface OperationalEmailOverview { revision: number; messages: OperationalEmailDelivery[]; }
export interface OperationalEmailMessage { to: string; from: string; messageId: string; subject: string; text: string; }
export interface OperationalEmailSender { send(message: OperationalEmailMessage): Promise<void>; close?(): void | Promise<void>; }
export interface OperationalEmailService { list(actor: IndividualActor | null, storeId: string): Promise<OperationalEmailOverview>; dispatch(): Promise<{ sent: number; failed: number; blocked: number }>; }
