import type { ReactElement } from "react";
import styles from "./ecosystem-section.module.css";

type EcosystemStatus = "live" | "soon" | "roadmap";

interface EcosystemItem
{
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly status: EcosystemStatus;
  readonly statusLabel: string;
}

const ECOSYSTEM_ITEMS: readonly EcosystemItem[] = [
  {
    icon: "📱",
    title: "Ordini digitali",
    description: "Menù digitale con personalizzazione completa, disponibilità in tempo reale e checkout guidato.",
    status: "live",
    statusLabel: "Live nel POC"
  },
  {
    icon: "📊",
    title: "Analytics AI",
    description: "Dashboard operativa con insight automatici, previsione della domanda e suggerimenti di pricing.",
    status: "live",
    statusLabel: "Live nel POC"
  },
  {
    icon: "🎯",
    title: "Marketing automation",
    description: "Campagne personalizzate per riattivare clienti inattivi, festeggiare compleanni e fare upsell.",
    status: "live",
    statusLabel: "Live nel POC"
  },
  {
    icon: "🛵",
    title: "Delivery & tracciamento",
    description: "Integrazione con rider, mappa live per il cliente e ottimizzazione dei percorsi di consegna.",
    status: "live",
    statusLabel: "Live nel POC"
  },
  {
    icon: "🤝",
    title: "Ordine di gruppo",
    description: "Lascia che i tuoi clienti ordinino insieme in tempo reale, ognuno personalizzando la propria pizza.",
    status: "soon",
    statusLabel: "Prossimamente"
  },
  {
    icon: "🏪",
    title: "Multi-sede",
    description: "Gestisci più locali da un unico pannello, con dati separati, menu differenziati e staff dedicato.",
    status: "live",
    statusLabel: "Live nel POC"
  },
  {
    icon: "🎁",
    title: "Loyalty & abbonamenti",
    description: "Programmi fedeltà a punti, card mensili e benefici esclusivi per i clienti più affezionati.",
    status: "live",
    statusLabel: "Live nel POC"
  },
  {
    icon: "📦",
    title: "Gestione magazzino",
    description: "Inventario in tempo reale collegato al menù: zero figure barbine con il «esaurito» sempre aggiornato.",
    status: "soon",
    statusLabel: "Prossimamente"
  },
  {
    icon: "🌐",
    title: "POS & integrazioni",
    description: "Integrazione con casse fisiche, sistemi di prenotazione tavoli e servizi di pagamento europei.",
    status: "roadmap",
    statusLabel: "In roadmap"
  }
] as const;

export function EcosystemSection(): ReactElement
{
  return (
    <section
      id="ecosistema"
      className={styles.section}
      aria-label="Ecosistema PizzaOS"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Ecosistema</span>
          <h2 className={styles.title}>
            Tutto ciò che una pizzeria moderna può immaginare.
          </h2>
          <p className={styles.description}>
            Dal primo ordine digitale alla gestione multi-sede: PizzaOS cresce con te.
            Alcune funzionalità sono già live, altre in arrivo presto.
          </p>
        </div>

        <div className={styles.grid} role="list">
          {ECOSYSTEM_ITEMS.map((item) => (
            <div key={item.title} className={styles.card} role="listitem">
              <div className={styles.cardIcon} aria-hidden="true">{item.icon}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDescription}>{item.description}</p>
              <span className={`${styles.cardBadge} ${styles[`cardBadge--${item.status}`]}`}>
                {item.statusLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
