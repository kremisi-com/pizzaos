import type { CSSProperties, ReactElement } from "react";
import styles from "./analytics-growth-section.module.css";

const FEATURE_STRIP = [
  {
    icon: <TrendIcon />,
    title: "Analytics avanzate",
    text: "Dashboard complete e personalizzabili."
  },
  {
    icon: <SparkleIcon />,
    title: "AI intelligente",
    text: "Suggerimenti automatici per massimizzare i profitti."
  },
  {
    icon: <CalendarIcon />,
    title: "Previsioni di vendita",
    text: "Anticipa la domanda e riduci sprechi e costi."
  },
  {
    icon: <PieIcon />,
    title: "Heatmap menu",
    text: "Scopri cosa piace davvero ai tuoi clienti."
  },
  {
    icon: <AbIcon />,
    title: "A/B Test",
    text: "Testa, confronta e scegli ciò che funziona di più."
  }
] as const;

const KPI_CARDS = [
  { label: "Fatturato", value: "12.345 €", delta: "↑ 224%", line: "revenue" },
  { label: "Ordini", value: "1.248", delta: "↑ 18%", line: "orders" },
  { label: "Scontrino medio", value: "28,60 €", delta: "↑ 12%", line: "ticket" },
  { label: "Clienti nuovi", value: "312", delta: "↑ 222%", line: "customers" }
] as const;

const CATEGORY_ROWS = [
  { name: "Pizze", value: "65%" },
  { name: "Bevande", value: "18%" },
  { name: "Fritti", value: "9%" },
  { name: "Dolci", value: "5%" },
  { name: "Altro", value: "3%" }
] as const;

const TOP_PRODUCTS = [
  { rank: "1", name: "Margherita", orders: "512 ordini", width: "94%" },
  { rank: "2", name: "Diavola", orders: "398 ordini", width: "68%" },
  { rank: "3", name: "Capricciosa", orders: "287 ordini", width: "42%" }
] as const;

const INSIGHTS = [
  {
    icon: <DoughIcon />,
    title: "Hai troppo impasto Kamut",
    meta: "Rimanenza prevista: 18 kg",
    action: "Crea una promo automatica per ridurre gli sprechi."
  },
  {
    icon: <UsersIcon />,
    title: "Questo cliente torna ogni venerdì",
    meta: "+126 clienti con questo comportamento",
    action: "Invia loro una notifica alle 18:00 di venerdì."
  },
  {
    icon: <BeerIcon />,
    title: "Stasera vendi di più Margherita + Birra",
    meta: "Probabilità di aumento fatturato: +23%",
    action: "Suggeriamo di spingerlo con una promo."
  },
  {
    icon: <TagIcon />,
    title: "-10% entro 48h",
    meta: "Attiva ora la promo post ordine",
    action: "Aumento medio riordini: +18%"
  },
  {
    icon: <GiftIcon />,
    title: "Compleanno in arrivo",
    meta: "23 clienti nei prossimi 7 giorni",
    action: "Invia una promo personalizzata."
  }
] as const;

