import Image from "next/image";
import type { ReactElement } from "react";
import styles from "./margin-comparison-section.module.css";

const COMPARISON_COLUMNS = [
  {
    key: "marketplace",
    icon: <StoreIcon />,
    title: "Marketplace",
    subtitle: "Più visibilità, meno controllo",
    highlighted: false,
  },
  {
    key: "simpleSite",
    icon: <ScreenIcon />,
    title: "Sito semplice",
    subtitle: "Più margine, ma poco sistema",
    highlighted: false,
  },
  {
    key: "pizzaos",
    title: "PizzaOS",
    subtitle: "Il sistema che massimizza il profitto",
    highlighted: true,
  },
] as const;

const COMPARISON_ROWS = [
  {
    icon: <MarginIcon />,
    label: "Margine su ogni ordine",
    marketplace: {
      tone: "bad",
      title: "Basso",
      detail: "Commissioni 15-30%",
    },
    simpleSite: {
      tone: "ok",
      title: "Buono",
      detail: "Nessuna commissione, ma poche leve di crescita",
    },
    pizzaos: {
      tone: "good",
      title: "Massimizzato",
      detail: "Ordini diretti + efficienza + ritorno clienti",
    },
  },
  {
    icon: <ScooterIcon />,
    label: "Gestione consegne",
    marketplace: {
      tone: "ok",
      title: "Semplificata",
      detail: "Delivery comoda, ma fuori controllo",
    },
    simpleSite: {
      tone: "bad",
      title: "Manuale",
      detail: "Rider e consegne poco ottimizzati",
    },
    pizzaos: {
      tone: "good",
      title: "Ottimizzata",
      detail: "Più consegne nello stesso tempo",
    },
  },
  {
    icon: <EuroIcon />,
    label: "Costi operativi",
    marketplace: {
      tone: "ok",
      title: "Parzialmente ridotti",
      detail: "Meno gestione interna, ma margine eroso",
    },
    simpleSite: {
      tone: "bad",
      title: "Nascosti",
      detail: "Più tempo, errori e inefficienze",
    },
    pizzaos: {
      tone: "good",
      title: "Ridotti",
      detail: "Percorsi migliori, meno benzina, meno errori",
    },
  },
  {
    icon: <UserIcon />,
    label: "Cliente e dati",
    marketplace: {
      tone: "bad",
      title: "Limitati",
      detail: "Cliente e dati non pienamente tuoi",
    },
    simpleSite: {
      tone: "ok",
      title: "Base",
      detail: "Dati tuoi, ma poco sfruttati",
    },
    pizzaos: {
      tone: "good",
      title: "Strategici",
      detail: "Insight, storico e clienti valorizzati",
    },
  },
  {
    icon: <MegaphoneIcon />,
    label: "Marketing e fidelizzazione",
    marketplace: {
      tone: "ok",
      title: "Visibilità iniziale",
      detail: "Promozioni utili, ma retention limitata",
    },
    simpleSite: {
      tone: "bad",
      title: "Debole",
      detail: "Azioni manuali e poco continuative",
    },
    pizzaos: {
      tone: "good",
      title: "Attivo",
      detail: "Coupon, loyalty, notifiche e automazioni",
    },
  },
  {
    icon: <RepeatIcon />,
    label: "Riordino e frequenza",
    marketplace: {
      tone: "ok",
      title: "Possibile",
      detail: "Hai traffico, ma dipendi dalla piattaforma",
    },
    simpleSite: {
      tone: "bad",
      title: "Limitata",
      detail: "Il cliente ordina, ma non sempre ritorna",
    },
    pizzaos: {
      tone: "good",
      title: "Alta",
      detail: "Riordino rapido e campagne mirate",
    },
  },
  {
    icon: <GrowthIcon />,
    label: "Capacità di crescita",
    marketplace: {
      tone: "bad",
      title: "Dipendente da terzi",
      detail: "Cresci, ma non costruisci asset tuo",
    },
    simpleSite: {
      tone: "bad",
      title: "Parziale",
      detail: "Canale utile, ma non sistema completo",
    },
    pizzaos: {
      tone: "good",
      title: "Completa",
      detail: "Ordini, delivery, insight e marketing insieme",
    },
  },
] satisfies readonly ComparisonRow[];

