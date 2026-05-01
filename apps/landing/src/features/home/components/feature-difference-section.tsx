import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import styles from "./feature-difference-section.module.css";

const REORDER_ITEMS = [
  { name: "2x Diavola", detail: "+ Coca Cola", price: "17,50 €", time: "2 giorni fa" },
  { name: "1x Bufalina", detail: "+ Frittatine", price: "15,00 €", time: "1 settimana fa" },
  { name: "1x Capricciosa", detail: "+ Acqua naturale", price: "14,00 €", time: "2 settimane fa" }
] as const;

const CUSTOM_OPTIONS = [
  { label: "Classico", active: false },
  { label: "Integrale", active: false },
  { label: "Kamut", active: false },
  { label: "Napoli", active: true }
] as const;

const INGREDIENTS = ["Basilico", "Bufala DOP", "Pomodorini", "Olio EVO"] as const;

const AI_INSIGHTS = [
  {
    text: "Questa sera venderai di più se spingi Margherita + Birra Moretti",
    highlight: "+23%",
    meta: "di vendite attese",
    visual: "bundle"
  },
  {
    text: "Hai troppo impasto Kamut. Crea una promo automatica?",
    highlight: "Rimanenza:",
    meta: "18 kg",
    visual: "dough"
  },
  {
    text: "Questo cliente ordina ogni venerdì. Notifica alle 18:00 con -10%?",
    highlight: "Cliente",
    meta: "#1258",
    visual: "client"
  }
] as const;

