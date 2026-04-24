import type { InventoryItem, Product, EntityIdentifier } from "@pizzaos/domain";
import { Button, Card, Badge } from "@pizzaos/ui";
import { type ReactElement } from "react";
import styles from "./inventory-manager.module.css";

interface InventoryManagerProps {
  readonly inventory: readonly InventoryItem[];
  readonly products: readonly Product[];
  readonly isDynamicPricingEnabled: boolean;
  readonly onToggleDynamicPricing: () => void;
  readonly onUpdateInventoryItem: (itemId: EntityIdentifier, status: "in_stock" | "low_stock" | "out_of_stock", availableUnits: number) => void;
}

export function InventoryManager({
  inventory,
  products,
  isDynamicPricingEnabled,
  onToggleDynamicPricing,
  onUpdateInventoryItem
}: InventoryManagerProps): ReactElement {
  function getProductName(productId: EntityIdentifier): string {
    return products.find((product) => product.id === productId)?.name ?? "Prodotto Sconosciuto";
  }

  function getStatusTone(status: InventoryItem["status"]): "success" | "warning" | "critical" {
    switch (status) {
      case "in_stock":
        return "success";
      case "low_stock":
        return "warning";
      case "out_of_stock":
        return "critical";
    }
  }

  function getStatusLabel(status: InventoryItem["status"]): string {
    switch (status) {
      case "in_stock":
        return "In Stock";
      case "low_stock":
        return "Scorte Basse";
      case "out_of_stock":
        return "Esaurito";
    }
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>Gestione Magazzino</h2>
          <p className={styles.subtitle}>Monitora le scorte e configura i controlli di prezzo</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.main}>
          <Card title="Disponibilità Prodotti">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Prodotto</th>
                  <th>SKU</th>
                  <th>Unità</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td className={styles.productCell}>{getProductName(item.productId)}</td>
                    <td className={styles.skuCell}>{item.sku}</td>
                    <td>{item.availableUnits}</td>
                    <td>
                      <Badge tone={getStatusTone(item.status)}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Button 
                          variant="ghost" 
                          onClick={() => {
                            if (item.status === "out_of_stock") {
                              const randomUnits = Math.floor(Math.random() * 50) + 10;
                              onUpdateInventoryItem(item.id, "in_stock", randomUnits);
                            } else {
                              onUpdateInventoryItem(item.id, "out_of_stock", 0);
                            }
                          }}
                        >
                          {item.status === "out_of_stock" ? "Ripristina" : "Segna Esaurito"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <aside className={styles.sidebar}>
          <Card title="Ottimizzazione Business">
            <div className={styles.configCard}>
              <div className={styles.configHeader}>
                <span className={styles.configLabel}>Dynamic Pricing</span>
                <Badge tone={isDynamicPricingEnabled ? "success" : "neutral"}>
                  {isDynamicPricingEnabled ? "ATTIVO" : "DISATTIVO"}
                </Badge>
              </div>
              <p className={styles.configDesc}>
                Regola automaticamente i prezzi in base alla domanda e alla disponibilità delle scorte.
              </p>
              <Button 
                variant={isDynamicPricingEnabled ? "secondary" : "primary"} 
                onClick={onToggleDynamicPricing}
                className={styles.configButton}
              >
                {isDynamicPricingEnabled ? "Disabilita Prezzi Dinamici" : "Abilita Prezzi Dinamici"}
              </Button>
            </div>
          </Card>

          <Card title="Alert Scorte">
             <div className={styles.alertList}>
               {inventory.filter(i => i.status !== "in_stock").length === 0 ? (
                 <p className={styles.emptyAlerts}>Nessun alert attivo.</p>
               ) : (
                 inventory.filter(i => i.status !== "in_stock").map(item => (
                   <div key={item.id} className={styles.alertItem}>
                      <div className={styles.alertIcon} style={{ backgroundColor: getStatusTone(item.status) === "critical" ? "var(--pizzaos-color-critical)" : "var(--pizzaos-color-warning)" }} />
                      <div className={styles.alertContent}>
                        <div className={styles.alertTitle}>{getProductName(item.productId)}</div>
                        <div className={styles.alertSubtitle}>
                          {item.status === "out_of_stock" ? "Prodotto esaurito" : `Solo ${item.availableUnits} unità rimaste`}
                        </div>
                      </div>
                   </div>
                 ))
               )}
             </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
