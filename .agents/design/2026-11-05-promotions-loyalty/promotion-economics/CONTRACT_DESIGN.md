# Contratto pubblico

Le firme senza corpi sono in `public.stub.ts`. Contratti runtime: `packages/domain/src/promotions-loyalty.ts`, esportati da `@pizzaos/domain`. Nessuna implementazione in package domain.

```ts
interface PromotionSelection { couponCodes: string[]; redeemReward: boolean; }
interface PromotionProgram { enabled:boolean; pointsPerEuro:number; rewardPoints:number; rewardCents:number; revision:number; }
interface PromotionCoupon {
 id:string; code:string; active:boolean; kind:'percent'|'fixed'; value:number;
 startsAt:string|null; endsAt:string|null; minimumCents:number; productIds:string[];
 globalLimit:number|null; perCustomerLimit:number|null; revision:number;
}
interface PromotionConfiguration {
 program:PromotionProgram; coupons:PromotionCoupon[];
 usage:{couponId:string; reserved:number; consumed:number}[];
}
interface LoyaltyMovement {
 id:string; orderId:string; kind:'earn'|'reward'; points:number;
 status:'posted'|'reserved'|'spent'|'released'; createdAt:string;
}
interface LoyaltyWallet {
 storeId:string; program:PromotionProgram; balancePoints:number; heldPoints:number;
 availablePoints:number; movements:LoyaltyMovement[];
}
interface PromotionBreakdown {
 originalSubtotalCents:number; discountCents:number; netSubtotalCents:number;
 coupons:{id:string; code:string; discountCents:number}[];
 rewardDiscountCents:number; redeemedPoints:number; pointsPerEuro:number;
 lines:{productId:string; grossCents:number; discountCents:number; netCents:number}[];
}
type PromotionProgramInput=Omit<PromotionProgram,'revision'>&{revision:number};
type PromotionCouponInput=Omit<PromotionCoupon,'id'|'revision'>&{id?:string;revision?:number};
interface PromotionsApi {
 configuration(storeId:string):Promise<PromotionConfiguration>;
 saveProgram(storeId:string,input:PromotionProgramInput):Promise<PromotionProgram>;
 saveCoupon(storeId:string,input:PromotionCouponInput):Promise<PromotionCoupon>;
 wallet(storeId:string):Promise<LoyaltyWallet>;
}
```

`value`: percentuali 1..10000 basis point (10%=1000), fissi 1..100000000 cent. Rate punti intera 1..10000, premio punti1..100000000 e valore cent1..100000000; enabled=false sospende nuovi accrediti/riscatti senza cancellare saldo. Codice normalizzato trim/uppercase 1..50 `[A-Z0-9_-]+`. productIds fino500 distinti appartenenti al catalogo sede; codici selezionati fino10 distinti. Date ISO valide o null, se entrambe presenti start<end. Minimo0..100000000cent; limiti interi1..100000000 o null. La creazione coupon omette id/revision; aggiornamento include entrambi. Campi autoritativi extra rifiutati.

Estensioni compatibili: `IndividualCart.benefits?:PromotionSelection`; `IndividualQuote.promotions?:PromotionBreakdown`; `GroupFulfillment.benefits?:PromotionSelection`. Nessuna forma permette importi sconto o identità cliente. `IndividualApi.quote(cart)` resta invariato; il trasporto fornisce l'actor dalla sessione. Server `OrderingService.quote(cart,actor?:IndividualActor|null)` accetta opzionalmente l'attore per selezioni autenticate. Assenza benefici o selezione vuota mantiene quote/fingerprint originario. `IndividualQuote.subtotalCents` diventa netto solo quando applicati benefici; i prezzi unitari delle righe restano lordi. Quote/addizioni correnti conservano lo sconto originale e aggiornano i totali netti.

Factory di composizione pubblica del servizio in `services/checkout-api/src/promotions/index.ts`: `createPromotionsOrderingServices(options:OrderingServiceOptions)` restituisce `{repository,service,analytics,delivery,promotions}`; le prime quattro rispettano i port operativi già esistenti. `promotions` espone i metodi di PromotionsApi con primo argomento `actor:IndividualActor|null`. Questa è l'entry da usare per test economici: configura provider/repository tramite port pubblici; non leggere implementazioni. Nessun metodo pubblico aggiunge direttamente saldo.

HTTP: `registerPromotionRoutes(app,{promotions,authenticate})` è esportato dallo stesso entry. Si registra su `buildOrderingApp` prima di ready, eredita proxy/sessione demo e verifica Origin canonico sulle scritture. `GET /v1/pilot/stores/:id/promotions` configuration; `PUT /v1/pilot/stores/:id/promotions/program`; `POST /v1/pilot/stores/:id/promotions/coupons`; `GET /v1/pilot/stores/:id/loyalty` wallet. Body esattamente input sopra, no coercion/strip. Il proxy app espone `/api/pilot` davanti al path servizio. Risposte no-store. Errori `{code,message}`:401 unauthorized,403 forbidden,404 not_found,400 invalid_input,409 revision_conflict/coupon_unavailable/coupon_limit_reached/loyalty_insufficient/loyalty_unavailable o conflitti canonici. Quote senza benefici conserva accesso guest.

Invarianti: saldo disponibile≥0; uso reserved+consumed≤limiti al momento di accettazione; coupon storicamente consumati non vengono ricalcolati al cambio configurazione; un movimento earned/reward per ordine al massimo (reward cambia status, non addebita due volte). balancePoints include crediti meno premi spesi, heldPoints premi reserved, available=balance−held. Released non riduce saldo. Nel gruppo i movimenti appartengono soltanto all'host. Nessun arretrato storico viene accreditato da una semplice lettura.

Enabled e tasso sono congelati alla creazione ordine; disattivare il programma non revoca l'accredito già promesso. Premio selezionato con residuo zero genera `loyalty_unavailable` senza impegno; residuo positivo inferiore al premio limita lo sconto al residuo ma mantiene il costo punti configurato, esposto nel riepilogo. Codici duplicati dopo trim/uppercase generano `invalid_input`.

Un coupon il cui sconto effettivo sarebbe zero genera `coupon_unavailable` prima dell'ordine e non consuma utilizzi: vale per prodotti ammessi assenti, residuo esaurito da sconti precedenti e arrotondamento floor a zero.
