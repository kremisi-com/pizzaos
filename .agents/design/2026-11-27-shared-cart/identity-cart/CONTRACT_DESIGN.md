# Contratto pubblico
Importare i tipi da @pizzaos/domain. Nessun dettaglio interno per i test.

## DTO e port browser
```ts
interface GroupCreate { storeId: string; lines: IndividualLine[]; fulfillment?: GroupFulfillment; idempotencyKey: string }
interface GroupParticipant { id: string; name: string; host: boolean; lines: IndividualLine[]; payment?: GroupSharePayment }
interface GroupSharePayment { id: string; participantId: string; amountCents: number; status: "processing"|"requires_action"|"failed"|"paid"|"refund_pending"|"refunded"|"refund_failed"; canRefund?: boolean }
interface GroupSnapshot { id: string; storeId: string; status: "open"|"closed"|"submitted"|"cancelled"; revision: number; participants: GroupParticipant[]; role: "host"|"participant"|"visitor"; participantId: string|null; inviteToken?: string; orderId?: string; checkoutPending?: boolean; fulfillment?: GroupFulfillment; payments?: GroupSharePayment[] }
interface GroupContext { activeId: string|null; groups: GroupSnapshot[] }
interface GroupPaymentResult { group: GroupSnapshot; payment: GroupSharePayment; clientSecret?: string }
interface GroupQuote { revision: number; quote: IndividualQuote; prepaidCents?: number; remainingCents?: number }
interface GroupOperationalOrder { id: string; storeId: string; revision: number; status: "open"|"closed"|"submitted"|"cancelled"; participants: GroupParticipant[]; payments: GroupSharePayment[]; orderId?: string }
interface GroupOrderingApi {
  context(storeId: string): Promise<GroupContext>;
  activate(storeId: string, groupId: string|null): Promise<GroupContext>;
  create(input: GroupCreate): Promise<GroupSnapshot>;
  read(id: string, inviteToken?: string): Promise<GroupSnapshot>;
  join(id: string, input: {inviteToken:string; lines?:IndividualLine[]; idempotencyKey?:string}): Promise<GroupSnapshot>;
  rename(id:string,input:{name:string;revision:number}): Promise<GroupSnapshot>;
  replaceLines(id:string,input:{participantId:string;revision:number;lines:IndividualLine[]}):Promise<GroupSnapshot>;
  removeParticipant(id:string,input:{participantId:string;revision:number}):Promise<GroupSnapshot>;
  close(id:string,input:{revision:number}):Promise<GroupSnapshot>;
  quote(id:string,input:{revision:number;fulfillment:GroupFulfillment}):Promise<GroupQuote>;
  checkout(id:string,input:GroupCheckout):Promise<IndividualCheckoutResult>;
  recover(id:string):Promise<IndividualCheckoutResult>;
  payShare(id:string,input:{revision:number;idempotencyKey:string}):Promise<GroupPaymentResult>;
  reconcileShare(id:string,paymentId:string):Promise<GroupPaymentResult>;
  refundShare(id:string,input:{paymentId:string;idempotencyKey:string}):Promise<GroupSnapshot>;
}
interface GroupOperationsApi {
  list(storeId:string):Promise<GroupOperationalOrder[]>;
  refund(id:string,input:{paymentId?:string;idempotencyKey:string;cashReturned?:boolean}):Promise<GroupOperationalOrder>;
}
```
GroupFulfillment e GroupCheckout mantengono le forme pubbliche esistenti. deadline è rimosso. Nessun token o email/ID account del pagante nei DTO gruppo. Risultato pagamento espone clientSecret soltanto a chiamante autenticato proprietario della quota.

## Servizio e harness dei test
```ts
interface GroupAccess { actor: IndividualActor|null; capability?: string; networkKey?: string }
declare function createGroupOrderingService(options: {
 repository: OrderingRepository; ordering: OrderingService;
 payments?: OrderingPayments;
 now?:()=>Date; id?:()=>string; token?:()=>string;
}): GroupOrderingService;
// create(access:GroupAccess,input:GroupCreate):Promise<GroupSnapshot>;
// context(access:GroupAccess,storeId:string):Promise<GroupContext>;
// activate(access:GroupAccess,storeId:string,id:string|null):Promise<GroupContext>;
// read(access,id,inviteToken?), join(access,id,input), rename(access,id,input),
// replaceLines/removeParticipant/close/quote/checkout/recover(access,id,input),
// payShare(access,id,input), reconcileShare(access,id,paymentId),
// refundShare(access,id,input): stesse risposte del port browser.
// operations(actor,storeId):Promise<GroupOperationalOrder[]>;
// refund(actor,id,input):Promise<GroupOperationalOrder>;
// tick():Promise<void>.
```
Il trasporto crea una capability privata prima della creazione (context) e la custodisce in cookie HttpOnly globale; il servizio riceve solo quella capability e l'actor autenticato dal trasporto. Nei test usare capability diverse esplicite (es. browser-host-secret e browser-guest-secret), non nomi come credenziali.
Harness pubblico: createOrderingService da services/checkout-api/src/ordering-service.ts. Costruire un repository di test implementando OrderingRepository: una coda Promise serializza transact, clona lo stato prima del callback, committa il clone solo dopo successo, e clona il risultato. Stato iniziale {stores:{store},memberships:[],orders:{},idempotency:{},events:[],cursor:0}. Repository transact serializza ed esegue rollback su throw. Fixture minimal: store {id:"store",name:"Sede test",latitude:45,longitude:9,acceptingOrders:true,deliveryBands:[],ingredients:[{id:"flour",name:"Farina",stock:10}],products:[{id:"pizza",name:"Pizza",description:"",priceCents:800,available:true,allergens:[],ingredients:{flour:1},options:[]}],slots:[{id:"slot",startsAt:"2030-11-05T19:00:00Z",capacity:10}]}. now = 2030-11-05T17:00:00Z. Actor Alice {id:"alice",name:"Alice",email:"alice@example.test"}. Payments implementa create/read/cancel/refund/readRefund; aggiunta amountCents opzionale a refund per rimborsi parziali. Provider ritorna {id,status}, clientSecret solo transient.
Errori: unauthorized per pagamento/finalizzazione anonima; forbidden per quote altrui/operatore altra sede; revision_conflict su scritture stale; checkout_pending su mutazioni bloccate; invalid_input per importi sotto minimo/campi iniettati; not_found per sede/record assente; provider failure non è mai successo locale.
UI nuova: SharedCartScreen riceve gli stessi port di PersistentGroupScreen con view "share"|"menu"|"cart"|"checkout"; la composizione seleziona la vista attiva. PersistentGroupScreen può restare export compatibile di SharedCartScreen per import app locali. Nomi UI già esistenti si riusano dove opportuno.

GroupSnapshot.fulfillment è riservato al ruolo host; omesso per participant/visitor anche tramite invito o storico pagamenti. Il DTO pubblico non deve includere contatti o benefici privati del creatore.
