import { Button, Card, StatusIndicator } from "@pizzaos/ui";
import { type ReactElement } from "react";
import styles from "./integrations-manager.module.css";

const INTEGRATIONS = [
  {
    id: "deliveroo",
    name: "Deliveroo",
    description: "Placeholder demo: integrazione non attiva nel POC frontend-only.",
    logo: "🛵"
  }
] as const;

export function IntegrationsManager(): ReactElement {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>Integrazioni Esterne</h2>
        <p className={styles.subtitle}>Nel POC mostriamo solo integrazioni placeholder non operative.</p>
      </header>

      <div className={styles.grid}>
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.id}>
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.logo}>{integration.logo}</div>
                <div className={styles.status}>
                  <StatusIndicator
                    tone="idle"
                    label="Placeholder"
                  />
                </div>
              </div>
              <h3 className={styles.integrationName}>{integration.name}</h3>
              <p className={styles.description}>{integration.description}</p>
              <div className={styles.actions}>
                <Button variant="secondary" style={{ width: "100%" }}>
                  Dettagli demo
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
              Le integrazioni reali non sono incluse nel POC. Questa sezione rappresenta solo la roadmap prodotto.
            </p>
            <Button variant="ghost">Vedi roadmap integrazioni</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
