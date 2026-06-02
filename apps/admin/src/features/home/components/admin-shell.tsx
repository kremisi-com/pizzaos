"use client";

import {
  loadDemoState,
  resetDemoState,
  reseedDemoState,
  advanceOrderSimulation,
  getDemoStateStorageKey,
  ADMIN_SIMULATION_INTERVAL_MS,
  ORDER_SIMULATION_STEP_MS,
  type AdminSeed,
} from "@pizzaos/mock-data";
import {
  type Order,
  type OrderStatus,
  type Product,
  type Menu,
  type Ingredient,
} from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import Image from "next/image";
import { useCallback, useState, type ReactElement, useEffect, useRef } from "react";
import { OrdersDashboard } from "../../orders/components/orders-dashboard";
import { StoreSwitcher } from "../../store-switch/components/store-switcher";
import { CatalogManager } from "../../catalog/components/catalog-manager";
import { InventoryManager } from "../../inventory/components/inventory-manager";
import { MarketingManager } from "../../marketing/components/marketing-manager";
import { AnalyticsManager } from "../../analytics/components/analytics-manager";
import { DeliveryManager } from "../../delivery/components/delivery-manager";
import { IntegrationsManager } from "../../integrations/components/integrations-manager";
import { ProfileManager } from "../../profile/components/profile-manager";
import styles from "./admin-shell.module.css";

const APP_ID = "admin" as const;
const NEW_ORDER_TOAST_TTL_MS = 7000;

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    iconSrc: "/images/sidebar/dashboard.png",
  },
  { id: "orders", label: "Ordini", iconSrc: "/images/sidebar/bag.png" },
  { id: "catalog", label: "Menu", iconSrc: "/images/sidebar/pizza.png" },
  { id: "inventory", label: "Magazzino", iconSrc: "/images/sidebar/box.png" },
  {
    id: "marketing",
    label: "Marketing",
    iconSrc: "/images/sidebar/megaphone.png",
  },
  {
    id: "analytics",
    label: "Analytics & AI",
    iconSrc: "/images/sidebar/bar-chart.png",
  },
  { id: "delivery", label: "Consegne", iconSrc: "/images/sidebar/scooter.png" },
  {
    id: "integrations",
    label: "Integrazioni",
    iconSrc: "/images/sidebar/plugin.png",
  },
  { id: "profile", label: "Profilo", iconSrc: "/images/sidebar/user.png" },
] as const;

const OPERATIONAL_TIMELINE_ITEMS = [
  {
    id: "order-received",
    time: "12:14",
    title: "Ordine #104 ricevuto",
    detail: "2 margherite, 1 diavola",
    tone: "red",
  },
  {
    id: "rider-assigned",
    time: "12:12",
    title: "Rider assegnato a #103",
    detail: "Marco Bianchi",
    tone: "orange",
  },
  {
    id: "lunch-menu",
    time: "12:09",
    title: "Menu pranzo attivato",
    detail: "Menu Pranzo Centro",
    tone: "green",
  },
  {
    id: "stock-alert",
    time: "12:05",
    title: "Birra IPA sotto scorta",
    detail: "Disponibilita: 0",
    tone: "amber",
  },
] as const;

interface NewOrderToast {
  readonly id: string;
  readonly order: Order;
}

function deriveNextSimulationDate(simulationCursorIso: string): Date {
  const cursorTimestamp = Date.parse(simulationCursorIso);

  if (!Number.isFinite(cursorTimestamp)) {
    return new Date();
  }

  return new Date(cursorTimestamp + ORDER_SIMULATION_STEP_MS);
}

function resolveStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { localStorage } = window;

  if (
    typeof localStorage.getItem !== "function" ||
    typeof localStorage.setItem !== "function" ||
    typeof localStorage.removeItem !== "function"
  ) {
    return undefined;
  }

  return localStorage;
}

const REVENUE_TODAY_LINE_PATH =
  "M0 69 C15 64 23 72 36 62 C48 50 57 55 69 48 C84 39 95 47 108 36 C121 25 132 32 145 28 C158 23 166 34 178 22 C191 11 204 18 220 8";

const REVENUE_TODAY_AREA_PATH = `${REVENUE_TODAY_LINE_PATH} L220 82 L0 82 Z`;

