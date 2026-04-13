"use client";

import type { Order, OrderStatus } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button } from "@pizzaos/ui";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { saveCartState } from "../../cart/cart-model";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  createCartStateFromOrder,
  deriveOrderTimeline,
  getOrderStatusLabel,
  isArchivedOrder
} from "../orders-model";
import styles from "./orders-screen.module.css";

const DATE_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric"
});

const TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit"
});

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

const ACTIVE_ORDER_STATUSES: readonly OrderStatus[] = [
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered"
];

const ACTIVE_ORDER_SIMULATION_TICK_MS = 3000;

const MOCK_ACTIVE_ORDER_ITEMS = [
  { name: "Diavola Piccante", qty: 1 },
  { name: "Focaccia al Rosmarino", qty: 2 }
] as const;

const MOCK_ACTIVE_ORDER_TOTAL = "18,50 €";
const MOCK_ACTIVE_ORDER_NUMBER = "#4";

function resolveStorage(): Storage | undefined
{
  if (typeof window === "undefined")
  {
    return undefined;
  }

  return window.localStorage;
}

export function OrdersScreen(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [reorderedOrderId, setReorderedOrderId] = useState<string | null>(null);

  useEffect(() =>
  {
    const hydratedSeed = loadClientDemoState(resolveStorage());

    setSeed(hydratedSeed);
  }, []);

  const displayedOrders = useMemo(
    () => deriveSelectableOrders(seed),
    [seed]
  );

  const productsById = useMemo(
    () => new Map(seed.products.map((p) => [p.id, p.name])),
    [seed.products]
  );

  function handleQuickReorder(order: Order): void
  {
    const storage = resolveStorage();
    const nextCartState = createCartStateFromOrder(order, seed.products);

    saveCartState(nextCartState, storage);
    setReorderedOrderId(order.id);
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.headerTopRow}>
          <a href="/" className={styles.backLink}>
            <span className={styles.backArrow}>←</span>
            Home
          </a>
          <span className={styles.orderCount}>
            {displayedOrders.length} {displayedOrders.length === 1 ? "ordine" : "ordini"}
          </span>
        </div>

        <h1 id="orders-title" className={styles.title}>Ordini passati</h1>
        <p className={styles.subtitle}>
          Riordina in un tap o rivedi i dettagli del tuo storico.
        </p>
      </header>

      {reorderedOrderId ? (
        <div className={styles.reorderNotice} data-testid="orders-reorder-notice">
          <span className={styles.reorderNoticeIcon}>✓</span>
          <span className={styles.reorderNoticeText}>Carrello pronto.</span>
          <a className={styles.reorderNoticeLink} href="/cart" data-testid="orders-reorder-cart-link">
            Vai al carrello →
          </a>
        </div>
      ) : null}

      <ActiveOrderPanel />

      <section className={styles.historySection} aria-labelledby="orders-title">
        <h2 className={styles.sectionLabel}>Storico</h2>

        {displayedOrders.length > 0 ? (
          <ul className={styles.historyList} data-testid="orders-history-list">
            {displayedOrders.map((order, index) => (
              <li key={order.id} className={styles.historyItem}>
                <div className={styles.historyItemInner}>
                  <div className={styles.historyItemLeft}>
                    <div className={styles.historyItemTitleRow}>
                      <span className={styles.historyItemNumber}>#{displayedOrders.length - index}</span>
                      <Badge tone={order.status === "cancelled" ? "warning" : "neutral"}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </div>

                    <p className={styles.historyItemProducts}>
                      {formatOrderItems(order, productsById)}
                    </p>

                    <p className={styles.historyItemMeta}>
                      {formatDate(order.createdAtIso)} · {formatTime(order.createdAtIso)}
                    </p>
                  </div>

                  <div className={styles.historyItemRight}>
                    <p className={styles.historyItemTotal}>
                      {formatMoney(order.total.amountCents)}
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => handleQuickReorder(order)}
                      data-testid={`orders-reorder-${order.id}`}
                    >
                      Riordina
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyState}>Nessun ordine nello storico.</p>
        )}
      </section>
    </main>
  );
}

