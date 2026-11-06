"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
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

export type AdminTab = (typeof NAV_ITEMS)[number]["id"];

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
            <div className={styles.logo}>
              <Image
                className={styles.logoImage}
                src="/images/logo.png"
                alt="PizzaOS Admin"
                width={180}
                height={52}
                priority
              />
            </div>

            <nav className={styles.nav} aria-label="Navigazione admin">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  aria-label={
                    item.id === "analytics" && demo ? "Analytics and AI" : undefined
                  }
                  type="button"
                  aria-current={activeTab === item.id ? "page" : undefined}
                  onClick={() => onTabChange(item.id)}
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
