import type { IndividualOrder, PilotAnalyticsReport } from "@pizzaos/domain";
import Image from "next/image";
import { useEffect, useState } from "react";
import { operationalOrderStatusLabels } from "../features/orders";
import { LiveOrdersSummaryCard, QuickActionsCard } from "./admin-dashboard-cards";
import type { AdminTab } from "./admin-frame";
import { createPilotAnalyticsApi } from "./api/pilot-analytics-api";
import { createDeliveryAdminApi } from "./api/rider-delivery-api";
import styles from "./admin-shell.module.css";

const analyticsApi = createPilotAnalyticsApi();
const deliveryApi = createDeliveryAdminApi();
const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function OperationalDashboard({ storeId, orders, connection, refreshVersion, timeZone, onNavigate }: {
  storeId: string;
  orders: IndividualOrder[];
  connection: string;
  refreshVersion: number;
  timeZone?: string;
  onNavigate: (tab: AdminTab) => void;
}) {
  const [report, setReport] = useState<PilotAnalyticsReport | null>();
  const [activeRiders, setActiveRiders] = useState<number | null>();
  useEffect(() => {
    let active = true;
    void analyticsApi.report({ storeId, period: "today" }).then(value => {
      if (active) setReport(value);
    }).catch(() => { if (active) setReport(null); });
    void deliveryApi.riders(storeId).then(value => {
      if (active) setActiveRiders(value.filter(rider => rider.active).length);
    }).catch(() => { if (active) setActiveRiders(null); });
    return () => { active = false; };
  }, [storeId, refreshVersion]);

  const awaiting = orders.filter(order => order.status === "awaiting_acceptance").length;
  const waiting = orders.filter(order => order.status === "awaiting_customer").length;
  const refundFailures = orders.filter(order => order.payment === "refund_failed" || order.additions?.some(item => item.payment === "refund_failed")).length;
  const onTheRoad = orders.filter(order => order.status === "out_for_delivery").length;
  const time = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit", timeZone });

  return <div className={styles.dashboardGrid}>
    <div className={styles.liveOrdersCard}>
      <LiveOrdersSummaryCard pendingOrdersCount={awaiting}
        preparingOrdersCount={orders.filter(order => order.status === "accepted" || order.status === "preparing").length}
        outForDeliveryOrdersCount={onTheRoad}
        readyOrdersCount={orders.filter(order => order.status === "ready").length}
        onOpenOrders={() => onNavigate("orders")} connection={connection} />
    </div>
    <article className={styles.attentionCard}>
      <header className={styles.attentionHeader}>
        <span className={styles.attentionHeaderIcon} aria-hidden="true"><Image alt="" width={18} height={18} src="/images/live-orders/writing.png" /></span>
        <h3>Richiede attenzione</h3>
      </header>
      <div className={styles.attentionAlertBox}>
        <p><strong>{waiting}</strong> in attesa del cliente</p>
        <p><strong>{refundFailures}</strong> rimborsi da gestire</p>
      </div>
    </article>
    <div className={styles.quickActionsCard}>
      <QuickActionsCard onAssignRider={() => onNavigate("delivery")} onCreateCoupon={() => onNavigate("marketing")}
        onPauseSimulation={() => onNavigate("profile")} onRefreshTimes={() => onNavigate("profile")}
        onUpdateMenu={() => onNavigate("catalog")} operational />
    </div>
    <section className={styles.dashboardInsightRow} aria-label="Sintesi dashboard">
      <article className={styles.dashboardInsightCard}>
        <header className={styles.operationalTimelineHeader}><h3>Prodotti più ordinati</h3></header>
        {report?.topProducts.length ? <ol>
          {report.topProducts.slice(0, 3).map(product => <li key={product.productId}>{product.name} · {product.quantity}</li>)}
        </ol> : <p>{report ? "Nessun prodotto negli ordini completati oggi." : report === null ? "Statistiche non disponibili." : "Caricamento statistiche…"}</p>}
        <button type="button" className={styles.operationalTimelineAction} onClick={() => onNavigate("analytics")}>Apri statistiche</button>
      </article>
      <article className={styles.dashboardInsightCard}>
        <header className={styles.operationalTimelineHeader}>
          <span className={styles.operationalTimelineIcon} aria-hidden="true"><Image alt="" width={18} height={18} src="/images/dashboard/clock.png" /></span>
          <h3>Timeline operativa</h3>
        </header>
        {orders.length === 0 ? <p>Non ci sono ordini per questa sede.</p> : <ol className={styles.operationalTimelineList}>
          {orders.slice(0, 4).map(order => <li className={styles.operationalTimelineItem} key={order.id}>
            <span className={styles.operationalTimelineTime}>{time.format(new Date(order.createdAt))}</span>
            <span className={`${styles.operationalTimelineDot} ${styles.operationalTimelineDotred}`} aria-hidden="true" />
            <span className={styles.operationalTimelineContent}><strong>Ordine #{order.id.slice(0, 8)}</strong><small>{operationalOrderStatusLabels[order.status]}</small></span>
          </li>)}
        </ol>}
        <button type="button" className={styles.operationalTimelineAction} onClick={() => onNavigate("orders")}>Vedi tutti gli ordini</button>
      </article>
      <article className={styles.revenueTodayCard}>
        <header className={styles.revenueTodayHeader}><h3>Vendite di oggi</h3></header>
        {report ? <>
          <strong className={styles.revenueTodayValue}>{currency.format(report.salesCents / 100)}</strong>
          <div className={styles.revenueTodayMetrics}>
            <div><span>Ordini completati</span><strong>{report.completedOrders}</strong></div>
            <div><span>Scontrino medio</span><strong>{currency.format(report.averageOrderCents / 100)}</strong></div>
          </div>
        </> : <p>{report === null ? "Vendite non disponibili." : "Caricamento vendite…"}</p>}
      </article>
      <article className={styles.deliveryFleetCard}>
        <header className={styles.deliveryFleetHeader}>
          <span className={styles.deliveryFleetIcon} aria-hidden="true"><Image alt="" width={16} height={16} src="/images/sidebar/scooter.png" /></span>
          <h3>Flotta Consegne</h3>
        </header>
        {typeof activeRiders === "number" && <p><strong>{activeRiders}</strong> rider abilitati</p>}
        {activeRiders === null && <p>Elenco rider non disponibile.</p>}
        <p><strong>{onTheRoad}</strong> ordini in consegna</p>
        <button type="button" className={styles.deliveryFleetAction} onClick={() => onNavigate("delivery")}>Gestisci flotta</button>
      </article>
    </section>
  </div>;
}
