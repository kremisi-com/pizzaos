import Image from "next/image";
import type { ReactElement } from "react";
import styles from "./admin-shell.module.css";

interface LiveOrdersSummaryCardProps {
  readonly pendingOrdersCount: number;
  readonly preparingOrdersCount: number;
  readonly outForDeliveryOrdersCount: number;
  readonly readyOrdersCount: number;
  readonly onOpenOrders: () => void;
  readonly connection?: string;
  readonly demo?: boolean;
}

export function LiveOrdersSummaryCard(
  props: LiveOrdersSummaryCardProps,
): ReactElement {
  const liveOrderStats = [
    {
      id: "pending",
      value: props.pendingOrdersCount,
      label: props.demo ? "da confermare" : "Da accettare",
      tone: "red",
      iconSrc: "/images/live-orders/writing.png",
    },
    {
      id: "preparing",
      value: props.preparingOrdersCount,
      label: "in cucina",
      tone: "orange",
      iconSrc: "/images/live-orders/chef.png",
    },
    {
      id: "delivery",
      value: props.outForDeliveryOrdersCount,
      label: "in consegna",
      tone: "amber",
      iconSrc: "/images/live-orders/scooter.png",
    },
    {
      id: "ready",
      value: props.readyOrdersCount,
      label: "pronto",
      tone: "green",
      iconSrc: "/images/live-orders/check.png",
    },
  ] as const;

  return (
    <article className={styles.liveOrdersPanel}>
      <header className={styles.liveOrdersHeader}>
        <h3>Ordini Live</h3>
        <div className={styles.liveOrdersStatus}>
          <span aria-hidden="true" />
          {props.connection ?? "Aggiornato in tempo reale"}
        </div>
      </header>

      <div className={styles.liveOrdersKpis}>
        {liveOrderStats.map((stat) => (
          <div
            className={`${styles.liveOrdersKpi} ${
              styles[`liveOrdersKpi${stat.tone}`]
            }`}
            key={stat.id}
            role={props.demo ? undefined : "group"}
            aria-label={props.demo ? undefined : stat.label}
          >
            <span className={styles.liveOrdersKpiIcon} aria-hidden="true">
              <Image
                alt=""
                height={22}
                src={stat.iconSrc}
                width={22}
              />
            </span>
            <div>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={props.demo ? styles.liveOrdersBottom : styles.liveOrdersActions}>
        {props.demo && <>
        <div className={styles.liveOrdersAverage}>
          <span>Tempo medio</span>
          <strong>24 min</strong>
          <small>
            <span aria-hidden="true">↓</span> 8% vs ieri
          </small>
        </div>

        <div className={styles.liveOrdersChart} aria-label="Trend ordini live">
          <div className={styles.liveOrdersChartScale} aria-hidden="true">
            <span>40</span>
            <span>30</span>
            <span>20</span>
            <span>10</span>
          </div>
          <svg viewBox="0 0 220 82" role="img" aria-label="Trend ordini">
            <defs>
              <linearGradient id="live-orders-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ff2d20" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ff2d20" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 66 C14 58 22 70 34 58 C45 42 56 43 69 54 C83 66 93 42 106 46 C120 50 123 18 140 24 C154 29 157 44 170 36 C183 27 189 45 200 32 C209 23 215 30 220 25 L220 82 L0 82 Z"
              fill="url(#live-orders-fill)"
            />
            <path
              d="M0 66 C14 58 22 70 34 58 C45 42 56 43 69 54 C83 66 93 42 106 46 C120 50 123 18 140 24 C154 29 157 44 170 36 C183 27 189 45 200 32 C209 23 215 30 220 25"
              fill="none"
              stroke="#ff2d20"
              strokeLinecap="round"
              strokeWidth="3"
            />
            <circle cx="220" cy="25" fill="#ff2d20" r="5" />
          </svg>
          <div className={styles.liveOrdersChartLabels} aria-hidden="true">
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span>14:00</span>
          </div>
        </div>

        </>}
        <div className={styles.liveOrdersActions}>
          <button
            className={styles.liveOrdersPrimaryAction}
            onClick={props.onOpenOrders}
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={16}
              src="/images/live-orders/queue.png"
              width={16}
            />
            Apri coda ordini
          </button>
          {props.demo && <button
            className={styles.liveOrdersSecondaryAction}
            onClick={() =>
              alert("Nuovo ordine manuale disponibile nella demo finale")
            }
            type="button"
          >
            <Image
              alt=""
              aria-hidden="true"
              height={16}
              src="/images/live-orders/manual-order.png"
              width={16}
            />
            Nuovo ordine manuale
          </button>}
        </div>
      </div>
    </article>
  );
}

interface QuickActionsCardProps {
  readonly onAssignRider: () => void;
  readonly onCreateCoupon: () => void;
  readonly onPauseSimulation: () => void;
  readonly onRefreshTimes: () => void;
  readonly onUpdateMenu: () => void;
  readonly operational?: boolean;
}

export function QuickActionsCard(props: QuickActionsCardProps): ReactElement {
  const quickActions = [
    {
      id: "pause",
      label: props.operational ? "Apertura sede" : "Metti in pausa",
      iconSrc: "/images/quick-actions/pause.png",
      isWide: false,
      onClick: props.onPauseSimulation,
    },
    {
      id: "times",
      label: props.operational ? "Fasce orarie" : "Aggiorna tempi",
      iconSrc: "/images/quick-actions/history.png",
      isWide: false,
      onClick: props.onRefreshTimes,
    },
    {
      id: "coupon",
      label: "Crea coupon",
      iconSrc: "/images/quick-actions/promo-code.png",
      isWide: false,
      onClick: props.onCreateCoupon,
    },
    {
      id: "menu",
      label: "Modifica menu",
      iconSrc: "/images/quick-actions/pizza.png",
      isWide: false,
      onClick: props.onUpdateMenu,
    },
    {
      id: "rider",
      label: "Assegna rider",
      iconSrc: "/images/quick-actions/scooter.png",
      onClick: props.onAssignRider,
      isWide: true,
    },
  ] as const;

  return (
    <article className={styles.quickActionsPanel}>
      <h3>Azioni rapide</h3>
      <div className={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <button
            className={`${styles.quickActionButton} ${
              action.isWide ? styles.quickActionButtonWide : ""
            }`}
            key={action.id}
            onClick={action.onClick}
            type="button"
          >
            <span aria-hidden="true">
              <Image
                alt=""
                height={22}
                src={action.iconSrc}
                width={22}
              />
            </span>
            {action.label}
          </button>
        ))}
      </div>
    </article>
  );
}
