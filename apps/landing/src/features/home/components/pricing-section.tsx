import type { ReactElement } from "react";
import styles from "./pricing-section.module.css";

interface Plan
{
  readonly name: "Start" | "Grow" | "Scale" | "Enterprise";
  readonly target: string;
  readonly price: string;
  readonly suffix?: string;
  readonly features: readonly string[];
  readonly cta: string;
  readonly highlighted?: boolean;
}

const PLANS: readonly Plan[] = [
  {
    name: "Start",
    target: "Perfetto per iniziare",
    price: "49 €",
    suffix: "/ mese",
    features: [
      "Ordini illimitati",
      "App e sito personalizzati",
      "Pagamenti online",
      "Dashboard ordini",
      "Supporto via email"
    ],
    cta: "Scegli Start",
    highlighted: false
  },
  {
    name: "Grow",
    target: "Ideale per le pizzerie in crescita",
    price: "99 €",
    suffix: "/ mese",
    features: [
      "Marketing automatico",
      "Programmi fedeltà e coupon",
      "Statistiche e analytics avanzate",
      "Integrazione Deliveroo",
      "Supporto prioritario"
    ],
    cta: "Scegli Grow",
    highlighted: true
  },
  {
    name: "Scale",
    target: "Per pizzerie e catene",
    price: "199 €",
    suffix: "/ mese",
    features: [
      "Gestione multi-sede",
      "Inventario e costi avanzati",
      "Pricing dinamico",
      "API e integrazioni avanzate",
      "Account manager dedicato"
    ],
    cta: "Scegli Scale",
    highlighted: false
  },
  {
    name: "Enterprise",
    target: "Soluzioni su misura",
    price: "Su misura",
    suffix: "",
    features: [
      "Sviluppo personalizzato",
      "Integrazioni su misura",
      "SLA dedicati",
      "Formazione e onboarding",
      "Supporto dedicato 24/7"
    ],
    cta: "Contattaci",
    highlighted: false
  }
] as const;

const COMPARISON_ROWS = [
  ["Zero commissioni sugli ordini", true, true, true, true],
  ["Ordini illimitati", true, true, true, true],
  ["App e sito personalizzati", true, true, true, true],
  ["Pagamenti online", true, true, true, true],
  ["Marketing e loyalty", false, true, true, true],
  ["Analytics avanzate", false, true, true, true],
  ["Gestione multi-sede", false, false, true, true],
  ["Supporto prioritario", false, true, true, true]
] as const;

const TRUST_ITEMS = [
  {
    icon: <EuroIcon />,
    title: "Nessuna commissione",
    copy: "Tieni il 100% dei tuoi guadagni."
  },
  {
    icon: <FileIcon />,
    title: "Cancella quando vuoi",
    copy: "Nessun vincolo, nessuna penale."
  },
  {
    icon: <ShieldIcon />,
    title: "Aggiornamenti inclusi",
    copy: "Nuove funzionalità sempre comprese."
  },
  {
    icon: <LockIcon />,
    title: "Sicurezza e privacy",
    copy: "Dati protetti e conformi GDPR."
  }
] as const;

interface PricingSectionProps
{
  readonly onRequestDemo: () => void;
}

