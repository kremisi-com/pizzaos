# Contratti pubblici di integrazione server

I contratti pubblici dei moduli analytics e rider sono nei rispettivi CONTRACT_DESIGN; i tipi sono esportati da @pizzaos/domain. OrderingRepository/OrderingService/OrderingServiceOptions sono in services/checkout-api/src/ordering-contract.ts.

```ts
export interface RiderOrderingService extends OrderingService {
  /** Restricted trusted-server entry, generic action remains unchanged. */
  riderProgress(actor: IndividualActor | null, orderId: string, action: "dispatch" | "complete"): Promise<IndividualOrder>;
}
// OrderingServiceOptions adds optional authorizeRiderProgress:
// (state: OrderingState, actor: IndividualActor, order: IndividualOrder, action: "dispatch" | "complete") => boolean
// Absent guard denies riderProgress. The guard is evaluated in the same transaction as the state change.
```

Nuovo entry point services/checkout-api/src/pilot-extensions.ts:

```ts
export function createOperationalServices(options: OrderingServiceOptions): {
  repository: OrderingRepository;
  service: RiderOrderingService;
  analytics: PilotAnalyticsService;
  delivery: DeliveryService;
};
export function registerPilotExtensionRoutes(app: FastifyInstance, options: {
  analytics: PilotAnalyticsService;
  delivery: DeliveryService;
  authenticate(request: FastifyRequest): Promise<IndividualActor | null>;
}): void;
```

Registrare le route prima di app.ready/inject/listen, sull'app restituita da buildOrderingApp. Il factory configura automaticamente journal e guard senza dipendere dal clock browser. Non modifica le opzioni originali. now/id e repository fake conformi sono consentiti nell'harness dei test; nessuna credenziale di test nel runtime reale.

HTTP:

- GET /v1/pilot/stores/:id/analytics?period=today|last_7_days|last_30_days|custom&fromDate=YYYY-MM-DD&throughDate=YYYY-MM-DD → PilotAnalyticsReport.
- GET /v1/pilot/rider/session → RiderSession; GET /v1/pilot/rider/deliveries → RiderDelivery[].
- POST /v1/pilot/rider/deliveries/:id/dispatch oppure /complete, corpo {} → 204.
- POST /v1/pilot/rider/deliveries/:id/failure, corpo {note:string} → 204.
- GET /v1/pilot/stores/:id/riders → DeliveryRider[].
- POST /v1/pilot/stores/:id/riders, corpo {email:string,name:string} → DeliveryRider.
- PATCH /v1/pilot/stores/:id/riders/:riderId, corpo {active:boolean} → DeliveryRider.
- GET /v1/pilot/stores/:id/deliveries → AdminDeliveryItem[].
- PUT /v1/pilot/orders/:id/assignment, corpo {riderId:string} → 204.

Precondizioni: identità risolta dal server, membership operatore/rider distinte. Le risposte di errore hanno {code,message} e messaggio italiano; tutti i successi sono privi di segreti. La route generica action resta nel suo contratto precedente.
