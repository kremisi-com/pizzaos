import type { IndividualActor, OperationalEmailOverview } from "@pizzaos/domain";

export interface OperationalEmailMessage { to: string; from: string; messageId: string; subject: string; text: string; }
export interface OperationalEmailSender { send(message: OperationalEmailMessage): Promise<void>; close?(): void | Promise<void>; }
export interface OperationalEmailOptions {
  mode?: "test" | "live"; environment?: "test" | "production"; testRecipients?: string[]; from?: string; sender?: OperationalEmailSender;
  leaseMs?: number; retryBaseMs?: number; maxRetryMs?: number; batchSize?: number;
}
export interface OperationalEmailService {
  list(actor: IndividualActor | null, storeId: string): Promise<OperationalEmailOverview>;
  dispatch(): Promise<{ sent: number; failed: number; blocked: number }>;
}
