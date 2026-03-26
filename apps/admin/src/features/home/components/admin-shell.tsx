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
import { Button, Card, StatusIndicator } from "@pizzaos/ui";
import { useState, type ReactElement, useEffect } from "react";
import { OrdersDashboard } from "../../orders/components/orders-dashboard";
import { StoreSwitcher } from "../../store-switch/components/store-switcher";
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "orders">("dashboard");

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
          <a href="#" className={styles.navItem}>
            Menu
          </a>
          <a href="#" className={styles.navItem}>
            Magazzino
          </a>
          <a href="#" className={styles.navItem}>
            Marketing
          </a>
          <a href="#" className={styles.navItem}>
            Analytics
          </a>
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
              {activeTab === "dashboard" ? seed.title : "Gestione Ordini"}
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

            <Card title="Info Demo">
              <p>Questa è una superficie demo frontend-only. Tutti i dati sono simulati localmente.</p>
              <ul className={styles.infoList}>
                <li>Persistenza: localStorage</li>
                <li>Multi-store: Abilitato</li>
                <li>Simulation loop: Attivo (5s)</li>
              </ul>
            </Card>
          </div>
        ) : (
          <OrdersDashboard
            orders={activeDataset.orders}
            lastUpdateIso={activeDataset.simulationCursorIso}
          />
        )}
      </main>
    </div>
  );
}
