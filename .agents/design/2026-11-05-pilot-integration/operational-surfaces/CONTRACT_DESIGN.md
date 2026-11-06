# Contratti delle viste

PilotAnalyticsPanel, RiderDeliveriesScreen e DeliveryAssignmentsPanel consumano i port pubblici dichiarati nei rispettivi SDD. Le composizioni forniscono adapter HTTP same-origin, senza import di servizi. Le route API sono nel contratto runtime-http.

Il modulo apps/admin/src/composition/api/pilot-analytics-api.ts esporta createPilotAnalyticsApi(): PilotAnalyticsApi.
Il modulo apps/admin/src/composition/api/rider-delivery-api.ts esporta createRiderDeliveryApi(): RiderDeliveryApi e createDeliveryAdminApi(): DeliveryAdminApi.
La composizione rider è raggiungibile tramite apps/admin/app/rider/page.tsx. L'accesso usa /accesso?area=rider oppure /accesso, con destinazioni fisse rispettivamente /rider e /operazioni.

La composizione operatore espone i pulsanti di navigazione Consegne e rider e Statistiche. Consegne e rider è la vista iniziale; Statistiche apre il pannello Vendite e ordini.

## DeliveryAssignmentsPanel

Entry point pubblico apps/admin/src/features/delivery-assignment-panel/index.tsx:

```tsx
import type { DeliveryAdminApi, IndividualOrder } from "@pizzaos/domain";
export interface DeliveryAssignmentsPanelProps {
  storeId: string;
  orders: IndividualOrder[];
  api: DeliveryAdminApi;
  onChanged?: () => void;
  refreshVersion?: number;
}
/** Italian operator controls; authorization and mutations remain in the public service port. */
export declare function DeliveryAssignmentsPanel(props: DeliveryAssignmentsPanelProps): React.JSX.Element;
```

Precondizioni: port stabile della composizione, ordini autorevoli già caricati dal flusso ordine, sede selezionata. Postcondizioni: niente dati di altre sedi, nessuna email inviata implicitamente, mutazioni idempotenti lato servizio e mai duplicate da click ripetuti nel pannello. onChanged viene chiamato una volta dopo ogni mutazione riuscita, mai dopo un fallimento o dopo smontaggio. refreshVersion modificato ricarica gli elenchi senza cambiare sede.

Label accessibili e copy prescritti nei requisiti: Email rider, Nome rider, Abilita rider, Disattiva <nome>, Riattiva <nome>, Rider per ordine <id>, Assegna per ordine <id>, Area rider. Caricamento/mutazione hanno role=status; errori role=alert. Nessun import da composizione o servizi dentro la feature.
