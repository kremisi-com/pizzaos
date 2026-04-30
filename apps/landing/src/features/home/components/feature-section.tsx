import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./feature-section.module.css";

/* ── Shared feature item type ── */
interface FeatureItem
{
  readonly text: string;
}

/* ── Ordering Visual ── */
function OrderingVisual(): ReactElement
{
  const doughs = ["Classico", "Integrale", "Senza glutine"] as const;
  const sizes = ["Tonda 30cm", "Tonda 33cm", "Maxi 40cm"] as const;
  const extras = ["+ Bufala", "+ Nduja", "+ Tartufo"] as const;

  return (
    <div className={styles.visualCard}>
      <div className={styles.orderingMockup}>
        <div className={styles.mockupTitle}>🍕 Crea la tua pizza</div>
        <div className={styles.pizzaCustomizer}>
          <div>
            <div className={styles.mockupTitle} style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "8px" }}>IMPASTO</div>
            <div className={styles.customizerRow}>
              {doughs.map((d, i) => (
                <div key={d} className={`${styles.customizerChip} ${i === 0 ? styles["customizerChip--active"] : ""}`}>
                  {d}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.mockupTitle} style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "8px" }}>DIMENSIONE</div>
            <div className={styles.customizerRow}>
              {sizes.map((s, i) => (
                <div key={s} className={`${styles.customizerChip} ${i === 1 ? styles["customizerChip--active"] : ""}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className={styles.mockupTitle} style={{ fontSize: "12px", color: "var(--color-muted)", marginBottom: "8px" }}>EXTRA PREMIUM</div>
            <div className={styles.customizerRow}>
              {extras.map((e, i) => (
                <div key={e} className={`${styles.customizerChip} ${i === 2 ? styles["customizerChip--active"] : ""}`}>
                  {e}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Totale</span>
            <span className={styles.priceValue}>€ 18,50</span>
          </div>
          <div className={styles.addBtn}>Aggiungi al carrello →</div>
        </div>
      </div>
    </div>
  );
}

/* ── Marketing Visual ── */
function MarketingVisual(): ReactElement
{
  const campaigns = [
    { name: "Sconto riattivazione", stats: "Aperto: 64% · Conv: 22%", status: "active" as const },
    { name: "Compleanno -15%", stats: "Aperto: 81% · Conv: 41%", status: "active" as const },
    { name: "Post-ordine upsell", stats: "Inizio: dom 20:00", status: "scheduled" as const }
  ] as const;

  return (
    <div className={styles.visualCard}>
      <div className={styles.marketingMockup}>
        <div className={styles.mockupTitle}>📣 Campagne attive</div>
        {campaigns.map((c) => (
          <div key={c.name} className={styles.campaignCard}>
            <div className={styles.campaignInfo}>
              <div className={styles.campaignName}>{c.name}</div>
              <div className={styles.campaignStats}>{c.stats}</div>
            </div>
            <div className={`${styles.campaignStatus} ${styles[`campaignStatus--${c.status}`]}`}>
              {c.status === "active" ? "Attiva" : "In programma"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analytics Visual ── */
const CHART_BARS = [40, 60, 45, 75, 55, 85, 70, 90, 65, 88, 78, 95] as const;

function AnalyticsVisual(): ReactElement
{
  return (
    <div className={styles.visualCard}>
      <div className={styles.analyticsMockup}>
        <div className={styles.chartHeader}>
          <div className={styles.chartTitle}>Fatturato settimanale</div>
          <div className={styles.chartBadge}>+28% vs mese scorso</div>
        </div>
        <div className={styles.chartArea}>
          {CHART_BARS.map((h, i) => (
            <div
              key={i}
              className={styles.chartBar}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className={styles.insightCard}>
          <div className={styles.insightLabel}>💡 Suggerimento AI</div>
          Il picco del venerdì alle 20:30 può essere ottimizzato con un bundle
          &ldquo;Serata Coppia&rdquo; per aumentare lo scontrino medio del 18%.
        </div>
      </div>
    </div>
  );
}

/* ── Delivery Visual ── */
interface TrackerStep
{
  readonly label: string;
  readonly time: string;
  readonly done: boolean;
  readonly active?: boolean;
}

const TRACKER_STEPS: readonly TrackerStep[] = [
  { label: "Ordine ricevuto", time: "20:12", done: true },
  { label: "In preparazione", time: "20:15", done: true },
  { label: "Consegna in corso", time: "20:41", done: false, active: true },
  { label: "Consegnato", time: "—", done: false }
];

function DeliveryVisual(): ReactElement
{
  return (
    <div className={styles.visualCard}>
      <div className={styles.deliveryMockup}>
        <div className={styles.mockupTitle}>🛵 Tracciamento in tempo reale</div>
        <div className={styles.mapPlaceholder}>
          <div className={styles.mapRoute} />
          <div className={`${styles.mapPin} ${styles.mapPinA}`} />
          <div className={`${styles.mapPin} ${styles.mapPinB}`} />
          <span>Mappa live</span>
        </div>
        <div className={styles.deliveryTracker}>
          {TRACKER_STEPS.map((step) => (
            <div key={step.label} className={styles.trackerStep}>
              <div className={`${styles.trackerDot} ${step.done ? styles["trackerDot--done"] : ""} ${step.active ? styles["trackerDot--active"] : ""}`} />
              <span className={styles.trackerLabel}>{step.label}</span>
              <span className={styles.trackerTime}>{step.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Operations Visual ── */
const TICKETS = [
  { id: "#0041", items: "2× Margherita, 1× Diavola", meta: "In attesa da 4 min", status: "preparing" as const },
  { id: "#0040", items: "1× Capricciosa, 1× Calzone", meta: "Pronto per ritiro", status: "ready" as const }
] as const;

function OperationsVisual(): ReactElement
{
  return (
    <div className={styles.visualCard}>
      <div className={styles.operationsMockup}>
        <div className={styles.mockupTitle}>📋 Coda ordini</div>
        {TICKETS.map((ticket) => (
          <div key={ticket.id} className={styles.orderTicket}>
            <div className={styles.ticketHeader}>
              <span className={styles.ticketId}>{ticket.id}</span>
              <span className={`${styles.ticketStatus} ${styles[`ticketStatus--${ticket.status}`]}`}>
                {ticket.status === "preparing" ? "In preparazione" : "Pronto"}
              </span>
            </div>
            <div className={styles.ticketItems}>{ticket.items}</div>
            <div className={styles.ticketMeta}>{ticket.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Feature Section Props ── */
type VisualType = "ordering" | "marketing" | "analytics" | "delivery" | "operations";

interface FeatureSectionProps
{
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly features: readonly FeatureItem[];
  readonly ctaLabel: string;
  readonly ctaHref: string;
  readonly visual: VisualType;
  readonly reversed?: boolean;
  readonly variant?: "beige" | "white";
}

const VISUAL_MAP: Record<VisualType, () => ReactElement> = {
  ordering: OrderingVisual,
  marketing: MarketingVisual,
  analytics: AnalyticsVisual,
  delivery: DeliveryVisual,
  operations: OperationsVisual
};

export function FeatureSection({
  id,
  eyebrow,
  title,
  description,
  features,
  ctaLabel,
  ctaHref,
  visual,
  reversed = false,
  variant = "white"
}: FeatureSectionProps): ReactElement
{
  const VisualComponent = VISUAL_MAP[visual];

  return (
    <section
      id={id}
      className={`${styles.section} ${variant === "beige" ? styles["section--beige"] : styles["section--white"]}`}
      aria-label={title}
    >
      <div className={styles.inner}>
        <div className={`${styles.split} ${reversed ? styles["split--reverse"] : ""}`}>

          {/* Text block */}
          <div className={styles.textBlock}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>{description}</p>
            <ul className={styles.featureList} role="list">
              {features.map((f) => (
                <li key={f.text} className={styles.featureItem}>
                  <span className={styles.featureIcon} aria-hidden="true">✓</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
            <Link href={ctaHref} className={styles.cta} id={`feature-cta-${id}`}>
              {ctaLabel} →
            </Link>
          </div>

          {/* Visual */}
          <div className={styles.visual}>
            <VisualComponent />
          </div>

        </div>
      </div>
    </section>
  );
}