function RevenueTodayCard(): ReactElement {
  return (
    <article className={styles.revenueTodayCard}>
      <header className={styles.revenueTodayHeader}>
        <span className={styles.revenueTodayIcon} aria-hidden="true">
          <svg viewBox="0 0 18 18" focusable="false">
            <circle cx="9" cy="9" r="7" />
            <path d="M9 5.6v6.8" />
            <path d="M11.2 7.1c-.35-.55-1.07-.86-1.9-.86-1.15 0-2.04.56-2.04 1.42 0 .92.86 1.2 1.93 1.43 1.18.25 2.1.54 2.1 1.48 0 .87-.86 1.48-2.12 1.48-.92 0-1.73-.35-2.14-.95" />
          </svg>
        </span>
        <h3>Revenue Oggi</h3>
      </header>

      <strong className={styles.revenueTodayValue}>1.414,30 €</strong>

      <p className={styles.revenueTodayTrend}>
        <span aria-hidden="true">↑</span>
        16% vs ieri
      </p>

      <div
        className={styles.revenueTodayChart}
        role="img"
        aria-label="Revenue oggi in crescita tra mezzanotte e le 16:00"
      >
        <svg viewBox="0 0 220 82" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id="revenue-today-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2d20" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ff2d20" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className={styles.revenueTodayArea} d={REVENUE_TODAY_AREA_PATH} />
          <path className={styles.revenueTodayLine} d={REVENUE_TODAY_LINE_PATH} />
          <circle
            className={styles.revenueTodayDot}
            cx="220"
            cy="8"
            r="5"
          />
        </svg>

        <div className={styles.revenueTodayAxis} aria-hidden="true">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>

      <div className={styles.revenueTodayMetrics}>
        <div>
          <span>Ordini oggi</span>
          <strong>52</strong>
          <small>
            <span aria-hidden="true">↑</span>
            8%
          </small>
        </div>
        <div>
          <span>Scontrino medio</span>
          <strong>27,20 €</strong>
          <small>
            <span aria-hidden="true">↑</span>
            5%
          </small>
        </div>
      </div>
    </article>
  );
}

interface DeliveryFleetCardProps {
  readonly onManageFleet: () => void;
}

function DeliveryFleetCard({
  onManageFleet,
}: DeliveryFleetCardProps): ReactElement {
  return (
    <article className={styles.deliveryFleetCard}>
      <header className={styles.deliveryFleetHeader}>
        <span className={styles.deliveryFleetIcon} aria-hidden="true">
          <Image
            alt=""
            height={16}
            src="/images/sidebar/scooter.png"
            width={16}
          />
        </span>
        <h3>Flotta Consegne</h3>
      </header>

      <div
        className={styles.deliveryFleetGauge}
        role="img"
        aria-label="Flotta consegne: 6 rider disponibili e 2 occupati"
      >
        <svg viewBox="0 0 200 118" focusable="false" aria-hidden="true">
          <path
            className={styles.deliveryFleetGaugeTrack}
            d="M 28 100 A 72 72 0 0 1 172 100"
          />
          <path
            className={styles.deliveryFleetGaugeAvailable}
            d="M 28 100 A 72 72 0 0 1 151 49"
          />
          <path
            className={styles.deliveryFleetGaugeBusy}
            d="M 160 58 A 72 72 0 0 1 172 100"
          />
        </svg>
        <div className={styles.deliveryFleetGaugeCenter} aria-hidden="true">
          <strong>8</strong>
          <span>rider attivi</span>
        </div>
      </div>

      <div className={styles.deliveryFleetLegend}>
        <span>
          <i className={styles.deliveryFleetLegendAvailable} aria-hidden="true" />
          6 disponibili
        </span>
        <span>
          <i className={styles.deliveryFleetLegendBusy} aria-hidden="true" />
          2 occupati
        </span>
      </div>

      <button
        className={styles.deliveryFleetAction}
        onClick={onManageFleet}
        type="button"
      >
        Gestisci flotta
      </button>
    </article>
  );
}

interface DashboardMarketingRowProps {
  readonly onOpenMarketing: () => void;
  readonly onOpenAnalytics: () => void;
}

