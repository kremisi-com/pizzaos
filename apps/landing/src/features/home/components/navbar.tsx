"use client";

import Image from "next/image";
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
          <Image
            className={styles.logoImage}
            src="/images/logo.png"
            alt="PizzaOS"
            width={1663}
            height={332}
            priority
          />
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
