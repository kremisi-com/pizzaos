import type { GroupOrderingApi, IndividualApi } from "@pizzaos/domain";

/** A replacement UI receives only public ports; capabilities remain transport-owned. */
export interface PersistentGroupScreenProps {
  api: GroupOrderingApi;
  individualApi: IndividualApi;
  groupId?: string;
  inviteToken?: string;
  pollMs?: number;
}
export declare function PersistentGroupScreen(props: PersistentGroupScreenProps): import("react").ReactNode;
