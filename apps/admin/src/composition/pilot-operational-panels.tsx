"use client";

import type { IndividualOrder, IndividualStore } from "@pizzaos/domain";
import { useMemo } from "react";
import { DeliveryAssignmentsPanel } from "../features/delivery-assignment-panel";
import { PilotAnalyticsPanel } from "../features/pilot-analytics";
import { PromotionAdminPanel } from "../features/promotions";
import { OperationalEmailPanel } from "../features/operational-emails";
import { createDeliveryAdminApi } from "./api/rider-delivery-api";
import { createPilotAnalyticsApi } from "./api/pilot-analytics-api";
import { createPromotionsApi } from "./api/promotions-api";
import { createOperationalEmailApi } from "./api/operational-email-api";

export function PilotOperationalPanels({ tab, storeId, store, orders, refreshVersion, onChanged, riderHref }: {
  tab: "delivery" | "analytics" | "marketing" | "integrations";
  storeId: string;
  store: IndividualStore | null;
  orders: IndividualOrder[] | null;
  refreshVersion: number;
  onChanged: () => void;
  riderHref?: string;
}) {
  const deliveryApi = useMemo(() => createDeliveryAdminApi(), []);
  const analyticsApi = useMemo(() => createPilotAnalyticsApi(), []);
  const promotionsApi = useMemo(() => createPromotionsApi(), []);
  const emailApi = useMemo(() => createOperationalEmailApi(), []);

  if (tab === "integrations") return <OperationalEmailPanel api={emailApi} storeId={storeId} refreshVersion={refreshVersion} />;
  if (tab === "analytics") return <PilotAnalyticsPanel storeId={storeId} api={analyticsApi} refreshVersion={refreshVersion} />;
  if (tab === "marketing") return store
    ? <PromotionAdminPanel storeId={storeId} products={store.products} api={promotionsApi} refreshVersion={refreshVersion} />
    : <p role="status">Caricamento del catalogo promozioni…</p>;
  return orders
    ? <DeliveryAssignmentsPanel storeId={storeId} orders={orders} api={deliveryApi} onChanged={onChanged} refreshVersion={refreshVersion} riderHref={riderHref} />
    : <p role="status">Caricamento degli ordini per le consegne…</p>;
}
