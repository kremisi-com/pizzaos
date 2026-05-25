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
import { useCallback, useState, type CSSProperties, type ReactElement, useEffect } from "react";
import { OrdersDashboard } from "../../orders/components/orders-dashboard";
import { StoreSwitcher } from "../../store-switch/components/store-switcher";
import { CatalogManager } from "../../catalog/components/catalog-manager";
import { InventoryManager } from "../../inventory/components/inventory-manager";
import { MarketingManager } from "../../marketing/components/marketing-manager";
import { AnalyticsManager } from "../../analytics/components/analytics-manager";
import { DeliveryManager } from "../../delivery/components/delivery-manager";
import { IntegrationsManager } from "../../integrations/components/integrations-manager";
import { ProfileManager } from "../../profile/components/profile-manager";
import { formatMoney } from "../../marketing/marketing-utils";
import styles from "./admin-shell.module.css";

const APP_ID = "admin" as const;
const DEMO_DASHBOARD_DATE = "Mer 21 Mag 2025, 12:15";

type AdminTab =
  | "dashboard"
  | "orders"
  | "catalog"
  | "inventory"
  | "marketing"
  | "analytics"
  | "delivery"
  | "integrations"
  | "profile";

type DashboardIconName =
  | "alert"
  | "analytics"
  | "bell"
  | "calendar"
  | "catalog"
  | "check"
  | "clock"
  | "coupon"
  | "delivery"
  | "grid"
  | "inventory"
  | "menu"
  | "orders"
  | "pause"
  | "plus"
  | "profile"
  | "rider"
  | "settings"
  | "spark"
  | "star"
  | "stripe"
  | "store"
  | "warning";

const NAV_ITEMS: ReadonlyArray<{
  readonly tab: AdminTab;
  readonly label: string;
  readonly icon: DashboardIconName;
}> = [
  { tab: "dashboard", label: "Dashboard", icon: "grid" },
  { tab: "orders", label: "Ordini", icon: "orders" },
  { tab: "catalog", label: "Menu", icon: "menu" },
  { tab: "inventory", label: "Magazzino", icon: "inventory" },
  { tab: "marketing", label: "Marketing", icon: "catalog" },
  { tab: "analytics", label: "Analytics & AI", icon: "analytics" },
  { tab: "delivery", label: "Consegne", icon: "delivery" },
  { tab: "integrations", label: "Integrazioni", icon: "settings" },
  { tab: "profile", label: "Profilo", icon: "profile" },
];

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

