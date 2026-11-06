# Contratto pubblico pannello

File apps/admin/src/features/pilot-analytics/index.tsx:

```tsx
import type { PilotAnalyticsApi } from "@pizzaos/domain";
export interface PilotAnalyticsPanelProps { storeId: string; api: PilotAnalyticsApi; refreshVersion?: number; }
/** Render Italian store analytics through the supplied authenticated browser port. */
export declare function PilotAnalyticsPanel(props: PilotAnalyticsPanelProps): React.JSX.Element;
```

Precondizioni: storeId identifica la sede selezionata; api è un port stabile della composizione e l'autorizzazione resta lato server. Nessun import del servizio dal browser. I controlli sono accessibili tramite label Periodo, Dal, Al e pulsanti Applica/Riprova. Stato caricamento annunciato con role=status, errori con role=alert.

Valori visualizzati: Ordini completati; Vendite; Valore medio ordine; Ordini annullati; Prodotti più venduti. I dati provengono esclusivamente da PilotAnalyticsReport. Non esporre dati di una sede precedente quando storeId cambia.
