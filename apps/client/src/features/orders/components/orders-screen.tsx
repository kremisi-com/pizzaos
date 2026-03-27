"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { loadClientDemoState, saveClientDemoState } from "../../home/client-demo-state";
import {
  advanceClientOrderState,
  CLIENT_ORDER_SIMULATION_TICK_MS,
  deriveOrderTimeline,
  deriveTrackingSnapshot,
  deriveUnreadOrderNotificationsCount,
  getOrderStatusLabel,
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
  const unreadNotificationsCount = deriveUnreadOrderNotificationsCount(notifications);
  const orderTimeline = useMemo(
    () => (focusedOrder ? deriveOrderTimeline(focusedOrder.status) : []),
    [focusedOrder]
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
          <a href="/menu" className={styles.secondaryLink}>Nuovo ordine</a>
        </div>
      </section>

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
