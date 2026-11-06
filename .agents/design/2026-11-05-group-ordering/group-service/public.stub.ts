import type { GroupCheckout, GroupFulfillment, GroupQuote, GroupSnapshot, IndividualActor, IndividualCheckoutResult } from "@pizzaos/domain";

/** Public signatures only; runtime implementation can be replaced without changing behavior. */
export interface GroupAccess { actor: IndividualActor | null; capability?: string; }
export interface GroupOrderingServiceStub {
  /** Authenticated host creates an open collection without reserving inventory/capacity. */
  create(actor: IndividualActor | null, input: { storeId: string; name: string; deadline: string }): Promise<GroupSnapshot>;
  /** Returns minimized roster for host, scoped personal capability, or valid invitation. */
  read(access: GroupAccess, id: string, inviteToken?: string): Promise<GroupSnapshot>;
  /** New guest receives personal capability; HTTP returns it exclusively in a HttpOnly cookie. */
  join(access: GroupAccess, id: string, input: { inviteToken: string; name: string }): Promise<{ group: GroupSnapshot; capability: string }>;
  replaceLines(access: GroupAccess, id: string, input: { participantId: string; revision: number; lines: import("@pizzaos/domain").IndividualLine[] }): Promise<GroupSnapshot>;
  removeParticipant(access: GroupAccess, id: string, input: { participantId: string; revision: number }): Promise<GroupSnapshot>;
  close(access: GroupAccess, id: string, input: { revision: number }): Promise<GroupSnapshot>;
  quote(access: GroupAccess, id: string, input: { revision: number; fulfillment: GroupFulfillment }): Promise<GroupQuote>;
  /** One canonical order; concurrent identical retries return the same order. */
  checkout(access: GroupAccess, id: string, input: GroupCheckout): Promise<IndividualCheckoutResult>;
  recover(access: GroupAccess, id: string): Promise<IndividualCheckoutResult>;
  /** Closes expired collections without an automatic order, reservation or payment. */
  tick(): Promise<void>;
}