function DashboardIcon(props: {
  readonly name: DashboardIconName;
  readonly className?: string;
}): ReactElement {
  const commonProps = {
    className: props.className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (props.name) {
    case "alert":
      return (
        <svg {...commonProps}>
          <path d="M12 3 2.8 19h18.4L12 3Z" />
          <path d="M12 8v5" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "analytics":
      return (
        <svg {...commonProps}>
          <path d="M4 19V9" />
          <path d="M10 19V5" />
          <path d="M16 19v-8" />
          <path d="M22 19V7" />
        </svg>
      );
    case "bell":
      return (
        <svg {...commonProps}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <path d="M3 10h18" />
        </svg>
      );
    case "catalog":
      return (
        <svg {...commonProps}>
          <path d="m20 12-8 8-8-8 8-8 8 8Z" />
          <path d="m4 12 8 4 8-4" />
        </svg>
      );
    case "check":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "coupon":
      return (
        <svg {...commonProps}>
          <path d="M4 10V6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z" />
          <path d="M9 9h.01" />
          <path d="m15 9-6 6" />
          <path d="M15 15h.01" />
        </svg>
      );
    case "delivery":
      return (
        <svg {...commonProps}>
          <path d="M5 16h9l2-7h3" />
          <path d="M7 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
          <path d="M17 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
          <path d="M9 5h4l1 4H7l2-4Z" />
        </svg>
      );
    case "grid":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="6" height="6" rx="1.4" />
          <rect x="14" y="4" width="6" height="6" rx="1.4" />
          <rect x="4" y="14" width="6" height="6" rx="1.4" />
          <rect x="14" y="14" width="6" height="6" rx="1.4" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...commonProps}>
          <path d="m21 8-9-5-9 5 9 5 9-5Z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      );
    case "menu":
      return (
        <svg {...commonProps}>
          <path d="m4 20 16-8L4 4v6l8 2-8 2v6Z" />
        </svg>
      );
    case "orders":
      return (
        <svg {...commonProps}>
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
          <path d="M9 16h4" />
        </svg>
      );
    case "pause":
      return (
        <svg {...commonProps}>
          <path d="M9 5v14" />
          <path d="M15 5v14" />
        </svg>
      );
    case "plus":
      return (
        <svg {...commonProps}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "rider":
      return (
        <svg {...commonProps}>
          <path d="M5 16h9l2-7h3" />
          <path d="M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M10 7h3l2 4" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="m4.9 4.9 2.1 2.1" />
          <path d="m17 17 2.1 2.1" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </svg>
      );
    case "spark":
      return (
        <svg {...commonProps}>
          <path d="m12 3 1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9L12 3Z" />
          <path d="m5 16 .7 2.2L8 19l-2.3.8L5 22l-.7-2.2L2 19l2.3-.8L5 16Z" />
        </svg>
      );
    case "star":
      return (
        <svg {...commonProps}>
          <path d="m12 3 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8L6.8 19l1-5.8L3.6 9.1l5.8-.8L12 3Z" />
        </svg>
      );
    case "stripe":
      return (
        <svg {...commonProps}>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <path d="M14.5 8.5c-1.6-.8-5-.6-5 1.4 0 2.5 5 1 5 3.7 0 2.2-3.6 2.5-5.6 1.3" />
        </svg>
      );
    case "store":
      return (
        <svg {...commonProps}>
          <path d="M4 10h16l-1.5-6h-13L4 10Z" />
          <path d="M6 10v10h12V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "warning":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v6" />
          <path d="M12 17h.01" />
        </svg>
      );
  }
}

function DashboardCard(props: {
  readonly children: ReactElement | readonly ReactElement[];
  readonly className?: string;
}): ReactElement {
  return (
    <section className={`${styles.dashboardCard} ${props.className ?? ""}`}>
      {props.children}
    </section>
  );
}

function MetricPill(props: {
  readonly icon: DashboardIconName;
  readonly value: number;
  readonly label: string;
  readonly tone: "red" | "orange" | "yellow" | "green";
}): ReactElement {
  return (
    <div className={styles.metricPill}>
      <span className={`${styles.metricIcon} ${styles[`metricIcon${props.tone}`]}`}>
        <DashboardIcon name={props.icon} />
      </span>
      <span className={styles.metricCopy}>
        <strong>{props.value}</strong>
        <span className={styles[`metricLabel${props.tone}`]}>{props.label}</span>
      </span>
    </div>
  );
}

function QuickActionButton(props: {
  readonly icon: DashboardIconName;
  readonly label: string;
  readonly onClick: () => void;
  readonly wide?: boolean;
}): ReactElement {
  return (
    <button
      className={`${styles.quickAction} ${props.wide ? styles.quickActionWide : ""}`}
      onClick={props.onClick}
      type="button"
    >
      <DashboardIcon name={props.icon} />
      <span>{props.label}</span>
    </button>
  );
}

function OrdersSparkline(): ReactElement {
  return (
    <svg className={styles.sparklineChart} viewBox="0 0 360 140" role="img" aria-label="Trend ordini live">
      <defs>
        <linearGradient id="ordersSparklineFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff2d20" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ff2d20" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className={styles.sparklineArea}
        d="M0 116 C22 92 38 116 58 88 S90 82 110 92 S148 84 164 54 S196 66 214 48 S248 62 266 42 S308 54 330 28 L330 122 L0 122 Z"
      />
      <path
        className={styles.sparklineLine}
        d="M0 116 C22 92 38 116 58 88 S90 82 110 92 S148 84 164 54 S196 66 214 48 S248 62 266 42 S308 54 330 28"
      />
      <circle className={styles.sparklineDot} cx="330" cy="28" r="6" />
      <g className={styles.sparklineAxis}>
        <line x1="0" y1="124" x2="350" y2="124" />
        <text x="22" y="138">08:00</text>
        <text x="154" y="138">10:00</text>
        <text x="274" y="138">12:00</text>
      </g>
    </svg>
  );
}

function RevenueChart(): ReactElement {
  return (
    <svg className={styles.revenueChart} viewBox="0 0 340 150" role="img" aria-label="Trend revenue oggi">
      <defs>
        <linearGradient id="revenueChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff2d20" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#ff2d20" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className={styles.revenueArea}
        d="M0 110 L22 96 L42 102 L62 78 L82 88 L102 66 L124 75 L146 70 L168 84 L190 62 L212 68 L234 38 L256 46 L278 32 L300 40 L322 28 L322 128 L0 128 Z"
      />
      <path
        className={styles.revenueLine}
        d="M0 110 L22 96 L42 102 L62 78 L82 88 L102 66 L124 75 L146 70 L168 84 L190 62 L212 68 L234 38 L256 46 L278 32 L300 40 L322 28"
      />
      <circle className={styles.sparklineDot} cx="322" cy="28" r="5" />
      <g className={styles.revenueAxis}>
        <line x1="0" y1="130" x2="334" y2="130" />
        <text x="0" y="146">00:00</text>
        <text x="98" y="146">06:00</text>
        <text x="205" y="146">12:00</text>
        <text x="302" y="146">18:00</text>
      </g>
    </svg>
  );
}

function FleetGauge(props: {
  readonly available: number;
  readonly busy: number;
}): ReactElement {
  const total = Math.max(1, props.available + props.busy);
  const availableArc = Math.max(8, Math.round((props.available / total) * 100));

  return (
    <div
      className={styles.fleetGauge}
      style={{ "--fleet-available": `${availableArc}%` } as CSSProperties}
      aria-label={`${props.available} rider disponibili, ${props.busy} occupati`}
      role="img"
    >
      <div className={styles.fleetGaugeValue}>
        <span>{props.available}</span>
        <span>{props.busy}</span>
      </div>
    </div>
  );
}

function countOrdersByStatus(orders: readonly Order[], statuses: readonly OrderStatus[]): number {
  return orders.filter((order) => statuses.includes(order.status)).length;
}

export function AdminShell(): ReactElement {
  const [seed, setSeed] = useState<AdminSeed>(() =>
    loadDemoState(APP_ID, { storage: resolveStorage() }),
  );

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

  const activeDataset = seed.datasetsByStoreId[seed.activeStoreId];

  const pendingOrdersCount = countOrdersByStatus(activeDataset.orders, [
    "received",
    "confirmed",
  ]);
  const preparingOrdersCount = countOrdersByStatus(activeDataset.orders, [
    "preparing",
  ]);
  const outForDeliveryOrdersCount = countOrdersByStatus(activeDataset.orders, [
    "out_for_delivery",
  ]);
  const readyOrdersCount = countOrdersByStatus(activeDataset.orders, ["ready"]);

  const lowStockCount = activeDataset.inventory.filter(
    (i) => i.status === "low_stock",
  ).length;
  const outOfStockCount = activeDataset.inventory.filter(
    (i) => i.status === "out_of_stock",
  ).length;

  const availableRidersCount =
    activeDataset.riders?.filter((r) => r.status === "available").length ?? 0;
  const busyRidersCount =
    activeDataset.riders?.filter((r) => r.status === "busy").length ?? 0;

  const topInsight = activeDataset.insights?.[0];
  const confidenceScore = Math.round((topInsight?.confidenceScore ?? 0.88) * 100);
  const activeCouponsCount =
    activeDataset.coupons?.filter((coupon) => coupon.status === "active").length ?? 0;
  const loyaltyCustomersCount = activeDataset.loyalty?.length ?? 0;
  const firstActiveOrder = activeDataset.orders.find(
    (order) => !["delivered", "cancelled"].includes(order.status),
  );
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
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <h1 className={styles.logo}>
          Pizza<span>OS</span>
        </h1>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`${styles.navButton} ${activeTab === item.tab ? styles.navItemActive : ""}`}
              type="button"
            >
              <DashboardIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.storeBlock}>
          <span className={styles.sidebarLabel}>Negozio attivo</span>
          <StoreSwitcher
            stores={seed.stores}
            activeStoreId={seed.activeStoreId}
            onStoreChange={handleStoreChange}
          />
        </div>

        <div className={styles.sidebarFooter}>
          <button
            className={styles.operatorCard}
            onClick={() => setActiveTab("profile")}
            type="button"
          >
            <span className={styles.operatorAvatar}>P</span>
            <span>
              <strong>PizzaOS Admin</strong>
              <span>Administrator</span>
            </span>
            <span className={styles.operatorChevron}>⌄</span>
          </button>
          <Button
            onClick={() => setIsSimulationRunning((current) => !current)}
            variant={isSimulationRunning ? "secondary" : "primary"}
            className={styles.advanceButton}
          >
            {isSimulationRunning ? "Pausa simulazione" : "Riprendi simulazione"}
          </Button>
          <Button
            onClick={handleResetClick}
            variant="secondary"
            className={styles.resetButton}
          >
            Reset Demo
          </Button>
        </div>
      </aside>

      <main className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <h2>
              {activeTab === "dashboard"
                ? seed.title
                : activeTab === "marketing"
                  ? "Marketing & Loyalty"
                  : activeTab === "analytics"
                    ? "Analytics and AI"
                    : activeTab === "delivery"
                      ? "Gestione Consegne"
                      : activeTab === "integrations"
                        ? "Integrazioni Esterne"
                        : activeTab === "profile"
                          ? "Profilo Ristoratore"
                          : "Gestione Operativa"}
            </h2>
            <p>
              {activeTab === "dashboard"
                ? "Centro operativo del negozio"
                : activeDataset.store.displayName}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.headerIconButton} type="button" aria-label="Notifiche">
              <DashboardIcon name="bell" />
              <span>3</span>
            </button>
            <button className={styles.headerIconButton} type="button" aria-label="Calendario">
              <DashboardIcon name="calendar" />
            </button>
            <button className={styles.dateButton} type="button">
              {DEMO_DASHBOARD_DATE}
              <span>⌄</span>
            </button>
          </div>
        </header>

        {activeTab === "dashboard" ? (
          <div className={styles.dashboardCanvas}>
            <DashboardCard className={styles.ordersLiveCard}>
              <div className={styles.cardHeader}>
                <h3>Ordini Live</h3>
                <span className={styles.liveBadge}>Aggiornato in tempo reale</span>
              </div>
              <div className={styles.orderMetrics}>
                <MetricPill icon="orders" value={pendingOrdersCount} label="da confermare" tone="red" />
                <MetricPill icon="catalog" value={preparingOrdersCount} label="in cucina" tone="orange" />
                <MetricPill icon="delivery" value={outForDeliveryOrdersCount} label="in consegna" tone="yellow" />
                <MetricPill icon="check" value={readyOrdersCount} label="pronto" tone="green" />
              </div>
              <div className={styles.ordersLiveBody}>
                <div className={styles.averageTime}>
                  <span>Tempo medio</span>
                  <strong>24 <small>min</small></strong>
                  <em>↓ 8% vs ieri</em>
                </div>
                <OrdersSparkline />
                <div className={styles.orderActions}>
                  <button className={styles.primaryDashboardButton} onClick={() => setActiveTab("orders")} type="button">
                    <DashboardIcon name="orders" />
                    Apri coda ordini
                  </button>
                  <button className={styles.secondaryDashboardButton} onClick={() => setActiveTab("orders")} type="button">
                    <DashboardIcon name="plus" />
                    Nuovo ordine manuale
                  </button>
                </div>
              </div>
            </DashboardCard>

            <DashboardCard className={styles.attentionCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="alert" />
                <h3>Attenzione</h3>
              </div>
              <div className={styles.alertStack}>
                <div className={styles.alertRow}>
                  <span className={styles.alertIconWarning}><DashboardIcon name="warning" /></span>
                  <span>
                    <strong>{lowStockCount} ingredienti sotto scorta</strong>
                    <small>Mozzarella, Rucola</small>
                  </span>
                </div>
                <div className={styles.alertDivider} />
                <div className={styles.alertRow}>
                  <span className={styles.alertIconCritical}><DashboardIcon name="alert" /></span>
                  <span>
                    <strong>{outOfStockCount} prodotto esaurito</strong>
                    <small>Birra IPA 33cl</small>
                  </span>
                </div>
              </div>
              <button className={styles.outlineDangerButton} onClick={() => setActiveTab("inventory")} type="button">
                Gestisci magazzino
              </button>
            </DashboardCard>

            <DashboardCard className={styles.quickActionsCard}>
              <h3>Azioni rapide</h3>
              <div className={styles.quickActionGrid}>
                <QuickActionButton
                  icon="pause"
                  label={isSimulationRunning ? "Metti in pausa" : "Riprendi demo"}
                  onClick={() => setIsSimulationRunning((current) => !current)}
                />
                <QuickActionButton icon="clock" label="Aggiorna tempi" onClick={handleAdvanceSimulation} />
                <QuickActionButton icon="coupon" label="Crea coupon" onClick={() => setActiveTab("marketing")} />
                <QuickActionButton icon="menu" label="Modifica menu" onClick={() => setActiveTab("catalog")} />
                <QuickActionButton icon="rider" label="Assegna rider" onClick={() => setActiveTab("delivery")} wide />
              </div>
            </DashboardCard>

            <DashboardCard className={styles.aiCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="spark" />
                <h3>Insight AI</h3>
              </div>
              <h4>{topInsight?.title ?? "Picco in zona uffici alle 12:30."}</h4>
              <p>{topInsight?.summary ?? "Attiva il menu rapido per ridurre i tempi medi del 12%."}</p>
              <span className={styles.confidenceLabel}>Confidenza</span>
              <strong className={styles.confidenceValue}>{confidenceScore}%</strong>
              <div className={styles.confidenceTrack}>
                <span style={{ width: `${confidenceScore}%` }} />
              </div>
              <button className={styles.aiButton} onClick={() => setActiveTab("analytics")} type="button">
                Applica suggerimento
              </button>
            </DashboardCard>

            <DashboardCard className={styles.timelineCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="clock" />
                <h3>Timeline operativa</h3>
              </div>
              <ol className={styles.timelineList}>
                <li>
                  <time>12:14</time>
                  <span className={styles.timelineDotRed} />
                  <strong>Ordine #{firstActiveOrder?.id.slice(-3) ?? "104"} ricevuto</strong>
                  <small>2 margherite, 1 diavola</small>
                </li>
                <li>
                  <time>12:12</time>
                  <span className={styles.timelineDotOrange} />
                  <strong>Rider assegnato a #103</strong>
                  <small>Marco Bianchi</small>
                </li>
                <li>
                  <time>12:09</time>
                  <span className={styles.timelineDotGreen} />
                  <strong>Menu pranzo attivato</strong>
                  <small>{activeDataset.menu.name}</small>
                </li>
                <li>
                  <time>12:05</time>
                  <span className={styles.timelineDotYellow} />
                  <strong>Birra IPA sotto scorta</strong>
                  <small>Disponibilità: 0</small>
                </li>
              </ol>
              <button className={styles.linkButton} onClick={() => setActiveTab("orders")} type="button">
                Vedi tutta l&apos;attività
                <span>›</span>
              </button>
            </DashboardCard>

            <DashboardCard className={styles.revenueCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="store" />
                <h3>Revenue Oggi</h3>
              </div>
              <strong className={styles.revenueValue}>{formatMoney(activeDataset.analytics.revenueToday)}</strong>
              <span className={styles.positiveDelta}>↑ 16% vs ieri</span>
              <RevenueChart />
              <div className={styles.revenueStats}>
                <span>
                  <small>Ordini oggi</small>
                  <strong>{activeDataset.analytics.ordersToday}</strong>
                  <em>↑ 8%</em>
                </span>
                <span>
                  <small>Scontrino medio</small>
                  <strong>{formatMoney(activeDataset.analytics.averageOrderValue)}</strong>
                  <em>↑ 5%</em>
                </span>
              </div>
            </DashboardCard>

            <DashboardCard className={styles.fleetCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="rider" />
                <h3>Flotta Consegne</h3>
              </div>
              <FleetGauge available={availableRidersCount} busy={busyRidersCount} />
              <div className={styles.fleetLegend}>
                <span><i className={styles.legendGreen} />Disponibili</span>
                <span><i className={styles.legendYellow} />Occupati</span>
              </div>
              <button className={styles.secondaryFullButton} onClick={() => setActiveTab("delivery")} type="button">
                Gestisci flotta
              </button>
            </DashboardCard>

            <DashboardCard className={styles.marketingCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="catalog" />
                <h3>Marketing Attivo</h3>
              </div>
              <div className={styles.marketingStats}>
                <span>
                  <small>Coupon attivi</small>
                  <strong>{activeCouponsCount}</strong>
                </span>
                <button className={styles.inlineDangerLink} onClick={() => setActiveTab("marketing")} type="button">
                  Vedi dettagli
                </button>
                <span>
                  <small>Clienti fedeltà</small>
                  <strong>{loyaltyCustomersCount}</strong>
                  <em>↑ 12%</em>
                </span>
                <span className={styles.starBubble}>
                  <DashboardIcon name="star" />
                </span>
              </div>
            </DashboardCard>

            <DashboardCard className={styles.integrationsCard}>
              <div className={styles.cardHeaderCompact}>
                <DashboardIcon name="settings" />
                <h3>Integrazioni</h3>
              </div>
              <div className={styles.integrationRows}>
                <div className={styles.integrationItem}>
                  <span className={styles.integrationLogoStripe}><DashboardIcon name="stripe" /></span>
                  <span>
                    <strong>Stripe</strong>
                    <small>Pagamenti attivi</small>
                  </span>
                  <em>Connesso</em>
                </div>
                <div className={styles.integrationItem}>
                  <span className={styles.integrationLogoGlovo}><DashboardIcon name="store" /></span>
                  <span>
                    <strong>Glovo</strong>
                    <small>Consegne attive</small>
                  </span>
                  <em>Connesso</em>
                </div>
              </div>
              <button className={styles.linkButton} onClick={() => setActiveTab("integrations")} type="button">
                Vedi tutto
                <span>›</span>
              </button>
            </DashboardCard>
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
    </div>
  );
}
