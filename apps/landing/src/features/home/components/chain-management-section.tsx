import type { ReactElement } from "react";
import styles from "./chain-management-section.module.css";

const FEATURE_STRIP = [
  {
    icon: <StoreIcon />,
    title: "Gestione centralizzata",
    text: "Tutti i tuoi locali, da un unico pannello."
  },
  {
    icon: <BarsIcon />,
    title: "Dati consolidati",
    text: "Confronta le performance e prendi decisioni migliori."
  },
  {
    icon: <UsersIcon />,
    title: "Standard e qualità",
    text: "Imposta standard operativi e monitora la qualità."
  },
  {
    icon: <TagIcon />,
    title: "Pricing e menu coordinati",
    text: "Aggiorna prezzi e menu per singolo locale o in blocco."
  },
  {
    icon: <GearIcon />,
    title: "Ruoli e permessi",
    text: "Assegna ruoli personalizzati e controlla ogni accesso."
  }
] as const;

const KPI_CARDS = [
  { label: "Fatturato totale", value: "128.540 €", trend: "+18,6%" },
  { label: "Ordini totali", value: "3.721", trend: "+12,4%" },
  { label: "Scontrino medio", value: "29,40 €", trend: "+7,3%" },
  { label: "Clienti nuovi", value: "892", trend: "+21,1%" }
] as const;

const STORES = [
  {
    name: "Piazza Rossa - Milano",
    revenue: "28.450 €",
    orders: "812",
    average: "35,00 €",
    rating: "4,8",
    trend: "up"
  },
  {
    name: "Forno Alto - Roma",
    revenue: "24.180 €",
    orders: "702",
    average: "34,45 €",
    rating: "4,7",
    trend: "up"
  },
  {
    name: "Costa Sud - Napoli",
    revenue: "20.310 €",
    orders: "589",
    average: "34,50 €",
    rating: "4,6",
    trend: "up"
  },
  {
    name: "La Cupola - Torino",
    revenue: "18.760 €",
    orders: "531",
    average: "31,20 €",
    rating: "4,5",
    trend: "up"
  },
  {
    name: "Corte Viva - Bologna",
    revenue: "16.840 €",
    orders: "487",
    average: "29,80 €",
    rating: "4,4",
    trend: "down"
  }
] as const;

const SIDE_BENEFITS = [
  {
    icon: <ClockIcon />,
    title: "Report automatici",
    text: "Ricevi report personalizzati via email ogni giorno o settimana."
  },
  {
    icon: <BellIcon />,
    title: "Alert intelligenti",
    text: "Vieni avvisato in caso di cali di performance, stock bassi o anomalie."
  },
  {
    icon: <SyncIcon />,
    title: "Sincronizzazione totale",
    text: "Menu, prezzi, promo e contenuti sincronizzati in pochi click su più locali."
  },
  {
    icon: <GlobeIcon />,
    title: "Espandi il tuo network",
    text: "Apri nuovi locali e integrali in pochi minuti. PizzaOS cresce con te."
  }
] as const;

const NAV_ITEMS = [
  "Panoramica",
  "Pizzerie",
  "Performance",
  "Ordini",
  "Menu",
  "Marketing",
  "Inventario",
  "Clienti",
  "Impostazioni"
] as const;

const SUMMARY_STATS = [
  { icon: <StoreIcon />, value: "50+", label: "catene attive" },
  { icon: <UsersIcon />, value: "300+", label: "pizzerie gestite" },
  { icon: <BarsIcon />, value: "2.5M+", label: "ordini al mese" },
  { icon: <SmileIcon />, value: "98%", label: "clienti soddisfatti" }
] as const;

