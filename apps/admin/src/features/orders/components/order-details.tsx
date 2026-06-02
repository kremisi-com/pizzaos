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
  readonly displayContext?: OrderDisplayContext;
  readonly onStatusUpdate: (orderId: string, nextStatus: OrderStatus, riderId?: string) => void;
  readonly onClose: () => void;
}

export interface OrderDisplayContext {
  readonly displayId: string;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly address: string;
  readonly paymentMethod: string;
  readonly priority: string;
  readonly statusLabel: string;
  readonly slaLabel: string;
  readonly totalLabel: string;
  readonly allergenLabels: readonly string[];
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

const CLIENT_STORY_BY_STATUS: Record<OrderStatus, string> = {
  received: "Il locale ha ricevuto l'ordine e lo sta verificando.",
  confirmed: "L'ordine e confermato: il cliente vede la presa in carico.",
  preparing: "La cucina sta preparando l'ordine.",
  ready: "L'ordine e pronto per essere affidato al rider.",
  out_for_delivery: "Il rider e partito: tracking cliente in corso.",
  delivered: "Consegna completata e ordine chiuso lato cliente.",
  cancelled: "Ordine annullato: il cliente riceve aggiornamento immediato."
};

export function OrderDetails(props: OrderDetailsProps): ReactElement {
  const { order, allProducts, displayContext, riders = [], onStatusUpdate, onClose } = props;

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
        <div>
          <div className={styles.orderId}>Ordine {displayContext?.displayId ?? `#${order.id.slice(-6).toUpperCase()}`}</div>
          {order.demoOrderRef && <div className={styles.demoRef}>Rif. demo cliente: {order.demoOrderRef}</div>}
        </div>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Chiudi dettaglio">
          x
        </button>
        <Badge tone={order.status === "cancelled" ? "critical" : order.status === "delivered" ? "success" : "warning"}>
          {displayContext?.statusLabel ?? STATUS_LABELS[order.status]}
        </Badge>
      </header>

      <p className={styles.clientStory}>Narrativa cliente: {CLIENT_STORY_BY_STATUS[order.status]}</p>

      <div className={styles.customerInfo}>
        <div className={styles.infoBlock}>
          <span className={styles.label}>Cliente</span>
          <span className={styles.value}>{displayContext?.customerName ?? `ID: ${order.customerId.slice(-8).toUpperCase()}`}</span>
          {displayContext ? <span className={styles.metaValue}>{displayContext.customerPhone}</span> : null}
        </div>
        {displayContext ? (
          <div className={styles.infoBlock}>
            <span className={styles.label}>Indirizzo di consegna</span>
            <span className={styles.value}>{displayContext.address}</span>
            <span className={styles.metaValue}>00165 Roma - 3 piano</span>
          </div>
        ) : null}
        <div className={styles.infoBlock}>
          <span className={styles.label}>Pagamento</span>
          <span className={styles.value}>{displayContext?.paymentMethod ?? "Carta online"}</span>
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

      <section className={styles.orderSummary} aria-label="Riepilogo operativo">
        <span>
          <strong>Priorita</strong>
          {displayContext?.priority ?? "Normale"}
        </span>
        <span>
          <strong>SLA stimato</strong>
          {displayContext?.slaLabel ?? "In orario"}
        </span>
        <span>
          <strong>Totale</strong>
          {displayContext?.totalLabel ?? `${order.total.amountCents / 100} ${order.total.currencyCode}`}
        </span>
      </section>

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

      {displayContext?.allergenLabels.length ? (
        <section className={styles.allergens}>
          <span className={styles.label}>Allergeni segnalati</span>
          <strong>{displayContext.allergenLabels.join(", ")}</strong>
        </section>
      ) : null}

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
