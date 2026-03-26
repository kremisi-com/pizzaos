import { type Rider, type Order } from "@pizzaos/domain";
import { Badge, Card, StatusIndicator } from "@pizzaos/ui";
import { type ReactElement, useMemo } from "react";
import styles from "./delivery-manager.module.css";

interface DeliveryManagerProps {
  readonly riders: readonly Rider[];
  readonly orders: readonly Order[];
}

function MockMap({ riders }: { riders: readonly Rider[] }): ReactElement {
  return (
    <div className={styles.mapContainer} aria-label="Mappa consegne">
      <svg className={styles.mapBackground} viewBox="0 0 800 400">
        <path d="M0,200 Q200,50 400,200 T800,200" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M100,0 V400 M300,0 V400 M500,0 V400 M700,0 V400" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" />
        <circle cx="400" cy="200" r="10" fill="var(--pizzaos-color-primary)" />
        <text x="415" y="205" fontSize="12" fontWeight="bold">Store</text>
      </svg>
      {riders.filter(r => r.status !== "offline" && r.location).map(rider => (
        <div 
          key={rider.id} 
          className={styles.riderMarker} 
          style={{ 
            left: `${((rider.location!.lng + 180) % 1) * 100}%`, 
            top: `${((rider.location!.lat + 90) % 1) * 100}%` 
          }}
        >
          <div className={styles.riderTooltip}>{rider.name}</div>
          <div className={styles.bikeIcon}>🚲</div>
        </div>
      ))}
    </div>
  );
}

export function DeliveryManager(props: DeliveryManagerProps): ReactElement {
  const { riders, orders } = props;

  const requestedOrders = useMemo(() => {
    return orders.filter(o => o.status === "received" || o.status === "confirmed").slice(0, 5);
  }, [orders]);

  const inProgressDeliveries = useMemo(() => {
    return orders.filter(o => o.status === "out_for_delivery" || o.status === "ready").slice(0, 5);
  }, [orders]);

  const completedDeliveries = useMemo(() => {
    return orders.filter(o => o.status === "delivered").slice(0, 5);
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
          <div className={styles.statLabel}>Richieste</div>
          <div className={styles.statValue}>{requestedOrders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Offline</div>
          <div className={styles.statValue}>{stats.offline}</div>
        </div>
      </div>

      <MockMap riders={riders} />

      <div className={styles.main}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Richieste Recenti</h3>
          <div className={styles.orderList}>
            {requestedOrders.length > 0 ? (
              requestedOrders.map((order) => (
                <Card key={order.id}>
                  <div className={styles.orderItem}>
                    <div className={styles.orderInfo}>
                      <div className={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</div>
                      <Badge tone="neutral">Nuova</Badge>
                    </div>
                    <div className={styles.orderSlot}>Slot: {order.scheduledSlot}</div>
                  </div>
                </Card>
              ))
            ) : (
              <div className={styles.emptyState}>Nessuna nuova richiesta.</div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>In Consegna</h3>
          <div className={styles.orderList}>
            {inProgressDeliveries.length > 0 ? (
              inProgressDeliveries.map((order) => {
                const rider = riders.find(r => r.id === order.riderId);
                return (
                  <Card key={order.id}>
                    <div className={styles.orderItem}>
                      <div className={styles.orderInfo}>
                        <div className={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</div>
                        <Badge tone={order.status === "ready" ? "warning" : "success"}>
                          {order.status === "ready" ? "In attesa" : "In viaggio"}
                        </Badge>
                      </div>
                      <div className={styles.deliveryRider}>
                        {rider ? <strong>{rider.name}</strong> : <em>Non assegnato</em>}
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className={styles.emptyState}>Nessuna consegna in corso.</div>
            )}
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Completate</h3>
          <div className={styles.orderList}>
            {completedDeliveries.length > 0 ? (
              completedDeliveries.map((order) => (
                <Card key={order.id}>
                  <div className={styles.orderItem}>
                    <div className={styles.orderInfo}>
                      <div className={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</div>
                      <Badge tone="success">Consegnato</Badge>
                    </div>
                    <div className={styles.orderSlot}>Completato: {new Date(order.updatedAtIso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </Card>
              ))
            ) : (
              <div className={styles.emptyState}>Nessuna consegna completata oggi.</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Rider Attivi</h3>
        <div className={styles.riderGrid}>
          {riders.map((rider) => (
            <Card key={rider.id}>
              <div className={styles.riderHeader}>
                <div className={styles.riderName}>{rider.name}</div>
                <StatusIndicator label="" tone={rider.status === "available" ? "active" : rider.status === "busy" ? "warning" : "idle"} />
              </div>
              <div className={styles.riderStatus}>
                {rider.status === "available" ? "Disponibile" : rider.status === "busy" ? "In consegna" : "Non attivo"}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
