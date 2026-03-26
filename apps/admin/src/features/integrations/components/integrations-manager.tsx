import { Badge, Button, Card, StatusIndicator } from "@pizzaos/ui";
import { type ReactElement } from "react";
import styles from "./integrations-manager.module.css";

const INTEGRATIONS = [
  {
    id: "deliveroo",
    name: "Deliveroo",
    description: "Ricevi ordini direttamente da Deliveroo nel tuo POS.",
    status: "connected",
    logo: "🛵"
  },
  {
    id: "glovo",
    name: "Glovo",
    description: "Integrazione completa con la piattaforma Glovo.",
    status: "disconnected",
    logo: "🧤"
  },
  {
    id: "justeat",
    name: "Just Eat",
    description: "Sincronizza il tuo menù con Just Eat in tempo reale.",
    status: "disconnected",
    logo: "🥡"
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Gestione pagamenti sicura e reportistica avanzata.",
    status: "connected",
    logo: "💳"
  }
] as const;

export function IntegrationsManager(): ReactElement {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>Integrazioni Esterne</h2>
        <p className={styles.subtitle}>Connetti PizzaOS con le tue piattaforme preferite.</p>
      </header>

      <div className={styles.grid}>
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.id}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.logo}>{integration.logo}</div>
                <div className={styles.status}>
                  <StatusIndicator tone={integration.status === "connected" ? "active" : "idle"} />
                  <span className={styles.statusText}>
                    {integration.status === "connected" ? "Connesso" : "Disponibile"}
                  </span>
                </div>
              </div>
              <h3 className={styles.integrationName}>{integration.name}</h3>
              <p className={styles.description}>{integration.description}</p>
              <div className={styles.actions}>
                <Button variant={integration.status === "connected" ? "secondary" : "primary"} style={{ width: "100%" }}>
                  {integration.status === "connected" ? "Gestisci" : "Connetti"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className={styles.placeholderSection}>
        <Card>
          <div className={styles.placeholderContent}>
            <h3>Sviluppo API Personalizzate</h3>
            <p>
              Hai bisogno di un'integrazione specifica per il tuo business? PizzaOS offre API robuste per 
              sviluppatori.
            </p>
            <Button variant="ghost">Leggi la documentazione API →</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
