# Contratti pubblici per test indipendenti

## Dominio: import da @pizzaos/domain

```ts
type OutOfStockBehavior = "allow" | "disable" | "hide";
// Estensione degli oggetti esistenti, senza endpoint nuovi.
interface IndividualStore {
  outOfStockBehavior?: OutOfStockBehavior; // assente = disable, aggiornamento omesso preserva il precedente
}
interface IndividualProduct {
  soldOut?: boolean; // proiezione pubblica, stock esaurito; mai accettato come fonte autorevole
}
```

Gli altri tipi esistenti sono importabili dal package. Per costruire una sede test valida: `{id:"store",name:"Sede",latitude:45,longitude:9,acceptingOrders:true,ingredients:[{id:"ingredient",name:"Pomodoro",stock: null}],products:[{id:"product",name:"Pizza",description:"",priceCents:800,available:true,allergens:[],ingredients:{ingredient:1},options:[]}],slots:[{id:"slot",startsAt:"2030-01-01T19:00:00Z",capacity:50}],deliveryBands:[]}`. Cart: `{storeId:"store",lines:[{productId:"product",quantity:1,optionIds:[],notes:""}],mode:"pickup",slotId:"slot",notes:""}`. Actor operatore `{id:"operator",name:"Operatore",email:"operator@example.test"}`. Attore cliente analogo con altra email.

## Servizio server, import ./ordering-service e ./ordering-contract

```ts
// File test destinazione services/checkout-api/src/stock-policy.test.ts
function createOrderingService(options: {
  repository: {transact<T>(work:(state:OrderingState)=>T|Promise<T>):Promise<T>};
  payments: {
    create(input:{orderId:string;totalCents:number;key:string}):Promise<{id:string;status:"requires_action"|"paid"}>;
    read(id:string):Promise<{id:string;status:"paid"}>;
    cancel(id:string):Promise<{id:string;status:"cancelled"}>;
    refund(input:{intentId:string;key:string}):Promise<{id:string;status:"succeeded"}>;
    readRefund(id:string):Promise<{id:string;status:"succeeded"}>;
  };
  now?:()=>Date; id?:()=>string; superadminEmails:string[];
}): {
 catalog(storeId:string,actor?:IndividualActor|null):Promise<IndividualStore>;
 saveStore(actor:IndividualActor|null,store:IndividualStore):Promise<IndividualStore>;
 quote(cart:IndividualCart,actor?:IndividualActor|null):Promise<IndividualQuote>;
 checkout(actor:IndividualActor|null,input:{cart:IndividualCart;fingerprint:string;phone:string;method:"cash";idempotencyKey:string}):Promise<{order:IndividualOrder}>;
 action(actor:IndividualActor|null,orderId:string,input:{action:"accept"|"prepare"|"ready"|"complete"}):Promise<IndividualOrder>;
 menu:{workspace(actor:IndividualActor|null,storeId:string):Promise<MenuWorkspace>;
 saveDraft(actor:IndividualActor|null,storeId:string,revision:number,draft:MenuDraft):Promise<MenuWorkspace>;
 publish(actor:IndividualActor|null,storeId:string,revision:number,id:string):Promise<MenuWorkspace>};
};
```

OrderingState: `{stores:Record<string,IndividualStore>,memberships:{storeId:string,email:string}[],orders:{},idempotency:{},events:[],cursor:0}`; usare il tipo importato per gli oggetti vuoti. Repository test seriale con copia e rollback in caso di errore. Now test `2030-01-01T12:00:00Z`. Per aggiornare sede rileggere catalog con attore operatore, che contiene configurationRevision. I metodi respingono con Error avente `code` (invalid_input, forbidden, inventory_changed, product_unavailable, customization_changed, revision_conflict). È sufficiente verificare il rifiuto per i carrelli indisponibili, senza imporre un codice specifico fra quelli di indisponibilità.

