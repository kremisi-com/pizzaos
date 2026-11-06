# Contratto pubblico

I seguenti tipi sono esposti da @pizzaos/domain; nessun import profondo. Errori di servizio sono Error con code: IndividualErrorCode e statusCode HTTP appropriato (401 unauthorized, 403 forbidden, 404 not_found, 400 invalid_input, 409 conflitti, 503 service_unavailable). Il servizio espone createOrderingService(options): OrderingService da services/checkout-api/src/ordering-service.ts. La repository è un port pubblico iniettato: transact serializza e rollback su eccezione, stato iniziale {stores:{},memberships:[],orders:{},idempotency:{},events:[],cursor:0}. Il test può implementare i propri adapter di repository/provider senza leggere implementazioni. Import dei soli tipi di port consentito da ordering-contract.ts; il comportamento è definito qui e nei requisiti.

```ts
/** Durable pilot contracts. EUR amounts are integer cents, dates are UTC ISO strings. */
export interface IndividualActor { id: string; email: string; name: string; }
export interface IndividualIngredient { id: string; name: string; stock: number; }
export interface IndividualOption { id: string; name: string; priceCents: number; ingredients: Record<string, number>; }
export interface IndividualProduct {
  id: string; name: string; description: string; priceCents: number; available: boolean;
  allergens: string[]; ingredients: Record<string, number>; options: IndividualOption[];
}
export interface IndividualSlot { id: string; startsAt: string; capacity: number; }
export interface IndividualStore {
  id: string; name: string; latitude: number; longitude: number; acceptingOrders: boolean;
  contactEmail?: string; contactPhone?: string;
  deliveryBands: { upToKm: number; feeCents: number; minimumCents: number }[];
  ingredients: IndividualIngredient[]; products: IndividualProduct[]; slots: IndividualSlot[];
}
export interface IndividualLine { productId: string; quantity: number; optionIds: string[]; notes: string; }
export interface IndividualCart {
  storeId: string; lines: IndividualLine[]; mode: "pickup" | "delivery"; slotId: string | null;
  notes: string; address?: { text: string; latitude: number; longitude: number };
}
export interface IndividualDraft { version: 1; updatedAt: string; cart: IndividualCart; }
export interface IndividualQuote {
  fingerprint: string; subtotalCents: number; deliveryCents: number; totalCents: number;
  slotId: string; slotStartsAt: string;
  lines: { productId: string; name: string; quantity: number; unitCents: number; optionIds: string[]; notes: string }[];
}
export type IndividualOrderStatus = "pending_payment" | "awaiting_acceptance" | "awaiting_customer" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
export type IndividualPaymentStatus = "requires_action" | "processing" | "failed" | "paid" | "cash_due" | "cash_paid" | "refund_pending" | "refunded" | "refund_failed";
export interface IndividualAdditionQuote { fingerprint: string; deltaCents: number; quote: IndividualQuote; }
export interface IndividualAdditionRequest { lines: IndividualLine[]; fingerprint: string; idempotencyKey: string; }
/** Every increase is separately settled; no provider secrets are persisted. */
export interface IndividualAddition {
  id: string; lines: IndividualLine[]; quote: IndividualQuote; deltaCents: number;
  method: "card" | "cash"; payment: IndividualPaymentStatus; applied: boolean;
  providerIntentId: string | null; refundId: string | null; refundAttempt: number;
  reservationExpiresAt: string | null; reservationReleased: boolean; createdAt: string;
}
export interface IndividualOrder {
  id: string; storeId: string; customerId: string; cart: IndividualCart; quote: IndividualQuote;
  contact: { name: string; email: string; phone: string }; status: IndividualOrderStatus;
  payment: IndividualPaymentStatus; method: "card" | "cash"; notes: string;
  createdAt: string; submittedAt: string | null; acceptanceDeadline: string | null;
  reservationExpiresAt: string | null; reservationReleased: boolean;
  unavailableProductIds: string[]; providerIntentId: string | null; refundId: string | null;
  refundAttempt: number; revision: number;
  additions?: IndividualAddition[];
}
export interface IndividualCheckout {
  cart: IndividualCart; fingerprint: string; phone: string; method: "card" | "cash";
  /** Reused for retries of identical input; never replaced after an uncertain result. */
  idempotencyKey: string;
}
export interface IndividualCheckoutResult { order: IndividualOrder; clientSecret?: string; }
export type IndividualOrderAction = "accept" | "wait_for_customer" | "cancel" | "prepare" | "ready" | "dispatch" | "complete" | "retry_refund";
export interface IndividualAction { action: IndividualOrderAction; unavailableProductIds?: string[]; }
export interface IndividualSession { actor: IndividualActor | null; superadmin: boolean; storeIds: string[]; }
export interface IndividualEvent { cursor: number; storeId: string; orderId: string; revision: number; }
/** Public error payload, shared by HTTP and direct service callers. */
export type IndividualErrorCode = "unauthorized" | "forbidden" | "not_found" | "invalid_input" | "product_unavailable" | "inventory_changed" | "slot_unavailable" | "price_changed" | "outside_delivery_area" | "minimum_not_met" | "idempotency_conflict" | "payment_unresolved" | "invalid_transition" | "service_unavailable";
export interface IndividualApi {
  session(): Promise<IndividualSession>;
  stores(): Promise<IndividualStore[]>;
  catalog(storeId: string): Promise<IndividualStore>;
  quote(cart: IndividualCart): Promise<IndividualQuote>;
  checkout(input: IndividualCheckout): Promise<IndividualCheckoutResult>;
  orders(storeId?: string): Promise<IndividualOrder[]>;
  reconcile(orderId: string): Promise<IndividualCheckoutResult>;
  action(orderId: string, input: IndividualAction): Promise<IndividualOrder>;
  notes(orderId: string, notes: string): Promise<IndividualOrder>;
  additionQuote?(orderId: string, lines: IndividualLine[]): Promise<IndividualAdditionQuote>;
  additions?(orderId: string, input: IndividualAdditionRequest): Promise<IndividualCheckoutResult>;
  saveStore(store: IndividualStore): Promise<IndividualStore>;
  invite(storeId: string, email: string): Promise<void>;
  events(cursor: number, storeId?: string): Promise<{ cursor: number; events: IndividualEvent[] }>;
}

import type { IndividualActor, IndividualApi, IndividualCart, IndividualCheckout, IndividualCheckoutResult, IndividualOrder, IndividualStore, IndividualSession, IndividualAction, IndividualQuote, IndividualEvent, IndividualAdditionQuote, IndividualAdditionRequest, IndividualLine } from "@pizzaos/domain";

export interface OrderingState {
  stores: Record<string, IndividualStore>;
  memberships: { storeId: string; email: string }[];
  orders: Record<string, IndividualOrder>;
  idempotency: Record<string, { hash: string; orderId: string }>;
  events: IndividualEvent[];
  cursor: number;
}
/** Transactions serialize all reads/writes; a thrown callback rolls back changes. */
export interface OrderingRepository {
  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T>;
}
export interface ProviderPayment {
  id: string;
  status: "requires_action" | "processing" | "failed" | "paid" | "cancelled";
  clientSecret?: string;
}
export interface ProviderRefund { id: string; status: "pending" | "failed" | "succeeded"; }
export interface OrderingPayments {
  create(input: { orderId: string; totalCents: number; key: string }): Promise<ProviderPayment>;
  read(intentId: string): Promise<ProviderPayment>;
  cancel(intentId: string): Promise<ProviderPayment>;
  refund(input: { intentId: string; key: string }): Promise<ProviderRefund>;
  readRefund(refundId: string): Promise<ProviderRefund>;
}
export interface OrderingService {
  session(actor: IndividualActor | null): Promise<IndividualSession>;
  stores(actor?: IndividualActor | null): Promise<IndividualStore[]>;
  catalog(storeId: string, actor?: IndividualActor | null): Promise<IndividualStore>;
  quote(cart: IndividualCart): Promise<IndividualQuote>;
  checkout(actor: IndividualActor | null, input: IndividualCheckout): Promise<IndividualCheckoutResult>;
  orders(actor: IndividualActor | null, storeId?: string): Promise<IndividualOrder[]>;
  reconcile(actor: IndividualActor | null, orderId: string): Promise<IndividualCheckoutResult>;
  action(actor: IndividualActor | null, orderId: string, input: IndividualAction): Promise<IndividualOrder>;
  notes(actor: IndividualActor | null, orderId: string, notes: string): Promise<IndividualOrder>;
  additionQuote(actor: IndividualActor | null, orderId: string, lines: IndividualLine[]): Promise<IndividualAdditionQuote>;
  additions(actor: IndividualActor | null, orderId: string, input: IndividualAdditionRequest): Promise<IndividualCheckoutResult>;
  saveStore(actor: IndividualActor | null, store: IndividualStore): Promise<IndividualStore>;
  invite(actor: IndividualActor | null, storeId: string, email: string): Promise<void>;
  events(actor: IndividualActor | null, cursor: number, storeId?: string): Promise<{ cursor: number; events: IndividualEvent[] }>;
  /** Reconcile remote operations and acceptance/reservation deadlines, safe across restarts. */
  tick(): Promise<void>;
}
export interface OrderingServiceOptions {
  repository: OrderingRepository;
  payments: OrderingPayments;
  superadminEmails: string[];
  now?: () => Date;
  id?: () => string;
  reservationMs?: number;
}
/** Structural compile-time compatibility with the browser port; no runtime dependency. */
export type IndividualBrowserPort = IndividualApi;

export declare function createOrderingService(options: OrderingServiceOptions): OrderingService;
```

