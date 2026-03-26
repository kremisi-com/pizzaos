"use client";

import {
  loadDemoState,
  resetDemoState,
  reseedDemoState,
  type AdminSeed
} from "@pizzaos/mock-data";
import { Button, Card, StatusIndicator } from "@pizzaos/ui";
import { useState, type ReactElement } from "react";
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

  const activeDataset = seed.datasetsByStoreId[seed.activeStoreId];

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
          <a href="#" className={`${styles.navItem} ${styles.navItemActive}`}>
            Dashboard
          </a>
          <a href="#" className={styles.navItem}>
            Ordini
          </a>
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
          <Button onClick={handleResetClick} variant="secondary" style={{ width: "100%" }}>
            Reset Demo
          </Button>
        </div>
      </aside>

      <main className={styles.content}>
        <header style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0 }}>{seed.title}</h2>
            <p style={{ margin: 0 }}>{seed.subtitle}</p>
          </div>
          <StatusIndicator tone="active" label="Sistema Operativo" />
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
          <Card title="Stato Negozio" subtitle={activeDataset.store.displayName}>
            <p>{activeDataset.store.city}</p>
            <div style={{ marginTop: "16px", display: "flex", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pizzaos-color-foreground-muted)" }}>ORDINI OGGI</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{activeDataset.orders.length}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pizzaos-color-foreground-muted)" }}>PRODOTTI</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{activeDataset.products.length}</div>
              </div>
            </div>
          </Card>

          <Card title="Info Demo">
            <p>Questa è una superficie demo frontend-only. Tutti i dati sono simulati localmente.</p>
            <ul style={{ paddingLeft: "20px", color: "var(--pizzaos-color-foreground-muted)" }}>
              <li>Persistenza: localStorage</li>
              <li>Multi-store: Abilitato</li>
              <li>Simulation loop: Pronto</li>
            </ul>
          </Card>
        </div>
      </main>
    </div>
  );
}
