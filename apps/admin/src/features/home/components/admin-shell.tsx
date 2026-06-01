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
  type OrderStatus,
  type Product,
  type Menu,
  type Ingredient,
} from "@pizzaos/domain";
import { Button, Card } from "@pizzaos/ui";
import Image from "next/image";
import { useCallback, useState, type ReactElement, useEffect } from "react";
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
    | "dashboard"
    | "orders"
    | "catalog"
    | "inventory"
    | "marketing"
    | "analytics"
    | "delivery"
    | "integrations"
    | "profile"
  >("dashboard");
  const [isSimulationRunning, setIsSimulationRunning] = useState(true);

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
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`${styles.navButton} ${activeTab === "dashboard" ? styles.navItemActive : ""}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`${styles.navButton} ${activeTab === "orders" ? styles.navItemActive : ""}`}
          >
            Ordini
          </button>
          <button
            onClick={() => setActiveTab("catalog")}
            className={`${styles.navButton} ${activeTab === "catalog" ? styles.navItemActive : ""}`}
          >
            Menu
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`${styles.navButton} ${activeTab === "inventory" ? styles.navItemActive : ""}`}
          >
            Magazzino
          </button>
          <button
            onClick={() => setActiveTab("marketing")}
            className={`${styles.navButton} ${activeTab === "marketing" ? styles.navItemActive : ""}`}
          >
            Marketing
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`${styles.navButton} ${activeTab === "analytics" ? styles.navItemActive : ""}`}
          >
            Analytics and AI
          </button>
          <button
            onClick={() => setActiveTab("delivery")}
            className={`${styles.navButton} ${activeTab === "delivery" ? styles.navItemActive : ""}`}
          >
            Consegne
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`${styles.navButton} ${activeTab === "integrations" ? styles.navItemActive : ""}`}
          >
            Integrazioni
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`${styles.navButton} ${activeTab === "profile" ? styles.navItemActive : ""}`}
          >
            Profilo
          </button>
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
                ? seed.subtitle
                : activeDataset.store.displayName}
            </p>
          </div>
        </header>

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

            <Card
              title="Stato Negozio"
              subtitle={activeDataset.store.displayName}
            >
              <p>{activeDataset.store.city}</p>
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>ORDINI OGGI</div>
                  <div className={styles.statItemValue}>
                    {activeDataset.orders.length}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>REVENUE</div>
                  <div className={styles.statItemValue}>
                    {formatMoney(activeDataset.analytics.revenueToday)}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Operatività Ordini">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>IN ATTESA</div>
                  <div className={styles.statItemValue}>
                    {pendingOrdersCount}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>IN CUCINA</div>
                  <div className={styles.statItemValue}>
                    {preparingOrdersCount}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>IN CONSEGNA</div>
                  <div className={styles.statItemValue}>
                    {outForDeliveryOrdersCount}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Stato Magazzino">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>SCORTE BASSE</div>
                  <div
                    className={`${styles.statItemValue} ${lowStockCount > 0 ? styles.statWarning : ""}`}
                  >
                    {lowStockCount}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>ESAURITI</div>
                  <div
                    className={`${styles.statItemValue} ${outOfStockCount > 0 ? styles.statDanger : ""}`}
                  >
                    {outOfStockCount}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Flotta Consegne">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>DISPONIBILI</div>
                  <div className={styles.statItemValue}>
                    {availableRidersCount}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>OCCUPATI</div>
                  <div className={styles.statItemValue}>{busyRidersCount}</div>
                </div>
              </div>
            </Card>

            <Card title="Configurazione Menu">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>MENU ATTIVO</div>
                  <div className={styles.statItemValueSmall}>
                    {activeDataset.menu.name}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>PRODOTTI</div>
                  <div className={styles.statItemValue}>
                    {activeDataset.products.length}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Marketing Attivo">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>COUPON ATTIVI</div>
                  <div className={styles.statItemValue}>
                    {activeDataset.coupons?.filter((c) => c.status === "active")
                      .length ?? 0}
                  </div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>LIVELLI FEDELTÀ</div>
                  <div className={styles.statItemValue}>
                    {activeDataset.loyaltyConfig?.tiers?.length ?? 0}
                  </div>
                </div>
              </div>
            </Card>

            {topInsight && (
              <Card title="Insight AI">
                <p className={styles.insightTitle}>{topInsight.title}</p>
                <p className={styles.insightSummary}>{topInsight.summary}</p>
                <div className={styles.statGrid}>
                  <div>
                    <div className={styles.statItemLabel}>CONFIDENZA</div>
                    <div className={styles.statItemValue}>
                      {Math.round(topInsight.confidenceScore * 100)}%
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card title="Integrazioni">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>GLOVO</div>
                  <div className={styles.statItemValueSmall}>Connesso</div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>STRIPE</div>
                  <div className={styles.statItemValueSmall}>Connesso</div>
                </div>
              </div>
            </Card>

            <Card title="Info Demo">
              <p>
                Questa è una superficie demo frontend-only. Tutti i dati sono
                simulati localmente.
              </p>
              <ul className={styles.infoList}>
                <li>Persistenza: localStorage</li>
                <li>Multi-store: Abilitato</li>
                <li>Simulation loop: Automatico ogni 5s</li>
                <li>Stato: {isSimulationRunning ? "Live" : "In pausa"}</li>
              </ul>
            </Card>
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
