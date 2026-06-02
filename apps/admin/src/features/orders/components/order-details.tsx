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
import { Badge } from "@pizzaos/ui";
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
  readonly scheduledTime?: string;
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
  received: "Conferma",
  confirmed: "Inizia preparazione",
  preparing: "Segna pronto",
  ready: "Assegna rider",
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

  const nextStatuses = getNextOrderStatuses(order.status);
  const primaryNextStatus = nextStatuses[0];
  const formattedTotal = displayContext?.totalLabel ?? formatMoney(order.total.amountCents, order.total.currencyCode);

  return (
    <div className={styles.details}>
      <header className={styles.cardHeader}>
        <strong>Dettaglio ordine selezionato</strong>
        <button className={styles.closeButton} type="button" onClick={onClose} aria-label="Chiudi dettaglio">
          x
        </button>
      </header>

      <section className={styles.orderHero}>
        <div className={styles.orderTitleRow}>
          <h2>{displayContext?.displayId ?? `#${order.id.slice(-6).toUpperCase()}`}</h2>
          <span className={styles.statusPill}>{displayContext?.statusLabel ?? STATUS_LABELS[order.status]}</span>
        </div>
        <div className={styles.orderMeta}>
          <span>Delivery</span>
          <span>{displayContext?.scheduledTime ?? order.scheduledSlot}</span>
          <span>{displayContext?.slaLabel ?? "SLA 30 min"}</span>
        </div>
        {order.demoOrderRef && <p className={styles.demoRef}>Rif. demo cliente: {order.demoOrderRef}</p>}
      </section>

      <div className={styles.customerInfo}>
        <section className={styles.infoSection}>
          <span className={styles.label}>Cliente</span>
          <div className={styles.contactRow}>
            <span className={styles.lineIcon} aria-hidden="true">u</span>
            <div>
              <strong>{displayContext?.customerName ?? `ID: ${order.customerId.slice(-8).toUpperCase()}`}</strong>
              {displayContext ? <small>{displayContext.customerPhone}</small> : null}
            </div>
            <button type="button" aria-label="Chiama cliente">tel</button>
            <button type="button" aria-label="Messaggio cliente">msg</button>
          </div>
        </section>
        {displayContext ? (
          <section className={styles.infoSection}>
            <span className={styles.label}>Indirizzo di consegna</span>
            <div className={styles.contactRow}>
              <span className={styles.lineIcon} aria-hidden="true">p</span>
              <div>
                <strong>{displayContext.address}</strong>
                <small>00165 Roma (RM) - 3 piano, int. 7</small>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <section className={styles.orderLines} aria-label="Prodotti ordinati">
        <span className={styles.label}>Ordine</span>
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

        {linesWithProducts.map((line, idx) => (
          <div key={`${line.productId}-${idx}`} className={styles.lineItem}>
            <span>{line.quantity}x</span>
            <strong>{line.product?.name ?? `Prodotto ${line.productId}`}</strong>
            <span>{formatMoney(line.unitPrice.amountCents * line.quantity, line.unitPrice.currencyCode)}</span>
          </div>
        ))}
      </section>

      <section className={styles.notes}>
        <span className={styles.label}>Note cliente</span>
        <p>{getCustomerNotes(linesWithProducts) ?? CLIENT_STORY_BY_STATUS[order.status]}</p>
      </section>

      <section className={styles.paymentSummary}>
        <div>
          <span className={styles.label}>Pagamento</span>
          <strong>{displayContext?.paymentMethod ?? "Carta online"}</strong>
        </div>
        <div>
          <span>Totale</span>
          <strong>{formattedTotal}</strong>
        </div>
      </section>

      <section className={styles.allergens}>
        <span className={styles.label}>Allergeni segnalati</span>
        <strong>{displayContext?.allergenLabels.length ? displayContext.allergenLabels.join(", ") : "Nessun allergene critico"}</strong>
      </section>

      <section className={styles.slaStrip} aria-label="SLA operativo">
        <span>Stimato pronto</span>
        <strong>{displayContext?.scheduledTime ?? order.scheduledSlot}</strong>
        <span>{displayContext?.slaLabel ?? "Tra 30 min"}</span>
      </section>

      <footer className={styles.footer}>
        <div className={styles.actions}>
          {primaryNextStatus && (
            <button
              className={styles.primaryAction}
              type="button"
              onClick={() => onStatusUpdate(order.id, primaryNextStatus, selectedRiderId)}
              disabled={order.status === "ready" && !selectedRiderId}
            >
              {ACTION_LABELS[order.status] ?? `Vai a ${STATUS_LABELS[primaryNextStatus]}`}
            </button>
          )}
          <button
            className={styles.secondaryAction}
            type="button"
            onClick={() => onStatusUpdate(order.id, "ready", selectedRiderId)}
            disabled={order.status === "ready" || order.status === "delivered" || order.status === "cancelled"}
          >
            Segna pronto
          </button>
          <button
            className={styles.tertiaryAction}
            type="button"
            onClick={() => onStatusUpdate(order.id, "out_for_delivery", selectedRiderId)}
            disabled={order.status === "delivered" || order.status === "cancelled"}
          >
            Assegna rider
          </button>
          <button className={styles.moreAction} type="button" aria-label="Altre azioni ordine">...</button>
        </div>
      </footer>
    </div>
  );
}

function getCustomerNotes(lines: readonly { readonly notes?: string }[]): string | null {
  const notes = lines.map((line) => line.notes?.trim()).filter((note): note is string => Boolean(note));
  return notes.length > 0 ? notes.join("; ") : null;
}

function formatMoney(amountCents: number, currencyCode: string): string {
  return new Intl.NumberFormat("it-IT", {
    currency: currencyCode,
    style: "currency"
  }).format(amountCents / 100);
}
