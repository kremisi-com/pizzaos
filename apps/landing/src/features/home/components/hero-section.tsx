"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./hero-section.module.css";

const CLIENT_DEMO_URL = "/client" as const;
const ADMIN_DEMO_URL = "/admin" as const;

const BOTTOM_FEATURES = [
  { icon: "⊡", title: "Ordini online", sub: "rapidi e intuitivi" },
  { icon: "⊕", title: "Pagamenti", sub: "sicuri" },
  { icon: "◎", title: "Consegne", sub: "tracciate in tempo reale" },
  { icon: "♡", title: "Clienti fidelizzati", sub: "e marketing automatico" }
] as const;

const REAL_TIME_ORDERS = [
  { id: "#1258", item: "Margherita DOP", type: "Consegna", time: "18:32" },
  { id: "#1257", item: "Diavola", type: "Asporto", time: "18:31" },
  { id: "#1256", item: "4 Formaggi", type: "Consegna", time: "18:28" }
] as const;

interface HeroSectionProps
{
  readonly onRequestDemo: () => void;
}

export function HeroSection({ onRequestDemo }: HeroSectionProps): ReactElement
{
  return (
    <section className={styles.hero} aria-label="Hero PizzaOS">
      <div className={styles.inner}>

        {/* Left column — copy */}
        <div className={styles.copy}>

          {/* Badge pill */}
          <div className={styles.badge} aria-hidden="true">
            <span className={styles.badgeIcon}>🚀</span>
            <span className={styles.badgeText}>LA PIATTAFORMA ALL-IN-ONE PER PIZZERIE MODERNE</span>
          </div>

          {/* Headline */}
          <h1 className={styles.headline}>
            Trasforma la tua<br />
            pizzeria in una<br />
            <span className={styles.headlineAccent}>macchina di<br />ordini diretti.</span>
          </h1>

          {/* Subline */}
          <p className={styles.subline}>
            Più ordini. Più clienti. Più controllo.<br />
            Tutto in un&apos;unica piattaforma, zero commissioni<br />
            sugli ordini.
          </p>

          {/* CTA row */}
          <div className={styles.ctaRow}>
            <button
              type="button"
              onClick={onRequestDemo}
              className={styles.primaryCta}
              id="hero-primary-cta"
            >
              Richiedi una demo →
            </button>
            <Link
              href={CLIENT_DEMO_URL}
              className={styles.secondaryCta}
              id="hero-secondary-cta"
            >
              <span className={styles.playIcon}>▶</span>
              Guarda come funziona
            </Link>
          </div>

        </div>

        {/* Right column — visual mockups */}
        <div className={styles.visual} aria-hidden="true">

          {/* Admin dashboard card (behind) */}
          <div className={styles.dashboardCard}>
            {/* Dashboard header */}
            <div className={styles.dashboardHeader}>
              <div className={styles.dashboardLogo}>
                <span className={styles.dashboardLogoIcon}>🍕</span>
                <span className={styles.dashboardLogoText}>PizzaOS</span>
              </div>
              <span className={styles.dashboardTitle}>Panoramica</span>
            </div>

            {/* Sidebar + content */}
            <div className={styles.dashboardLayout}>
              <nav className={styles.dashboardSidebar}>
                <div className={`${styles.sidebarItem} ${styles.sidebarItemActive}`}>Dashboard</div>
                <div className={styles.sidebarItem}>Ordini</div>
                <div className={styles.sidebarItem}>Menu</div>
                <div className={styles.sidebarItem}>Clienti</div>
                <div className={styles.sidebarItem}>Marketing</div>
                <div className={styles.sidebarItem}>Analytics</div>
                <div className={styles.sidebarItem}>Impostazioni</div>
              </nav>

              <div className={styles.dashboardContent}>
                {/* KPI row */}
                <div className={styles.kpiRow}>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Ordini oggi</span>
                    <span className={styles.kpiValue}>126</span>
                    <span className={styles.kpiGrowth}>↑ 19%</span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Fatturato oggi</span>
                    <span className={styles.kpiValue}>2.345 €</span>
                    <span className={styles.kpiGrowth}>↑ 24%</span>
                  </div>
                  <div className={styles.kpiCard}>
                    <span className={styles.kpiLabel}>Nuovi clienti</span>
                    <span className={styles.kpiValue}>32</span>
                    <span className={styles.kpiGrowth}>↑ 12%</span>
                  </div>
                </div>

                {/* Chart area */}
                <div className={styles.chartArea}>
                  <div className={styles.chartHeader}>
                    <span className={styles.chartTitle}>Andamento ordini</span>
                    <span className={styles.chartBadge}>Oggi</span>
                  </div>
                  <div className={styles.chartLine}>
                    <svg viewBox="0 0 220 60" preserveAspectRatio="none" className={styles.chartSvg}>
                      <polyline
                        points="0,45 30,38 55,50 80,28 110,35 140,20 170,28 200,15 220,22"
                        fill="none"
                        stroke="#f43a26"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Real-time orders */}
                <div className={styles.ordersSection}>
                  <div className={styles.ordersSectionHeader}>
                    <span>Ordini in tempo reale</span>
                    <a href={ADMIN_DEMO_URL} className={styles.ordersLink}>Vedi tutti</a>
                  </div>
                  {REAL_TIME_ORDERS.map((order) => (
                    <div key={order.id} className={styles.orderRow}>
                      <div className={styles.orderAvatar} />
                      <div className={styles.orderInfo}>
                        <span className={styles.orderId}>{order.id}</span>
                        <span className={styles.orderItem}>{order.item}</span>
                      </div>
                      <span className={styles.orderType}>{order.type}</span>
                      <span className={styles.orderTime}>{order.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Phone mockup (front) */}
          <div className={styles.phoneMockup}>
            <div className={styles.phoneScreen}>
              {/* Status bar */}
              <div className={styles.phoneStatusBar}>
                <span>9:01</span>
                <div className={styles.phoneStatusIcons}>
                  <span>●●●</span>
                  <span>▲</span>
                  <span>▌</span>
                </div>
              </div>

              {/* App header */}
              <div className={styles.phoneAppHeader}>
                <span className={styles.phoneMenuIcon}>≡</span>
                <div className={styles.phoneRestaurantInfo}>
                  <span className={styles.phoneRestaurantName}>Bella Napoli</span>
                  <span className={styles.phoneRestaurantSub}>PIZZERIA</span>
                </div>
                <span className={styles.phoneCartIcon}>🛒</span>
              </div>

              {/* Greeting */}
              <div className={styles.phoneGreeting}>
                <p className={styles.phoneGreetingTitle}>Ciao Mario!</p>
                <p className={styles.phoneGreetingSubtitle}>Ordina come l&apos;ultima volta</p>
              </div>

              {/* Featured item */}
              <div className={styles.phoneFeaturedItem}>
                <div className={styles.phonePizzaImage}>🍕</div>
                <div className={styles.phoneFeaturedInfo}>
                  <p className={styles.phoneFeaturedName}>Margherita DOP</p>
                  <p className={styles.phoneFeaturedDesc}>Pomodoro San Marzano, fior di latte, basilico</p>
                  <div className={styles.phoneFeaturedRow}>
                    <span className={styles.phoneFeaturedPrice}>7,50 €</span>
                    <button type="button" className={styles.phoneAddBtn}>+ Aggiungi</button>
                  </div>
                </div>
              </div>

              {/* Section header */}
              <div className={styles.phoneSection}>
                <p className={styles.phoneSectionTitle}>Le nostre pizze</p>
                <div className={styles.phoneTabs}>
                  <span className={`${styles.phoneTab} ${styles.phoneTabActive}`}>Tutte</span>
                  <span className={styles.phoneTab}>Classiche</span>
                  <span className={styles.phoneTab}>Speciali</span>
                  <span className={styles.phoneTab}>Bianche</span>
                </div>
              </div>

              {/* Second item */}
              <div className={styles.phoneFeaturedItem}>
                <div className={styles.phonePizzaImage}>🍕</div>
                <div className={styles.phoneFeaturedInfo}>
                  <p className={styles.phoneFeaturedName}>Diavola</p>
                  <p className={styles.phoneFeaturedDesc}>Pomodoro San Marzano, mozzarella fior di latte, salame piccante</p>
                  <div className={styles.phoneFeaturedRow}>
                    <span className={styles.phoneFeaturedPrice}>8,50 €</span>
                    <button type="button" className={styles.phoneAddBtn}>+</button>
                  </div>
                </div>
              </div>

              {/* Bottom nav */}
              <div className={styles.phoneBottomNav}>
                <div className={`${styles.phoneNavItem} ${styles.phoneNavItemActive}`}>
                  <span>⊞</span>
                  <span>Menu</span>
                </div>
                <div className={styles.phoneNavItem}>
                  <span>📋</span>
                  <span>Ordini</span>
                </div>
                <div className={styles.phoneNavItem}>
                  <span>👤</span>
                  <span>Profilo</span>
                </div>
                <div className={styles.phoneNavItem}>
                  <span>•••</span>
                  <span>Altro</span>
                </div>
              </div>
            </div>
          </div>

          {/* Floating delivery card */}
          <div className={styles.deliveryCard}>
            <div className={styles.deliveryCardBadge}>Ordine #1258<br /><span className={styles.deliveryStatus}>In consegna</span></div>
            <div className={styles.deliveryMap}>
              <div className={styles.deliveryMapDot} />
            </div>
            <div className={styles.riderInfo}>
              <div className={styles.riderAvatar} />
              <div>
                <p className={styles.riderLabel}>Il tuo rider</p>
                <p className={styles.riderName}>Luca</p>
              </div>
              <div className={styles.riderActions}>
                <span className={styles.riderAction}>📞</span>
                <span className={styles.riderAction}>💬</span>
              </div>
            </div>
            <p className={styles.deliveryEta}>Consegna prevista <strong>18:45</strong></p>
          </div>

          {/* Basil decoration */}
          <div className={styles.basilDecoration} aria-hidden="true">🌿</div>

        </div>
      </div>

      {/* Bottom feature strip */}
      <div className={styles.featureStrip}>
        <div className={styles.featureStripInner}>
          {BOTTOM_FEATURES.map((feat) => (
            <div key={feat.title} className={styles.featureItem}>
              <span className={styles.featureIcon}>{feat.icon}</span>
              <div>
                <p className={styles.featureTitle}>{feat.title}</p>
                <p className={styles.featureSub}>{feat.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
