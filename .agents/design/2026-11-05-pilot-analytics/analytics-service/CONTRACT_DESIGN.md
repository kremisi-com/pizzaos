# Contratto pubblico

Tipi in packages/domain/src/pilot-analytics.ts (esportati dall'entry point @pizzaos/domain dal coordinatore):

```ts
export type PilotAnalyticsPeriod = "today" | "last_7_days" | "last_30_days" | "custom";
export interface PilotAnalyticsQuery { storeId: string; period: PilotAnalyticsPeriod; fromDate?: string; throughDate?: string; }
export interface PilotAnalyticsRange { timeZone: string; fromDate: string; throughDate: string; startsAt: string; endsAt: string; }
export interface PilotAnalyticsProduct { productId: string; name: string; quantity: number; }
export interface PilotAnalyticsReport { storeId: string; range: PilotAnalyticsRange; completedOrders: number; salesCents: number; averageOrderCents: number; cancelledOrders: number; topProducts: PilotAnalyticsProduct[]; }
export interface PilotAnalyticsApi { report(query: PilotAnalyticsQuery): Promise<PilotAnalyticsReport>; }
```

Servizio in services/checkout-api/src/analytics/index.ts:

```ts
import type { IndividualActor, PilotAnalyticsQuery, PilotAnalyticsReport } from "@pizzaos/domain";
import type { OrderingRepository } from "../ordering-contract";
export interface PilotAnalyticsService { report(actor: IndividualActor | null, query: PilotAnalyticsQuery): Promise<PilotAnalyticsReport>; }
export interface PilotAnalyticsOptions { repository: OrderingRepository; superadminEmails: string[]; now?: () => Date; }
/** Return an OrderingRepository preserving transaction results/errors and atomically recording NEW terminal transitions. Clock defaults to server current time. */
export declare function withPilotAnalytics(repository: OrderingRepository, now?: () => Date): OrderingRepository;
/** Read reports from a repository instrumented with withPilotAnalytics; no implicit journal backfill. */
export declare function createPilotAnalyticsService(options: PilotAnalyticsOptions): PilotAnalyticsService;
/** Exposes code unauthorized|forbidden|not_found|invalid_input, corresponding statusCode 401|403|404|400 and an Italian message. */
export declare class PilotAnalyticsError extends Error { readonly code: "unauthorized" | "forbidden" | "not_found" | "invalid_input"; readonly statusCode: number; }
```

Precondizioni: repository conforme a OrderingRepository con rollback su callback fallita e isolamento transazionale; gli importi/righe degli ordini sono già validati dal servizio autorevole. Postcondizioni: output privo di dati personali, valuta in centesimi, filtri locali con UTC esclusivo a destra. Invariante: la stessa transizione definitiva contribuisce una sola volta, indipendentemente da retry e ricostruzione degli oggetti servizio.

Esempi e errori sono prescritti in REQUIREMENTS.md. Test possono usare un repository in-memory transazionale conforme e ordini minimi strutturalmente validi, senza leggere l'implementazione privata del servizio.
