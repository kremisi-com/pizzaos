# Contratto pubblico

## Pagina e feature

Route `/ordina/ordini`; entry `apps/client/src/features/orders/index.ts`.

```ts
import type { IndividualApi, IndividualOrder } from "@pizzaos/domain";
import type { ReactNode } from "react";
export interface OperationalOrdersScreenProps {
  api: IndividualApi;
  refreshVersion?: number;
  connection?: string;
  /** Salva la composizione nel draft reale o rigetta senza successo UI. */
  onReorder: (order: IndividualOrder) => Promise<void>;
  /** Capability esistente aggiunte, fornita dalla composizione. */
  renderAdditions?: (order: IndividualOrder, onChanged: () => Promise<void>) => ReactNode;
}
/** Legge soltanto gli ordini dell'account tramite api.orders(), senza storeId operatore. */
export declare function OperationalOrdersScreen(props: OperationalOrdersScreenProps): ReactNode;
```

I contratti `IndividualApi`, `IndividualOrder`, `IndividualSession` restano quelli pubblici di `@pizzaos/domain`. `refreshVersion` richiede una nuova lettura per l'account autenticato. `onReorder` si invoca solo per ordine terminale e senza pagamenti incerti. Fallimento callback: errore UI, nessuna conferma carrello pronto. `renderAdditions` riceve l'ordine server e callback rilettura dopo cambiamento.

Esempi: order.awaiting_acceptance → «In attesa del ristorante», timeline, note e «Annulla ordine»; completed → storico con prezzo acquistato e «Riordina»; guest → «Accedi», nessuna chiamata api.orders. `api.orders` unauthorized dopo accesso → nessun dato ordine ancora mostrato. Errori transitori conservano elenco precedente. `api.reconcile` non chiama checkout.

Riordino in composizione: scrittura draft con slotId=null, senza benefici precedenti e senza righe segnalate indisponibili; prezzi rideterminati soltanto nel checkout successivo. Un tentativo persistito blocca scrittura. Nessun dato carta o segreto viene persistito.

Le etichette stato/pagamento e le azioni esistenti sono conservate. Nessuna nuova policy commerciale. Testare comportamenti visibili e chiamate del port, non strutture private.
