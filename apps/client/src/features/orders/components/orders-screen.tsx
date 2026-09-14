"use client";

import type { Order } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { saveCartState } from "../../cart/cart-model";
import {
  getOrderFeedbackEntry,
  loadClientFeedbackState,
  markGoogleReviewRedirected,
  saveClientFeedbackState,
  shouldSuggestGoogleReviewRedirect,
  submitOrderFeedback,
  type ClientFeedbackState,
  type FeedbackRating
} from "../../feedback/feedback-model";
import { loadClientDemoState, saveClientDemoState } from "../../home/client-demo-state";
import {
  advanceClientOrderState,
  createCartStateFromOrder,
  deriveTrackingSnapshot,
  deriveOrderTimeline,
  getOrderStatusLabel,
  isArchivedOrder,
  loadOrderNotifications,
  markAllOrderNotificationsAsRead,
  saveOrderNotifications,
  type ClientOrderNotification,
  CLIENT_ORDER_SIMULATION_TICK_MS
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
  const [notifications, setNotifications] = useState<readonly ClientOrderNotification[]>(() =>
    loadOrderNotifications(resolveStorage())
  );
  const [feedbackState, setFeedbackState] = useState<ClientFeedbackState>(() =>
    loadClientFeedbackState(resolveStorage())
  );
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating>(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [reorderedOrderId, setReorderedOrderId] = useState<string | null>(null);

  useEffect(() =>
  {
    const hydratedSeed = loadClientDemoState(resolveStorage());

    setSeed(hydratedSeed);
    setNotifications(loadOrderNotifications(resolveStorage()));
    setFeedbackState(loadClientFeedbackState(resolveStorage()));
  }, []);

  useEffect(() =>
  {
    if (seed.activeOrders.length === 0)
    {
      return undefined;
    }

    const simulationInterval = window.setInterval(() =>
    {
      const storage = resolveStorage();

      setSeed((currentSeed) =>
      {
        const result = advanceClientOrderState(
          currentSeed,
          loadOrderNotifications(storage)
        );

        saveOrderNotifications(result.notifications, storage);
        setNotifications(result.notifications);
        return saveClientDemoState(result.seed, storage);
      });
    }, CLIENT_ORDER_SIMULATION_TICK_MS);

    return () => window.clearInterval(simulationInterval);
  }, [seed.activeOrders.length]);

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

  function handleFeedbackSubmit(order: Order): void
  {
    const nextState = saveClientFeedbackState(submitOrderFeedback({
      state: feedbackState,
      orderId: order.id,
      rating: feedbackRating,
      comment: feedbackComment
    }), resolveStorage());

    setFeedbackState(nextState);
  }

  function handleGoogleReviewRedirect(orderId: string): void
  {
    setFeedbackState(saveClientFeedbackState(
      markGoogleReviewRedirected(feedbackState, orderId),
      resolveStorage()
    ));
  }

  function handleMarkNotificationsRead(): void
  {
    setNotifications(markAllOrderNotificationsAsRead(notifications, resolveStorage()));
  }

  const latestDeliveredOrder = seed.orderHistory.find((order) => order.status === "delivered");
  const latestDeliveredFeedback = latestDeliveredOrder
    ? getOrderFeedbackEntry(feedbackState, latestDeliveredOrder.id)
    : null;

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

      <ActiveOrderPanel order={seed.activeOrders[0]} productsById={productsById} />

      <OrderNotifications notifications={notifications} onMarkAllRead={handleMarkNotificationsRead} />

      {latestDeliveredOrder ? (
        <FeedbackPrompt
          order={latestDeliveredOrder}
          feedback={latestDeliveredFeedback}
          rating={feedbackRating}
          comment={feedbackComment}
          onRatingChange={setFeedbackRating}
          onCommentChange={setFeedbackComment}
          onSubmit={handleFeedbackSubmit}
          onGoogleReviewRedirect={handleGoogleReviewRedirect}
        />
      ) : null}

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

interface ActiveOrderPanelProps
{
  readonly order?: Order;
  readonly productsById: ReadonlyMap<string, string>;
}

function ActiveOrderPanel({ order, productsById }: ActiveOrderPanelProps): ReactElement | null
{
  if (!order)
  {
    return null;
  }

  const timeline = deriveOrderTimeline(order.status);
  const trackingSnapshot = deriveTrackingSnapshot(order);
  const isDelivered = order.status === "delivered";
  const isOutForDelivery = order.status === "out_for_delivery";

  return (
    <section className={styles.activeOrderSection} aria-label="Ordine in corso" data-testid="orders-active-order">
      <div className={styles.activeOrderHeader}>
        <div className={styles.activeOrderMeta}>
          <span className={styles.activeOrderNumber}>#{order.id}</span>
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
          {order.lines.map((line, index) => (
            <span key={`${line.productId}-${index}`} className={styles.activeOrderItemChip}>
              {line.quantity > 1 ? `${line.quantity}× ` : ""}
              {productsById.get(line.productId) ?? line.productId.replace(/^product-/, "").replace(/-/g, " ")}
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
              style={{
                left: `${trackingSnapshot?.mapPosition.xPercent ?? 52}%`,
                top: `${trackingSnapshot?.mapPosition.yPercent ?? 54}%`
              }}
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
            {getOrderStatusLabel(order.status)}
          </span>
          <span className={styles.activeOrderEta}>
            {isDelivered ? "Buon appetito! 🎉" : "Stima: 18–25 min"}
          </span>
        </div>
        <span className={styles.activeOrderTotal}>{formatMoney(order.total.amountCents)}</span>
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
