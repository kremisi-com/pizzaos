import type { CSSProperties, ReactElement, ReactNode } from "react";
import styles from "./complete-platform-section.module.css";

const ORDER_ITEMS = [
  { label: "1x Margherita DOP", price: "7,50 €" },
  { label: "1x Diavola", price: "8,50 €" },
  { label: "1x Coca Cola", price: "2,50 €" }
] as const;

const TIMELINE = [
  { label: "Ordine ricevuto", time: "17:50", active: true },
  { label: "In preparazione", time: "17:55", active: true },
  { label: "In consegna", time: "18:15", active: true },
  { label: "Consegnato", time: "--", active: false }
] as const;

const CHECKLISTS = [
  [
    "Personalizzazioni avanzate",
    "Lista allergeni e impasti",
    "Ordina come l'ultima volta"
  ],
  [
    "Tracking live dell'ordine",
    "Notifiche automatiche",
    "Integrazione con Deliveroo"
  ],
  [
    "Coupon e promozioni automatiche",
    "Tessera fedeltà e premi",
    "Analytics e suggerimenti AI"
  ]
] as const;

const BENEFITS = [
  {
    icon: <ShieldIcon />,
    title: "Zero commissioni",
    text: "Paghi solo un canone mensile."
  },
  {
    icon: <LockIcon />,
    title: "I tuoi clienti, sempre tuoi",
    text: "Dati, relazioni e comunicazioni restano a te."
  },
  {
    icon: <BoltIcon />,
    title: "Set up rapido",
    text: "Onboarding in pochi giorni, senza stress."
  },
  {
    icon: <HeadsetIcon />,
    title: "Supporto dedicato",
    text: "Sempre al tuo fianco, quando ti serve."
  },
  {
    icon: <StarIcon />,
    title: "Pensato per i ristoratori",
    text: "Funzionalità reali per problemi reali."
  }
] as const;

const CUSTOMER_AVATARS = ["#c97945", "#dca064", "#8f5135", "#efc08d"] as const;

interface PillarProps
{
  readonly number: string;
  readonly icon: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly checklist: readonly string[];
}

