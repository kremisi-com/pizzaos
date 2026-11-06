import type { IndividualCart, IndividualCheckoutResult, IndividualLine, IndividualQuote } from "./individual-ordering";

export interface GroupParticipant { id: string; name: string; host: boolean; lines: IndividualLine[]; }
export interface GroupSnapshot {
  id: string; storeId: string; deadline: string; status: "open" | "closed" | "submitted"; revision: number;
  participants: GroupParticipant[]; role: "host" | "participant" | "visitor"; participantId: string | null;
  /** Host-only invitation and checkout recovery information. */
  inviteToken?: string; orderId?: string; checkoutPending?: boolean;
}
export type GroupFulfillment = Pick<IndividualCart, "mode" | "slotId" | "notes" | "address" | "benefits">;
export interface GroupQuote { revision: number; quote: IndividualQuote; }
export interface GroupCheckout {
  revision: number; fingerprint: string; fulfillment: GroupFulfillment;
  phone: string; method: "card" | "cash"; idempotencyKey: string;
}
export interface GroupOrderingApi {
  create(input: { storeId: string; name: string; deadline: string }): Promise<GroupSnapshot>;
  read(id: string, inviteToken?: string): Promise<GroupSnapshot>;
  join(id: string, input: { inviteToken: string; name: string }): Promise<GroupSnapshot>;
  replaceLines(id: string, input: { participantId: string; revision: number; lines: IndividualLine[] }): Promise<GroupSnapshot>;
  removeParticipant(id: string, input: { participantId: string; revision: number }): Promise<GroupSnapshot>;
  close(id: string, input: { revision: number }): Promise<GroupSnapshot>;
  quote(id: string, input: { revision: number; fulfillment: GroupFulfillment }): Promise<GroupQuote>;
  checkout(id: string, input: GroupCheckout): Promise<IndividualCheckoutResult>;
  recover(id: string): Promise<IndividualCheckoutResult>;
}
