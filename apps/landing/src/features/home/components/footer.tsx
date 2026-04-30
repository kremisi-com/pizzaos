import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./footer.module.css";

const NAV_COLUMNS = [
  {
    title: "Prodotto",
    links: [
      { label: "Ordinazione digitale", href: "#ordinazione" },
      { label: "Marketing automation", href: "#marketing" },
      { label: "Analytics & AI", href: "#analytics" },
      { label: "Delivery & ops", href: "#operazioni" },
      { label: "Ecosistema", href: "#ecosistema" }
    ]
  },
  {
    title: "Demo",
    links: [
      { label: "App cliente", href: "/client" },
      { label: "Dashboard admin", href: "/admin" }
    ]
  },
  {
    title: "Differenziali",
    links: [
      { label: "Zero commissioni", href: "#differenziazione" },
      { label: "Dati tuoi", href: "#differenziazione" },
      { label: "Setup 24h", href: "#differenziazione" }
    ]
  }
] as const;

interface FooterProps
{
  readonly onResetDemo: () => void;
}

export function Footer({ onResetDemo }: FooterProps): ReactElement
{
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.top}>

          {/* Brand column */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logo} aria-label="PizzaOS home">
              <div className={styles.logoMark} aria-hidden="true">
                <span className={styles.logoMarkText}>P</span>
              </div>
              <span className={styles.logoName}>PizzaOS</span>
            </Link>
            <p className={styles.tagline}>
              Il software più elegante per pizzerie serie. Ordini, marketing,
              analytics e operazioni — in un unico sistema.
            </p>
          </div>

          {/* Link columns */}
          {NAV_COLUMNS.map((col) => (
            <div key={col.title} className={styles.col}>
              <span className={styles.colTitle}>{col.title}</span>
              {col.links.map((link) => (
                <a key={link.label} href={link.href} className={styles.colLink}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}

        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {year} PizzaOS — Proof of Concept. Tutti i diritti riservati.
          </span>
          <button
            type="button"
            onClick={onResetDemo}
            className={styles.resetLink}
            id="footer-reset-demo"
            aria-label="Reimposta stato demo"
          >
            Reset demo
          </button>
        </div>
      </div>
    </footer>
  );
}
