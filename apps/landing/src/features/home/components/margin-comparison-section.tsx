import type { ReactElement } from "react";
import styles from "./margin-comparison-section.module.css";

const COMPARISON_ROWS = [
  {
    icon: <PercentIcon />,
    label: "Commissioni sugli ordini",
    detail: "Paghi ad ogni ordine ricevuto",
    marketplace: {
      value: "15% - 30%",
      detail: "su ogni ordine"
    },
    pizzaos: {
      value: "0%",
      detail: "Zero commissioni sugli ordini"
    }
  },
  {
    icon: <UserIcon />,
    label: "Il cliente è tuo",
    detail: "Hai accesso ai dati e allo storico",
    marketplace: {
      value: "No",
      detail: "Il cliente è del marketplace"
    },
    pizzaos: {
      value: "Sì",
      detail: "Tutti i clienti e i dati sono tuoi"
    }
  },
  {
    icon: <TagIcon />,
    label: "Il tuo brand",
    detail: "Esperienza personalizzata",
    marketplace: {
      value: "Limitato",
      detail: "Il brand del marketplace in primo piano"
    },
    pizzaos: {
      value: "100% tuo",
      detail: "Il tuo brand, la tua esperienza"
    }
  },
  {
    icon: <ChartIcon />,
    label: "Dati e analytics",
    detail: "Report avanzati e insights",
    marketplace: {
      value: "Limitati",
      detail: "Dati parziali e non esportabili"
    },
    pizzaos: {
      value: "Completi",
      detail: "Dati completi e insights avanzati"
    }
  },
  {
    icon: <MegaphoneIcon />,
    label: "Marketing e fidelizzazione",
    detail: "Strumenti integrati per crescere",
    marketplace: {
      value: "Limitati",
      detail: "Strumenti di marketing assenti"
    },
    pizzaos: {
      value: "Avanzati",
      detail: "Automazioni, coupon, loyalty e altro"
    }
  },
  {
    icon: <HeadsetIcon />,
    label: "Supporto dedicato",
    detail: "Sempre al tuo fianco",
    marketplace: {
      value: "Da chat o ticket",
      detail: "Tempi di risposta variabili"
    },
    pizzaos: {
      value: "Dedicato",
      detail: "Supporto rapido e specializzato"
    }
  }
] as const;

interface MarginComparisonSectionProps
{
  readonly onRequestDemo: () => void;
}