export function AnalyticsGrowthSection(): ReactElement
{
  return (
    <section className={styles.section} id="dati-crescita" aria-labelledby="analytics-growth-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <BarsIcon />
          DATI, ANALISI, CRESCITA
        </div>

        <h2 className={styles.title} id="analytics-growth-title">
          Dati che contano.<br />
          Decisioni che <span>fanno crescere.</span>
        </h2>

        <p className={styles.subtitle}>
          PizzaOS trasforma i dati della tua pizzeria in informazioni chiare e azionabili.<br />
          Capisci, prevedi e agisci prima degli altri.
        </p>

        <div className={styles.featureStrip} aria-label="Funzionalità analytics">
          {FEATURE_STRIP.map((feature) => (
            <article className={styles.featureItem} key={feature.title}>
              <span>{feature.icon}</span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.dashboardGrid}>
          <DashboardMockup />
          <InsightsPanel />
        </div>

        <div className={styles.bottomCta}>
          <span className={styles.rocketBadge}>
            <RocketIcon />
          </span>
          <div>
            <strong>Trasforma i dati in crescita reale</strong>
            <p>PizzaOS ti fornisce gli strumenti per prendere decisioni migliori, ogni giorno.</p>
          </div>
          <a className={styles.cta} href="/admin">
            Scopri come i dati fanno la differenza
            <ArrowIcon />
          </a>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup(): ReactElement
{
  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <SliceIcon />
          <strong>PizzaOS</strong>
        </div>
        <nav aria-label="Anteprima navigazione analytics">
          {["Overview", "Ordini", "Clienti", "Menu", "Marketing", "Analytics", "Report", "Impostazioni"].map(
            (item, index) => (
              <span className={index === 0 ? styles.activeNav : ""} key={item}>
                <NavIcon />
                {item}
              </span>
            )
          )}
        </nav>
        <div className={styles.aiSuggestion}>
          <strong>Suggerimento AI</strong>
          <p>Questa sera vendi di più spingendo Margherita + Birra Moretti.</p>
          <button type="button">Vedi dettagli <ArrowIcon /></button>
        </div>
      </aside>

      <div className={styles.mainPanel}>
        <header className={styles.panelHeader}>
          <h3>Panoramica</h3>
          <span>13 mag - 19 mag 2024 <CalendarTinyIcon /></span>
        </header>

        <div className={styles.kpiGrid}>
          {KPI_CARDS.map((card) => (
            <article className={styles.kpiCard} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small><b>{card.delta}</b> vs settimana precedente</small>
              <Sparkline variant={card.line} />
            </article>
          ))}
        </div>

        <div className={styles.chartGrid}>
          <article className={styles.categoryCard}>
            <h4>Vendite per categoria</h4>
            <div className={styles.categoryContent}>
              <div className={styles.donut} aria-hidden="true" />
              <ul>
                {CATEGORY_ROWS.map((row) => (
                  <li key={row.name}>
                    <span>{row.name}</span>
                    <b>{row.value}</b>
                  </li>
                ))}
              </ul>
            </div>
          </article>

          <article className={styles.ordersCard}>
            <h4>Andamento ordini</h4>
            <div className={styles.legend}>
              <span><b /> Questa settimana</span>
              <span><i /> Settimana precedente</span>
            </div>
            <svg viewBox="0 0 520 230" aria-hidden="true">
              <path className={styles.gridLine} d="M20 40h480M20 90h480M20 140h480M20 190h480" />
              <path className={styles.oldLine} d="M25 178 82 166 139 150 196 160 253 132 310 112 367 126 424 96 492 126" />
              <path className={styles.newLine} d="M25 132 82 124 139 92 196 70 253 86 310 58 367 58 424 44 492 68" />
              <g className={styles.newDots}>
                <circle cx="25" cy="132" r="5" />
                <circle cx="82" cy="124" r="5" />
                <circle cx="139" cy="92" r="5" />
                <circle cx="196" cy="70" r="5" />
                <circle cx="253" cy="86" r="5" />
                <circle cx="310" cy="58" r="5" />
                <circle cx="367" cy="58" r="5" />
                <circle cx="424" cy="44" r="5" />
                <circle cx="492" cy="68" r="5" />
              </g>
            </svg>
          </article>
        </div>

        <div className={styles.bottomGrid}>
          <article className={styles.topProducts}>
            <h4>Top prodotti</h4>
            {TOP_PRODUCTS.map((product) => (
              <div className={styles.productRow} key={product.name}>
                <b>{product.rank}</b>
                <span>{product.name}</span>
                <small>{product.orders}</small>
                <i style={{ "--bar-width": product.width } as CSSProperties} />
              </div>
            ))}
          </article>

          <article className={styles.returningCard}>
            <h4>Clienti che tornano</h4>
            <strong>42%</strong>
            <small><b>↑ 48%</b> vs settimana precedente</small>
            <div className={styles.avatarRow}>
              {["#9b5a34", "#e8a15b", "#52301f", "#c66b3d", "#231713"].map((color) => (
                <span key={color} style={{ "--avatar-color": color } as CSSProperties} />
              ))}
              <b>+96</b>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function InsightsPanel(): ReactElement
{
  return (
    <aside className={styles.insights}>
      <h3>Insight AI per il tuo business</h3>
      <div className={styles.insightList}>
        {INSIGHTS.map((insight) => (
          <article className={styles.insight} key={insight.title}>
            <span>{insight.icon}</span>
            <div>
              <strong>{insight.title}</strong>
              <small>{insight.meta}</small>
              <p>{insight.action}</p>
            </div>
            <ArrowRightIcon />
          </article>
        ))}
      </div>
      <a href="/admin">
        Vedi tutti gli insight
        <ArrowIcon />
      </a>
    </aside>
  );
}

type SparklineVariant = (typeof KPI_CARDS)[number]["line"];

function Sparkline({ variant }: { readonly variant: SparklineVariant }): ReactElement
{
  const paths = {
    revenue: "M4 48 C24 54 32 32 52 38 S78 58 96 40 122 44 136 30 154 36 172 18 196 22",
    orders: "M4 46 C26 34 34 54 54 38 S78 52 94 34 118 52 132 30 152 36 168 16 196 24",
    ticket: "M4 48 C22 28 36 44 54 40 S78 24 96 34 116 24 132 42 150 30 172 36 196 18",
    customers: "M4 44 C22 32 36 44 54 38 S76 54 94 34 114 46 134 20 154 36 174 16 196 22"
  } as const;

  return (
    <svg className={styles.sparkline} viewBox="0 0 200 64" aria-hidden="true">
      <path d={paths[variant]} />
    </svg>
  );
}

function BarsIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 19V11" />
      <path d="M11 19V5" />
      <path d="M17 19V8" />
      <rect x="3" y="11" width="4" height="8" rx="1" />
      <rect x="9" y="5" width="4" height="14" rx="1" />
      <rect x="15" y="8" width="4" height="11" rx="1" />
    </svg>
  );
}

function TrendIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 17 9 11l4 4 6-9" />
      <path d="M15 6h4v4" />
      <path d="M4 21h16" />
    </svg>
  );
}

function SparkleIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 14.3 8.7 20 11l-5.7 2.3L12 19l-2.3-5.7L4 11l5.7-2.3L12 3Z" />
      <path d="M19 16v4" />
      <path d="M17 18h4" />
    </svg>
  );
}

function CalendarIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" />
      <path d="M8 14h2M14 14h2M8 17h2" />
    </svg>
  );
}

function PieIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3v9h9" />
      <path d="M20.5 15A9 9 0 1 1 9 3.5" />
      <path d="M12 12 18.4 5.6" />
    </svg>
  );
}

function AbIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m3 17 4-10 4 10M4.5 13h5" />
      <path d="M14 7v10M14 12h3.2a2.5 2.5 0 0 1 0 5H14" />
      <path d="M14 7h2.7a2.5 2.5 0 0 1 0 5H14" />
    </svg>
  );
}

function SliceIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4.5 4.2 20.5 9 9 21.2 4.5 4.2Z" />
      <path d="M7.5 8.2c4.8.1 8.2 1.1 10.9 3.3" />
    </svg>
  );
}

function NavIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="5" y="5" width="14" height="14" rx="2" />
      <path d="M9 9h6M9 13h4" />
    </svg>
  );
}

function CalendarTinyIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="5" y="6" width="14" height="13" rx="2" />
      <path d="M8 4v4M16 4v4M5 10h14" />
    </svg>
  );
}

function DoughIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

function UsersIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.5 19c.8-3.8 2.7-5.7 5.5-5.7s4.7 1.9 5.5 5.7" />
      <path d="M14.5 14c2.7.3 4.5 2 5.2 5" />
    </svg>
  );
}

function BeerIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="6" y="7" width="10" height="13" rx="2" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16M8 7V5h6v2M9 11h4M9 15h4" />
    </svg>
  );
}

function TagIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 12 12 4h7v7l-8 8-7-7Z" />
      <circle cx="16" cy="8" r="1.3" />
    </svg>
  );
}

function GiftIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10h16v10H4zM12 10v10M4 14h16" />
      <path d="M12 10c-4.8-1-4.8-5 0-4 4.8-1 4.8 3 0 4Z" />
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
    </svg>
  );
}

function ArrowIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function ArrowRightIcon(): ReactElement
{
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
