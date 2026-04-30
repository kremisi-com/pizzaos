"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./hero-section.module.css";

const CLIENT_DEMO_URL = "/client" as const;
const ADMIN_DEMO_URL = "/admin" as const;

const MOCK_BAR_HEIGHTS = [35, 55, 45, 70, 60, 85, 75, 90, 65, 88, 72, 95] as const;

const KPI_CARDS = [
  { value: "€ 4.280", label: "Incasso oggi" },
  { value: "127", label: "Ordini totali" },
  { value: "33:42", label: "Tempo medio" },
  { value: "4.8★", label: "Valutazione" }
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

        {/* Badge */}
        <div className={styles.badge} aria-hidden="true">
          <span className={styles.badgeDot}>🍕</span>
          <span>
            Il software <span className={styles.badgeHighlight}>più elegante</span> per pizzerie serie
          </span>
        </div>

        {/* Headline */}
        <h1 className={styles.headline}>
          La pizzeria del futuro{" "}
          <span className={styles.headlineAccent}>
            parte da qui.
          </span>
        </h1>

        {/* Subline */}
        <p className={styles.subline}>
          PizzaOS unifica ordini online, marketing automatico, analytics AI e gestione
          operativa in un unico sistema progettato per pizzerie ambiziose.
        </p>

        {/* CTA Row */}
        <div className={styles.ctaRow}>
          <Link
            href={CLIENT_DEMO_URL}
            className={styles.primaryCta}
            id="hero-primary-cta"
          >
            Scopri il menù digitale →
          </Link>
          <Link
            href={ADMIN_DEMO_URL}
            className={styles.secondaryCta}
            id="hero-admin-cta"
          >
            Vai alla dashboard
          </Link>
          <button
            type="button"
            onClick={onRequestDemo}
            className={styles.modalTrigger}
            id="hero-modal-trigger"
          >
            Richiedi una demo
          </button>
        </div>

        {/* Social proof */}
        <div className={styles.socialProof}>
          <div className={styles.socialProofItem}>
            <span>✓</span>
            <span>Zero commissioni</span>
          </div>
          <div className={styles.socialProofDivider} aria-hidden="true" />
          <div className={styles.socialProofItem}>
            <span>✓</span>
            <span>Setup in 24 ore</span>
          </div>
          <div className={styles.socialProofDivider} aria-hidden="true" />
          <div className={styles.socialProofItem}>
            <span>✓</span>
            <span>Dati sempre tuoi</span>
          </div>
          <div className={styles.socialProofDivider} aria-hidden="true" />
          <div className={styles.socialProofItem}>
            <span>✓</span>
            <span>AI inclusa</span>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className={styles.mockupWrapper}>

          {/* Floating card left */}
          <div className={`${styles.floatCard} ${styles.floatCardLeft}`} aria-hidden="true">
            <div className={styles.floatCardLabel}>Ordini in arrivo</div>
            <div className={styles.floatCardValue}>+12 oggi</div>
          </div>

          {/* Floating card right */}
          <div className={`${styles.floatCard} ${styles.floatCardRight}`} aria-hidden="true">
            <div className={styles.floatCardLabel}>Fatturato mensile</div>
            <div className={styles.floatCardValue}>+28% ↑</div>
          </div>

          <div className={styles.mockup} aria-label="Anteprima dashboard PizzaOS" role="img">
            {/* Browser chrome */}
            <div className={styles.mockupBar}>
              <div className={styles.mockupDot} />
              <div className={styles.mockupDot} />
              <div className={styles.mockupDot} />
            </div>

            {/* Content */}
            <div className={styles.mockupContent}>
              {/* Sidebar */}
              <div className={styles.mockupSidebar} aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={styles.mockupSidebarItem} />
                ))}
              </div>

              {/* Main panel */}
              <div className={styles.mockupMain}>
                {/* KPI cards */}
                <div className={styles.mockupKpiRow} aria-hidden="true">
                  {KPI_CARDS.map((kpi) => (
                    <div key={kpi.label} className={styles.mockupKpiCard}>
                      <div className={styles.mockupKpiValue}>{kpi.value}</div>
                      <div className={styles.mockupKpiLabel}>{kpi.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart area */}
                <div className={styles.mockupChartArea} aria-hidden="true">
                  {MOCK_BAR_HEIGHTS.map((h, i) => (
                    <div
                      key={i}
                      className={styles.mockupBar2}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
