"use client";

import Link from "next/link";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "./challenges-section.module.css";

const CLIENT_DEMO_URL = "/client" as const;

const missedCalls = ["12:45", "12:47", "12:49"] as const;
const unavailablePizzas = ["Pizza Crudo", "Pizza Tartufo", "Pizza Burrata"] as const;
const chartBars = [40, 62, 34, 84, 52, 72, 96] as const;

interface ChallengeCardProps {
  readonly icon: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

function ChallengeCard({ icon, title, description, children }: ChallengeCardProps): ReactElement {
  return (
    <div className={styles.card}>
      <div className={styles.closeButton}><CloseIcon /></div>
      <div className={styles.cardHeader}>
        <div className={styles.iconBox}>{icon}</div>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardDescription}>{description}</p>
      </div>
      <div className={styles.cardVisual}>
        {children}
      </div>
    </div>
  );
}

function PhoneIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M22 16.92v2.48a2.2 2.2 0 0 1-2.39 2.2 19.2 19.2 0 0 1-8.37-2.98 18.9 18.9 0 0 1-5.82-5.82 19.2 19.2 0 0 1-2.98-8.42A2.2 2.2 0 0 1 4.62 2h2.5a2.2 2.2 0 0 1 2.18 1.9c.14 1.05.38 2.08.72 3.06a2.2 2.2 0 0 1-.5 2.27l-1.06 1.06a17.55 17.55 0 0 0 5.25 5.25l1.06-1.06a2.2 2.2 0 0 1 2.27-.5c.98.34 2.01.58 3.06.72A2.2 2.2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function GrowthIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 17 6-6 4 4 6-8" />
      <path d="M14 7h6v6" />
    </svg>
  );
}

function UserIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function DeliveryIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 17h6l1.5-7H8.8L8 6H4" />
      <path d="M13 17h2.5l2-5H21v5h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}

function MenuIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

function ChartIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V10" />
      <path d="M12 20V4" />
      <path d="M19 20v-7" />
    </svg>
  );
}

function CloseIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d="m4.5 4.5 7 7" />
      <path d="m11.5 4.5-7 7" />
    </svg>
  );
}

export function ChallengesSection(): ReactElement {
  return (
    <section className={styles.section} id="challenges">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowIcon}>⚡</span>
          LE SFIDE DI OGNI PIZZERIA
        </div>

        <h2 className={styles.title}>
          Ti riconosci in<br />
          uno di questi <span className={styles.titleAccent}>problemi?</span>
        </h2>

        <p className={styles.subtitle}>
          Ogni giorno perdi tempo, ordini e margine.<br />
          PizzaOS è nato per risolvere tutto questo.
        </p>

        <div className={styles.grid}>
          {/* Card 1 */}
          <ChallengeCard
            icon={<PhoneIcon />}
            title="Troppe chiamate, troppo caos"
            description="Ordini al telefono, errori, attese infinite e staff sotto pressione."
          >
            <div className={styles.mockupPhone}>
              <div className={styles.phoneHeader}>
                Chiamata in arrivo<br />
                <span>Linea ordini</span>
              </div>
              <div className={styles.phoneAction}>
                <PhoneIcon />
              </div>
              {missedCalls.map((time) => (
                <div className={styles.mockupCall} key={time}>
                  <span className={styles.mockupCallIcon}><PhoneIcon /></span>
                  <span>Chiamata persa</span>
                  <span className={styles.mockupTime}>{time}</span>
                </div>
              ))}
            </div>
          </ChallengeCard>

          {/* Card 2 */}
          <ChallengeCard
            icon={<GrowthIcon />}
            title="Commissioni che mangiano i profitti"
            description="I marketplace prendono fino al 30% per ogni ordine. Il cliente non è tuo."
          >
            <div className={styles.mockupCommission}>
              <div className={styles.mockupLabel}>Commissioni</div>
              <div className={styles.mockupCommissionValue}>-30%</div>
              <div className={styles.mockupCaption}>Su ogni ordine</div>
              <svg className={styles.lineChart} viewBox="0 0 100 40" aria-hidden="true">
                <path d="M0,35 Q25,32 40,25 T70,28 T100,10" fill="none" stroke="#f43a26" strokeWidth="2" />
                <circle cx="100" cy="10" r="2" fill="#f43a26" />
              </svg>
            </div>
          </ChallengeCard>

          {/* Card 3 */}
          <ChallengeCard
            icon={<UserIcon />}
            title="Clienti che ordinano una volta e spariscono"
            description="Nessun programma fedeltà, nessuna comunicazione, nessun legame."
          >
            <div className={styles.mockupGrid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.mockupDot}>
                  <UserIcon />
                </div>
              ))}
            </div>
          </ChallengeCard>

          {/* Card 4 */}
          <ChallengeCard
            icon={<DeliveryIcon />}
            title="Consegne disordinate e zero controllo"
            description="Nessun tracciamento, ritardi, clienti arrabbiati e rider sotto stress."
          >
            <div className={styles.mockupMap}>
              <div className={styles.mapBubble}>
                Dov&apos;è il mio ordine?
              </div>
              <svg className={styles.mapRoute} viewBox="0 0 100 100" aria-hidden="true">
                <path d="M14,36 C28,28 32,50 44,46 C58,41 51,70 66,72 C75,73 78,62 88,67" />
                <circle cx="14" cy="36" r="3" />
                <circle cx="88" cy="67" r="3" />
              </svg>
              <span className={styles.riderPin}><DeliveryIcon /></span>
            </div>
          </ChallengeCard>

          {/* Card 5 */}
          <ChallengeCard
            icon={<MenuIcon />}
            title="Menu statico, poco flessibile"
            description="Aggiornamenti lenti, prodotti non disponibili e opportunità perse."
          >
            <div className={styles.mockupMenu}>
              <div className={styles.mockupLabel}>Menu</div>
              {unavailablePizzas.map((pizza) => (
                <div className={styles.mockupMenuItem} key={pizza}>
                  <span>{pizza}</span>
                  <span className={styles.mockupStatus}>Non disponibile</span>
                </div>
              ))}
            </div>
          </ChallengeCard>

          {/* Card 6 */}
          <ChallengeCard
            icon={<ChartIcon />}
            title="Nessun dato, nessuna crescita"
            description="Senza dati non puoi capire cosa funziona, cosa migliorare e come far crescere il tuo business."
          >
            <div className={styles.mockupOrders}>
              <div className={styles.mockupLabel}>Ordini</div>
              <div className={styles.mockupChart}>
                {chartBars.map((height) => (
                  <div
                    className={styles.mockupBar}
                    key={height}
                    style={{ "--bar-height": `${height}%` } as CSSProperties}
                  />
                ))}
              </div>
              <div className={styles.questionMark}>?</div>
            </div>
          </ChallengeCard>
        </div>

        <div className={styles.footerBanner}>
          <span className={styles.footerIcon}>✨</span>
          PizzaOS risolve tutto in un&apos;unica piattaforma.
        </div>

        <div>
          <Link href={CLIENT_DEMO_URL} className={styles.ctaButton}>
            Scopri come funziona <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