export function PricingSection({ onRequestDemo }: PricingSectionProps): ReactElement
{
  return (
    <section className={styles.section} id="piani" aria-labelledby="pricing-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <RocketIcon />
          PREZZI SEMPLICI
        </div>

        <h2 className={styles.title} id="pricing-title">
          Scegli il piano.<br />
          Cresci <span>senza commissioni.</span>
        </h2>

        <p className={styles.subtitle}>
          Zero commissioni sugli ordini, solo un canone mensile in base al piano scelto.<br />
          Tutte le funzionalità incluse, nessuna sorpresa.
        </p>

        <div className={styles.planGrid} aria-label="Piani PizzaOS">
          {PLANS.map((plan) =>
          {
            const isHighlighted = "highlighted" in plan && plan.highlighted;
            const suffix = "suffix" in plan ? plan.suffix : undefined;

            return (
              <article
                className={`${styles.planCard} ${isHighlighted ? styles.highlighted : ""}`}
                key={plan.name}
              >
                {isHighlighted ? <span className={styles.ribbon}>PIÙ SCELTO</span> : null}
                <h3>{plan.name}</h3>
                <p>{plan.target}</p>

                <div className={styles.price}>
                  <strong>{plan.price}</strong>
                  {suffix ? <span>{suffix}</span> : null}
                </div>

                <div className={styles.divider} />

                <span className={styles.includes}>
                  {plan.name === "Start" ? "Incluso:" : `Tutto di ${previousPlanName(plan.name)}, più:`}
                </span>

                <ul className={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  className={`${styles.planCta} ${isHighlighted ? styles.primaryCta : ""}`}
                  type="button"
                  onClick={onRequestDemo}
                >
                  {plan.cta}
                </button>
              </article>
            );
          })}
        </div>

        <div className={styles.lowerGrid}>
          <div className={styles.comparisonCard}>
            <h3>Confronto piani</h3>

            <div className={styles.table} role="table" aria-label="Confronto funzionalità per piano">
              <div className={styles.headerRow} role="row">
                <div role="columnheader" />
                <div role="columnheader">
                  <strong>START</strong>
                  <span>49 € / mese</span>
                </div>
                <div role="columnheader">
                  <strong>GROW</strong>
                  <span>99 € / mese</span>
                </div>
                <div role="columnheader">
                  <strong>SCALE</strong>
                  <span>199 € / mese</span>
                </div>
                <div role="columnheader">
                  <strong>ENTERPRISE</strong>
                  <span>Su misura</span>
                </div>
              </div>

              {COMPARISON_ROWS.map(([label, start, grow, scale, enterprise]) => (
                <div className={styles.featureRow} role="row" key={label}>
                  <div className={styles.rowLabel} role="cell">
                    <span className={styles.rowIcon}>
                      <SmallFeatureIcon />
                    </span>
                    {label}
                  </div>
                  {[start, grow, scale, enterprise].map((isIncluded, index) => (
                    <div className={styles.availability} role="cell" key={`${label}-${index}`}>
                      {isIncluded ? <CheckIcon /> : <MinusIcon />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <aside className={styles.trustCard} aria-label="Trasparenza prezzi PizzaOS">
            <div className={styles.trustHeading}>
              <span>
                <EuroIcon />
              </span>
              <h3>Trasparenza totale</h3>
            </div>

            <div className={styles.trustList}>
              {TRUST_ITEMS.map((item) => (
                <div className={styles.trustItem} key={item.title}>
                  <span>{item.icon}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.copy}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.savingNote}>
              <span>
                <PercentIcon />
              </span>
              <div>
                <strong>Risparmi fino al 30%</strong>
                <p>rispetto alle commissioni dei marketplace.</p>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.trialBanner} id="richiedi-demo">
          <span className={styles.giftIcon}>
            <GiftIcon />
          </span>
          <div>
            <strong>Prova gratuita di 14 giorni, senza impegno.</strong>
            <p>Attiva il tuo piano e inizia a ricevere ordini in pochi minuti.</p>
          </div>
          <button className={styles.trialCta} type="button" onClick={onRequestDemo}>
            Inizia la prova gratuita
            <ArrowIcon />
          </button>
        </div>
      </div>
    </section>
  );
}

function previousPlanName(planName: string): string
{
  if (planName === "Grow")
  {
    return "Start";
  }

  if (planName === "Scale")
  {
    return "Grow";
  }

  return "Scale";
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

function CheckIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="m8.7 12.2 2.2 2.1 4.6-5" />
    </svg>
  );
}

function MinusIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" className="not-included" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M9 12h6" />
    </svg>
  );
}

function EuroIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M14.8 8.8a4.2 4.2 0 1 0 0 6.4" />
      <path d="M8.8 10.7h5.4" />
      <path d="M8.8 13.3h5.4" />
    </svg>
  );
}

function FileIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 3.8h5.8L18 8v12.2H8z" />
      <path d="M13.5 4v4.4H18" />
      <path d="m9.8 13 1.8 1.8 3.2-3.6" />
    </svg>
  );
}

function ShieldIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.6 18.3 6v5.2c0 4.1-2.2 7.2-6.3 9.2-4.1-2-6.3-5.1-6.3-9.2V6z" />
      <path d="m9.1 12.1 2 2 4-4.4" />
    </svg>
  );
}

function LockIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7.5 10.2h9v8.5h-9z" />
      <path d="M9.3 10.2V8a2.7 2.7 0 0 1 5.4 0v2.2" />
      <path d="M12 14v1.5" />
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

function GiftIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.5 9h15v11h-15z" />
      <path d="M3.5 6.2h17V9h-17z" />
      <path d="M12 6.2V20" />
      <path d="M8.6 6.2C6.4 6.2 6 4 7.4 3.4c1.6-.7 3.1 1.4 4.6 2.8" />
      <path d="M15.4 6.2c2.2 0 2.6-2.2 1.2-2.8-1.6-.7-3.1 1.4-4.6 2.8" />
    </svg>
  );
}

function ArrowIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function SmallFeatureIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="3" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
