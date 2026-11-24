"use client";

import { BRAND_ASSETS } from "@pizzaos/brand";
import { BrandLogo } from "@pizzaos/ui";
import { useState, type ReactNode } from "react";
import { adminHref, type AdminTab } from "./admin-navigation";
import styles from "./admin-shell.module.css";

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

export type { AdminTab } from "./admin-navigation";


export function AdminFrame({ activeTab, onTabChange, storeSelector, sidebarFooter, children, overlay, demo = false }: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  storeSelector: ReactNode;
  sidebarFooter?: ReactNode;
  children: ReactNode;
  overlay?: ReactNode;
  demo?: boolean;
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div
      className={`${styles.shell} ${demo ? styles.shellDemo : ""} ${
        isSidebarCollapsed ? styles.shellSidebarCollapsed : ""
      }`}
    >
      <button
        aria-controls="admin-sidebar-content"
        aria-expanded={!isSidebarCollapsed}
        aria-label={
          isSidebarCollapsed ? "Mostra sidebar" : "Nascondi sidebar"
        }
        className={`${styles.sidebarToggle} ${isSidebarCollapsed ? styles.sidebarToggleCollapsed : ""}`}
        onClick={() => setIsSidebarCollapsed((current) => !current)}
        type="button"
      >
        <span aria-hidden="true">
          {isSidebarCollapsed ? <>&rsaquo;</> : <>&lsaquo;</>}
        </span>
      </button>

      <aside
        className={`${styles.sidebar} ${
          isSidebarCollapsed ? styles.sidebarCollapsed : ""
        }`}
      >
        {!isSidebarCollapsed ? (
          <div className={styles.sidebarContent} id="admin-sidebar-content">
            <div className={styles.logo}>
              <BrandLogo
                className={styles.logoImage}
                src={BRAND_ASSETS.logo}
                width={180}
              />
            </div>

            <nav className={styles.nav} aria-label="Navigazione admin">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.id}
                  aria-label={
                    item.id === "analytics" && demo ? "Analytics and AI" : undefined
                  }
                  href={adminHref(item.id, demo)}
                  aria-current={activeTab === item.id ? "page" : undefined}
                  onClick={event => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    onTabChange(item.id);
                  }}
                  className={`${styles.navButton} ${
                    activeTab === item.id ? styles.navItemActive : ""
                  }`}
                >
                  <span aria-hidden="true" className={styles.navIcon} style={{ maskImage: `url(${item.iconSrc})` }} />
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>

            {storeSelector}
            {sidebarFooter && <div className={styles.sidebarFooter}>{sidebarFooter}</div>}
          </div>
        ) : null}
      </aside>

      <main className={styles.content}>{children}</main>
      {overlay}
    </div>
  );
}
