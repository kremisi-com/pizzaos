import { type Rider, type Order, type EntityIdentifier } from "@pizzaos/domain";
import { Badge, Card, StatusIndicator } from "@pizzaos/ui";
import { type ReactElement, useMemo } from "react";
import styles from "./delivery-manager.module.css";

interface DeliveryManagerProps {
  readonly riders: readonly Rider[];
  readonly orders: readonly Order[];
}

export function DeliveryManager(props: DeliveryManagerProps): ReactElement {
  const { riders, orders } = props;

  const activeDeliveries = useMemo(() => {
    return orders.filter(o => o.status === "out_for_delivery" || o.status === "ready");
  }, [orders]);

  const stats = useMemo(() => {
    const available = riders.filter(r => r.status === "available").length;
    const busy = riders.filter(r => r.status === "busy").length;
    const offline = riders.filter(r => r.status === "offline").length;

    return { available, busy, offline };
  }, [riders]);

  return (
    <div className={styles.container}>
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Rider Disponibili</div>
          <div className={styles.statValue}>{stats.available}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Consegna</div>
          <div className={styles.statValue}>{stats.busy}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Offline</div>
          <div className={styles.statValue}>{stats.offline}</div>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Rider Attivi</h3>
          <div className={styles.riderGrid}>
            {riders.map((rider) => (
              <Card key={rider.id}>
                <div className={styles.riderHeader}>
                  <div className={styles.riderName}>{rider.name}</div>
                  <StatusIndicator tone={rider.status === "available" ? "active" : rider.status === "busy" ? "warning" : "idle"} />
                </div>
                <div className={styles.riderStatus}>
                  {rider.status === "available" ? "Disponibile" : rider.status === "busy" ? "In consegna" : "Non attivo"}
                </div>
                {rider.location && (
                  <div className={styles.riderLocation}>
                    Posizione: {rider.location.lat.toFixed(4)}, {rider.location.lng.toFixed(4)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Consegne in corso</h3>
          <div className={styles.orderList}>
            {activeDeliveries.length > 0 ? (
              activeDeliveries.map((order) => {
                const rider = riders.find(r => r.id === order.riderId);
                return (
                  <Card key={order.id}>
                    <div className={styles.orderItem}>
                      <div className={styles.orderInfo}>
                        <div className={styles.orderId}>Ordine #{order.id.slice(-6).toUpperCase()}</div>
                        <Badge tone={order.status === "ready" ? "warning" : "success"}>
                          {order.status === "ready" ? "In attesa rider" : "In viaggio"}
                        </Badge>
                      </div>
                      <div className={styles.deliveryRider}>
                        {rider ? (
                          <>Assegnato a: <strong>{rider.name}</strong></>
                        ) : (
                          <span className={styles.unassigned}>In attesa di assegnazione</span>
                        )}
                      </div>
                      <div className={styles.orderSlot}>
                        Slot: {order.scheduledSlot}
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className={styles.emptyState}>Nessuna consegna attiva al momento.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
