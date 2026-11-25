# Contratto pubblico

`IndividualStore` di `@pizzaos/domain` aggiunge `configurationRevision?: string`: token opaco presente solo nelle viste operatore. La forma rimane opzionale per creazione e cataloghi cliente. Per una sede esistente `saveStore` richiede il token corrente; versione mancante/superata -> `revision_conflict`, malformata -> `invalid_input`. Il valore va ritrasmesso senza interpretarlo. Un conflitto non altera la configurazione.

Interfacce disponibili alle prove (stub descrittivi, non importare questo file):

```ts
import type { IndividualActor, IndividualCart, IndividualStore, IndividualCheckout, IndividualOrder } from '@pizzaos/domain';
interface OrderingRepository {
  transact<T>(work: (state: OrderingState) => T | Promise<T>): Promise<T>;
}
// Importare OrderingRepository/OrderingState da ./ordering-contract per test collocati in services/checkout-api/src.
// OrderingState iniziale: {stores: {}, memberships: [], orders: {}, idempotency: {}, events: [], cursor: 0}.
// Il repository di test serializza transazioni con una coda Promise, structuredClone prima/dopo;
// committa il clone solo se work termina con successo. Nessuna ispezione dell'implementazione servizio.
interface OrderingPayments {
  create(input: {orderId: string; totalCents: number; key: string}): Promise<{id: string; status: 'paid'}>;
  read(id: string): Promise<{id: string; status: 'paid'}>;
  cancel(id: string): Promise<{id: string; status: 'cancelled'}>;
  refund(input: {intentId: string; key: string}): Promise<{id: string; status: 'succeeded'}>;
  readRefund(id: string): Promise<{id: string; status: 'succeeded'}>;
}
// import {createOrderingService} from './ordering-service';
// createOrderingService({repository, payments, superadminEmails: ['owner@example.test'], now: () => new Date('2026-11-25T18:00:00Z')})
// Restituisce:
interface Service {
  catalog(storeId: string, actor?: IndividualActor | null): Promise<IndividualStore>;
  stores(actor?: IndividualActor | null): Promise<IndividualStore[]>;
  saveStore(actor: IndividualActor | null, store: IndividualStore, addressConfirmation?: string): Promise<IndividualStore>;
  invite(actor: IndividualActor, storeId: string, email: string): Promise<void>;
  quote(cart: IndividualCart, actor?: IndividualActor): Promise<{fingerprint: string}>;
  checkout(actor: IndividualActor, input: IndividualCheckout): Promise<{order: IndividualOrder}>;
  action(actor: IndividualActor, id: string, input: {action: 'accept'|'prepare'|'ready'|'complete'}): Promise<IndividualOrder>;
}
// import {buildOrderingApp} from './http-app';
// buildOrderingApp({service, authenticate: async request => actor}) produce Fastify con inject() e close().
// GET/PUT /v1/pilot/stores/:id. PUT ha il corpo IndividualStore. Errori: {code,message,requestId}.
```

Fixture minima: sede `roma`, nome `Roma`, latitudine 41.9, longitudine 12.5, acceptingOrders true, deliveryBands [], ingredients [{id:'dough',name:'Impasto',stock:20}], products [{id:'pizza',name:'Pizza',description:'',priceCents:800,available:true,allergens:[],ingredients:{dough:1},options:[]}], slots [{id:'evening',startsAt:'2026-11-25T19:00:00Z',capacity:20}]. Creazione con superadmin; per cliente usare identità distinta. Carrello: storeId roma, una riga pizza quantità 1, optionIds [], notes '', mode pickup, slotId evening, notes ''. Checkout contanti: cart, fingerprint da quote, phone '3331234567', method cash, idempotencyKey univoca. Completamento: accept -> prepare -> ready -> complete.

Per testare stabilità all'ordine delle chiavi, usare un repository che normalizza le chiavi degli oggetti al commit come farebbe JSONB (array ordinati preservati); la ricostruzione del servizio usa lo stesso repository. Non vincolare i test al formato o all'algoritmo del token.
