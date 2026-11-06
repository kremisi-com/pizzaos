/** Calendar filters evaluated in the configured store time zone. */
export type PilotAnalyticsPeriod = "today" | "last_7_days" | "last_30_days" | "custom";
export interface PilotAnalyticsQuery { storeId: string; period: PilotAnalyticsPeriod; fromDate?: string; throughDate?: string; }
export interface PilotAnalyticsRange { timeZone: string; fromDate: string; throughDate: string; startsAt: string; endsAt: string; }
export interface PilotAnalyticsProduct { productId: string; name: string; quantity: number; }
/** Sales are completed order value including delivery, not profit or cash balance. */
export interface PilotAnalyticsReport { storeId: string; range: PilotAnalyticsRange; completedOrders: number; salesCents: number; averageOrderCents: number; cancelledOrders: number; topProducts: PilotAnalyticsProduct[]; }
export interface PilotAnalyticsApi { report(query: PilotAnalyticsQuery): Promise<PilotAnalyticsReport>; }
