import type { IndividualActor } from "./individual-ordering";

/** A rider membership does not grant store-operator permissions. */
export interface DeliveryRider {
  id: string;
  storeId: string;
  email: string;
  name: string;
  active: boolean;
}

export interface DeliveryAssignment {
  orderId: string;
  riderId: string;
  assignedAt: string;
}

export interface DeliveryIssue {
  note: string;
  reportedAt: string;
}

/** Minimal view for an authenticated rider, never a complete financial order. */
export interface RiderDelivery {
  orderId: string;
  storeId: string;
  storeName: string;
  status: "ready" | "out_for_delivery";
  address: { text: string; latitude: number; longitude: number };
  contact: { name: string; phone: string };
  notes: string;
  items: { name: string; quantity: number }[];
  cashDueCents: number;
  issue: DeliveryIssue | null;
}

/** Store ids here are rider memberships, not operator store ids. */
export interface RiderSession {
  actor: IndividualActor | null;
  storeIds: string[];
}

export interface RiderDeliveryApi {
  session(): Promise<RiderSession>;
  deliveries(): Promise<RiderDelivery[]>;
  dispatch(orderId: string): Promise<void>;
  complete(orderId: string): Promise<void>;
  reportFailure(orderId: string, note: string): Promise<void>;
}

export interface AdminDeliveryItem {
  orderId: string;
  riderId: string;
  issue: DeliveryIssue | null;
}

export interface DeliveryAdminApi {
  riders(storeId: string): Promise<DeliveryRider[]>;
  inviteRider(storeId: string, email: string, name: string): Promise<DeliveryRider>;
  setRiderActive(storeId: string, riderId: string, active: boolean): Promise<DeliveryRider>;
  assignments(storeId: string): Promise<AdminDeliveryItem[]>;
  assign(orderId: string, riderId: string): Promise<void>;
}
