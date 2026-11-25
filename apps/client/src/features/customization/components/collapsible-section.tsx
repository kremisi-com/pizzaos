import { useId, type ReactNode } from "react";
import styles from "./product-detail-screen.module.css";

const money = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function CollapsibleSection({ icon, title, currentValue, advice, delta, isOpen, onToggle, children }: {
  icon: string; title: string; currentValue: string; delta: number;
  advice?: string;
  isOpen: boolean; onToggle: () => void; children: ReactNode;
}) {
  const contentId = useId();
  return <div className={`${styles.sectionCard} ${isOpen ? styles.sectionCardOpen : ""}`}>
    <button type="button" className={styles.sectionHeader} onClick={onToggle}
      aria-expanded={isOpen} aria-controls={contentId}>
      <div className={styles.sectionHeaderLeft}>
        <span className={styles.sectionIcon} aria-hidden="true">{icon}</span>
        <div className={styles.sectionTitleGroup}>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p className={styles.sectionCurrentValue}>{currentValue}</p>
          {advice && <p className={styles.sectionAdvice}>{advice}</p>}
        </div>
      </div>
      <div className={styles.sectionHeaderRight}>
        {delta !== 0 && <span className={styles.sectionDelta}>{delta > 0 ? "+" : "−"}{money.format(Math.abs(delta) / 100)}</span>}
        <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} aria-hidden="true">▾</span>
      </div>
    </button>
    <div id={contentId} className={`${styles.sectionBody} ${isOpen ? styles.sectionBodyOpen : ""}`} inert={!isOpen}>
      <div className={styles.sectionContent}>{children}</div>
    </div>
  </div>;
}
