# Contratti pubblici

I tipi condivisi saranno esposti da `@pizzaos/domain`; import profondi non sono ammessi. Il file `packages/domain/src/rider-deliveries.ts` contiene solo tipi pubblici.

```ts
interface DeliveryRider { id: string; storeId: string; email: string; name: string; active: boolean; }
interface DeliveryAssignment { orderId: string; riderId: string; assignedAt: string; }
interface DeliveryIssue { note: string; reportedAt: string; }
interface RiderDelivery {
  orderId: string; storeId: string; storeName: string;
  status: 'ready' | 'out_for_delivery';
  address: { text: string; latitude: number; longitude: number };
  contact: { name: string; phone: string }; notes: string;
  items: { name: string; quantity: number }[];
  cashDueCents: number; issue: DeliveryIssue | null;
}
interface RiderSession { actor: IndividualActor | null; storeIds: string[]; }
interface RiderDeliveryApi {
  session(): Promise<RiderSession>;
  deliveries(): Promise<RiderDelivery[]>;
  dispatch(orderId: string): Promise<void>;
  complete(orderId: string): Promise<void>;
  reportFailure(orderId: string, note: string): Promise<void>;
}
interface AdminDeliveryItem { orderId: string; riderId: string; issue: DeliveryIssue | null; }
interface DeliveryAdminApi {
  riders(storeId: string): Promise<DeliveryRider[]>;
  inviteRider(storeId: string, email: string, name: string): Promise<DeliveryRider>;
  setRiderActive(storeId: string, riderId: string, active: boolean): Promise<DeliveryRider>;
  assignments(storeId: string): Promise<AdminDeliveryItem[]>;
  assign(orderId: string, riderId: string): Promise<void>;
}
```

Servizio server in `services/checkout-api/src/delivery/delivery-service.ts`:

```ts
interface DeliveryData {
  riders: Record<string, DeliveryRider>;
  assignments: Record<string, DeliveryAssignment>;
  issues: Record<string, DeliveryIssue>;
}
type DeliveryOrderingState = OrderingState & { delivery?: DeliveryData };
interface DeliveryServiceOptions {
  repository: OrderingRepository;
  superadminEmails: string[];
  now?: () => Date;
  id?: () => string;
  // Must enforce isRiderProgressAllowed INSIDE canonical transaction.
  // Uses actual authenticated actor, retains canonical stock/payment invariants.
  progress(actor: IndividualActor, orderId: string, action: 'dispatch' | 'complete'): Promise<IndividualOrder>;
}
interface DeliveryService {
  session(actor: IndividualActor | null): Promise<RiderSession>;
  deliveries(actor: IndividualActor | null): Promise<RiderDelivery[]>;
  riders(actor: IndividualActor | null, storeId: string): Promise<DeliveryRider[]>;
  inviteRider(actor: IndividualActor | null, storeId: string, email: string, name: string): Promise<DeliveryRider>;
  setRiderActive(actor: IndividualActor | null, storeId: string, riderId: string, active: boolean): Promise<DeliveryRider>;
  assignments(actor: IndividualActor | null, storeId: string): Promise<AdminDeliveryItem[]>;
  assign(actor: IndividualActor | null, orderId: string, riderId: string): Promise<void>;
  dispatch(actor: IndividualActor | null, orderId: string): Promise<void>;
  complete(actor: IndividualActor | null, orderId: string): Promise<void>;
  reportFailure(actor: IndividualActor | null, orderId: string, note: string): Promise<void>;
}
/** No mutation; validates assignment and active membership in current transaction state. */
declare function isRiderProgressAllowed(state: DeliveryOrderingState, actor: IndividualActor | null, order: IndividualOrder, action: string): boolean;
declare function createDeliveryService(options: DeliveryServiceOptions): DeliveryService;
class DeliveryError extends Error { readonly code: IndividualErrorCode; readonly statusCode: number; }
```

Invalid input -> invalid_input, unknown referenced entity -> not_found, role/assignment violation -> forbidden, wrong lifecycle stage/open issue -> invalid_transition. Authorization is checked before exposing store-private rider/order details. Mutating operations are transactional; no helper starts a nested transaction. Progress delegates to the canonical gateway after a preliminary check; that preliminary check is NOT the final authorization. The mandatory atomic guard closes reassignment races. Gateway failures propagate unchanged; no delivery-specific endpoint returns a full IndividualOrder.

`DeliveryError.statusCode`: unauthorized=401, forbidden=403, not_found=404, invalid_input=400, other domain conflicts=409. Rider invitation records an enabled membership; it does not claim to send a notification email. UI wording is “Abilita rider”, with existing Auth.js login responsible for any magic-link email.
