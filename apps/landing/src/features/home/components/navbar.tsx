"use client";

import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./navbar.module.css";

const CLIENT_DEMO_URL = "/client" as const;
const ADMIN_DEMO_URL = "/admin" as const;

export function Navbar(): ReactElement
{
  return (
    <header className={styles.navbar} role="banner">
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo} aria-label="PizzaOS – torna alla home">
          <div className={styles.logoMark} aria-hidden="true">
            <span className={styles.logoMarkText}>P</span>
          </div>
          <span className={styles.logoName}>PizzaOS</span>
        </Link>

        {/* Desktop nav links */}
        <nav aria-label="Navigazione principale">
          <ul className={styles.navLinks} role="list">
            <li>
              <a href="#ordinazione" className={styles.navLink}>Ordinazione</a>
            </li>
            <li>
              <a href="#marketing" className={styles.navLink}>Marketing</a>
            </li>
            <li>
              <a href="#analytics" className={styles.navLink}>Analytics</a>
            </li>
            <li>
              <a href="#operazioni" className={styles.navLink}>Operazioni</a>
            </li>
          </ul>
        </nav>

        {/* CTA group */}
        <div className={styles.actions}>
          <Link
            href={ADMIN_DEMO_URL}
            className={styles.demoLink}
            id="navbar-admin-demo-link"
          >
            Demo Admin
          </Link>
          <Link
            href={CLIENT_DEMO_URL}
            className={styles.ctaBtn}
            id="navbar-cta-btn"
          >
            Prova il menu →
          </Link>
        </div>
      </div>
    </header>
  );
}
