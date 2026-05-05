import type { ReactElement } from "react";
import styles from "./ecosystem-section.module.css";

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
  readonly title: string;
  readonly features: readonly string[];
}

const ECOSYSTEM_ITEMS: readonly EcosystemItem[] = [
  {
    icon: "orders",
    title: "Ordini digitali",
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
    title: "Pizza builder",
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
    title: "Ordine di gruppo",
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
    title: "Marketing automation",
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
    title: "Loyalty & abbonamenti",
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
    title: "Analytics AI",
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
    title: "Delivery & tracciamento",
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
    title: "Gestione ristorante",
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
    title: "Magazzino",
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
    title: "Pagamenti & integrazioni",
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
    title: "Brand & canali proprietari",
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
            Tutto ciò che una pizzeria moderna può <span>immaginare.</span>
          </h2>
          <p className={styles.description}>
            Dal primo ordine digitale alla gestione multi-sede: PizzaOS cresce
            con te.
            <br />
            Ogni area è pensata per controllo operativo, canali proprietari e
            crescita senza commissioni.
          </p>
        </div>

        <div className={styles.grid} role="list">
          {ECOSYSTEM_ITEMS.map((item) => (
            <div key={item.title} className={styles.card} role="listitem">
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon} aria-hidden="true">
                  {renderIcon(item.icon)}
                </div>
              </div>
              <div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <ul className={styles.featureList}>
                  {item.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
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
