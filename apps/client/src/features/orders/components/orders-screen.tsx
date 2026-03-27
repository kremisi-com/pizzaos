"use client";

import type { Order } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
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
  CLIENT_ORDER_SIMULATION_TICK_MS,
  createCartStateFromOrder,
  deriveLastReorderOrder,
  deriveOrderTimeline,
  deriveTrackingSnapshot,
  deriveUnreadOrderNotificationsCount,
  getOrderStatusLabel,
  isArchivedOrder,
  loadOrderNotifications,
  markAllOrderNotificationsAsRead,
  saveOrderNotifications,
  type ClientOrderNotification
} from "../orders-model";
import styles from "./orders-screen.module.css";

const TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit"
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
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
  const [notifications, setNotifications] = useState<readonly ClientOrderNotification[]>([]);
  const [feedbackState, setFeedbackState] = useState<ClientFeedbackState>(() => loadClientFeedbackState());
  const [feedbackRating, setFeedbackRating] = useState<FeedbackRating | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [reorderedOrderId, setReorderedOrderId] = useState<string | null>(null);
  const seedRef = useRef<ClientSeed>(seed);
  const notificationsRef = useRef<readonly ClientOrderNotification[]>([]);

  useEffect(() =>
  {
    const storage = resolveStorage();

    const hydratedSeed = loadClientDemoState(storage);
    seedRef.current = hydratedSeed;
    setSeed(hydratedSeed);

    const hydratedNotifications = loadOrderNotifications(storage);
    notificationsRef.current = hydratedNotifications;
    setNotifications(hydratedNotifications);
    setFeedbackState(loadClientFeedbackState(storage));
  }, []);

  useEffect(() =>
  {
    seedRef.current = seed;
  }, [seed]);

  useEffect(() =>
  {
    notificationsRef.current = notifications;
  }, [notifications]);

  const focusedOrder = seed.activeOrders[0] ?? seed.orderHistory[0];
  const historyOrders = seed.orderHistory;
  const archivedOrders = useMemo(
    () => historyOrders.filter((order) => isArchivedOrder(order)),
    [historyOrders]
  );
  const reorderCandidate = useMemo(
    () => deriveLastReorderOrder(historyOrders),
    [historyOrders]
  );
  const unreadNotificationsCount = deriveUnreadOrderNotificationsCount(notifications);
  const orderTimeline = useMemo(
    () => (focusedOrder ? deriveOrderTimeline(focusedOrder.status) : []),
    [focusedOrder]
  );
  const feedbackTargetOrder = focusedOrder?.status === "delivered" ? focusedOrder : null;
  const submittedFeedback = useMemo(
    () => (feedbackTargetOrder ? getOrderFeedbackEntry(feedbackState, feedbackTargetOrder.id) : null),
    [feedbackState, feedbackTargetOrder]
  );
  const shouldOfferGoogleReviewRedirect = useMemo(
    () => (submittedFeedback ? shouldSuggestGoogleReviewRedirect(submittedFeedback.rating) : false),
    [submittedFeedback]
  );
  const trackingSnapshot = useMemo(
    () => deriveTrackingSnapshot(focusedOrder),
    [focusedOrder]
  );

  const handleSimulationAdvance = useCallback((): void =>
  {
    const storage = resolveStorage();
    const result = advanceClientOrderState(seedRef.current, notificationsRef.current);
    const persistedSeed = saveClientDemoState(result.seed, storage);
    const persistedNotifications = saveOrderNotifications(result.notifications, storage);

    seedRef.current = persistedSeed;
    notificationsRef.current = persistedNotifications;
    setSeed(persistedSeed);
    setNotifications(persistedNotifications);
  }, []);

  useEffect(() =>
  {
    const intervalId = window.setInterval(() =>
    {
      handleSimulationAdvance();
    }, CLIENT_ORDER_SIMULATION_TICK_MS);

    return () =>
    {
      window.clearInterval(intervalId);
    };
  }, [handleSimulationAdvance]);

  function handleMarkAllNotificationsAsRead(): void
  {
    const storage = resolveStorage();
    const updatedNotifications = markAllOrderNotificationsAsRead(notifications, storage);

    notificationsRef.current = updatedNotifications;
    setNotifications(updatedNotifications);
  }

  function handleQuickReorder(order: Order): void
  {
    const storage = resolveStorage();
    const nextCartState = createCartStateFromOrder(order, seed.products);

    saveCartState(nextCartState, storage);
    setReorderedOrderId(order.id);
  }

  function handleSubmitFeedback(): void
  {
    if (!feedbackTargetOrder || !feedbackRating)
    {
      return;
    }

    const storage = resolveStorage();
    const nextFeedbackState = submitOrderFeedback({
      state: feedbackState,
      orderId: feedbackTargetOrder.id,
      rating: feedbackRating,
      comment: feedbackComment
    });

    setFeedbackState(saveClientFeedbackState(nextFeedbackState, storage));
    setFeedbackRating(null);
    setFeedbackComment("");
  }

  function handleGoogleReviewRedirectSimulation(): void
  {
    if (!feedbackTargetOrder)
    {
      return;
    }

    const storage = resolveStorage();
    const nextFeedbackState = markGoogleReviewRedirected(feedbackState, feedbackTargetOrder.id);
    setFeedbackState(saveClientFeedbackState(nextFeedbackState, storage));
  }

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="orders-title">
        <div className={styles.heroTopRow}>
          <a href="/" className={styles.backLink}>Home</a>
          <Badge tone={unreadNotificationsCount > 0 ? "warning" : "neutral"}>
            {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} nuove` : "Nessun update"}
          </Badge>
        </div>

        <h1 id="orders-title" className={styles.heroTitle}>Stato ordine</h1>
        <p className={styles.heroCopy}>
          Timeline, notifiche e tracking simulato per seguire l&apos;ordine in tempo reale demo.
        </p>

        <div className={styles.heroActions}>
          <Button onClick={handleSimulationAdvance} data-testid="orders-advance-button">
            Avanza stato
          </Button>
          {reorderCandidate ? (
            <Button
              variant="secondary"
              onClick={() => handleQuickReorder(reorderCandidate)}
              data-testid="orders-last-time-button"
            >
              Ordina come l&apos;ultima volta
            </Button>
          ) : null}
          <a href="/menu" className={styles.secondaryLink}>Nuovo ordine</a>
        </div>
      </section>

      {reorderedOrderId ? (
        <ShellCard title="Riordino pronto">
          <p className={styles.emptyCopy}>
            Carrello aggiornato con l&apos;ordine {reorderedOrderId}. Continua con il checkout rapido.
          </p>
          <a className={styles.secondaryLink} href="/cart" data-testid="orders-reorder-cart-link">
            Vai al carrello
          </a>
        </ShellCard>
      ) : null}

      {focusedOrder ? (
        <>
          <ShellCard title="Timeline ordine">
            <div className={styles.orderMeta}>
              <p>
                <strong>ID ordine:</strong> {focusedOrder.id}
              </p>
              <p>
                <strong>Stato corrente:</strong>{" "}
                <span data-testid="orders-current-status">{getOrderStatusLabel(focusedOrder.status)}</span>
              </p>
            </div>

            <ol className={styles.timeline} data-testid="orders-timeline">
              {orderTimeline.map((step) => (
                <li
                  key={step.status}
                  className={`${styles.timelineStep} ${step.isCompleted ? styles.timelineStepCompleted : ""} ${step.isCurrent ? styles.timelineStepCurrent : ""}`}
                >
                  <span className={styles.timelineLabel}>{step.label}</span>
                  <span className={styles.timelineMeta}>
                    {step.isCurrent ? "In corso" : step.isCompleted ? "Completato" : "In attesa"}
                  </span>
                </li>
              ))}
            </ol>
          </ShellCard>

          <ShellCard title="Tracking rider">
            <div data-testid="tracking-card">
              {trackingSnapshot?.visibility === "hidden" ? (
                <p data-testid="tracking-hidden">{trackingSnapshot.summary}</p>
              ) : (
                <div className={styles.trackingStack}>
                  <p data-testid="tracking-visible">{trackingSnapshot?.summary}</p>
                  <div className={styles.mockMap}>
                    <span
                      className={styles.storePin}
                      style={{
                        left: `${trackingSnapshot?.mapPosition.xPercent ?? 50}%`,
                        top: `${trackingSnapshot?.mapPosition.yPercent ?? 50}%`
                      }}
                    >
                      Store
                    </span>
                    <span
                      className={styles.riderPin}
                      style={{
                        left: `${trackingSnapshot?.mapPosition.xPercent ?? 58}%`,
                        top: `${(trackingSnapshot?.mapPosition.yPercent ?? 54) - 12}%`
                      }}
                    >
                      Rider
                    </span>
                  </div>
                  <p className={styles.trackingMeta}>
                    Ultimo aggiornamento {formatTime(trackingSnapshot?.lastUpdatedAtIso ?? focusedOrder.updatedAtIso)}
                  </p>
                </div>
              )}
            </div>
          </ShellCard>
        </>
      ) : (
        <ShellCard title="Nessun ordine attivo">
          <p className={styles.emptyCopy}>
            Non ci sono ordini da seguire. Vai al menu per creare un nuovo ordine mock.
          </p>
        </ShellCard>
      )}

      <ShellCard title="Notifiche ordine">
        <div className={styles.notificationsHeader}>
          <p className={styles.notificationsMeta}>
            {unreadNotificationsCount > 0
              ? `${unreadNotificationsCount} notifiche non lette`
              : "Tutte le notifiche sono lette"}
          </p>
          <Button
            variant="secondary"
            onClick={handleMarkAllNotificationsAsRead}
            disabled={unreadNotificationsCount === 0}
            data-testid="orders-mark-read-button"
          >
            Segna tutte come lette
          </Button>
        </div>

        {notifications.length > 0 ? (
          <ul className={styles.notificationsList}>
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`${styles.notificationItem} ${!notification.isRead ? styles.notificationUnread : ""}`}
              >
                <div className={styles.notificationTopRow}>
                  <p className={styles.notificationTitle}>{notification.title}</p>
                  <Badge tone={notification.isRead ? "neutral" : "warning"}>
                    {notification.isRead ? "Letta" : "Nuova"}
                  </Badge>
                </div>
                <p className={styles.notificationDescription}>{notification.description}</p>
                <p className={styles.notificationMeta}>
                  {formatTime(notification.createdAtIso)} · {getOrderStatusLabel(notification.status)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyCopy}>Nessuna notifica disponibile.</p>
        )}
      </ShellCard>

      {feedbackTargetOrder ? (
        <ShellCard title="Feedback post-consegna">
          <div className={styles.feedbackStack} data-testid="orders-feedback-card">
            {!submittedFeedback ? (
              <>
                <p className={styles.feedbackIntro}>
                  Com&apos;è andata la consegna di questo ordine? Il feedback resta locale e aiuta la demo retention.
                </p>

                <div className={styles.feedbackRatingRow} role="radiogroup" aria-label="Valuta l'ordine da 1 a 5">
                  {[1, 2, 3, 4, 5].map((ratingValue) => (
                    <button
                      key={ratingValue}
                      type="button"
                      className={`${styles.feedbackRatingButton} ${feedbackRating === ratingValue ? styles.feedbackRatingButtonActive : ""}`}
                      onClick={() => setFeedbackRating(ratingValue as FeedbackRating)}
                      aria-pressed={feedbackRating === ratingValue}
                      data-testid={`orders-feedback-rating-${ratingValue}`}
                    >
                      {ratingValue}
                    </button>
                  ))}
                </div>

                <label className={styles.feedbackLabel} htmlFor="orders-feedback-comment">
                  Nota facoltativa
                </label>
                <textarea
                  id="orders-feedback-comment"
                  className={styles.feedbackComment}
                  rows={3}
                  value={feedbackComment}
                  onChange={(event) => setFeedbackComment(event.target.value)}
                  placeholder="Impasto perfetto e consegna puntuale."
                />

                <div className={styles.feedbackSubmitRow}>
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={feedbackRating === null}
                    data-testid="orders-feedback-submit-button"
                  >
                    Invia feedback
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.feedbackSummaryTopRow}>
                  <Badge tone={shouldOfferGoogleReviewRedirect ? "success" : "neutral"}>Feedback inviato</Badge>
                  <p className={styles.feedbackMeta}>Valutazione: {submittedFeedback.rating}/5</p>
                </div>

                {submittedFeedback.comment ? (
                  <p className={styles.feedbackCommentPreview}>&ldquo;{submittedFeedback.comment}&rdquo;</p>
                ) : (
                  <p className={styles.feedbackMeta}>Nessuna nota aggiuntiva.</p>
                )}

                {shouldOfferGoogleReviewRedirect ? (
                  <>
                    {submittedFeedback.googleReviewRedirectedAtIso ? (
                      <p className={styles.feedbackMeta} data-testid="orders-feedback-google-redirected">
                        Redirect Google Review simulato con successo.
                      </p>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={handleGoogleReviewRedirectSimulation}
                        data-testid="orders-feedback-google-button"
                      >
                        Simula redirect Google Review
                      </Button>
                    )}
                  </>
                ) : (
                  <p className={styles.feedbackMeta}>
                    Grazie, useremo il feedback per migliorare la prossima consegna.
                  </p>
                )}
              </>
            )}
          </div>
        </ShellCard>
      ) : null}

      <ShellCard title="Storico ordini e archivio">
        {historyOrders.length > 0 ? (
          <ul className={styles.historyList} data-testid="orders-history-list">
            {historyOrders.map((order) => (
              <li key={order.id} className={styles.historyItem}>
                <div className={styles.historyTopRow}>
                  <p className={styles.historyTitle}>{order.id}</p>
                  <Badge tone={isArchivedOrder(order) ? "neutral" : "warning"}>
                    {isArchivedOrder(order) ? "Archiviato" : "In corso"}
                  </Badge>
                </div>
                <p className={styles.historyMeta}>
                  {formatDateTime(order.createdAtIso)} · {getOrderStatusLabel(order.status)}
                </p>
                <ul className={styles.historyLines}>
                  {order.lines.map((line) => (
                    <li key={`${order.id}-${line.productId}-${line.notes}`} className={styles.historyLine}>
                      {line.quantity}x {resolveProductName(line.productId, seed)} · {formatMoney(line.unitPrice.amountCents)}
                    </li>
                  ))}
                </ul>
                <div className={styles.historyFooter}>
                  <p className={styles.historyTotal}>Totale {formatMoney(order.total.amountCents)}</p>
                  <Button
                    variant="secondary"
                    onClick={() => handleQuickReorder(order)}
                    data-testid={`orders-reorder-${order.id}`}
                  >
                    Riordina veloce
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyCopy}>Nessun ordine nello storico.</p>
        )}

        <div className={styles.archiveSummary}>
          <p className={styles.notificationsMeta}>Ordini archiviati: {archivedOrders.length}</p>
        </div>
      </ShellCard>
    </main>
  );
}

function formatTime(isoTimestamp: string): string
{
  const parsedDate = new Date(isoTimestamp);

  if (Number.isNaN(parsedDate.getTime()))
  {
    return isoTimestamp;
  }

  return TIME_FORMATTER.format(parsedDate);
}

function formatDateTime(isoTimestamp: string): string
{
  const parsedDate = new Date(isoTimestamp);

  if (Number.isNaN(parsedDate.getTime()))
  {
    return isoTimestamp;
  }

  return DATE_TIME_FORMATTER.format(parsedDate);
}

function formatMoney(amountCents: number): string
{
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(amountCents / 100);
}

function resolveProductName(productId: string, seed: ClientSeed): string
{
  return seed.products.find((product) => product.id === productId)?.name ?? productId;
}
