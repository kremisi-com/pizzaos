import Link from "next/link";
import type { ReactElement } from "react";
import styles from "./final-cta-section.module.css";

const CLIENT_DEMO_URL = "/client" as const;

const BENEFITS = [
  {
    icon: <GrowthIcon />,
    title: "Più ordini, più clienti, più fatturato",
    description: "Attira nuovi clienti e fidelizza quelli esistenti con un'esperienza d'ordine impeccabile."
  },
  {
    icon: <ClockIcon />,
    title: "Meno lavoro, più tempo",
    description: "Automatizza ordini, marketing e operazioni per concentrarti su ciò che conta davvero."
  },
  {
    icon: <ShieldIcon />,
    title: "Zero commissioni",
    description: "Paghi solo un canone mensile trasparente. Nessuna sorpresa, nessun costo nascosto."
  },
  {
    icon: <HeartIcon />,
    title: "Clienti più felici, recensioni migliori",
    description: "Consegne puntuali, comunicazione chiara e un servizio che fa la differenza."
  }
] as const;

const TRIAL_ITEMS = [
  "Tutte le funzionalità incluse",
  "Setup guidato e onboarding dedicato",
  "Assistenza 7/7 sempre al tuo fianco",
  "Disdici quando vuoi"
] as const;

const REAL_TIME_ORDERS = [
  { id: "#1058", channel: "Consegna", status: "In preparazione", time: "18 min", tone: "red" },
  { id: "#1057", channel: "Asporto", status: "Pronto", time: "5 min", tone: "green" },
  { id: "#1056", channel: "Tavolo 7", status: "In forno", time: "8 min", tone: "amber" }
] as const;

const TRUST_FEATURES = [
  {
    icon: <RocketIcon />,
    title: "Onboarding rapido",
    description: "Il tuo account è attivo in meno di 24 ore."
  },
  {
    icon: <HeadsetIcon />,
    title: "Supporto dedicato",
    description: "Un team di esperti sempre disponibile per te."
  },
  {
    icon: <TrainingIcon />,
    title: "Formazione inclusa",
    description: "Guide, tutorial e consigli per usare al meglio PizzaOS."
  },
  {
    icon: <BarsIcon />,
    title: "Risultati misurabili",
    description: "Dati, analytics e insight per far crescere il tuo business."
  }
] as const;

interface FinalCtaSectionProps
{
  readonly onRequestDemo: () => void;
}

