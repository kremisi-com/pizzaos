"use client";

import { useId, useState, type ReactElement } from "react";
import styles from "./ecosystem-section.module.css";

type EcosystemCategory =
  | "Ordini"
  | "Crescita"
  | "AI"
  | "Operatività"
  | "Pagamenti";

type EcosystemStatus = "Live nella demo" | "Prossimamente" | "In roadmap";

type EcosystemIcon =
  | "orders"
  | "pizza"
  | "analytics"
  | "marketing"
  | "delivery"
  | "group"
  | "stores"
  | "loyalty"
  | "inventory"
  | "payments"
  | "brand";

interface EcosystemItem {
  readonly icon: EcosystemIcon;
  readonly category: EcosystemCategory;
  readonly status: EcosystemStatus;
  readonly title: string;
  readonly description: string;
  readonly features: readonly string[];
}

const ECOSYSTEM_FILTERS = [
  "Tutto",
  "Ordini",
  "Crescita",
  "AI",
  "Operatività",
  "Pagamenti",
] as const;

type EcosystemFilter = (typeof ECOSYSTEM_FILTERS)[number];

const ECOSYSTEM_ITEMS: readonly EcosystemItem[] = [
  {
    icon: "orders",
    category: "Ordini",
    status: "Live nella demo",
    title: "Ordini digitali",
    description:
      "Ricevi ordini online con menu personalizzato, checkout guidato, pagamenti e disponibilità sempre aggiornata.",
    features: [
      "Menu digitale personalizzato",
      "Ordinazione da app/web",
      "Prodotti a crudo o cotti",
      "Checkout guidato",
      "Pagamento online",
      "Login con magic link o social",
      "Archivio ordini",
      "Riordino rapido",
      "Ordina come l’ultima volta",
      "Disponibilità prodotti",
      "Slot sold-out visivi",
    ],
  },
  {
    icon: "pizza",
    category: "Ordini",
    status: "Live nella demo",
    title: "Pizza builder",
    description:
      "Permetti ai clienti di creare pizze personalizzate con impasti, basi, topping, allergeni e prezzo in tempo reale.",
    features: [
      "Personalizzazione estrema della pizza",
      "Impasti diversi",
      "Base rossa, bianca o speciale",
      "Topping configurabili",
      "Ingredienti extra",
      "Allergeni sempre visibili",
      "Prezzo aggiornato in tempo reale",
      "Creazione pizza custom",
      "Riordino delle pizze personalizzate",
    ],
  },
  {
    icon: "group",
    category: "Ordini",
    status: "Live nella demo",
    title: "Ordine di gruppo",
    description:
      "Fai ordinare più persone dallo stesso menu condiviso, ognuna dal proprio dispositivo.",
    features: [
      "Menu condiviso tra più dispositivi",
      "Ognuno personalizza il proprio ordine",
      "Carrello condiviso",
      "Totale aggiornato in tempo reale",
      "Split conto tra amici",
      "Conferma finale da un solo utente",
    ],
  },
  {
    icon: "marketing",
    category: "Crescita",
    status: "Live nella demo",
    title: "Marketing automation",
    description:
      "Automatizza coupon, promo, recupero clienti inattivi, compleanni, feedback e recensioni Google.",
    features: [
      "Coupon dall’app",
      "Cliente inattivo → sconto automatico",
      "Post ordine → promo entro 48h",
      "Compleanno → promo automatica",
      "Invito al feedback post ordine",
      "Recensione positiva → link Google",
      "Abbinamenti contestuali",
      "Notifiche post ordine",
      "Premi e campagne fedeltà",
    ],
  },
  {
    icon: "loyalty",
    category: "Crescita",
    status: "Live nella demo",
    title: "Loyalty & abbonamenti",
    description:
      "Costruisci relazioni continuative con tessere fedeltà, punti, premi, card mensili e abbonamenti pizza.",
    features: [
      "Tessera fedeltà",
      "Raccolta punti",
      "Card mensili",
      "Abbonamento pizze",
      "Benefici per clienti affezionati",
      "Premi automatici",
      "Coupon dedicati",
    ],
  },
  {
    icon: "analytics",
    category: "AI",
    status: "Live nella demo",
    title: "Analytics AI",
    description:
      "Analizza vendite, domanda e comportamento dei clienti con insight automatici e suggerimenti operativi.",
    features: [
      "Dashboard operativa",
      "Pattern di vendita",
      "Forecasting domanda",
      "Transactional clustering",
      "Suggerimenti AI",
      "Heatmap menu",
      "A/B test menu",
      "Suggerimenti su promo e pricing",
    ],
  },
  {
    icon: "delivery",
    category: "Operatività",
    status: "Live nella demo",
    title: "Delivery & tracciamento",
    description:
      "Gestisci consegne, rider, notifiche e tracciamento live con stato ordine sempre chiaro per il cliente.",
    features: [
      "Stato ordine chiaro",
      "Notifiche sugli ordini",
      "Tracciamento live rider",
      "Ottimizzazione consegne",
      "Assegnazione rider automatica",
      "Integrazione Deliveroo",
      "Tempi stimati per consegna",
    ],
  },
  {
    icon: "stores",
    category: "Operatività",
    status: "Live nella demo",
    title: "Gestione ristorante",
    description:
      "Coordina ordini, reparti, staff, priorità e sedi da un pannello pensato per il lavoro quotidiano.",
    features: [
      "Pannello amministrativo ordini",
      "Prioritizzazione ordini",
      "Smistamento comande per reparto",
      "Tempi stimati per reparto",
      "Menu stagionale",
      "Staff dedicato",
      "Gestione catene",
      "Multi-sede",
      "Network di pizzerie",
    ],
  },
  {
    icon: "inventory",
    category: "Operatività",
    status: "Prossimamente",
    title: "Gestione magazzino",
    description:
      "Collega inventario, ingredienti e menu per evitare vendite impossibili e aggiornare gli esauriti in tempo reale.",
    features: [
      "Inventario in tempo reale",
      "Collegamento prodotti-menu",
      "Esaurito automatico",
      "Disponibilità ingredienti",
      "Suggerimenti promo su scorte in eccesso",
      "Controllo impasti disponibili",
    ],
  },
  {
    icon: "payments",
    category: "Pagamenti",
    status: "In roadmap",
    title: "Pagamenti & integrazioni",
    description:
      "Unifica pagamenti, split conto, fatture, scontrini elettronici, POS e integrazioni con la cassa.",
    features: [
      "Pagamento da app",
      "Split conto",
      "Fattura via WhatsApp o email",
      "Fatturazione automatica",
      "Integrazione cassa/POS",
      "Scontrino elettronico automatico",
      "Servizi di pagamento europei",
    ],
  },
  {
    icon: "brand",
    category: "Crescita",
    status: "Live nella demo",
    title: "Brand & canali proprietari",
    description:
      "Trasforma il menu in un canale proprietario, brandizzato e senza commissioni sugli ordini.",
    features: [
      "Dominio personale",
      "Ecosistema monobrand",
      "Stile menu su misura",
      "Zero commissioni sugli ordini",
      "Link ordine via WhatsApp",
      "Link automatico quando il cliente chiama",
    ],
  },
] as const;

