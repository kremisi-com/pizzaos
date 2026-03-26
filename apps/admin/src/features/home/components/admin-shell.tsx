"use client";

import {
  loadDemoState,
  resetDemoState,
  reseedDemoState,
  advanceOrderSimulation,
  getDemoStateStorageKey,
  ADMIN_SIMULATION_INTERVAL_MS,
  type AdminSeed
} from "@pizzaos/mock-data";
import { type OrderStatus, type Product, type Menu } from "@pizzaos/domain";
import { Button, Card, StatusIndicator } from "@pizzaos/ui";
import { useState, type ReactElement, useEffect } from "react";
import { OrdersDashboard } from "../../orders/components/orders-dashboard";
import { StoreSwitcher } from "../../store-switch/components/store-switcher";
import { CatalogManager } from "../../catalog/components/catalog-manager";
import { InventoryManager } from "../../inventory/components/inventory-manager";
import { MarketingManager } from "../../marketing/components/marketing-manager";
import { AnalyticsManager } from "../../analytics/components/analytics-manager";
import { DeliveryManager } from "../../delivery/components/delivery-manager";
import { IntegrationsManager } from "../../integrations/components/integrations-manager";
import styles from "./admin-shell.module.css";

const APP_ID = "admin" as const;

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function AdminShell(): ReactElement
{
  const [seed, setSeed] = useState<AdminSeed>(() => loadDemoState(APP_ID, { storage: resolveStorage() }));

  const [activeTab, setActiveTab] = useState<"dashboard" | "orders" | "catalog" | "inventory" | "marketing" | "analytics" | "delivery" | "integrations">("dashboard");

  const activeDataset = seed.datasetsByStoreId[seed.activeStoreId];


  useEffect(() => {
    const storage = resolveStorage();
    if (storage) {
      const storageKey = getDemoStateStorageKey(APP_ID);
      storage.setItem(storageKey, JSON.stringify(seed));
    }
  }, [seed]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeed((currentSeed) => {
        const activeStoreId = currentSeed.activeStoreId;
        const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];
        const now = new Date();

        const updatedDataset = advanceOrderSimulation(currentDataset, now);

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
    }, ADMIN_SIMULATION_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  function handleResetClick(): void
  {
    const resetSeed = resetDemoState(APP_ID, { storage: resolveStorage() });
    setSeed(resetSeed);
  }

  function handleStoreChange(storeId: string): void
  {
    const updatedSeed = reseedDemoState(APP_ID, {
      storage: resolveStorage(),
      storeId
    }) as AdminSeed;

    setSeed(updatedSeed);
  }

  function handleOrderStatusUpdate(orderId: string, nextStatus: OrderStatus, riderId?: string): void {
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

      const updatedRiders = currentDataset.riders?.map((rider) => {
        if (rider.id === riderId) {
          return {
            ...rider,
            status: nextStatus === "out_for_delivery" ? ("busy" as const) : rider.status,
          };
        }
        if (nextStatus === "delivered" && rider.id === updatedOrders.find(o => o.id === orderId)?.riderId) {
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
        m.id === updatedMenu.id ? updatedMenu : m
      );

      return {
        ...currentSeed,
        datasetsByStoreId: {
          ...currentSeed.datasetsByStoreId,
          [activeStoreId]: {
            ...currentDataset,
            menus: updatedMenus,
            menu: updatedMenu.id === currentDataset.menu.id ? updatedMenu : currentDataset.menu,
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
        p.id === updatedProduct.id ? updatedProduct : p
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

  function handleUpdateInventoryItem(itemId: string, status: "in_stock" | "low_stock" | "out_of_stock", availableUnits: number): void {
    setSeed((currentSeed) => {
      const activeStoreId = currentSeed.activeStoreId;
      const currentDataset = currentSeed.datasetsByStoreId[activeStoreId];

      const updatedInventory = currentDataset.inventory.map((item) =>
        item.id === itemId ? { ...item, status, availableUnits } : item
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
        <h1 className={styles.logo}>PizzaOS</h1>

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
            Analytics
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
        </nav>

        <StoreSwitcher
          stores={seed.stores}
          activeStoreId={seed.activeStoreId}
          onStoreChange={handleStoreChange}
        />

        <div className={styles.sidebarFooter}>
          <Button onClick={handleResetClick} variant="secondary" className={styles.resetButton}>
            Reset Demo
          </Button>
        </div>
      </aside>

      <main className={styles.content}>
        <header className={styles.header}>
          <div className={styles.headerInfo}>
            <h2>
              {activeTab === "dashboard" ? seed.title : 
               activeTab === "marketing" ? "Marketing & Loyalty" : 
               activeTab === "analytics" ? "Analytics & Insights" : 
               activeTab === "delivery" ? "Gestione Consegne" :
               activeTab === "integrations" ? "Integrazioni Esterne" :
               "Gestione Operativa"}
            </h2>
            <p>
              {activeTab === "dashboard" ? seed.subtitle : activeDataset.store.displayName}
            </p>
          </div>
          <StatusIndicator tone="active" label="Sistema Operativo" />
        </header>

        {activeTab === "dashboard" ? (
          <div className={styles.dashboardGrid}>
            <Card title="Stato Negozio" subtitle={activeDataset.store.displayName}>
              <p>{activeDataset.store.city}</p>
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>ORDINI OGGI</div>
                  <div className={styles.statItemValue}>{activeDataset.orders.length}</div>
                </div>
                <div>
                  <div className={styles.statItemLabel}>PRODOTTI</div>
                  <div className={styles.statItemValue}>{activeDataset.products.length}</div>
                </div>
              </div>
            </Card>

            <Card title="Marketing Attivo">
              <div className={styles.statGrid}>
                <div>
                  <div className={styles.statItemLabel}>COUPON ATTIVI</div>
                  <div className={styles.statItemValue}>
                    {activeDataset.coupons?.filter(c => c.status === "active").length ?? 0}
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

            <Card title="Info Demo">
              <p>Questa è una superficie demo frontend-only. Tutti i dati sono simulati localmente.</p>
              <ul className={styles.infoList}>
                <li>Persistenza: localStorage</li>
                <li>Multi-store: Abilitato</li>
                <li>Simulation loop: Attivo (5s)</li>
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
            onCreateCoupon={() => alert("Funzionalità di creazione coupon in arrivo (POC)")}
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
            products={activeDataset.products}
            isDynamicPricingEnabled={activeDataset.isDynamicPricingEnabled}
            onToggleDynamicPricing={handleToggleDynamicPricing}
            onUpdateInventoryItem={handleUpdateInventoryItem}
          />
        ) : (
          <div>Tab non ancora implementato</div>
        )}
      </main>
    </div>
  );
}
