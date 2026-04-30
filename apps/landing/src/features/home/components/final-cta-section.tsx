import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./final-cta-section.module.css";

const CLIENT_DEMO_URL = "/client" as const;

interface FinalCtaSectionProps
{
  readonly onRequestDemo: () => void;
}

export function FinalCtaSection({ onRequestDemo }: FinalCtaSectionProps): ReactElement
{
  return (
    <section className={styles.section} aria-label="Inizia con PizzaOS">
      <div className={styles.inner}>
        <span className={styles.eyebrow}>Pronto a iniziare?</span>
        <h2 className={styles.title}>
          La tua pizzeria merita un{" "}
          <span className={styles.titleAccent}>software all&apos;altezza.</span>
        </h2>
        <p className={styles.description}>
          Unisciti alle pizzerie che hanno scelto di crescere con PizzaOS.
          Zero commissioni, setup in 24 ore, supporto sempre attivo.
        </p>
        <div className={styles.ctaRow}>
          <Link
            href={CLIENT_DEMO_URL}
            className={styles.primaryCta}
            id="footer-cta-client"
          >
            Prova il menù digitale →
          </Link>
          <button
            type="button"
            onClick={onRequestDemo}
            className={styles.secondaryCta}
            id="footer-cta-demo"
          >
            Parla con il team
          </button>
        </div>
      </div>
    </section>
  );
}
