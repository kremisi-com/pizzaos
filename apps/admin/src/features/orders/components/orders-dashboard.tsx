"use client";

import type { Order, OrderStatus, Product } from "@pizzaos/domain";
import { Badge, Card, Dialog } from "@pizzaos/ui";
import { type ReactElement, useMemo, useState } from "react";
import styles from "./orders-dashboard.module.css";
import { OrderDetails } from "./order-details";

interface OrdersDashboardProps {
  readonly orders: readonly Order[];
  readonly lastUpdateIso: string;
  readonly allProducts: readonly Product[];
  readonly onOrderStatusUpdate?: (orderId: string, nextStatus: OrderStatus) => void;
}

const STATUS_MAP: Record<OrderStatus, { label: string; tone: "neutral" | "success" | "warning" | "critical" }> = {
  received: { label: "Ricevuto", tone: "warning" },
  confirmed: { label: "Confermato", tone: "neutral" },
  preparing: { label: "In preparazione", tone: "neutral" },
  ready: { label: "Pronto", tone: "success" },
  out_for_delivery: { label: "In consegna", tone: "neutral" },
  delivered: { label: "Consegnato", tone: "success" },
  cancelled: { label: "Annullato", tone: "critical" },
};

export function OrdersDashboard(props: OrdersDashboardProps): ReactElement {
  const { orders, allProducts, onOrderStatusUpdate } = props;

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      // Sort by created date (newest first)
      return Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso);
    });
  }, [orders]);

  const stats = useMemo(() => {
    const active = orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length;
    const total = orders.length;
    const received = orders.filter(o => o.status === "received").length;
    const preparing = orders.filter(o => o.status === "preparing").length;

    return { active, total, received, preparing };
  }, [orders]);

  const selectedOrder = useMemo(() => {
    return orders.find(o => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Ordini Attivi</div>
          <div className={styles.statValue}>{stats.active}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Ricevuti</div>
          <div className={styles.statValue}>{stats.received}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In preparazione</div>
          <div className={styles.statValue}>{stats.preparing}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Totale oggi</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
      </div>

      <div className={styles.grid}>
        {sortedOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelectedOrderId(order.id)}
            className={styles.orderCardWrapper}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedOrderId(order.id)}
          >
            <Card>
              <div className={styles.orderHeader}>
                <div className={styles.orderId}>#{order.id.slice(-6).toUpperCase()}</div>
                <Badge tone={STATUS_MAP[order.status].tone}>
                  {STATUS_MAP[order.status].label}
                </Badge>
              </div>

              <div className={styles.customer}>
                Cliente #{order.customerId.slice(-4)}
              </div>

              <ul className={styles.itemsList}>
                {order.lines.map((line, idx) => (
                  <li key={`${order.id}-line-${idx}`} className={styles.item}>
                    <span>{line.quantity}x Prodotto #{line.productId.slice(-4)}</span>
                    <span>{line.unitPrice.amountCents * line.quantity / 100} {line.unitPrice.currencyCode}</span>
                  </li>
                ))}
              </ul>

              <div className={styles.footer}>
                 <span className={styles.updatedAt}>
                   Aggiornato: {new Date(order.updatedAtIso).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                 </span>
                 <span className={styles.total}>
                   Totale: {order.total.amountCents / 100} {order.total.currencyCode}
                 </span>
              </div>
            </Card>
          </div>
        ))}

        {orders.length === 0 && (
          <div className={styles.emptyState}>
            <p>Nessun ordine trovato.</p>
          </div>
        )}
      </div>

      <Dialog
        open={!!selectedOrder}
        dialogId="order-details-dialog"
        title="Dettaglio Ordine"
        onClose={() => setSelectedOrderId(null)}
      >
        {selectedOrder && (
          <OrderDetails
            order={selectedOrder}
            allProducts={allProducts}
            onStatusUpdate={(id, status) => {
              onOrderStatusUpdate?.(id, status);
              setSelectedOrderId(null);
            }}
            onClose={() => setSelectedOrderId(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