export function EcosystemSection(): ReactElement {
  const detailsBaseId = useId();
  const [activeFilter, setActiveFilter] = useState<EcosystemFilter>("Tutto");
  const [openCardTitle, setOpenCardTitle] = useState<string | null>(null);

  const visibleItems = ECOSYSTEM_ITEMS.filter(
    (item) => activeFilter === "Tutto" || item.category === activeFilter,
  );

  function handleFilterChange(nextFilter: EcosystemFilter): void {
    setActiveFilter(nextFilter);
    setOpenCardTitle(null);
  }

  function handleCardToggle(title: string): void {
    setOpenCardTitle((currentTitle) => (currentTitle === title ? null : title));
  }

  return (
    <section
      id="ecosistema"
      className={styles.section}
      aria-label="Ecosistema PizzaOS"
    >
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>
            <EcosystemIcon />
            ECOSISTEMA
          </span>
          <h2 className={styles.title}>
            Tutto il sistema operativo della tua pizzeria
          </h2>
          <p className={styles.description}>
            Dagli ordini online alla fidelizzazione, dal magazzino alla
            consegna: PizzaOS riunisce in un’unica piattaforma le funzioni che
            oggi sono sparse tra menu digitali, gestionali, POS e strumenti
            marketing.
          </p>
        </div>

        <div
          className={styles.filters}
          role="tablist"
          aria-label="Filtra funzionalità PizzaOS"
        >
          {ECOSYSTEM_FILTERS.map((filter) => {
            const isActive = filter === activeFilter;

            return (
              <button
                key={filter}
                type="button"
                className={`${styles.filterButton} ${
                  isActive ? styles.filterButtonActive : ""
                }`}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleFilterChange(filter)}
              >
                {filter}
              </button>
            );
          })}
        </div>

        <div className={styles.grid} role="list">
          {visibleItems.map((item) => {
            const isOpen = openCardTitle === item.title;
            const detailsId = `${detailsBaseId}-${item.title
              .toLowerCase()
              .replaceAll(" ", "-")
              .replaceAll("&", "e")}`;
            const additionalFeatureCount = item.features.length;
            const additionalFeatureLabel = `+${additionalFeatureCount} funzioni incluse`;
            const statusClassName = getStatusClassName(item.status);

            return (
              <article
                key={item.title}
                className={`${styles.card} ${isOpen ? styles.cardOpen : ""}`}
                role="listitem"
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardIcon} aria-hidden="true">
                    {renderIcon(item.icon)}
                  </div>
                  <span className={`${styles.statusBadge} ${statusClassName}`}>
                    {item.status}
                  </span>
                </div>

                <div className={styles.cardBody}>
                  <span className={styles.category}>{item.category}</span>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardDescription}>{item.description}</p>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.detailsButton}
                    aria-expanded={isOpen}
                    aria-controls={detailsId}
                    onClick={() => handleCardToggle(item.title)}
                  >
                    <span>
                      {isOpen ? "Nascondi dettagli" : "Vedi tutte le funzioni"}
                    </span>
                    {!isOpen && additionalFeatureCount > 0 ? (
                      <span className={styles.moreCount}>
                        {additionalFeatureLabel}
                      </span>
                    ) : null}
                  </button>
                </div>

                <div
                  className={`${styles.detailsPanel} ${
                    isOpen ? styles.detailsPanelOpen : ""
                  }`}
                  id={detailsId}
                  aria-hidden={!isOpen}
                >
                  <div className={styles.detailsInner}>
                    <ul className={styles.featureList}>
                      {item.features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function getStatusClassName(status: EcosystemStatus): string {
  if (status === "Live nella demo") return styles.statusLive;

  if (status === "Prossimamente") return styles.statusSoon;

  return styles.statusRoadmap;
}

function renderIcon(icon: EcosystemIcon): ReactElement {
  switch (icon) {
    case "orders":
      return <PhoneIcon />;
    case "pizza":
      return <PizzaIcon />;
    case "analytics":
      return <ChartIcon />;
    case "marketing":
      return <TargetIcon />;
    case "delivery":
      return <ScooterIcon />;
    case "group":
      return <UsersIcon />;
    case "stores":
      return <StoreIcon />;
    case "loyalty":
      return <GiftIcon />;
    case "inventory":
      return <BoxIcon />;
    case "payments":
      return <CreditCardIcon />;
    case "brand":
      return <GlobeIcon />;
  }
}

function EcosystemIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
      <path d="M12 12 20 7.5" />
      <path d="M12 12v9" />
      <path d="M12 12 4 7.5" />
    </svg>
  );
}

function PhoneIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M10 18h4" />
      <path d="M9 7h6" />
    </svg>
  );
}

function PizzaIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 20 20 4" />
      <path d="M20 4c-5.8-.5-10.9 1.3-15.2 5.6L4 20l10.4-.8C18.7 14.9 20.5 9.8 20 4Z" />
      <circle cx="11" cy="11" r="1.3" />
      <circle cx="15" cy="8" r="1.3" />
      <circle cx="14" cy="15" r="1.3" />
    </svg>
  );
}

function ChartIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 3-4 3 2 5-7" />
      <path d="M18 6h-4" />
    </svg>
  );
}

function TargetIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M22 12h-3" />
      <path d="M12 22v-3" />
      <path d="M2 12h3" />
    </svg>
  );
}

function ScooterIcon(): ReactElement {
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

function UsersIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.8-3.2 2.7-5 5.5-5s4.7 1.8 5.5 5" />
      <path d="M15 6.5a3 3 0 0 1 0 5.7" />
      <path d="M16.5 14.2c2 .6 3.3 2.2 4 4.8" />
    </svg>
  );
}

function StoreIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10h16l-1.4-5H5.4L4 10Z" />
      <path d="M6 10v10h12V10" />
      <path d="M9 20v-6h6v6" />
      <path d="M4 10c0 1.4 1.1 2.5 2.5 2.5S9 11.4 9 10" />
      <path d="M9 10c0 1.4 1.1 2.5 2.5 2.5S14 11.4 14 10" />
      <path d="M14 10c0 1.4 1.1 2.5 2.5 2.5S19 11.4 19 10" />
    </svg>
  );
}

function GiftIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 10h16v10H4V10Z" />
      <path d="M12 10v10" />
      <path d="M4 14h16" />
      <path d="M12 10H8a2 2 0 1 1 2-2c0 1.1 2 2 2 2Z" />
      <path d="M12 10h4a2 2 0 1 0-2-2c0 1.1-2 2-2 2Z" />
    </svg>
  );
}

function BoxIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
      <path d="m8 5.5 8 4.5" />
    </svg>
  );
}

function CreditCardIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
      <path d="M15 15h2" />
    </svg>
  );
}

function GlobeIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9" />
      <path d="M12 3C9.8 5.4 8.7 8.4 8.7 12s1.1 6.6 3.3 9" />
    </svg>
  );
}
