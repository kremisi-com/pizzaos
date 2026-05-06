import Image from "next/image";
import Link from "next/link";
import type { ReactElement } from "react";
import type { DemoRequestIntent } from "../demo-request-mail";
import { IUBENDA_EMBED_CLASS, POLICY_LINKS } from "../policy-links";
import styles from "./footer.module.css";

const NAV_COLUMNS = [
  {
    title: "Prodotto",
    links: [
      { label: "Soluzione completa", href: "#soluzione-completa" },
      { label: "Gestione ordini", href: "#gestione-ordini" },
      { label: "Analytics & AI", href: "#dati-crescita" },
      { label: "Gestione catene", href: "#gestione-catene" },
      { label: "Ecosistema", href: "#ecosistema" },
    ],
  },
  {
    title: "Differenziali",
    links: [
      { label: "Meno costi, più margine", href: "#prezzi" },
      { label: "Piani semplici", href: "#piani" },
      { label: "Prova gratuita", href: "#richiedi-demo" },
      { label: "Domande frequenti", href: "#faq" },
    ],
  },
] as const;

const DEMO_LINKS = ["App cliente", "Dashboard admin"] as const;

interface FooterProps {
  readonly onRequestDemo: (intent?: DemoRequestIntent) => void;
  readonly showChainManagementLink?: boolean;
}

export function Footer({
  onRequestDemo,
  showChainManagementLink = true,
}: FooterProps): ReactElement {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.inner}>
        <div className={styles.top}>
          {/* Brand column */}
          <div className={styles.brand}>
            <Link href="/" className={styles.logo} aria-label="PizzaOS home">
              <Image
                className={styles.logoImage}
                src="/images/logo-light.png"
                alt="PizzaOS"
                width={1663}
                height={332}
              />
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
              {col.links
                .filter(
                  (link) =>
                    showChainManagementLink ||
                    link.href !== "#gestione-catene",
                )
                .map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className={styles.colLink}
                  >
                    {link.label}
                  </a>
                ))}
            </div>
          ))}

          <div className={styles.col}>
            <span className={styles.colTitle}>Demo</span>
            {DEMO_LINKS.map((label) => (
              <button
                key={label}
                className={styles.colLink}
                type="button"
                onClick={() => onRequestDemo()}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {year}{" "}
            <a
              href="https://kremisi.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Kremisi
            </a>
            . Tutti i diritti riservati.
          </span>
          <div className={styles.legalLinks} aria-label="Link legali">
            {Object.values(POLICY_LINKS).map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`${styles.legalLink} ${IUBENDA_EMBED_CLASS}`}
                title={link.title}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