function Pillar({ number, icon, title, description, children, checklist }: PillarProps): ReactElement
{
  return (
    <article className={styles.pillar}>
      <div className={styles.pillarHeader}>
        <span className={styles.number}>{number}</span>
        <span className={styles.pillarIcon}>{icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div className={styles.visual}>
        {children}
      </div>

      <ul className={styles.checklist}>
        {checklist.map((item) => (
          <li key={item}>
            <CheckIcon />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function PhoneMockup(): ReactElement
{
  return (
    <div className={styles.orderVisual}>
      <div className={styles.phone}>
        <div className={styles.phoneBar}>
          <span>9:41</span>
          <span>•••</span>
        </div>
        <div className={styles.phoneHeader}>
          <MenuIcon />
          <strong>Bella Napoli</strong>
          <CartIcon />
        </div>
        <div className={styles.phoneContent}>
          <h4>Ciao Mario!</h4>
          <p>Ordina come l&apos;ultima volta</p>

          <div className={styles.featuredPizza}>
            <div className={styles.pizzaPhoto}>
              <span />
            </div>
            <div>
              <strong>Margherita DOP</strong>
              <small>Pomodoro San Marzano, fior di latte, basilico</small>
              <div className={styles.priceRow}>
                <b>7,50 €</b>
                <button type="button">+ Aggiungi</button>
              </div>
            </div>
          </div>

          <h5>Le nostre pizze</h5>
          <div className={styles.tabs}>
            <span>Tutte</span>
            <span>Classiche</span>
            <span>Speciali</span>
            <span>Bianche</span>
          </div>

          <div className={styles.menuCard}>
            <div className={styles.pizzaThumb} />
            <div>
              <strong>Diavola</strong>
              <small>Pomodoro San Marzano, mozzarella fior di latte, salame piccante</small>
              <b>8,50 €</b>
            </div>
            <span>+</span>
          </div>
        </div>
      </div>

      <div className={styles.receipt}>
        <strong>Il tuo ordine</strong>
        {ORDER_ITEMS.map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <b>{item.price}</b>
          </div>
        ))}
        <div className={styles.total}>
          <span>Totale</span>
          <b>18,50 €</b>
        </div>
        <button type="button">Paga 18,50 €</button>
      </div>
    </div>
  );
}

function DeliveryMockup(): ReactElement
{
  return (
    <div className={styles.mapCard}>
      <div className={styles.deliveryPanel}>
        <strong>Ordine #1258</strong>
        <span>In consegna</span>
        <div className={styles.rider}>
          <span className={styles.avatar} />
          <div>
            <b>Luca</b>
            <small>Il tuo rider</small>
          </div>
        </div>
        <p>Consegna prevista <b>18:45</b></p>
        <ol>
          {TIMELINE.map((step) => (
            <li key={step.label} className={step.active ? styles.activeStep : ""}>
              <span />
              <b>{step.label}</b>
              <small>{step.time}</small>
            </li>
          ))}
        </ol>
      </div>

      <svg className={styles.mapRoute} viewBox="0 0 520 360" aria-hidden="true">
        <path className={styles.streetWide} d="M40 82h440M20 184h480M90 18v320M205 35v310M330 20v310M450 40v300" />
        <path className={styles.streetThin} d="M30 126 490 52M56 272 474 112M130 338 498 236M14 226 244 42M284 338 506 122" />
        <path className={styles.routeDark} d="M248 116 220 174 284 228" />
        <path className={styles.routeRed} d="M284 228 354 152 444 222" />
        <circle className={styles.routeEnd} cx="444" cy="222" r="8" />
      </svg>

      <div className={styles.riderPin}>
        <ScooterIcon />
      </div>

      <div className={styles.distanceBadge}>
        <strong>2 min</strong>
        <span>distanza dal rider</span>
      </div>
    </div>
  );
}

function GrowthMockup(): ReactElement
{
  return (
    <div className={styles.growthGrid}>
      <MetricCard title="Fatturato" value="12.345 €" delta="↑ 24% vs settimana scorsa">
        <svg viewBox="0 0 200 60" aria-hidden="true">
          <path d="M4 48 C20 24 34 42 48 34 S75 16 94 35 S124 28 138 18 S164 24 178 8 S190 14 198 3" />
        </svg>
      </MetricCard>

      <MetricCard title="Clienti fidelizzati" value="1.248" delta="↑ 18% vs settimana scorsa">
        <div className={styles.customers}>
          {CUSTOMER_AVATARS.map((color, index) => (
            <span
              key={color}
              style={{ "--avatar-color": color, "--avatar-index": index } as CSSProperties}
            />
          ))}
          <b>+127</b>
        </div>
      </MetricCard>

      <MetricCard title="Clienti che tornano" value="42%" delta="↑ 12% vs settimana scorsa">
        <div className={styles.donut} />
      </MetricCard>

      <div className={styles.aiCard}>
        <div className={styles.aiTitle}>
          <SparkleIcon />
          <strong>Suggerimento AI</strong>
        </div>
        <p>Questa sera vendi di più se spingi Margherita + Birra Moretti.</p>
        <button type="button">Crea promo</button>
      </div>
    </div>
  );
}

interface MetricCardProps
{
  readonly title: string;
  readonly value: string;
  readonly delta: string;
  readonly children: ReactNode;
}

function MetricCard({ title, value, delta, children }: MetricCardProps): ReactElement
{
  return (
    <div className={styles.metricCard}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
      {children}
    </div>
  );
}

export function CompletePlatformSection(): ReactElement
{
  return (
    <section
      className={styles.section}
      id="soluzione-completa"
      aria-labelledby="complete-platform-title"
    >
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <RocketIcon />
          LA SOLUZIONE COMPLETA
        </div>

        <h2 className={styles.title} id="complete-platform-title">
          Tutto ciò che ti serve,<br />
          <span>in un&apos;unica piattaforma.</span>
        </h2>

        <p className={styles.subtitle}>
          PizzaOS unisce ordini, consegne, clienti e marketing in un sistema
          semplice da usare e pensato per far crescere la tua pizzeria.
        </p>

        <div className={styles.pillars}>
          <Pillar
            number="01"
            icon={<SliceIcon />}
            title="Ordini Smart"
            description="Menu digitale, personalizzazioni illimitate, pagamenti online e riordini in 1 click."
            checklist={CHECKLISTS[0]}
          >
            <PhoneMockup />
          </Pillar>

          <Pillar
            number="02"
            icon={<ScooterIcon />}
            title="Delivery Control"
            description="Consegne ottimizzate, rider assegnati automaticamente e tracciamento live per te e i tuoi clienti."
            checklist={CHECKLISTS[1]}
          >
            <DeliveryMockup />
          </Pillar>

          <Pillar
            number="03"
            icon={<BarsIcon />}
            title="Growth Engine"
            description="Marketing automatico, fedeltà e analisi AI per far tornare i clienti e aumentarne il valore."
            checklist={CHECKLISTS[2]}
          >
            <GrowthMockup />
          </Pillar>
        </div>

        <div className={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <div className={styles.benefit} key={benefit.title}>
              <span>{benefit.icon}</span>
              <div>
                <strong>{benefit.title}</strong>
                <p>{benefit.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RocketIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 15 3 21l6-2 8-8c2-2 3-5 3-8-3 0-6 1-8 3l-8 8Z" />
      <path d="m12 6 6 6" />
      <path d="M7 17 3 13" />
      <path d="M11 21 7 17" />
    </svg>
  );
}

function SliceIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 3 20 8 9 22 4 3Z" />
      <path d="M7 7c4 0 7 1 10 3" />
      <circle cx="10" cy="10" r="1.2" />
      <circle cx="13" cy="14" r="1.2" />
    </svg>
  );
}

function ScooterIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 17h6l1.5-7H9L8 6H4" />
      <path d="M13 17h3l2-5h3v5h-1" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M15 8h3" />
    </svg>
  );
}

function BarsIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 20V11h4v9H5Z" />
      <path d="M11 20V6h4v14h-4Z" />
      <path d="M17 20V3h4v17h-4Z" />
    </svg>
  );
}

function CheckIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" />
      <path d="m5.3 8.1 1.7 1.8 3.8-4" />
    </svg>
  );
}

function MenuIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 6h12M4 10h12M4 14h12" />
    </svg>
  );
}

function CartIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M5 6h12l-1.2 6H7L5 3H2" />
      <circle cx="8" cy="16" r="1.2" />
      <circle cx="15" cy="16" r="1.2" />
    </svg>
  );
}

function SparkleIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M10 2 8.5 7.5 3 9l5.5 1.5L10 16l1.5-5.5L17 9l-5.5-1.5L10 2Z" />
    </svg>
  );
}

function ShieldIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 5 6v5c0 4.4 2.7 8 7 10 4.3-2 7-5.6 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function LockIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function BoltIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />
    </svg>
  );
}

function HeadsetIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v4a2 2 0 0 0 2 2h2v-8H6a2 2 0 0 0-2 2Z" />
      <path d="M20 13v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z" />
      <path d="M14 21h-2" />
    </svg>
  );
}

function StarIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
    </svg>
  );
}