export function FinalCtaSection({ onRequestDemo }: FinalCtaSectionProps): ReactElement
{
  return (
    <section className={styles.section} aria-labelledby="final-cta-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <RocketIcon />
          PRONTO A FAR CRESCERE LA TUA PIZZERIA?
        </div>

        <h2 className={styles.title} id="final-cta-title">
          Inizia oggi.<br />
          <span>Trasforma la tua pizzeria.</span>
        </h2>

        <p className={styles.description}>
          Unisciti a centinaia di pizzerie che già usano PizzaOS<br />
          per vendere di più, lavorare meglio e far felici i propri clienti.
        </p>

        <div className={styles.heroGrid}>
          <div className={styles.benefitsList} aria-label="Vantaggi principali">
            {BENEFITS.map((benefit) => (
              <article className={styles.benefitItem} key={benefit.title}>
                <span className={styles.benefitIcon}>{benefit.icon}</span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.trialColumn}>
            <div className={styles.trialCard}>
              <span className={styles.giftBadge}>
                <GiftIcon />
              </span>
              <h3>Prova PizzaOS gratis per 14 giorni</h3>
              <p>Senza impegno. Senza carta di credito.</p>

              <ul className={styles.trialList}>
                {TRIAL_ITEMS.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href={CLIENT_DEMO_URL}
                className={styles.primaryCta}
                id="footer-cta-client"
              >
                Inizia la prova gratuita
                <ArrowIcon />
              </Link>
              <button
                type="button"
                onClick={onRequestDemo}
                className={styles.demoLink}
                id="footer-cta-demo"
              >
                Prenota una demo personalizzata
              </button>
            </div>

            <p className={styles.securityNote}>
              <ShieldSmallIcon />
              I tuoi dati sono al sicuro con noi.<br />
              Conforme al GDPR e agli standard di sicurezza più elevati.
            </p>
          </div>

          <div className={styles.productVisual} aria-label="Anteprima dashboard PizzaOS">
            <DashboardMockup />
            <PhoneMockup />
          </div>
        </div>

        <div className={styles.socialProof}>
          <div className={styles.ratingBlock}>
            <div className={styles.avatars} aria-hidden="true">
              <span className={styles.avatarOne}>M</span>
              <span className={styles.avatarTwo}>G</span>
              <span className={styles.avatarThree}>L</span>
              <span className={styles.avatarFour}>A</span>
            </div>
            <div>
              <div className={styles.stars} aria-label="Valutazione cinque stelle">★★★★★</div>
              <strong>Oltre 300 pizzerie già con PizzaOS</strong>
              <p>E migliaia di clienti soddisfatti ogni giorno.</p>
            </div>
          </div>

          <div className={styles.partnerBlock}>
            <span>Integrato con i migliori partner</span>
            <div className={styles.partnerLogos} aria-label="Partner delivery">
              <strong className={styles.deliveroo}>deliveroo</strong>
              <strong className={styles.glovo}>Glovo</strong>
              <strong className={styles.justEat}>JUST EAT</strong>
              <span>e molti altri</span>
            </div>
          </div>

          <div className={styles.trustpilotBlock}>
            <span>Eccellente</span>
            <div className={styles.trustStars} aria-hidden="true">
              <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
            </div>
            <strong>4,8 su 5 su Trustpilot</strong>
          </div>
        </div>

        <div className={styles.featureStrip}>
          {TRUST_FEATURES.map((feature) => (
            <article className={styles.trustFeature} key={feature.title}>
              <span>{feature.icon}</span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardMockup(): ReactElement
{
  return (
    <div className={styles.dashboardMockup}>
      <div className={styles.dashboardHeader}>
        <strong>Dashboard</strong>
        <span>Ultimi 7 giorni⌄</span>
      </div>
      <div className={styles.kpiGrid}>
        <KpiCard label="Ordini totali" value="348" delta="↑ 18,6%" />
        <KpiCard label="Fatturato" value="7.650 €" delta="↑ 22,4%" />
        <KpiCard label="Tempo medio consegna" value="24 min" delta="↓ 8%" />
      </div>
      <div className={styles.chartCard}>
        <strong>Andamento ordini</strong>
        <svg aria-hidden="true" viewBox="0 0 330 88" preserveAspectRatio="none">
          <path d="M2 66 C20 66 21 55 38 57 C54 59 60 65 76 55 C93 45 99 48 114 39 C129 30 138 50 154 48 C171 46 176 31 193 33 C211 35 214 23 231 26 C249 29 254 14 272 18 C290 22 295 8 312 14 C322 18 325 10 328 4" />
        </svg>
        <div className={styles.chartTicks}>
          <span>12 Mag</span><span>13 Mag</span><span>14 Mag</span><span>15 Mag</span>
        </div>
      </div>
      <div className={styles.tableCard}>
        <strong>Ordini in tempo reale</strong>
        <div><span>#1058</span><span>Via Torino, 123</span><em>In preparazione</em></div>
        <div><span>#1057</span><span>Asporto</span><em>Pronto</em></div>
        <div><span>#1056</span><span>Tavolo 7</span><em>In forno</em></div>
      </div>
    </div>
  );
}

interface KpiCardProps
{
  readonly label: string;
  readonly value: string;
  readonly delta: string;
}

function KpiCard({ label, value, delta }: KpiCardProps): ReactElement
{
  return (
    <div className={styles.kpiCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{delta}</em>
    </div>
  );
}

function PhoneMockup(): ReactElement
{
  return (
    <div className={styles.phoneMockup}>
      <div className={styles.phoneSpeaker} />
      <div className={styles.phoneContent}>
        <div className={styles.phoneTop}>
          <div>
            <strong>Ciao Marco! 👋</strong>
            <span>Pronto a ricevere nuovi ordini?</span>
          </div>
          <span className={styles.notification}>4</span>
        </div>
        <div className={styles.redMetric}>
          <span>Ordini oggi</span>
          <strong>128</strong>
          <em>+21% vs ieri</em>
          <svg aria-hidden="true" viewBox="0 0 180 52" preserveAspectRatio="none">
            <path d="M2 42 C20 38 25 34 39 37 C52 40 58 27 72 30 C85 33 91 21 105 24 C120 27 124 15 138 18 C153 21 160 8 178 5" />
          </svg>
        </div>
        <div className={styles.phoneKpis}>
          <div><span>Fatturato oggi</span><strong>2.450 €</strong><em>+18%</em></div>
          <div><span>Tempo medio</span><strong>24 min</strong><em>+15%</em></div>
        </div>
        <div className={styles.phoneOrders}>
          <div className={styles.phoneOrdersHeader}>
            <strong>Ordini in corso</strong>
            <span>Visualizza tutti →</span>
          </div>
          {REAL_TIME_ORDERS.map((order) => (
            <div className={styles.phoneOrder} key={order.id}>
              <span className={styles[`orderDot${order.tone}`]} />
              <div><strong>{order.id}</strong><em>{order.channel}</em></div>
              <p>{order.status}</p>
              <time>{order.time}</time>
            </div>
          ))}
        </div>
        <div className={styles.phoneNav}>
          <span>Dashboard</span><span>Ordini</span><span>Menu</span><span>Analytics</span><span>Altro</span>
        </div>
      </div>
    </div>
  );
}

function GrowthIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-8" />
      <path d="M3.5 19.5h17" />
      <path d="m14 5 6-1-1 6" />
      <path d="m20 4-8 8-3-3-5 5" />
    </svg>
  );
}

function ClockIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v5l3.4 2" />
    </svg>
  );
}

function ShieldIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3.5 19 6v5.2c0 4.3-2.5 7.6-7 9.3-4.5-1.7-7-5-7-9.3V6l7-2.5Z" />
      <path d="m9.5 12 1.7 1.7L15 9.8" />
    </svg>
  );
}

function HeartIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 20s-7-4.4-8.5-9.2C2.4 7.2 4.7 4.5 8 4.5c1.8 0 3.2 1 4 2.2.8-1.2 2.2-2.2 4-2.2 3.3 0 5.6 2.7 4.5 6.3C19 15.6 12 20 12 20Z" />
    </svg>
  );
}

function RocketIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M14 4c2.4-.7 4.4-.7 5.8.2.8 1.5.8 3.4.1 5.9l-5 5-4.9-4.9 4-6.2Z" />
      <path d="m8.8 10.6-3.1.5-2 4 4-.8" />
      <path d="m13.4 15.2-.6 3.1-4 2 .8-4" />
      <path d="M16.8 7.2h.1" />
    </svg>
  );
}

function GiftIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10h16v10H4z" />
      <path d="M3 7h18v3H3z" />
      <path d="M12 7v13" />
      <path d="M12 7H9.3C7 7 6.4 4 8.4 3.5 10.1 3.1 11.2 5.2 12 7Z" />
      <path d="M12 7h2.7c2.3 0 2.9-3 0.9-3.5-1.7-.4-2.8 1.7-3.6 3.5Z" />
    </svg>
  );
}

function CheckIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.2" />
      <path d="m8.7 12 2.1 2.2 4.7-5" />
    </svg>
  );
}

function ArrowIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h13" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ShieldSmallIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 4.5 18 7v4.4c0 3.8-2.1 6.4-6 8.1-3.9-1.7-6-4.3-6-8.1V7l6-2.5Z" />
      <path d="m9.7 12 1.5 1.5 3.2-3.5" />
    </svg>
  );
}

function HeadsetIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
      <path d="M5 13h3v5H5z" />
      <path d="M16 13h3v5h-3z" />
      <path d="M16 20h-3" />
    </svg>
  );
}

function TrainingIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m3 8.5 9-4 9 4-9 4-9-4Z" />
      <path d="M7 10.3v4.4c1.3 1.7 3 2.5 5 2.5s3.7-.8 5-2.5v-4.4" />
      <path d="M21 8.5V15" />
    </svg>
  );
}

function BarsIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V9" />
      <path d="M12 20V4" />
      <path d="M19 20v-7" />
    </svg>
  );
}
