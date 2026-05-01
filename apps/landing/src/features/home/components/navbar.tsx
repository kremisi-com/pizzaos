"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./navbar.module.css";

const CLIENT_DEMO_URL = "/client" as const;

const NAV_LINKS = [
  { label: "Funzionalità", href: "#funzionalita" },
  { label: "Perché PizzaOS", href: "#perche-pizzaos" },
  { label: "Prezzi", href: "#prezzi" },
  { label: "Risorse", href: "#risorse" },
  { label: "Chi siamo", href: "#chi-siamo" }
] as const;

interface NavbarProps
{
  readonly onRequestDemo?: () => void;
}

export function Navbar({ onRequestDemo }: NavbarProps): ReactElement
{
  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo} aria-label="PizzaOS – torna alla home">
          <div className={styles.logoMark} aria-hidden="true">
            <span className={styles.logoMarkIcon}>🍕</span>
          </div>
          <span className={styles.logoName}>
            <span className={styles.logoNamePizza}>Pizza</span>
            <span className={styles.logoNameOs}>OS</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav aria-label="Navigazione principale">
          <ul className={styles.navLinks} role="list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={styles.navLink}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* CTA group */}
        <div className={styles.actions}>
          <Link
            href={CLIENT_DEMO_URL}
            className={styles.loginLink}
            id="navbar-login-link"
          >
            Accedi
          </Link>
          <button
            type="button"
            className={styles.ctaBtn}
            id="navbar-cta-btn"
            onClick={onRequestDemo}
          >
            Richiedi una demo
          </button>
        </div>
      </div>
    </header>
  );
}