Un menu normale completo è `{id:"draft",name:"Menu",sections:[{id:"section",name:"Pizze",productIds:["product"]}],products:[product]}`. Menu pizza può essere verificato usando `materializePizzaMenu`, `syncPizzaInventory`, tipi PizzaCatalog/PizzaEntry pubblici; nessuna lettura del codice del servizio.

## Admin

File test `apps/admin/src/test/stock-policy.test.tsx`. Import componente `../features/individual-ordering/components/store-configuration`, props pubbliche: `{store: IndividualStore,isNew:false,section:"profile"|"inventory",busy:false,onSearchAddress:async()=>[],onSave:async(draft,original)=>true}`. Profilo contiene selettore «Prodotti con ingredienti esauriti», valori allow/disable/hide e pulsante «Salva configurazione». Se store ha address già salvato il normale submit non richiede ricerca indirizzo. Nuovo store non necessario. `OperationalCatalog` da `../features/catalog/components/operational-catalog` riceve `{api:MenuAdminApi,storeId,ingredients,onPublished:()=>void,outOfStockBehavior?:OutOfStockBehavior}`. api.workspace restituisce `{revision:1,published:draft,drafts:[]}`. In allow ingredienti zero comportano alert con nomi; non occorre aprire un modal. Tutti i testi UI sono italiani.

## Client

File test `apps/client/src/test/stock-policy.test.tsx`. Import `OperationalMenu` da `../features/menu/components/operational-menu`. Props: `{store:IndividualStore, preferences:{avoid:[]},onAdd:(line:IndividualLine)=>void}`. Prodotti esauriti sono `available:false,soldOut:true`: dicitura Esaurito e pulsante non selezionabile. `available:false` senza soldOut conserva Non disponibile. Non testare dettagli privati o classi CSS.

Per il componente cliente, preferences ha il contratto completo `{avoid:[],save:async(next:string[])=>true,busy:false,message:"",authenticated:false,retry:()=>{},available:true}`. I test client importano renderDom, cleanupDom, domScreen e domFireEvent dal package pubblico `@pizzaos/testing`, con alias render/cleanup/screen/fireEvent se desiderato; il package client non dipende direttamente da testing-library/react. Usare asserzioni Vitest standard senza matcher jest-dom non installati.

```ts
interface MenuAdminApi {
  workspace(storeId: string): Promise<MenuWorkspace>;
  saveDraft(storeId: string, revision: number, draft: MenuDraft): Promise<MenuWorkspace>;
  removeDraft(storeId: string, revision: number, draftId: string): Promise<MenuWorkspace>;
  publish(storeId: string, revision: number, draftId: string): Promise<MenuWorkspace>;
  uploadImage(storeId: string, image: File): Promise<{id:string}>;
}
```

Per testare scelte e riferimenti: aggiungere un ingrediente `{id:"optional",name:"Olive",stock:0}`. Una opzione valida è `{id:"extra",name:"Olive extra",priceCents:100,ingredients:{optional:1},available:true}`; un gruppo valido è `{id:"extras",name:"Extra",kind:"selection",min:0,max:1,optionIds:["extra"]}`. La presenza di groups sul prodotto attiva il contratto a gruppi; cart.lines[0].selections può essere `[{optionId:"extra",quantity:1}]` e optionIds resta []. Senza scelte selections=[] è valida col gruppo opzionale. `pairingProductIds:["altro-prodotto"]` indica abbinamenti; i riferimenti a un prodotto nascosto devono essere assenti nel catalogo pubblico. Un prodotto con available:false resta sempre non ordinabile a prescindere dalla policy. Per controllare dosi incomplete usare `{ingredient:null}`; per ID inesistente `{missing:1}`. Opzioni ingredienti e controlli ricetta valgono anche per le pizze materializzate.

Gli agenti dei test leggono soltanto REQUIREMENTS.md e CONTRACT_DESIGN.md; possono eseguire i propri test e leggere l'output, senza leggere l'implementazione.
