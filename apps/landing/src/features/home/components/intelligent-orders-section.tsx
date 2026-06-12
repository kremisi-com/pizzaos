import Link from "next/link";
import Image from "next/image";
import type { ReactElement } from "react";
import styles from "./intelligent-orders-section.module.css";

const ORDER_PILLARS = [
  {
    icon: <RoutingIcon />,
    title: "Smistamento automatico",
    text: "Ogni ordine viene inviato al reparto giusto: cucina, bar, forno, delivery e molto altro.",
  },
  {
    icon: <PriorityIcon />,
    title: "Prioritizzazione intelligente",
    text: (
      <>
        Al tavolo &gt; Asporto &gt; Delivery.
        <br />
        Tu decidi le regole, PizzaOS le applica.
      </>
    ),
  },
  {
    icon: <ClockIcon />,
    title: "Tempi stimati per reparto",
    text: "Ogni reparto conosce i propri tempi e l'ordine viene aggiornato in automatico.",
  },
] as const;

const NAV_ITEMS = [
  { label: "Ordini", count: "23", active: true, icon: <ReceiptIcon /> },
  { label: "Dashboard", icon: <HomeIcon /> },
  { label: "Comande", icon: <TicketIcon /> },
  { label: "Reparti", icon: <GridIcon /> },
  { label: "Menu", icon: <MenuIcon /> },
  { label: "Inventario", icon: <BoxIcon /> },
  { label: "Clienti", icon: <UserIcon /> },
  { label: "Marketing", icon: <MegaphoneIcon /> },
  { label: "Impostazioni", icon: <SettingsIcon /> },
] satisfies readonly {
  readonly label: string;
  readonly count?: string;
  readonly active?: boolean;
  readonly icon: ReactElement;
}[];

const ORDER_FILTERS = [
  { label: "Tutti", count: "23", active: true },
  { label: "Al tavolo", count: "8" },
  { label: "Asporto", count: "6" },
  { label: "Delivery", count: "9" },
] satisfies readonly {
  readonly label: string;
  readonly count: string;
  readonly active?: boolean;
}[];

const LANES = [
  {
    title: "Cucina",
    count: "8",
    tone: "red",
    orders: [
      {
        id: "#1258",
        meta: "2 min fa",
        destination: "Tavolo 12",
        items: ["2x Margherita DOP", "1x Diavola", "1x Bufalina"],
        customer: "Luca R.",
        footer: "Prep. stimata",
        time: "12 min",
      },
      {
        id: "#1257",
        meta: "4 min fa",
        destination: "Asporto",
        items: ["1x Capricciosa", "1x Crocchè"],
        customer: "Marco B.",
        footer: "Prep. stimata",
        time: "10 min",
      },
    ],
  },
  {
    title: "Forno",
    count: "5",
    tone: "orange",
    orders: [
      {
        id: "#1256",
        meta: "1 min fa",
        destination: "Tavolo 8",
        items: ["1x Margherita DOP", "1x 4 Formaggi"],
        customer: "Giulia P.",
        footer: "In forno",
        time: "5 min",
      },
      {
        id: "#1255",
        meta: "3 min fa",
        destination: "Asporto",
        items: ["2x Marinara", "1x Fritti misti"],
        customer: "Andrea M.",
        footer: "In forno",
        time: "7 min",
      },
    ],
  },
  {
    title: "Bar",
    count: "3",
    tone: "blue",
    orders: [
      {
        id: "#1254",
        meta: "2 min fa",
        destination: "Tavolo 5",
        items: ["2x Coca Cola", "2x Birra Moretti", "1x Acqua frizzante"],
        customer: "Elisa T.",
        footer: "Prep. stimata",
        time: "4 min",
      },
      {
        id: "#1253",
        meta: "5 min fa",
        destination: "Asporto",
        items: ["1x Spritz", "1x Lemon Soda"],
        customer: "Francesco P.",
        footer: "Prep. stimata",
        time: "3 min",
      },
    ],
  },
  {
    title: "Delivery",
    count: "7",
    tone: "green",
    orders: [
      {
        id: "#1252",
        meta: "3 min fa",
        destination: "Via Toledo, 123",
        items: ["1x Margherita", "1x Patatine fritte", "1x Coca Cola"],
        customer: "Sara G.",
        footer: "In consegna",
        time: "15 min",
      },
      {
        id: "#1251",
        meta: "6 min fa",
        destination: "Corso Umberto, 45",
        items: ["1x Diavola", "1x Birra Moretti"],
        customer: "Lorenzo V.",
        footer: "Assegnato a Rider Luca",
        time: "",
      },
    ],
  },
] as const;

type IntegrationPartner = {
  readonly name: string;
  readonly logo: {
    readonly src: string;
    readonly width: number;
    readonly height: number;
  };
};

