import type { ReactElement } from "react";
import styles from "./differentiation-section.module.css";

const COMPARISON_ROWS = [
  { feature: "Zero commissioni su ogni ordine", others: false, pizzaos: true },
  { feature: "Proprietà totale dei dati clienti", others: false, pizzaos: true },
  { feature: "Marketing automation incluso", others: false, pizzaos: true },
  { feature: "Analytics AI avanzate", others: false, pizzaos: true },
  { feature: "Programma fedeltà nativo", others: false, pizzaos: true },
  { feature: "Gestione operativa integrata", others: false, pizzaos: true },
  { feature: "Menù con disponibilità in tempo reale", others: "parziale", pizzaos: true },
  { feature: "Ordine collaborativo di gruppo", others: false, pizzaos: true }
] as const;

type ComparisonValue = boolean | "parziale";

function CheckCell({ value }: { readonly value: ComparisonValue }): ReactElement
{
  if (value === "parziale")
  {
    return <td className={styles.check}><span title="Parzialmente disponibile">〜</span></td>;
  }

  return (
    <td className={styles.check}>
      <span className={value ? styles.yes : styles.no}>
        {value ? "✓" : "✗"}
      </span>
    </td>
  );
}

export function DifferentiationSection(): ReactElement
{
  return (
    <section
      id="differenziazione"
      className={styles.section}
      aria-label="PizzaOS vs soluzioni tradizionali"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Perché PizzaOS</span>
          <h2 className={styles.title}>
            Non è solo un altro software.<br />È un vantaggio competitivo.
          </h2>
          <p className={styles.description}>
            Ogni ordine che passa da una piattaforma esterna ti costa. PizzaOS ti rimette
            al centro del rapporto con il cliente, senza intermediari.
          </p>
        </div>

        <table className={styles.table} aria-label="Confronto funzionalità">
          <thead>
            <tr className={styles.tableHead}>
              <th scope="col">Funzionalità</th>
              <th scope="col">Soluzioni tradizionali</th>
              <th scope="col">
                <div className={styles.colHeaderPizzaos}>
                  PizzaOS
                  <span className={styles.colHeaderBadge}>Nostro</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.feature} className={styles.tableRow}>
                <td className={styles.featureLabel}>{row.feature}</td>
                <CheckCell value={row.others} />
                <CheckCell value={row.pizzaos} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
