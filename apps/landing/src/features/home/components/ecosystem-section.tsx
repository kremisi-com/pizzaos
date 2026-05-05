import type { ReactElement } from "react";
import styles from "./ecosystem-section.module.css";

type EcosystemStatus = "live" | "soon" | "roadmap";
type EcosystemIcon =
  | "orders"
  | "analytics"
  | "marketing"
  | "delivery"
  | "group"
  | "stores"
  | "loyalty"
  | "inventory"
  | "integrations";

interface EcosystemItem {
  readonly icon: EcosystemIcon;
  readonly title: string;
  readonly description: string;
  readonly status: EcosystemStatus;
  readonly statusLabel: string;
}

const ECOSYSTEM_ITEMS: readonly EcosystemItem[] = [
  {
    icon: "orders",
    title: "Ordini digitali",
    description:
      "Menù digitale con personalizzazione completa, disponibilità in tempo reale e checkout guidato.",
    status: "live",
    statusLabel: "Live nella Demo",
  },
  {
    icon: "analytics",
    title: "Analytics AI",
    description:
      "Dashboard operativa con insight automatici, previsione della domanda e suggerimenti di pricing.",
    status: "live",
    statusLabel: "Live nella Demo",
  },
  {
    icon: "marketing",
    title: "Marketing automation",
    description:
      "Campagne personalizzate per riattivare clienti inattivi, festeggiare compleanni e fare upsell.",
    status: "live",
    statusLabel: "Live nella Demo",
  },
  {
    icon: "delivery",
    title: "Delivery & tracciamento",
    description:
      "Integrazione con rider, mappa live per il cliente e ottimizzazione dei percorsi di consegna.",
    status: "live",
    statusLabel: "Live nella Demo",
  },
  {
    icon: "group",
    title: "Ordine di gruppo",
    description:
      "Lascia che i tuoi clienti ordinino insieme in tempo reale, ognuno personalizzando la propria pizza.",
    status: "soon",
    statusLabel: "Prossimamente",
  },
  {
    icon: "stores",
    title: "Multi-sede",
    description:
      "Gestisci più locali da un unico pannello, con dati separati, menu differenziati e staff dedicato.",
    status: "live",
    statusLabel: "Live nella Demo",
  },
  {
    icon: "loyalty",
    title: "Loyalty & abbonamenti",
    description:
      "Programmi fedeltà a punti, card mensili e benefici esclusivi per i clienti più affezionati.",
    status: "live",
    statusLabel: "Live nella Demo",
  },
  {
    icon: "inventory",
    title: "Gestione magazzino",
    description:
      "Inventario in tempo reale collegato al menù: zero figure barbine con il «esaurito» sempre aggiornato.",
    status: "soon",
    statusLabel: "Prossimamente",
  },
  {
    icon: "integrations",
    title: "POS & integrazioni",
    description:
      "Integrazione con casse fisiche, sistemi di prenotazione tavoli e servizi di pagamento europei.",
    status: "roadmap",
    statusLabel: "In roadmap",
  },
] as const;

export function EcosystemSection(): ReactElement {
  return (
    <section
      id="ecosistema"
      className={styles.section}
      aria-label="Ecosistema PizzaOS"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>
            <EcosystemIcon />
            ECOSISTEMA
          </span>
          <h2 className={styles.title}>
            Tutto ciò che una pizzeria moderna può <span>immaginare.</span>
          </h2>
          <p className={styles.description}>
            Dal primo ordine digitale alla gestione multi-sede: PizzaOS cresce
            con te.
            <br />
            Alcune funzionalità sono già live, altre in arrivo presto.
          </p>
        </div>

        <div className={styles.grid} role="list">
          {ECOSYSTEM_ITEMS.map((item) => (
            <div key={item.title} className={styles.card} role="listitem">
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} aria-hidden="true">
                  {renderIcon(item.icon)}
                </div>
                <span
                  className={`${styles.cardBadge} ${styles[`cardBadge--${item.status}`]}`}
                >
                  {item.statusLabel}
                </span>
              </div>
              <div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardDescription}>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function renderIcon(icon: EcosystemIcon): ReactElement {
  switch (icon) {
    case "orders":
      return <PhoneIcon />;
    case "analytics":
      return <ChartIcon />;
    case "marketing":
      return <TargetIcon />;
    case "delivery":
      return <ScooterIcon />;
    case "group":
      return <UsersIcon />;
    case "stores":
      return <StoreIcon />;
    case "loyalty":
      return <GiftIcon />;
    case "inventory":
      return <BoxIcon />;
    case "integrations":
      return <GlobeIcon />;
  }
}

function EcosystemIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 20 7.5" />
      <path d="M12 12v9" />
      <path d="M12 12 4 7.5" />
    </svg>
  );
}

function PhoneIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M10 18h4" />
      <path d="M9 7h6" />
    </svg>
  );
}

function ChartIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
      <path d="M18 6h-4" />
    </svg>
  );
}

function TargetIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M22 12h-3" />
      <path d="M12 22v-3" />
      <path d="M2 12h3" />
    </svg>
  );
}

function ScooterIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 17h6l1.5-7H9L8 6H4" />
      <path d="M13 17h3l2-5h3v5h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M15 8h3" />
    </svg>
  );
}

function UsersIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3.2 2.7-5 5.5-5s4.7 1.8 5.5 5" />
      <path d="M15 6.5a3 3 0 0 1 0 5.7" />
      <path d="M16.5 14.2c2 .6 3.3 2.2 4 4.8" />
    </svg>
  );
}

function StoreIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10h16l-1.4-5H5.4L4 10Z" />
      <path d="M6 10v10h12V10" />
      <path d="M9 20v-6h6v6" />
      <path d="M4 10c0 1.4 1.1 2.5 2.5 2.5S9 11.4 9 10" />
      <path d="M9 10c0 1.4 1.1 2.5 2.5 2.5S14 11.4 14 10" />
      <path d="M14 10c0 1.4 1.1 2.5 2.5 2.5S19 11.4 19 10" />
    </svg>
  );
}

function GiftIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10h16v10H4V10Z" />
      <path d="M12 10v10" />
      <path d="M4 14h16" />
      <path d="M12 10H8a2 2 0 1 1 2-2c0 1.1 2 2 2 2Z" />
      <path d="M12 10h4a2 2 0 1 0-2-2c0 1.1-2 2-2 2Z" />
    </svg>
  );
}

function BoxIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="m8 5.5 8 4.5" />
    </svg>
  );
}

function GlobeIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9" />
      <path d="M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9" />
    </svg>
  );
}