function ActiveOrderPanel(): ReactElement
{
  const [statusIndex, setStatusIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() =>
  {
    intervalRef.current = setInterval(() =>
    {
      setStatusIndex((prev) => (prev + 1) % ACTIVE_ORDER_STATUSES.length);
    }, ACTIVE_ORDER_SIMULATION_TICK_MS);

    return () =>
    {
      if (intervalRef.current !== null)
      {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentStatus = ACTIVE_ORDER_STATUSES[statusIndex];
  const timeline = deriveOrderTimeline(currentStatus);
  const isDelivered = currentStatus === "delivered";
  const isOutForDelivery = currentStatus === "out_for_delivery";

  return (
    <section className={styles.activeOrderSection} aria-label="Ordine in corso">
      <div className={styles.activeOrderHeader}>
        <div className={styles.activeOrderMeta}>
          <span className={styles.activeOrderNumber}>{MOCK_ACTIVE_ORDER_NUMBER}</span>
          <span
            className={
              `${styles.activeOrderLiveBadge}${
                isDelivered ? ` ${styles.activeOrderLiveBadgeDelivered}` : ""
              }`
            }
          >
            {isDelivered ? "✓ Consegnato" : "● In corso"}
          </span>
        </div>
        <div className={styles.activeOrderItems}>
          {MOCK_ACTIVE_ORDER_ITEMS.map((item) => (
            <span key={item.name} className={styles.activeOrderItemChip}>
              {item.qty > 1 ? `${item.qty}× ` : ""}{item.name}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.activeOrderMap}>
        <div className={styles.activeOrderMapBg}>
          <div className={styles.activeOrderMapGrid} />
          <div className={styles.activeOrderMapStreets}>
            <div className={styles.activeOrderMapStreetH} style={{ top: "30%" }} />
            <div className={styles.activeOrderMapStreetH} style={{ top: "55%" }} />
            <div className={styles.activeOrderMapStreetH} style={{ top: "78%" }} />
            <div className={styles.activeOrderMapStreetV} style={{ left: "25%" }} />
            <div className={styles.activeOrderMapStreetV} style={{ left: "55%" }} />
            <div className={styles.activeOrderMapStreetV} style={{ left: "78%" }} />
          </div>
          <div className={styles.activeOrderMapRestaurant}>
            <span className={styles.activeOrderMapRestaurantIcon}>🍕</span>
          </div>
          <div
            className={styles.activeOrderMapHome}>
            <span className={styles.activeOrderMapHomeIcon}>🏠</span>
          </div>
          {(isOutForDelivery || isDelivered) && (
            <div
              className={
                `${styles.activeOrderMapRider}${
                  isDelivered ? ` ${styles.activeOrderMapRiderDelivered}` : ""
                }`
              }
            >
              <span className={styles.activeOrderMapRiderIcon}>🛵</span>
            </div>
          )}
          <div className={styles.activeOrderMapRouteLine} />
        </div>
        <div className={styles.activeOrderMapLabel}>
          {isOutForDelivery && "Rider in avvicinamento"}
          {isDelivered && "Consegna completata!"}
          {!isOutForDelivery && !isDelivered && "Mappa attiva alla partenza del rider"}
        </div>
      </div>

      <div className={styles.activeOrderTimeline}>
        {timeline
          .filter((step) => step.status !== "cancelled")
          .map((step) => (
            <div
              key={step.status}
              className={
                `${styles.activeOrderTimelineStep}${
                  step.isCompleted ? ` ${styles.activeOrderTimelineStepDone}` : ""
                }${
                  step.isCurrent ? ` ${styles.activeOrderTimelineStepCurrent}` : ""
                }`
              }
            >
              <div className={styles.activeOrderTimelineDot} />
              <span className={styles.activeOrderTimelineLabel}>
                {step.label}
              </span>
            </div>
          ))}
      </div>

      <div className={styles.activeOrderFooter}>
        <div className={styles.activeOrderFooterLeft}>
          <span className={styles.activeOrderStatusLabel}>
            {getOrderStatusLabel(currentStatus)}
          </span>
          <span className={styles.activeOrderEta}>
            {isDelivered ? "Buon appetito! 🎉" : "Stima: 18–25 min"}
          </span>
        </div>
        <span className={styles.activeOrderTotal}>{MOCK_ACTIVE_ORDER_TOTAL}</span>
      </div>
    </section>
  );
}

function deriveSelectableOrders(seed: ClientSeed): readonly Order[]
{
  const archivedOrders = seed.orderHistory.filter((order) => isArchivedOrder(order));

  if (archivedOrders.length > 0)
  {
    return archivedOrders;
  }

  return seed.orderHistory;
}

function formatOrderItems(order: Order, productsById: ReadonlyMap<string, string>): string
{
  return order.lines
    .map((line) =>
    {
      const qtyPrefix = line.quantity > 1 ? `${line.quantity}× ` : "";
      const name = productsById.get(line.productId) ?? line.productId.replace(/^product-/, "").replace(/-/g, " ");

      return `${qtyPrefix}${name}`;
    })
    .join(", ");
}

function formatDate(isoTimestamp: string): string
{
  const parsedDate = new Date(isoTimestamp);

  if (Number.isNaN(parsedDate.getTime()))
  {
    return isoTimestamp;
  }

  return DATE_FORMATTER.format(parsedDate);
}

function formatTime(isoTimestamp: string): string
{
  const parsedDate = new Date(isoTimestamp);

  if (Number.isNaN(parsedDate.getTime()))
  {
    return "";
  }

  return TIME_FORMATTER.format(parsedDate);
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}