const INTEGRATIONS = [
  {
    name: "Deliveroo",
    logo: {
      src: "/images/deliveroo.png",
      width: 1280,
      height: 342,
    },
  },
] satisfies readonly IntegrationPartner[];

const AUTO_SEND = [
  { label: "Stampante", icon: <PrinterIcon /> },
  { label: "Display cucina", icon: <DisplayIcon /> },
  { label: "Tablet reparto", icon: <TabletIcon /> },
  { label: "Notifiche push", icon: <BellIcon /> },
] as const;

const BENEFITS = [
  {
    icon: <ShieldIcon />,
    title: "Meno errori",
    text: "Ordini sempre chiari e senza fraintendimenti.",
  },
  {
    icon: <SpeedIcon />,
    title: "Più velocità",
    text: "Processi più rapidi e reparti sempre allineati.",
  },
  {
    icon: <TargetIcon />,
    title: "Più controllo",
    text: "Monitora ogni ordine in tempo reale.",
  },
  {
    icon: <SmileIcon />,
    title: "Clienti più felici",
    text: "Ordini puntuali, comunicazioni chiare, esperienze top.",
  },
] as const;

export function IntelligentOrdersSection(): ReactElement {
  return (
    <section
      className={styles.section}
      id="gestione-ordini"
      aria-labelledby="intelligent-orders-title"
    >
      <div className={styles.inner}>
        <div className={styles.topGrid}>
          <div className={styles.copyColumn}>
            <h2 className={styles.title} id="intelligent-orders-title">
              Tutto sotto controllo,
              <br />
              <span>ogni ordine al posto giusto.</span>
            </h2>

            <p className={styles.subtitle}>
              PizzaOS smista automaticamente gli ordini, ottimizza i tempi,
              prioritizza ciò che conta e semplifica il lavoro di ogni reparto.
            </p>

            <div className={styles.pillars}>
              {ORDER_PILLARS.map((pillar) => (
                <article className={styles.pillar} key={pillar.title}>
                  <span className={styles.pillarIcon}>{pillar.icon}</span>
                  <div>
                    <h3>{pillar.title}</h3>
                    <p>{pillar.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.visualColumn}>
            <DashboardMockup />
          </div>
        </div>

        <div className={styles.deviceLayer} aria-hidden="true">
          <SmistaGraphic />
        </div>

        <div className={styles.integrationPanel}>
          <div className={styles.deliveryPartner}>
            <p className={styles.deliveryPartnerText}>
              <b>Non possiedi riders?</b> PizzaOS è indicata anche per chi non
              vuole gestire una flotta di rider interna: gli ordini possono
              integrarsi con Deliveroo, mantenendo controllo operativo e
              semplicità di gestione.
            </p>
            <div className={styles.integrationLogos}>
              {INTEGRATIONS.map((integration) => (
                <strong
                  className={styles.integrationLogo}
                  key={integration.name}
                >
                  <Image
                    className={styles.integrationLogoImage}
                    src={integration.logo.src}
                    alt={integration.name}
                    width={integration.logo.width}
                    height={integration.logo.height}
                  />
                </strong>
              ))}
            </div>
          </div>

          <div className={styles.panelDivider} />

          <div className={styles.autoSend}>
            <span className={styles.panelTitle}>Invio comande automatico</span>
            <div className={styles.autoSendItems}>
              {AUTO_SEND.map((item) => (
                <div className={styles.autoSendItem} key={item.label}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.benefitBar}>
          {BENEFITS.map((benefit) => (
            <article className={styles.benefit} key={benefit.title}>
              <span className={styles.benefitIcon}>{benefit.icon}</span>
              <div>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </div>
            </article>
          ))}

          <Link className={styles.cta} href="#ecosistema">
            Scopri tutte le funzionalità
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup(): ReactElement {
  return (
    <div className={styles.dashboard} aria-label="Dashboard ordini PizzaOS">
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Image
            className={styles.logoImage}
            src="/brand/logo-horizontal-color.svg"
            alt="PizzaOS"
            width={1663}
            height={332}
            priority={false}
          />
        </div>

        <nav
          className={styles.sideNav}
          aria-label="Navigazione dashboard simulata"
        >
          {NAV_ITEMS.map((item) => (
            <div
              className={`${styles.sideItem} ${item.active ? styles.sideItemActive : ""}`}
              key={item.label}
            >
              {item.icon}
              <span>{item.label}</span>
              {"count" in item ? <b>{item.count}</b> : null}
            </div>
          ))}
        </nav>

        <div className={styles.restaurantAccount}>
          <UserIcon />
          <div>
            <strong>pizza demo</strong>
            <span>centro operativo</span>
          </div>
        </div>
      </aside>

      <div className={styles.board}>
        <header className={styles.boardHeader}>
          <h3>Ordini in tempo reale</h3>
          <div className={styles.boardActions}>
            <button type="button" className={styles.filterButton}>
              <FilterIcon />
              Filtri
            </button>
            <button type="button" className={styles.newOrderButton}>
              + Nuovo ordine
            </button>
          </div>
        </header>

        <div className={styles.filters}>
          {ORDER_FILTERS.map((filter) => (
            <span
              className={filter.active ? styles.filterActive : ""}
              key={filter.label}
            >
              {filter.label} <b>{filter.count}</b>
            </span>
          ))}
        </div>

        <div className={styles.lanes}>
          {LANES.map((lane) => (
            <div
              className={`${styles.lane} ${styles[`lane-${lane.tone}`]}`}
              key={lane.title}
            >
              <div className={styles.laneHeader}>
                <strong>{lane.title}</strong>
                <span>{lane.count}</span>
              </div>
              {lane.orders.map((order) => (
                <article className={styles.orderCard} key={order.id}>
                  <div className={styles.orderTop}>
                    <strong>{order.id}</strong>
                    <span>{order.meta}</span>
                  </div>
                  <b className={styles.destination}>{order.destination}</b>
                  <ul>
                    {order.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <div className={styles.customer}>
                    <UserIcon />
                    <span>{order.customer}</span>
                  </div>
                  <div className={styles.orderFooter}>
                    <span>{order.footer}</span>
                    {order.time ? <b>{order.time}</b> : null}
                  </div>
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SmistaGraphic(): ReactElement {
  return (
    <div className={styles.smistaGraphic}>
      <Image
        src="/images/smista.png"
        alt=""
        fill
        sizes="420px"
        style={{ objectFit: "contain", objectPosition: "center" }}
      />
    </div>
  );
}

function RoutingIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="6" cy="17" r="2.5" />
      <circle cx="18" cy="17" r="2.5" />
      <circle cx="12" cy="7" r="2.5" />
      <path d="M12 9.5v4.3M8.2 15.5 10.3 12M15.8 15.5 13.7 12" />
    </svg>
  );
}

function PriorityIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  );
}

function ClockIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function ReceiptIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 4h10v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2V4Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function HomeIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m4 11 8-7 8 7v9h-5v-6H9v6H4v-9Z" />
    </svg>
  );
}

function TicketIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 5h14v14H5V5Z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  );
}

function GridIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 5h6v6H5V5ZM13 5h6v6h-6V5ZM5 13h6v6H5v-6ZM13 13h6v6h-6v-6Z" />
    </svg>
  );
}

function MenuIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 7h12M6 12h12M6 17h12" />
    </svg>
  );
}

function BoxIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 8.5 12 5l7 3.5v7L12 19l-7-3.5v-7Z" />
      <path d="m5 8.5 7 3.5 7-3.5M12 12v7" />
    </svg>
  );
}

function UserIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.8-4 3-6 6.5-6s5.7 2 6.5 6" />
    </svg>
  );
}

function MegaphoneIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 13h3l9 4V7l-9 4H4v2Z" />
      <path d="m7 13 1 5" />
    </svg>
  );
}

function SettingsIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2.1-1.2L14 3h-4l-.4 2.6a7.6 7.6 0 0 0-2.1 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2.1 1.2L10 21h4l.4-2.6a7.6 7.6 0 0 0 2.1-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  );
}

function FilterIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 6h14l-5.4 6.2V18l-3.2 1v-6.8L5 6Z" />
    </svg>
  );
}

function PrinterIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 8V4h10v4M7 17H5V9h14v8h-2M7 14h10v6H7v-6Z" />
      <path d="M17 12h.1" />
    </svg>
  );
}

function DisplayIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h16v11H4V5ZM9 20h6M12 16v4" />
    </svg>
  );
}

function TabletIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M12 18h.1" />
    </svg>
  );
}

function BellIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 16h12l-1.3-2V10a4.7 4.7 0 0 0-9.4 0v4L6 16ZM10 19h4" />
    </svg>
  );
}

function ShieldIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 19 6v5c0 4.2-2.5 7.5-7 10-4.5-2.5-7-5.8-7-10V6l7-3Z" />
      <path d="m9 12 2 2 4-5" />
    </svg>
  );
}

function SpeedIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 17a8 8 0 1 1 14 0" />
      <path d="m12 15 4-5" />
      <path d="M8 18h8" />
    </svg>
  );
}

function TargetIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </svg>
  );
}

function SmileIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 14.5c1 1.4 2.1 2 3.5 2s2.5-.6 3.5-2M9 9.5h.1M15 9.5h.1" />
    </svg>
  );
}

function ArrowIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
