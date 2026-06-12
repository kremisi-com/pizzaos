"use client";

import Image from "next/image";
import type { ReactElement } from "react";
import styles from "./hero-section.module.css";

interface HeroSectionProps {
  readonly onRequestDemo: () => void;
}

export function HeroSection({ onRequestDemo }: HeroSectionProps): ReactElement {
  return (
    <section className={styles.hero} aria-label="Hero PizzaOS">
      <div className={styles.inner}>
        {/* Left column — copy */}
        <div className={styles.copy}>
          {/* Headline */}
          <h1 className={styles.headline}>
            Smetti di rincorrere
            <br />
            gli ordini.
            <br />
            <span className={styles.headlineAccent}>
              Inizia a controllarli.
            </span>
          </h1>

          {/* Subline */}
          <p className={styles.subline}>
            PizzaOS organizza ordini, consegne e clienti in modo semplice e
            tutto in un unico sistema.
            <br />
            Pensato per il ritmo reale di una pizzeria. Così puoi concentrarti
            su quello che conta davvero.
          </p>

          <div className={styles.featureStrip}>
            <div className={styles.featureStripInner}>
              {/* Feature 1: Online Orders */}
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div>
                  <p className={styles.featureTitle}>Ordini online</p>
                  <p className={styles.featureSub}>rapidi e intuitivi</p>
                </div>
              </div>

              {/* Feature 2: Payments */}
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" ry="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <div>
                  <p className={styles.featureTitle}>Pagamenti</p>
                  <p className={styles.featureSub}>sicuri</p>
                </div>
              </div>

              {/* Feature 3: Deliveries */}
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div>
                  <p className={styles.featureTitle}>Consegne</p>
                  <p className={styles.featureSub}>tracciate in tempo reale</p>
                </div>
              </div>

              {/* Feature 4: Loyalty */}
              <div className={styles.featureItem}>
                <div className={styles.featureIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div>
                  <p className={styles.featureTitle}>Clienti fidelizzati</p>
                  <p className={styles.featureSub}>e marketing automatico</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA row — following the exact design of the reference */}
          <div className={styles.ctaRow}>
            <button
              type="button"
              onClick={onRequestDemo}
              className={styles.primaryCta}
              id="hero-primary-cta"
            >
              <span>Prova la Demo!</span>
              <svg
                className={styles.ctaArrowIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right column — visual mockups (real images) */}
        <div className={styles.visual} aria-hidden="true">
          {/* Admin dashboard image (behind) */}
          <div className={styles.dashboardImage}>
            <Image
              src="/images/hero/admin-dashboard.png"
              alt=""
              fill
              sizes="(max-width: 900px) 400px, 800px"
              style={{ objectFit: "contain", objectPosition: "top right" }}
              priority
            />
          </div>

          {/* Phone mockup image (front) */}
          <div className={styles.phoneImage}>
            <Image
              src="/images/hero/phone-mockup.png"
              alt=""
              fill
              sizes="(max-width: 900px) 250px, 400px"
              style={{ objectFit: "contain", objectPosition: "center" }}
              priority
            />
          </div>

          {/* Delivery card image (floating) */}
          <div className={styles.deliveryImage}>
            <Image
              src="/images/hero/delivery-card.png"
              alt=""
              fill
              sizes="(max-width: 900px) 200px, 300px"
              style={{ objectFit: "contain", objectPosition: "center" }}
              priority
            />
          </div>

          {/* Brand circle motif */}
          <div className={styles.circleDecoration} aria-hidden="true">
            <span className={styles.brandRing} />
            <span className={styles.brandDot} />
            <span className={styles.brandOrbit} />
          </div>
        </div>
      </div>

      {/* Bottom feature strip */}
    </section>
  );
}