export function MarginComparisonSection({ onRequestDemo }: MarginComparisonSectionProps): ReactElement
{
  return (
    <section className={styles.section} id="prezzi" aria-labelledby="margin-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <RocketIcon />
          MENO COSTI, PIÙ MARGINE
        </div>

        <h2 className={styles.title} id="margin-title">
          Più ordini diretti.<br />
          Più <span>margine</span> per te.
        </h2>

        <p className={styles.subtitle}>
          Con PizzaOS dimentichi le commissioni ad ogni ordine.<br />
          Un unico canone mensile, zero sorprese, tutti i clienti sono tuoi.
        </p>

        <div className={styles.comparisonArea}>
          <div className={styles.matrix} role="table" aria-label="Confronto tra marketplace e PizzaOS">
            <div className={styles.columnHeaders} role="row">
              <div className={styles.blankHeader} />
              <div className={styles.marketplaceHeader} role="columnheader">
                <strong>Marketplace</strong>
                <span>Commissioni ad ogni ordine</span>
              </div>
              <div className={styles.vsBadge}>VS</div>
              <div className={styles.pizzaosHeader} role="columnheader">
                <PizzaOsLogo />
                <span>Un&apos;unica piattaforma, zero commissioni</span>
              </div>
            </div>

            <div className={styles.rows}>
              {COMPARISON_ROWS.map((row) => (
                <div className={styles.row} role="row" key={row.label}>
                  <div className={styles.rowLabel} role="cell">
                    <span className={styles.featureIcon}>{row.icon}</span>
                    <div>
                      <strong>{row.label}</strong>
                      <span>{row.detail}</span>
                    </div>
                  </div>

                  <div className={styles.marketplaceCell} role="cell">
                    <XIcon />
                    <div>
                      <strong>{row.marketplace.value}</strong>
                      <span>{row.marketplace.detail}</span>
                    </div>
                  </div>

                  <div className={styles.pizzaosCell} role="cell">
                    <CheckIcon />
                    <div>
                      <strong>{row.pizzaos.value}</strong>
                      <span>{row.pizzaos.detail}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className={styles.savingsCard} aria-label="Esempio concreto di risparmio">
            <h3>Esempio concreto</h3>
            <p className={styles.orderCount}>500 ordini al mese <span aria-hidden="true">🍕</span></p>

            <div className={styles.savingsBlock}>
              <span>Con marketplace</span>
              <strong className={styles.loss}>-750 € <small>/ mese</small></strong>
              <p>di commissioni</p>
            </div>

            <div className={styles.savingsBlock}>
              <span>Con PizzaOS</span>
              <strong className={styles.gain}>+750 € <small>/ mese</small></strong>
              <p>nel tuo margine</p>
            </div>

            <div className={styles.yearlyGain}>
              <strong>9.000 € in più</strong>
              <span>ogni anno nel tuo business <span aria-hidden="true">🎉</span></span>
            </div>
          </aside>
        </div>

        <div className={styles.bottomCta}>
          <span className={styles.bottomIcon}>
            <GrowthIcon />
          </span>
          <div className={styles.bottomCopy}>
            <strong>Più ordini diretti, più clienti fedeli, più crescita.</strong>
            <span>
              PizzaOS ti dà tutto ciò che serve per far crescere la tua pizzeria
              senza dipendere da nessuno.
            </span>
          </div>
          <div className={styles.ctaStack}>
            <button className={styles.cta} type="button" onClick={onRequestDemo}>
              Scopri quanto puoi risparmiare
              <ArrowIcon />
            </button>
            <span className={styles.ctaNote}>
              <CheckIcon />
              Calcolo gratuito in 2 minuti
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PizzaOsLogo(): ReactElement
{
  return (
    <div className={styles.logo} aria-label="PizzaOS">
      <span className={styles.logoMark}>
        <SliceIcon />
      </span>
      <span>Pizza<span>OS</span></span>
    </div>
  );
}

function RocketIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 4c2.4-.7 4.4-.7 5.8.2.8 1.5.8 3.4.1 5.9l-5 5-4.9-4.9 4-6.2Z" />
      <path d="m8.8 10.6-3.1.5-2 4 4-.8" />
      <path d="m13.4 15.2-.6 3.1-4 2 .8-4" />
      <path d="M16.8 7.2h.1" />
    </svg>
  );
}

function SliceIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.5 4.2 20.5 9 9 21.2 4.5 4.2Z" />
      <path d="M7.5 8.2c4.8.1 8.2 1.1 10.9 3.3" />
      <circle cx="10.2" cy="11.8" r="1.2" />
      <circle cx="13.2" cy="15.6" r="1.2" />
    </svg>
  );
}

function PercentIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="8" cy="8" r="2.2" />
      <circle cx="16" cy="16" r="2.2" />
      <path d="m17.5 6.5-11 11" />
    </svg>
  );
}

function UserIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
    </svg>
  );
}

function TagIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 12 8-8 7.5 7.5-8 8L4 12Z" />
      <circle cx="12.2" cy="9.2" r="1.3" />
    </svg>
  );
}

function ChartIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V10h3v10H5Z" />
      <path d="M11 20V5h3v15h-3Z" />
      <path d="M17 20v-8h3v8h-3Z" />
    </svg>
  );
}

function MegaphoneIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 13h4l9-5v12l-9-5H4v-2Z" />
      <path d="M8 15v4" />
      <path d="M20 10.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5" />
    </svg>
  );
}

function HeadsetIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v4h3v-5H4Z" />
      <path d="M20 13v4h-3v-5h3Z" />
      <path d="M17 19c-1.1 1.1-2.7 1.6-5 1.6" />
    </svg>
  );
}

function CheckIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7.2" />
      <path d="m6.8 10 2.1 2.1 4.4-4.5" />
    </svg>
  );
}

function XIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7.2" />
      <path d="m7.5 7.5 5 5M12.5 7.5l-5 5" />
    </svg>
  );
}

function GrowthIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V10h3v10H5Z" />
      <path d="M11 20V5h3v15h-3Z" />
      <path d="M17 20v-8h3v8h-3Z" />
    </svg>
  );
}

function ArrowIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11" />
      <path d="m11 5 5 5-5 5" />
    </svg>
  );
}