interface FeatureCardProps
{
  readonly icon: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

function FeatureCard({ icon, title, description, children }: FeatureCardProps): ReactElement
{
  return (
    <article className={styles.card}>
      <div className={styles.iconBadge}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className={styles.cardVisual}>{children}</div>
    </article>
  );
}

function PizzaBuilderMockup(): ReactElement
{
  return (
    <div className={styles.builderVisual}>
      <div className={styles.largePizza} aria-hidden="true">
        <span />
      </div>

      <div className={styles.productTile}>
        <strong>Margherita DOP</strong>
        <div>
          <b>7,50 €</b>
          <span>Aggiungi</span>
        </div>
      </div>

      <div className={styles.customizerPanel}>
        <strong>Impasto</strong>
        <div className={styles.optionGrid}>
          {CUSTOM_OPTIONS.map((option) => (
            <span className={option.active ? styles.optionActive : ""} key={option.label}>
              {option.label}
            </span>
          ))}
        </div>

        <strong>Bordo</strong>
        <div className={styles.lineOption}>
          <span>Classico</span>
          <small />
        </div>
        <div className={styles.lineOption}>
          <span>Ripieno</span>
          <b>+ 1,50 €</b>
        </div>
        <div className={styles.lineOption}>
          <span>Alto e soffice</span>
          <b>+ 1,00 €</b>
        </div>

        <strong>Ingredienti</strong>
        {INGREDIENTS.map((ingredient) => (
          <div className={styles.ingredient} key={ingredient}>
            <span>{ingredient}</span>
            <CheckIcon />
          </div>
        ))}
        <button type="button">+ Aggiungi</button>
      </div>
    </div>
  );
}

function ReorderMockup(): ReactElement
{
  return (
    <div className={styles.reorderPanel}>
      <strong>I tuoi ultimi ordini</strong>
      <div className={styles.reorderList}>
        {REORDER_ITEMS.map((item) => (
          <div className={styles.reorderItem} key={item.name}>
            <div className={styles.pizzaThumb} aria-hidden="true" />
            <div>
              <b>{item.name}</b>
              <span>{item.detail}</span>
            </div>
            <div className={styles.reorderMeta}>
              <strong>{item.price}</strong>
              <small>{item.time}</small>
            </div>
          </div>
        ))}
      </div>
      <button type="button">Ordina come l&apos;ultima volta</button>
    </div>
  );
}

function TrackingMockup(): ReactElement
{
  return (
    <div className={styles.trackingPanel}>
      <div className={styles.deliveryNotice}>
        <span className={styles.tinyPizza} aria-hidden="true" />
        <div>
          <strong>Il tuo ordine è in consegna</strong>
          <small>Consegna prevista 18:45</small>
        </div>
      </div>

      <svg className={styles.routeMap} viewBox="0 0 330 240" aria-hidden="true">
        <path className={styles.mapWide} d="M8 28h304M20 92h290M12 156h300M44 8v220M108 12v212M178 8v220M250 12v212M306 22v200" />
        <path className={styles.mapThin} d="M8 58 304 12M28 132 316 76M12 208 314 142M76 226 308 44M2 112 124 22M182 226 318 86" />
        <path className={styles.routePath} d="M126 112 160 146 214 116 248 154" />
        <circle className={styles.pinBlue} cx="126" cy="112" r="10" />
        <circle className={styles.pinRed} cx="248" cy="154" r="10" />
      </svg>

      <div className={styles.riderRow}>
        <span className={styles.riderAvatar} />
        <div>
          <strong>Luca</strong>
          <small>Il tuo rider</small>
        </div>
        <button type="button" aria-label="Chiama il rider">
          <PhoneIcon />
        </button>
        <button type="button" aria-label="Messaggia il rider">
          <ChatIcon />
        </button>
      </div>

      <div className={styles.statusRow}>
        {["Ricevuto", "In preparazione", "In consegna", "Consegnato"].map((step, index) => (
          <div className={styles.statusStep} key={step}>
            <span className={index < 3 ? styles.stepActive : ""} />
            <small>{step}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function AiMockup(): ReactElement
{
  return (
    <div className={styles.aiPanel}>
      <strong>AI Insights</strong>
      {AI_INSIGHTS.map((insight) => (
        <div className={styles.insightCard} key={insight.text}>
          <div>
            <p>{insight.text}</p>
            <small>
              <b>{insight.highlight}</b> {insight.meta}
            </small>
          </div>
          <span className={`${styles.insightVisual} ${styles[`insightVisual-${insight.visual}`]}`} />
        </div>
      ))}
    </div>
  );
}

export function FeatureDifferenceSection(): ReactElement
{
  return (
    <section
      className={styles.section}
      id="funzionalita-differenza"
      aria-labelledby="feature-difference-title"
    >
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <StarIcon />
          FUNZIONALITÀ CHE FANNO LA DIFFERENZA
        </div>

        <h2 className={styles.title} id="feature-difference-title">
          Funzionalità pensate<br />
          per farti <span>vendere di più.</span>
        </h2>

        <p className={styles.subtitle}>
          Ogni dettaglio è stato progettato per semplificare il lavoro,
          migliorare l&apos;esperienza dei tuoi clienti e aumentare i tuoi guadagni.
        </p>

        <div className={styles.grid}>
          <FeatureCard
            icon={<SliceIcon />}
            title="Pizza Builder avanzato"
            description="Personalizzazioni senza limiti: impasti, ingredienti, cotture e tutto quello che vuoi tu."
          >
            <PizzaBuilderMockup />
          </FeatureCard>

          <FeatureCard
            icon={<ClockIcon />}
            title="Ordina come l&apos;ultima volta"
            description="I tuoi clienti possono riordinare in 1 click i loro piatti preferiti."
          >
            <ReorderMockup />
          </FeatureCard>

          <FeatureCard
            icon={<ScooterIcon />}
            title="Tracciamento live del rider"
            description="I tuoi clienti seguono l&apos;ordine in tempo reale fino alla consegna."
          >
            <TrackingMockup />
          </FeatureCard>

          <FeatureCard
            icon={<BarsIcon />}
            title="AI che lavora per te"
            description="Suggerimenti intelligenti e marketing automatico per aumentare vendite e fidelizzazione."
          >
            <AiMockup />
          </FeatureCard>
        </div>

        <div className={styles.footerNote}>
          <HeartIcon />
          <span>Tutte le funzionalità sono integrate. Zero complicazioni, solo risultati.</span>
        </div>

        <Link className={styles.cta} href="#ordinazione">
          Scopri tutte le funzionalità
          <ArrowIcon />
        </Link>
      </div>
    </section>
  );
}

function StarIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9L12 3Z" />
    </svg>
  );
}

function SliceIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 4 21 9 9 22 4 4Z" />
      <path d="M7 8c4.8 0 8.3 1.1 11.2 3.4" />
      <circle cx="10" cy="11" r="1.2" />
      <circle cx="13" cy="15" r="1.2" />
    </svg>
  );
}

function ClockIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 5.8v4.7h4.7" />
      <path d="M12 8v4l3 2" />
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
      <path d="M11 20V7h4v13h-4Z" />
      <path d="M17 20V3h4v17h-4Z" />
    </svg>
  );
}

function CheckIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" />
      <path d="m5.4 8.1 1.8 1.8 3.6-4" />
    </svg>
  );
}

function PhoneIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M6.5 3.5 8.7 7 7.4 8.5c1 2 2.1 3.1 4.1 4.1L13 11.3l3.5 2.2-.5 2.3c-.2.8-.9 1.2-1.7 1.1-5.6-.9-9.3-4.6-10.2-10.2-.1-.8.3-1.5 1.1-1.7l1.3-.5Z" />
    </svg>
  );
}

function ChatIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 5.5h12v8H8l-4 2v-10Z" />
      <path d="M7 9h6M7 11.5h4" />
    </svg>
  );
}

function HeartIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 20s-7-4.2-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.8-7 10-7 10Z" />
    </svg>
  );
}

function ArrowIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4 10h11" />
      <path d="m11 5 5 5-5 5" />
    </svg>
  );
}