function DashboardMarketingRow({
  onOpenAnalytics,
  onOpenMarketing,
}: DashboardMarketingRowProps): ReactElement {
  const opportunityItems = [
    {
      id: "inactive-customer",
      title: "Cliente inattivo da 21 giorni",
      detail: "Invia coupon -10% per riattivarlo",
      tone: "red",
      icon: (
        <span className={styles.opportunityCustomerIcon} aria-hidden="true" />
      ),
      onOpen: onOpenMarketing,
    },
    {
      id: "birthday",
      title: "Compleanno cliente domani",
      detail: "Programma promo auguri",
      tone: "purple",
      icon: (
        <Image
          alt=""
          height={21}
          src="/images/dashboard/gift.png"
          width={21}
        />
      ),
      onOpen: onOpenMarketing,
    },
    {
      id: "lunch-spike",
      title: "Picco uffici alle 12:30",
      detail: "Attiva menu pranzo rapido",
      tone: "green",
      icon: (
        <Image
          alt=""
          height={21}
          src="/images/dashboard/clock.png"
          width={21}
        />
      ),
      onOpen: onOpenAnalytics,
    },
  ] as const;

  return (
    <section
      className={styles.dashboardMarketingRow}
      aria-label="Marketing e opportunita automatiche"
    >
      <article className={styles.marketingActiveCard}>
        <header className={styles.dashboardMarketingHeader}>
          <span className={styles.dashboardMarketingTitleIcon} aria-hidden="true">
            <Image
              alt=""
              height={18}
              src="/images/sidebar/megaphone.png"
              width={18}
            />
          </span>
          <h3>Marketing Attivo</h3>
        </header>

        <div className={styles.marketingActiveBody}>
          <div className={styles.marketingActiveMetric}>
            <span>Coupon attivi</span>
            <strong>1</strong>
          </div>

          <div className={styles.marketingActiveDivider} aria-hidden="true" />

          <button
            className={styles.marketingActiveAction}
            onClick={onOpenMarketing}
            type="button"
          >
            Vedi dettagli
          </button>

          <div className={styles.marketingActiveMetric}>
            <span>Clienti fedelta</span>
            <strong>234</strong>
            <small>
              <span aria-hidden="true">↑</span>
              12%
            </small>
          </div>
        </div>

        <span className={styles.marketingActiveBadge} aria-hidden="true">
          <Image
            alt=""
            height={28}
            src="/images/dashboard/star.png"
            width={28}
          />
        </span>
      </article>

      <article className={styles.automatedOpportunitiesCard}>
        <header className={styles.dashboardMarketingHeader}>
          <span
            className={styles.dashboardMarketingTitleIcon}
            aria-hidden="true"
          >
            <Image
              alt=""
              height={18}
              src="/images/dashboard/star.png"
              width={18}
            />
          </span>
          <h3>Opportunita automatiche</h3>
          <button
            className={styles.opportunitiesViewAll}
            onClick={onOpenMarketing}
            type="button"
          >
            Vedi tutte
            <span aria-hidden="true">›</span>
          </button>
        </header>

        <div className={styles.opportunityList}>
          {opportunityItems.map((item) => (
            <button
              className={styles.opportunityItem}
              key={item.id}
              onClick={item.onOpen}
              type="button"
            >
              <span
                className={`${styles.opportunityIcon} ${
                  styles[`opportunityIcon${item.tone}`]
                }`}
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className={styles.opportunityCopy}>
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className={styles.opportunityChevron} aria-hidden="true">
                ›
              </span>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

interface LiveOrdersSummaryCardProps {
  readonly pendingOrdersCount: number;
  readonly preparingOrdersCount: number;
  readonly outForDeliveryOrdersCount: number;
  readonly readyOrdersCount: number;
  readonly onOpenOrders: () => void;
}

function LiveOrdersSummaryCard(
  props: LiveOrdersSummaryCardProps,
): ReactElement {
  const liveOrderStats = [
    {
      id: "pending",
      value: props.pendingOrdersCount,
      label: "da confermare",
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
          Aggiornato in tempo reale
        </div>
      </header>

      <div className={styles.liveOrdersKpis}>
        {liveOrderStats.map((stat) => (
          <div
            className={`${styles.liveOrdersKpi} ${
              styles[`liveOrdersKpi${stat.tone}`]
            }`}
            key={stat.id}
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

      <div className={styles.liveOrdersBottom}>
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
          <button
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
          </button>
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
}

function QuickActionsCard(props: QuickActionsCardProps): ReactElement {
  const quickActions = [
    {
      id: "pause",
      label: "Metti in pausa",
      iconSrc: "/images/quick-actions/pause.png",
      isWide: false,
      onClick: props.onPauseSimulation,
    },
    {
      id: "times",
      label: "Aggiorna tempi",
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

export function AdminShell(): ReactElement {
  const [seed, setSeed] = useState<AdminSeed>(() =>
    loadDemoState(APP_ID, { storage: resolveStorage() }),
  );

  const [activeTab, setActiveTab] = useState<
    (typeof NAV_ITEMS)[number]["id"]
  >("dashboard");
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [newOrderToasts, setNewOrderToasts] = useState<readonly NewOrderToast[]>([]);
  const knownOrderIdsRef = useRef<ReadonlySet<string> | null>(null);
  const knownOrderStoreIdRef = useRef<string | null>(null);

  const activeDataset = seed.datasetsByStoreId[seed.activeStoreId];

  const pendingOrdersCount = activeDataset.orders.filter(
    (o) => o.status === "received" || o.status === "confirmed",
  ).length;
  const preparingOrdersCount = activeDataset.orders.filter(
    (o) => o.status === "preparing",
  ).length;
  const outForDeliveryOrdersCount = activeDataset.orders.filter(
    (o) => o.status === "out_for_delivery",
  ).length;
  const readyOrdersCount = activeDataset.orders.filter(
    (o) => o.status === "ready",
  ).length;
  const topInsight = activeDataset.insights?.[0];

  const inventoryIngredients: readonly Ingredient[] =
    activeDataset.products.flatMap((product) => product.ingredients ?? []);

  useEffect(() => {
    const storage = resolveStorage();
    if (storage) {
      const storageKey = getDemoStateStorageKey(APP_ID);
      storage.setItem(storageKey, JSON.stringify(seed));
    }
  }, [seed]);

  const handleAdvanceSimulation = useCallback((): void => {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];
      const nextSimulationDate = deriveNextSimulationDate(
        currentDataset.simulationCursorIso,
      );

      const updatedDataset = advanceOrderSimulation(
        currentDataset,
        nextSimulationDate,
      );

      if (updatedDataset === currentDataset) {
        return currentSeed;
      }

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: updatedDataset,
        },
      };
    });
  }, []);

  useEffect(() => {
    const currentOrderIds = new Set(activeDataset.orders.map((order) => order.id));

    if (knownOrderStoreIdRef.current !== seed.activeStoreId || knownOrderIdsRef.current === null) {
      knownOrderStoreIdRef.current = seed.activeStoreId;
      knownOrderIdsRef.current = currentOrderIds;
      return;
    }

    const arrivedOrders = activeDataset.orders.filter((order) => !knownOrderIdsRef.current?.has(order.id));

    knownOrderIdsRef.current = currentOrderIds;

    if (arrivedOrders.length === 0) {
      return;
    }

    setNewOrderToasts((currentToasts) => [
      ...arrivedOrders.map((order) => ({
        id: `${order.id}-${order.updatedAtIso}`,
        order,
      })),
      ...currentToasts,
    ].slice(0, 4));
  }, [activeDataset.orders, seed.activeStoreId]);

  useEffect(() => {
    if (newOrderToasts.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setNewOrderToasts((currentToasts) => currentToasts.slice(0, -1));
    }, NEW_ORDER_TOAST_TTL_MS);

    return () => window.clearTimeout(timeoutId);
  }, [newOrderToasts]);

  useEffect(() => {
    if (!isSimulationRunning) {
      return undefined;
    }

    const intervalId = window.setInterval(
      handleAdvanceSimulation,
      ADMIN_SIMULATION_INTERVAL_MS,
    );

    return () => window.clearInterval(intervalId);
  }, [handleAdvanceSimulation, isSimulationRunning]);

  function handleResetClick(): void {
    const resetSeed = resetDemoState(APP_ID, { storage: resolveStorage() });
    setSeed(resetSeed);
  }

  function handleStoreChange(storeId: string): void {
    const updatedSeed = reseedDemoState(APP_ID, {
      storage: resolveStorage(),
      storeId,
    }) as AdminSeed;

    setSeed(updatedSeed);
  }

  function handleOrderStatusUpdate(
    orderId: string,
    nextStatus: OrderStatus,
    riderId?: string,
  ): void {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];

      const updatedOrders = currentDataset.orders.map((order) => {
        if (order.id === orderId) {
          return {
            ...order,
            status: nextStatus,
            riderId: riderId ?? order.riderId,
            updatedAtIso: new Date().toISOString(),
          };
        }
        return order;
      });

      const updatedRiders =
        currentDataset.riders?.map((rider) => {
          if (rider.id === riderId) {
            return {
              ...rider,
              status:
                nextStatus === "out_for_delivery"
                  ? ("busy" as const)
                  : rider.status,
            };
          }
          if (
            nextStatus === "delivered" &&
            rider.id === updatedOrders.find((o) => o.id === orderId)?.riderId
          ) {
            return {
              ...rider,
              status: "available" as const,
            };
          }
          return rider;
        }) ?? [];

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: {
            ...currentDataset,
            orders: updatedOrders,
            riders: updatedRiders,
          },
        },
      };
    });
  }

  function handleUpdateMenu(updatedMenu: Menu): void {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];

      const updatedMenus = currentDataset.menus.map((m) =>
        m.id === updatedMenu.id ? updatedMenu : m,
      );

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: {
            ...currentDataset,
            menus: updatedMenus,
            menu:
              updatedMenu.id === currentDataset.menu.id
                ? updatedMenu
                : currentDataset.menu,
          },
        },
      };
    });
  }

  function handleUpdateProduct(updatedProduct: Product): void {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];

      const updatedProducts = currentDataset.products.map((p) =>
        p.id === updatedProduct.id ? updatedProduct : p,
      );

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: {
            ...currentDataset,
            products: updatedProducts,
          },
        },
      };
    });
  }

  function handleToggleDynamicPricing(): void {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: {
            ...currentDataset,
            isDynamicPricingEnabled: !currentDataset.isDynamicPricingEnabled,
          },
        },
      };
    });
  }

  function handleUpdateInventoryItem(
    itemId: string,
    status: "in_stock" | "low_stock" | "out_of_stock",
    availableUnits: number,
  ): void {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];

      const updatedInventory = currentDataset.inventory.map((item) =>
        item.id === itemId ? { ...item, status, availableUnits } : item,
      );

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: {
            ...currentDataset,
            inventory: updatedInventory,
          },
        },
      };
    });
  }

  return (
    <div
      className={`${styles.shell} ${
        isSidebarCollapsed ? styles.shellSidebarCollapsed : ""
      }`}
    >
      <aside
        className={`${styles.sidebar} ${
          isSidebarCollapsed ? styles.sidebarCollapsed : ""
        }`}
      >
        <button
          aria-controls="admin-sidebar-content"
          aria-expanded={!isSidebarCollapsed}
          aria-label={
            isSidebarCollapsed ? "Mostra sidebar" : "Nascondi sidebar"
          }
          className={styles.sidebarToggle}
          onClick={() => setIsSidebarCollapsed((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">
            {isSidebarCollapsed ? <>&rsaquo;</> : <>&lsaquo;</>}
          </span>
        </button>

        {!isSidebarCollapsed ? (
          <div className={styles.sidebarContent} id="admin-sidebar-content">
            <h1 className={styles.logo}>
              <Image
                className={styles.logoImage}
                src="/images/logo.png"
                alt="PizzaOS Admin"
                width={180}
                height={52}
                priority
              />
            </h1>

            <nav className={styles.nav}>
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  aria-label={
                    item.id === "analytics" ? "Analytics and AI" : undefined
                  }
                  onClick={() => setActiveTab(item.id)}
                  className={`${styles.navButton} ${
                    activeTab === item.id ? styles.navItemActive : ""
                  }`}
                >
                  <span aria-hidden="true" className={styles.navIcon}>
                    <Image alt="" height={18} src={item.iconSrc} width={18} />
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            <StoreSwitcher
              stores={seed.stores}
              activeStoreId={seed.activeStoreId}
              onStoreChange={handleStoreChange}
            />

            <div className={styles.sidebarFooter}>
              <Button
                onClick={() => setIsSimulationRunning((current) => !current)}
                variant={isSimulationRunning ? "secondary" : "primary"}
                className={styles.advanceButton}
              >
                {isSimulationRunning
                  ? "Pausa simulazione"
                  : "Riprendi simulazione"}
              </Button>
              <Button
                onClick={handleResetClick}
                variant="secondary"
                className={styles.resetButton}
              >
                Reset Demo
              </Button>
            </div>
          </div>
        ) : null}
      </aside>

      <main className={styles.content}>
        {activeTab === "dashboard" ? (
          <div className={styles.dashboardGrid}>
            <div className={styles.liveOrdersCard}>
              <LiveOrdersSummaryCard
                pendingOrdersCount={pendingOrdersCount}
                preparingOrdersCount={preparingOrdersCount}
                outForDeliveryOrdersCount={outForDeliveryOrdersCount}
                readyOrdersCount={readyOrdersCount}
                onOpenOrders={() => setActiveTab("orders")}
              />
            </div>

            <article className={styles.attentionCard}>
              <header className={styles.attentionHeader}>
                <span className={styles.attentionHeaderIcon} aria-hidden="true">
                  <Image
                    alt=""
                    height={18}
                    src="/images/attention/warning.png"
                    width={18}
                  />
                </span>
                <h3>Attenzione</h3>
              </header>

              <div className={styles.attentionAlertBox}>
                <div className={styles.attentionAlertRow}>
                  <span
                    className={`${styles.attentionAlertIcon} ${styles.attentionAlertIconWarning}`}
                    aria-hidden="true"
                  >
                    <Image
                      alt=""
                      height={18}
                      src="/images/attention/exclamation.png"
                      width={18}
                    />
                  </span>
                  <div>
                    <p className={styles.attentionAlertTitle}>
                      2 ingredienti sotto scorta
                    </p>
                    <p className={styles.attentionAlertDetail}>
                      Mozzarella, Rucola
                    </p>
                  </div>
                </div>

                <div className={styles.attentionDivider} />

                <div className={styles.attentionAlertRow}>
                  <span
                    className={`${styles.attentionAlertIcon} ${styles.attentionAlertIconDanger}`}
                    aria-hidden="true"
                  >
                    <Image
                      alt=""
                      height={18}
                      src="/images/attention/danger.png"
                      width={18}
                    />
                  </span>
                  <div>
                    <p className={styles.attentionAlertTitle}>
                      1 prodotto esaurito
                    </p>
                    <p className={styles.attentionAlertDetail}>
                      Birra IPA 33cl
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.attentionStaticAction}>
                Gestisci magazzino
              </div>
            </article>

            <div className={styles.quickActionsCard}>
              <QuickActionsCard
                onAssignRider={() => setActiveTab("delivery")}
                onCreateCoupon={() => setActiveTab("marketing")}
                onPauseSimulation={() => setIsSimulationRunning(false)}
                onRefreshTimes={handleAdvanceSimulation}
                onUpdateMenu={() => setActiveTab("catalog")}
              />
            </div>

            <section
              className={styles.dashboardInsightRow}
              aria-label="Sintesi dashboard"
            >
              <article
                className={`${styles.dashboardInsightCard} ${styles.aiInsightCard}`}
              >
                <header className={styles.aiInsightHeader}>
                  <span className={styles.aiInsightIcon} aria-hidden="true">
                    ✦
                  </span>
                  <h3>Insight AI</h3>
                </header>
                <p className={styles.aiInsightTitle}>
                  {topInsight?.title ?? "Nessun insight prioritario"}.
                </p>
                <p className={styles.aiInsightSummary}>
                  {topInsight?.summary ??
                    "Attiva il menu rapido per ridurre i tempi medi del 12%."}
                </p>
                <div className={styles.aiInsightConfidence}>
                  <span>Confidenza</span>
                  <strong>
                    {topInsight
                      ? `${Math.round(topInsight.confidenceScore * 100)}%`
                      : "0%"}
                  </strong>
                  <div
                    className={styles.aiInsightProgress}
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        width: topInsight
                          ? `${Math.round(topInsight.confidenceScore * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                </div>
                <button className={styles.aiInsightAction} type="button">
                  Applica suggerimento
                </button>
              </article>

              <article className={styles.dashboardInsightCard}>
                <header className={styles.operationalTimelineHeader}>
                  <span
                    className={styles.operationalTimelineIcon}
                    aria-hidden="true"
                  >
                    <Image
                      alt=""
                      height={18}
                      src="/images/dashboard/clock.png"
                      width={18}
                    />
                  </span>
                  <h3>Timeline operativa</h3>
                </header>

                <ol className={styles.operationalTimelineList}>
                  {OPERATIONAL_TIMELINE_ITEMS.map((item) => (
                    <li
                      className={styles.operationalTimelineItem}
                      key={item.id}
                    >
                      <span className={styles.operationalTimelineTime}>
                        {item.time}
                      </span>
                      <span
                        className={`${styles.operationalTimelineDot} ${
                          styles[`operationalTimelineDot${item.tone}`]
                        }`}
                        aria-hidden="true"
                      />
                      <span className={styles.operationalTimelineContent}>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </li>
                  ))}
                </ol>

                <button
                  className={styles.operationalTimelineAction}
                  onClick={() => setActiveTab("orders")}
                  type="button"
                >
                  Vedi tutta l&apos;attivit&agrave;
                  <span aria-hidden="true">&rsaquo;</span>
                </button>
              </article>

              <RevenueTodayCard />

              <DeliveryFleetCard
                onManageFleet={() => setActiveTab("delivery")}
              />
            </section>

            <DashboardMarketingRow
              onOpenAnalytics={() => setActiveTab("analytics")}
              onOpenMarketing={() => setActiveTab("marketing")}
            />
          </div>
        ) : activeTab === "orders" ? (
          <OrdersDashboard
            orders={activeDataset.orders}
            riders={activeDataset.riders}
            lastUpdateIso={activeDataset.simulationCursorIso}
            allProducts={activeDataset.products}
            onOrderStatusUpdate={handleOrderStatusUpdate}
          />
        ) : activeTab === "catalog" ? (
          <CatalogManager
            menus={activeDataset.menus}
            products={activeDataset.products}
            onUpdateMenu={handleUpdateMenu}
            onUpdateProduct={handleUpdateProduct}
          />
        ) : activeTab === "marketing" ? (
          <MarketingManager
            coupons={activeDataset.coupons ?? []}
            loyaltyConfig={activeDataset.loyaltyConfig}
            isDynamicPricingEnabled={activeDataset.isDynamicPricingEnabled}
            onToggleDynamicPricing={handleToggleDynamicPricing}
            onCreateCoupon={() =>
              alert("Funzionalità di creazione coupon in arrivo (POC)")
            }
          />
        ) : activeTab === "analytics" ? (
          <AnalyticsManager
            analytics={activeDataset.analytics}
            insights={activeDataset.insights}
            products={activeDataset.products}
          />
        ) : activeTab === "delivery" ? (
          <DeliveryManager
            riders={activeDataset.riders ?? []}
            orders={activeDataset.orders}
          />
        ) : activeTab === "integrations" ? (
          <IntegrationsManager />
        ) : activeTab === "inventory" ? (
          <InventoryManager
            inventory={activeDataset.inventory}
            ingredients={inventoryIngredients}
            onUpdateInventoryItem={handleUpdateInventoryItem}
          />
        ) : activeTab === "profile" ? (
          <ProfileManager
            storeId={activeDataset.store.id}
            storeName={activeDataset.store.displayName}
          />
        ) : (
          <div>Tab non ancora implementato</div>
        )}
      </main>

      {newOrderToasts.length > 0 ? (
        <aside className={styles.toastStack} aria-label="Notifiche ordini live">
          {newOrderToasts.map((toast) => (
            <article className={styles.orderToast} key={toast.id} role="status">
              <span className={styles.orderToastPulse} aria-hidden="true" />
              <div>
                <strong>Nuovo ordine ricevuto</strong>
                <p>
                  {toast.order.demoOrderRef ?? `#${toast.order.id.slice(-6).toUpperCase()}`}{" "}
                  - {getOrderItemsCount(toast.order)} prodotti - {formatOrderTotal(toast.order)}
                </p>
                <small>Slot {formatOrderSlot(toast.order.scheduledSlot)}</small>
              </div>
            </article>
          ))}
        </aside>
      ) : null}
    </div>
  );
}

function getOrderItemsCount(order: Order): number {
  return order.lines.reduce((total, line) => total + line.quantity, 0);
}

function formatOrderTotal(order: Order): string {
  return new Intl.NumberFormat("it-IT", {
    currency: order.total.currencyCode,
    style: "currency",
  }).format(order.total.amountCents / 100);
}

function formatOrderSlot(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return new Date(value).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