export function ChainManagementSection(): ReactElement
{
  return (
    <section className={styles.section} id="gestione-catene" aria-labelledby="chain-title">
      <div className={styles.inner}>
        <div className={styles.eyebrow}>
          <BuildingIcon />
          GESTIONE CATENE
        </div>

        <h2 className={styles.title} id="chain-title">
          Una piattaforma. Tutte le tue pizzerie.<br />
          <span>Controllo totale, ovunque tu sia.</span>
        </h2>

        <p className={styles.subtitle}>
          PizzaOS è pensato per chi gestisce più punti vendita.<br />
          Centralizza, monitora, confronta e fai crescere il tuo network di pizzerie.
        </p>

        <div className={styles.featureStrip} role="list">
          {FEATURE_STRIP.map((item) => (
            <article className={styles.stripItem} key={item.title} role="listitem">
              <span className={styles.stripIcon}>{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.contentGrid}>
          <DashboardMockup />
          <aside className={styles.sidePanel} aria-label="Vantaggi gestione catene">
            {SIDE_BENEFITS.map((benefit) => (
              <article className={styles.sideBenefit} key={benefit.title}>
                <span>{benefit.icon}</span>
                <div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.text}</p>
                </div>
              </article>
            ))}
          </aside>
        </div>

        <div className={styles.bottomGrid}>
          <figure className={styles.quoteCard}>
            <div className={styles.quoteLogo}>
              <strong>PIZZA</strong>
              <span>GROUP</span>
            </div>
            <blockquote>
              Con PizzaOS gestiamo 8 pizzerie in 4 città diverse. Abbiamo ridotto i costi,
              aumentato la qualità e il fatturato del 23% in 6 mesi.
            </blockquote>
            <figcaption>- Marco R., CEO Pizza Group</figcaption>
          </figure>

          <div className={styles.summaryStats} role="list">
            {SUMMARY_STATS.map((stat) => (
              <article className={styles.summaryStat} key={stat.label} role="listitem">
                <span>{stat.icon}</span>
                <strong>{stat.value}</strong>
                <small>{stat.label}</small>
              </article>
            ))}
          </div>

          <div className={styles.ctaCard}>
            <strong>Gestisci tutte le tue pizzerie con una sola piattaforma.</strong>
            <a href="/admin" className={styles.cta}>
              Richiedi una demo gratuita
              <ArrowIcon />
            </a>
            <span>
              <ShieldIcon />
              Nessun vincolo. Disdici quando vuoi.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup(): ReactElement
{
  return (
    <div className={styles.dashboard} aria-label="Panoramica network PizzaOS">
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span><SliceIcon /></span>
          Pizza<span>OS</span>
        </div>
        <button className={styles.storeSelect} type="button">
          Pizza Group
          <ChevronIcon />
        </button>
        <nav aria-label="Navigazione mockup gestione catene">
          {NAV_ITEMS.map((item, index) => (
            <a className={index === 0 ? styles.activeNav : ""} href="#gestione-catene" key={item}>
              <NavIcon index={index} />
              {item}
            </a>
          ))}
        </nav>
        <div className={styles.planCard}>
          <strong>Pizza Group</strong>
          <span>Piano Enterprise</span>
          <a href="/admin">
            Gestisci abbonamento
            <ArrowIcon />
          </a>
        </div>
      </aside>

      <div className={styles.dashboardMain}>
        <header className={styles.dashboardHeader}>
          <h3>Panoramica network</h3>
          <div className={styles.filters}>
            <button type="button">
              13 mag - 19 mag 2024
              <CalendarIcon />
            </button>
            <button type="button">
              Tutti i locali
              <ChevronIcon />
            </button>
          </div>
        </header>

        <div className={styles.kpiGrid}>
          {KPI_CARDS.map((card) => (
            <article className={styles.kpiCard} key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.trend} vs settimana precedente</small>
              <Sparkline tone="green" />
            </article>
          ))}
        </div>

        <div className={styles.dashboardLower}>
          <StoreTable />
          <MapCard />
        </div>
      </div>
    </div>
  );
}

function StoreTable(): ReactElement
{
  return (
    <div className={styles.tableCard}>
      <h3>Performance per pizzeria</h3>
      <div className={styles.table} role="table" aria-label="Performance per pizzeria">
        <div className={styles.tableHead} role="row">
          <span role="columnheader">Pizzeria</span>
          <span role="columnheader">Fatturato</span>
          <span role="columnheader">Ordini</span>
          <span role="columnheader">Scontrino medio</span>
          <span role="columnheader">Rating</span>
          <span role="columnheader">Trend</span>
        </div>
        {STORES.map((store) => (
          <div className={styles.tableRow} role="row" key={store.name}>
            <strong role="cell">{store.name}</strong>
            <span role="cell">{store.revenue}</span>
            <span role="cell">{store.orders}</span>
            <span role="cell">{store.average}</span>
            <span role="cell">★ {store.rating}</span>
            <span className={styles.trendCell} role="cell">
              <Sparkline tone={store.trend === "down" ? "red" : "green"} />
            </span>
          </div>
        ))}
      </div>
      <a className={styles.tableCta} href="/admin">
        Vedi tutte le pizzerie
        <ArrowIcon />
      </a>
    </div>
  );
}

function MapCard(): ReactElement
{
  return (
    <div className={styles.mapCard}>
      <h3>Mappa pizzerie</h3>
      <div className={styles.mapCanvas} aria-hidden="true">
        <svg viewBox="0 0 280 214">
          <path className={styles.sea} d="M0 0h280v214H0z" />
          <path
            className={styles.land}
            d="M0 8c38 10 51 19 87 14 34-5 55-23 93-12 33 10 52 29 87 28 7 0 11 1 13 3v173H0V8Z"
          />
          <path
            className={styles.italy}
            d="M111 31c21 11 33 28 35 51 1 14 16 16 23 25 8 10 5 22 18 28 8 4 20 5 21 14 1 8-11 11-19 9-16-3-24-15-31-25-6-10-18-14-23-25-7-15-1-29-9-44-5-10-16-13-19-24-1-5 0-8 4-9Z"
          />
          <path
            className={styles.island}
            d="M64 118c17 2 25 14 20 28-5 13-20 24-32 20-12-4-15-20-7-32 5-8 11-14 19-16Z"
          />
          <path className={styles.island} d="M147 163c13-2 26 4 29 15 3 10-6 20-20 20-13 0-24-9-22-19 1-8 5-14 13-16Z" />
        </svg>
        <MapPin className={styles.pinNorth} count="5" tone="green" />
        <MapPin className={styles.pinCenter} count="12" tone="yellow" />
        <MapPin className={styles.pinSouth} count="3" tone="green" />
        <MapPin className={styles.pinIsland} count="4" tone="green" />
      </div>
      <div className={styles.legend}>
        <span><i className={styles.greenDot} />Ottimo</span>
        <span><i className={styles.yellowDot} />Buono</span>
        <span><i className={styles.redDot} />Attenzione</span>
      </div>
    </div>
  );
}

interface MapPinProps
{
  readonly className: string;
  readonly count: string;
  readonly tone: "green" | "yellow";
}

function MapPin({ className, count, tone }: MapPinProps): ReactElement
{
  return <span className={`${styles.mapPin} ${styles[tone]} ${className}`}>{count}</span>;
}

interface SparklineProps
{
  readonly tone: "green" | "red";
}

function Sparkline({ tone }: SparklineProps): ReactElement
{
  const path = tone === "red" ? "M2 15 12 9 23 16 34 10 45 19 57 22" : "M2 18 12 12 23 15 34 7 45 12 57 4";

  return (
    <svg className={`${styles.sparkline} ${styles[tone]}`} viewBox="0 0 60 24" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

interface NavIconProps
{
  readonly index: number;
}

function NavIcon({ index }: NavIconProps): ReactElement
{
  const icons = [
    <HomeIcon key="home" />,
    <StoreIcon key="store" />,
    <BarsIcon key="bars" />,
    <ReceiptIcon key="receipt" />,
    <MenuIcon key="menu" />,
    <MegaphoneIcon key="marketing" />,
    <BoxIcon key="box" />,
    <UserIcon key="user" />,
    <GearIcon key="gear" />
  ];

  return icons[index] ?? <CircleIcon />;
}

function IconShell({ children }: { readonly children: ReactElement }): ReactElement
{
  return <svg aria-hidden="true" viewBox="0 0 24 24">{children}</svg>;
}

function BuildingIcon(): ReactElement
{
  return <IconShell><path d="M5 21V4h10v17M15 9h4v12M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1" /></IconShell>;
}

function StoreIcon(): ReactElement
{
  return <IconShell><path d="M4 10 5.5 4h13L20 10M5 10v10h14V10M8 20v-6h8v6M7 10a2 2 0 0 0 4 0M11 10a2 2 0 0 0 4 0M15 10a2 2 0 0 0 4 0" /></IconShell>;
}

function BarsIcon(): ReactElement
{
  return <IconShell><path d="M5 20V10h3v10M11 20V5h3v15M17 20v-8h3v8" /></IconShell>;
}

function UsersIcon(): ReactElement
{
  return <IconShell><path d="M8.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20c.8-4 2.6-6 5.5-6s4.7 2 5.5 6M17 11a2.5 2.5 0 1 0 0-5M15 14c2.8.2 4.8 2.2 5.6 6" /></IconShell>;
}

function TagIcon(): ReactElement
{
  return <IconShell><path d="M4 12.5 12.5 4H20v7.5L11.5 20 4 12.5ZM16 8h.1" /></IconShell>;
}

function GearIcon(): ReactElement
{
  return <IconShell><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM4 12h2M18 12h2M12 4v2M12 18v2M6.4 6.4l1.4 1.4M16.2 16.2l1.4 1.4M17.6 6.4l-1.4 1.4M7.8 16.2l-1.4 1.4" /></IconShell>;
}

function ClockIcon(): ReactElement
{
  return <IconShell><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" /></IconShell>;
}

function BellIcon(): ReactElement
{
  return <IconShell><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></IconShell>;
}

function SyncIcon(): ReactElement
{
  return <IconShell><path d="M20 7v5h-5M4 17v-5h5M18 12a6 6 0 0 0-10.4-4M6 12a6 6 0 0 0 10.4 4" /></IconShell>;
}

function GlobeIcon(): ReactElement
{
  return <IconShell><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.3 2.5 3.4 5.5 3.4 9s-1.1 6.5-3.4 9M12 3c-2.3 2.5-3.4 5.5-3.4 9s1.1 6.5 3.4 9" /></IconShell>;
}

function SmileIcon(): ReactElement
{
  return <IconShell><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 10h.1M16 10h.1M8 15c2.3 2 5.7 2 8 0" /></IconShell>;
}

function ShieldIcon(): ReactElement
{
  return <IconShell><path d="M12 22c5-2 8-5.8 8-11V5l-8-3-8 3v6c0 5.2 3 9 8 11ZM9 12l2 2 4-5" /></IconShell>;
}

function ArrowIcon(): ReactElement
{
  return <IconShell><path d="M5 12h14M13 6l6 6-6 6" /></IconShell>;
}

function ChevronIcon(): ReactElement
{
  return <IconShell><path d="m7 10 5 5 5-5" /></IconShell>;
}

function CalendarIcon(): ReactElement
{
  return <IconShell><path d="M7 3v4M17 3v4M4 8h16M5 5h14v15H5z" /></IconShell>;
}

function SliceIcon(): ReactElement
{
  return <IconShell><path d="M4.5 4.2 20 9 9 21 4.5 4.2ZM7.5 8.2c4.6.2 8 1.2 10.5 3.2M10 12h.1M13.5 15.8h.1" /></IconShell>;
}

function HomeIcon(): ReactElement
{
  return <IconShell><path d="M4 11 12 4l8 7v9H6v-7h12" /></IconShell>;
}

function ReceiptIcon(): ReactElement
{
  return <IconShell><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6" /></IconShell>;
}

function MenuIcon(): ReactElement
{
  return <IconShell><path d="M7 5h10M7 12h10M7 19h10" /></IconShell>;
}

function MegaphoneIcon(): ReactElement
{
  return <IconShell><path d="M4 13h4l9 5V6l-9 5H4v2ZM8 13l2 6" /></IconShell>;
}

function BoxIcon(): ReactElement
{
  return <IconShell><path d="M4 8 12 4l8 4-8 4-8-4ZM4 8v8l8 4 8-4V8M12 12v8" /></IconShell>;
}

function UserIcon(): ReactElement
{
  return <IconShell><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21c1-4 3.3-6 7-6s6 2 7 6" /></IconShell>;
}

function CircleIcon(): ReactElement
{
  return <IconShell><circle cx="12" cy="12" r="4" /></IconShell>;
}
