"use client";

import {
  type Order,
  type OrderStatus,
  type Product,
  type Rider,
  type RoutingStation,
  deriveRoutingStation,
  getNextOrderStatuses,
} from "@pizzaos/domain";
import { Badge, Button } from "@pizzaos/ui";
import { type ReactElement, useMemo, useState } from "react";
import styles from "./order-details.module.css";

interface OrderDetailsProps {
  readonly order: Order;
  readonly allProducts: readonly Product[];
  readonly riders?: readonly Rider[];
  readonly onStatusUpdate: (orderId: string, nextStatus: OrderStatus, riderId?: string) => void;
  readonly onClose: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Ricevuto",
  confirmed: "Confermato",
  preparing: "In preparazione",
  ready: "Pronto",
  out_for_delivery: "In consegna",
  delivered: "Consegnato",
  cancelled: "Annullato",
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  received: "Conferma Ordine",
  confirmed: "Inizia Preparazione",
  preparing: "Segna come Pronto",
  ready: "Affida al Rider",
  out_for_delivery: "Consegnato",
};

export function OrderDetails(props: OrderDetailsProps): ReactElement {
  const { order, allProducts, riders = [], onStatusUpdate, onClose } = props;

  const [selectedRiderId, setSelectedRiderId] = useState<string | undefined>(order.riderId);

  const linesWithProducts = useMemo(() => {
    return order.lines.map((line) => {
      const product = allProducts.find((p) => p.id === line.productId);
      return {
        ...line,
        product,
        station: product ? deriveRoutingStation(product) : ("kitchen" as RoutingStation),
      };
    });
  }, [order.lines, allProducts]);

  const stations = useMemo(() => {
    const kitchen = linesWithProducts.filter((l) => l.station === "kitchen");
    const bar = linesWithProducts.filter((l) => l.station === "bar");
    return { kitchen, bar };
  }, [linesWithProducts]);

  const nextStatuses = getNextOrderStatuses(order.status);
  const primaryNextStatus = nextStatuses[0];

  return (
    <div className={styles.details}>
      <header className={styles.header}>
        <div className={styles.orderId}>Ordine #{order.id.slice(-6).toUpperCase()}</div>
        <Badge tone={order.status === "cancelled" ? "critical" : order.status === "delivered" ? "success" : "warning"}>
          {STATUS_LABELS[order.status]}
        </Badge>
      </header>

      <div className={styles.customerInfo}>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Cliente</span>
          <span className={styles.value}>ID: {order.customerId.slice(-8).toUpperCase()}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Slot Consegna</span>
          <span className={styles.value}>{order.scheduledSlot}</span>
        </div>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Creato il</span>
          <span className={styles.value}>{new Date(order.createdAtIso).toLocaleString("it-IT")}</span>
        </div>
      </div>

      <div className={styles.stations}>
        {order.status === "ready" && riders.length > 0 && (
          <div className={styles.riderAssignment}>
            <div className={styles.stationTitle}>Assegnazione Rider</div>
            <div className={styles.riderSelect}>
              {riders.map(rider => (
                <button
                  key={rider.id}
                  className={`${styles.riderOption} ${selectedRiderId === rider.id ? styles.riderOptionActive : ""} ${rider.status !== "available" ? styles.riderOptionDisabled : ""}`}
                  onClick={() => rider.status === "available" && setSelectedRiderId(rider.id)}
                  disabled={rider.status !== "available"}
                >
                  <span className={styles.riderName}>{rider.name}</span>
                  <Badge tone={rider.status === "available" ? "success" : "neutral"}>
                    {rider.status === "available" ? "Libero" : "Occupato"}
                  </Badge>
                </button>
              ))}
            </div>
            {!selectedRiderId && <p className={styles.assignmentHint}>Seleziona un rider disponibile per affidare la consegna.</p>}
          </div>
        )}

        {stations.kitchen.length > 0 && (
          <div className={styles.station}>
            <div className={styles.stationHeader}>
              <span className={styles.stationTitle}>Cucina</span>
              <Badge tone="neutral">{stations.kitchen.length} item</Badge>
            </div>
            {stations.kitchen.map((line, idx) => (
              <div key={`kitchen-${idx}`} className={styles.lineItem}>
                <div className={styles.lineMain}>
                  <span>{line.quantity}x {line.product?.name ?? `Prodotto ${line.productId}`}</span>
                </div>
                {line.notes && <div className={styles.lineNotes}>Note: {line.notes}</div>}
              </div>
            ))}
          </div>
        )}

        {stations.bar.length > 0 && (
          <div className={styles.station}>
            <div className={styles.stationHeader}>
              <span className={styles.stationTitle}>Bar</span>
              <Badge tone="neutral">{stations.bar.length} item</Badge>
            </div>
            {stations.bar.map((line, idx) => (
              <div key={`bar-${idx}`} className={styles.lineItem}>
                <div className={styles.lineMain}>
                  <span>{line.quantity}x {line.product?.name ?? `Prodotto ${line.productId}`}</span>
                </div>
                {line.notes && <div className={styles.lineNotes}>Note: {line.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>Totale:</span>{" "}
          <span className={styles.totalValue}>
            {order.total.amountCents / 100} {order.total.currencyCode}
          </span>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Chiudi
          </Button>
          {primaryNextStatus && (
            <Button
              onClick={() => onStatusUpdate(order.id, primaryNextStatus, selectedRiderId)}
              disabled={order.status === "ready" && !selectedRiderId}
            >
              {ACTION_LABELS[order.status] ?? `Vai a ${STATUS_LABELS[primaryNextStatus]}`}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