Precondizioni: input strutturati validi, identificatori non vuoti, email normalizzate senza distinzione maiuscole, actor null per guest. saveStore crea solo per superadmin, aggiorna per membro/superadmin. orders(actor) senza storeId restituisce solo ordini del cliente; con storeId richiede membro o superadmin. catalog/stores senza actor sono pubblici e non espongono quantità stock; per operatore autorizzato restituiscono configurazione completa. Sessione restituisce sedi assegnate.

checkout ritorna clientSecret solo per tentativo carta non definitivo, esclusivamente da provider in memoria; mai persisterlo. reconcile recupera ordine/tentativo esistente, non ne crea un secondo. actions sono idempotenti dove l'esito è già raggiunto. tick esegue scadenze e riconciliazione senza actor, senza esporlo in HTTP pubblico.

HTTP sotto /v1/pilot: GET session, GET stores, GET stores/:id, POST quote {cart}, POST checkouts, GET orders?storeId=, POST orders/:id/reconcile, POST orders/:id/actions, PATCH orders/:id/notes {notes}, PUT stores/:id, POST stores/:id/invitations {email}, GET events?cursor=&storeId=, GET stream?cursor=&storeId=. POST /v1/stripe/webhook corpo grezzo firmato. Errori JSON {code,message}. Auth.js sotto /api/pilot/auth/* via proxy app. JSON body methods richiedono Content-Type application/json. GET session è guest-safe.

## Estensione D36 / R13 approvata il 2026-11-05

I nuovi metodi sono obbligatori su OrderingService; opzionali sul port browser IndividualApi solo per compatibilità con gli adapter POC/test preesistenti. Runtime live implementa entrambi. IndividualOrder.additions?: IndividualAddition[] conserva ledger dei delta. Gli altri campi dell'ordine restano invariati; clientSecret del risultato è esclusivamente l'eventuale delta in corso durante additions, mentre reconcile può restituire il segreto del delta irrisolto se il pagamento originale è già definitivo.

```ts
export interface IndividualAdditionQuote { fingerprint: string; deltaCents: number; quote: IndividualQuote; }
export interface IndividualAdditionRequest { lines: IndividualLine[]; fingerprint: string; idempotencyKey: string; }
export interface IndividualAddition {
 id:string; lines:IndividualLine[]; quote:IndividualQuote; deltaCents:number;
 method:'card'|'cash'; payment:IndividualPaymentStatus; applied:boolean;
 providerIntentId:string|null; refundId:string|null; refundAttempt:number;
 reservationExpiresAt:string|null; reservationReleased:boolean; createdAt:string;
}
// Public factory result:
additionQuote(actor:IndividualActor|null,orderId:string,lines:IndividualLine[]):Promise<IndividualAdditionQuote>;
additions(actor:IndividualActor|null,orderId:string,input:IndividualAdditionRequest):Promise<IndividualCheckoutResult>;
```

R13 definisce pre/postcondizioni e casi. reservationReleased del delta applied indica riserva consolidata sull'ordine; totale ordine e recipe originale vengono aggiornati una sola volta al pagamento. I campi di rimborso di ogni delta si leggono nel suo ledger, non confondere rimborso del pagamento originale con quello dei delta. POST /v1/pilot/orders/:id/additions/quote body {lines}, POST /v1/pilot/orders/:id/additions body IndividualAdditionRequest. Il cliente non può fornire method, price, customerId per il delta; il servizio deriva metodo e identità.

## Rifiuti definitivi del port pagamenti

OrderingPayments.create e OrderingPayments.refund possono lanciare Error & {definitive:true} esclusivamente quando il provider ha rifiutato l'operazione prima di creare l'oggetto remoto. Per create: ordine o delta failed e rilascio riserva. Per refund: refund_failed sul relativo pagamento originale/delta; retry_refund crea una nuova operazione soltanto dopo questo fallimento certo. Errori senza flag non provano l'assenza di effetto remoto e restano in verifica con la stessa chiave. read/readRefund non producono nuovi tentativi su errore.

## Adapter Stripe: port verificabile senza rete

Factory pubblica `createStripeOrderingPayments(stripe: Stripe): OrderingPayments` da `services/checkout-api/src/stripe-payments.ts`. Usa metodi SDK Stripe standard. create passa totalCents autorevole, EUR, payment_method_types card, metadata individualOrderId e chiave idempotente del port. Non conferma l'intento sul server: Elements conferma nel browser.

Mapping provider: succeeded -> paid; canceled -> cancelled; requires_payment_method con last_payment_error -> failed; requires_payment_method senza errore, requires_confirmation o requires_action -> requires_action; processing -> processing. Client secret solo requires_action; read usa stesso mapping. cancel tenta cancellazione con chiave stabile cancel:intentId; se il provider non consente più cancellazione rilegge stato, così non rilascia stock su un pagamento riuscito.

refund ricerca prima `stripe.refunds.list({payment_intent:intentId,limit:100})`: se esiste un rimborso con metadata.pizzaosOperationKey uguale alla key richiesta, lo restituisce senza creare un secondo rimborso, anche oltre la finestra di retention idempotente del provider. Altrimenti refunds.create passa payment_intent e metadata.pizzaosOperationKey con la stessa chiave idempotente. Refund status succeeded -> succeeded; failed/canceled -> failed; altri -> pending. readRefund usa refunds.retrieve e stesso mapping.

Solo create/refund rigettati con StripeInvalidRequestError o StripeCardError diventano Error con definitive:true e messaggio generico senza dettagli provider. Network, API, rate-limit e idempotency errors restano incerti senza definitive:true. Nessuna chiamata remota avviene alla costruzione della factory.