const CUMULATIVE_ITEMS = [
  {
    icon: <ScooterIcon />,
    title: "Più consegne",
    detail: "nello stesso tempo",
  },
  {
    icon: <LeafIcon />,
    title: "Meno benzina",
    detail: "grazie ai percorsi ottimali",
  },
  {
    icon: <UsersIcon />,
    title: "Più clienti che tornano",
    detail: "grazie al marketing",
  },
  {
    icon: <ChartIcon />,
    title: "Dati e insight",
    detail: "che diventano azioni",
  },
] as const;

type CellTone = "bad" | "ok" | "good";

interface ComparisonCell {
  readonly tone: CellTone;
  readonly title: string;
  readonly detail: string;
}

interface ComparisonRow {
  readonly icon: ReactElement;
  readonly label: string;
  readonly marketplace: ComparisonCell;
  readonly simpleSite: ComparisonCell;
  readonly pizzaos: ComparisonCell;
}

export function MarginComparisonSection(): ReactElement {
  return (
    <section
      className={styles.section}
      id="prezzi"
      aria-labelledby="margin-title"
    >
      <div className={styles.inner}>
        <h2 className={styles.title} id="margin-title">
          Tre modi di gestire una pizzeria.
          <br />
          Uno solo <span>massimizza i guadagni.</span>
        </h2>

        <p className={styles.subtitle}>
          Marketplace, sito semplice o PizzaOS: cambia il canale, ma soprattutto
          cambia il profitto finale.
          <br />
          Il vantaggio di PizzaOS nasce dalla somma di ordini diretti,
          ottimizzazione operativa, dati e marketing.
        </p>

        <div className={styles.contentGrid}>
          <div
            className={styles.matrix}
            role="table"
            aria-label="Confronto tra marketplace, sito semplice e PizzaOS"
          >
            <div className={styles.columnHeaders} role="row">
              <div className={styles.blankHeader} aria-hidden="true" />
              {COMPARISON_COLUMNS.map((column) => (
                <div
                  className={
                    column.highlighted
                      ? styles.pizzaosHeader
                      : styles.columnHeader
                  }
                  key={column.key}
                  role="columnheader"
                >
                  {column.highlighted ? (
                    <Image
                      className={styles.headerLogo}
                      src="/images/logo.png"
                      alt="PizzaOS"
                      width={1663}
                      height={332}
                    />
                  ) : (
                    <>
                      <span className={styles.headerIcon}>{column.icon}</span>
                      <strong>{column.title}</strong>
                    </>
                  )}
                  <small>{column.subtitle}</small>
                </div>
              ))}
            </div>

            <div className={styles.rows}>
              {COMPARISON_ROWS.map((row) => (
                <div className={styles.row} role="row" key={row.label}>
                  <div className={styles.rowLabel} role="cell">
                    <span className={styles.featureIcon}>{row.icon}</span>
                    <strong>{row.label}</strong>
                  </div>

                  <ComparisonValue
                    cell={row.marketplace}
                    columnLabel="Marketplace"
                  />
                  <ComparisonValue
                    cell={row.simpleSite}
                    columnLabel="Sito semplice"
                  />
                  <ComparisonValue cell={row.pizzaos} columnLabel="PizzaOS" />
                </div>
              ))}
            </div>
          </div>

          <aside
            className={styles.cumulativeCard}
            aria-label="Effetto cumulativo PizzaOS"
          >
            <span className={styles.cardEyebrow}>Effetto cumulativo</span>
            <h3>
              Come cresce il margine con <span>PizzaOS</span>
            </h3>

            <div className={styles.cumulativeList}>
              {CUMULATIVE_ITEMS.map((item) => (
                <article className={styles.cumulativeItem} key={item.title}>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className={styles.profitBlock}>
              <h4>Più profitto finale</h4>
              <p>
                Non per una singola feature, ma per la somma di molte
                ottimizzazioni.
              </p>
            </div>

            <div className={styles.note}>
              <SparkleIcon />
              <p>
                <strong>I costi visibili li vedono tutti.</strong>
                Quelli invisibili sono quelli che riducono il margine.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ComparisonValue({
  cell,
  columnLabel,
}: {
  readonly cell: ComparisonCell;
  readonly columnLabel: string;
}): ReactElement {
  return (
    <div className={styles.valueCell} data-tone={cell.tone} role="cell">
      <span className={styles.mobileColumn}>{columnLabel}</span>
      <StatusIcon tone={cell.tone} />
      <div>
        <strong>{cell.title}</strong>
        <span>{cell.detail}</span>
      </div>
    </div>
  );
}

function StatusIcon({ tone }: { readonly tone: CellTone }): ReactElement {
  if (tone === "good") {
    return (
      <span className={styles.statusIcon} aria-label="Punto di forza">
        <CheckIcon />
      </span>
    );
  }

  if (tone === "ok") {
    return (
      <span className={styles.statusIcon} aria-label="Parziale">
        <MinusIcon />
      </span>
    );
  }

  return (
    <span className={styles.statusIcon} aria-label="Criticità">
      <XIcon />
    </span>
  );
}

function StoreIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10 5.4 4h13.2L20 10" />
      <path d="M5 10v9h14v-9" />
      <path d="M9 19v-5h6v5" />
      <path d="M4 10c1.2 1.1 2.5 1.1 4 0 1.3 1.1 2.7 1.1 4 0 1.3 1.1 2.7 1.1 4 0 1.5 1.1 2.8 1.1 4 0" />
    </svg>
  );
}

function ScreenIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="5" width="16" height="12" rx="1.5" />
      <path d="M9 21h6" />
      <path d="M12 17v4" />
      <path d="M8 9h5" />
      <path d="M8 12h3" />
    </svg>
  );
}

function MarginIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 16 5-5 4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

function ScooterIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="7" cy="17" r="2.2" />
      <circle cx="17" cy="17" r="2.2" />
      <path d="M9.2 17h4.1l2.7-5h-4.2l-1.4-3H7" />
      <path d="M16 8h3" />
      <path d="M5 14h3" />
    </svg>
  );
}

function EuroIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M17.5 6.5a6.2 6.2 0 1 0 0 11" />
      <path d="M5 10h9" />
      <path d="M5 14h8" />
    </svg>
  );
}

function UserIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
    </svg>
  );
}

function MegaphoneIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 13h4l9-5v12l-9-5H4v-2Z" />
      <path d="M8 15v4" />
      <path d="M20 10.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5" />
    </svg>
  );
}

function RepeatIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M17 2.8 21 7l-4 4.2" />
      <path d="M3 11V9a2 2 0 0 1 2-2h16" />
      <path d="M7 21.2 3 17l4-4.2" />
      <path d="M21 13v2a2 2 0 0 1-2 2H3" />
    </svg>
  );
}

function GrowthIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 19h16" />
      <path d="M6 16v-4" />
      <path d="M11 16V8" />
      <path d="M16 16V5" />
      <path d="m5 8 4-4 4 4 6-6" />
    </svg>
  );
}

function LeafIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 19C5.5 9 12 5 20 4c-1 8-5 14.5-15 15Z" />
      <path d="M5 19c3.6-4.4 7-7 12-9" />
    </svg>
  );
}

function UsersIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="9" cy="8.5" r="2.6" />
      <circle cx="16.5" cy="9.5" r="2.1" />
      <path d="M4 19c.7-3.4 2.4-5.1 5-5.1s4.3 1.7 5 5.1" />
      <path d="M14.5 15c2.3.2 3.8 1.5 4.5 4" />
    </svg>
  );
}

function ChartIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V10h3v10H5Z" />
      <path d="M11 20V5h3v15h-3Z" />
      <path d="M17 20v-8h3v8h-3Z" />
    </svg>
  );
}

function SparkleIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m6.4 6.4 2.8 2.8" />
      <path d="m14.8 14.8 2.8 2.8" />
      <path d="m17.6 6.4-2.8 2.8" />
      <path d="m9.2 14.8-2.8 2.8" />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m5.5 12.5 4 4 9-9" />
    </svg>
  );
}

function XIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </svg>
  );
}

function MinusIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 12h12" />
    </svg>
  );
}
