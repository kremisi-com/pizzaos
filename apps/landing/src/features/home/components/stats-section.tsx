import type { ReactElement } from "react";
import styles from "./stats-section.module.css";

const STATS = [
  { value: "+38", unit: "%", label: "Aumento medio del fatturato nel primo anno" },
  { value: "0", unit: "€", label: "Commissioni su ogni ordine ricevuto" },
  { value: "24", unit: "h", label: "Setup completo, dal primo accesso al menù live" },
  { value: "4.9", unit: "★", label: "Valutazione media dalle pizzerie attive" }
] as const;

export function StatsSection(): ReactElement
{
  return (
    <section className={styles.section} aria-label="Numeri chiave PizzaOS">
      <div className={styles.inner}>
        <div className={styles.grid} role="list">
          {STATS.map((stat) => (
            <div key={stat.label} className={styles.stat} role="listitem">
              <div className={styles.statValue}>
                {stat.value}
                <span className={styles.statValueAccent}>{stat.unit}</span>
              </div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
