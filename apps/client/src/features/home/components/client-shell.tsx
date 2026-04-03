"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { Product } from "@pizzaos/domain";
import { Badge, Button } from "@pizzaos/ui";
import { useEffect, useState, type ReactElement } from "react";
import type { ClientSeed } from "@pizzaos/mock-data";
import { clearCartState, saveCartState } from "../../cart/cart-model";
import { clearClientFeedbackState } from "../../feedback/feedback-model";
import { loadClientDemoState, resetClientDemoState } from "../client-demo-state";
import {
  clearOrderNotifications,
  createCartStateFromOrder,
  deriveLastReorderOrder,
  deriveUnreadOrderNotificationsCount,
  loadOrderNotifications
} from "../../orders/orders-model";
import styles from "./client-shell.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

const SLOT_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
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

export function ClientShell(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const [isQuickReorderReady, setIsQuickReorderReady] = useState(false);

  useEffect(() =>
  {
    const storage = resolveStorage();
    const hydratedSeed = loadClientDemoState(storage);

    setSeed(hydratedSeed);
    setUnreadNotificationsCount(deriveUnreadOrderNotificationsCount(loadOrderNotifications(storage)));
  }, []);

  function handleResetClick(): void
  {
    const storage = resolveStorage();

    clearCartState(storage);
    clearClientFeedbackState(storage);
    clearOrderNotifications(storage);
    setSeed(resetClientDemoState(storage));
    setUnreadNotificationsCount(0);
    setIsQuickReorderReady(false);
  }

  function handleOrderLikeLastTime(): void
  {
    const storage = resolveStorage();
    const lastReorderOrder = deriveLastReorderOrder(seed.orderHistory);

    if (!lastReorderOrder)
    {
      return;
    }

    saveCartState(createCartStateFromOrder(lastReorderOrder, seed.products), storage);
    setIsQuickReorderReady(true);
  }

  const activeOrder = seed.activeOrders[0];
  const latestOrder = deriveLastReorderOrder(seed.orderHistory) ?? activeOrder;
  return (
    <main className={`${getThemeClass(seed.surface)} ${styles.shell}`}>
      <section className={styles.hero} aria-labelledby="client-home-title">
        <div className={styles.heroTopRow}>
          <div className={styles.storeInfo}>
            <span className={styles.statusDot} />
            <span className={styles.heroMeta}>
              {seed.store.displayName} · {seed.store.city}
            </span>
          </div>
          {unreadNotificationsCount > 0 ? (
            <Badge tone="warning">
              {unreadNotificationsCount}
            </Badge>
          ) : null}
        </div>

        <h1 id="client-home-title" className={styles.heroTitle}>
          Cosa ordiniamo oggi?
        </h1>

        <div className={styles.heroActions}>
          <a className={`${styles.actionLink} ${styles.primaryActionLink}`} href="/menu">
            Sfoglia il menu
          </a>
          <a
            className={`${styles.actionLink} ${styles.secondaryActionLink}`}
            href="/menu?section=section-speciali"
          >
            Crea la tua pizza
          </a>
        </div>
      </section>

      {activeOrder ? (
        <section className={styles.activeOrderCard}>
          <div className={styles.activeOrderInfo}>
            <Badge tone="success">Ordine in corso</Badge>
            <p className={styles.activeOrderMeta}>
              Consegna prevista {formatSlot(activeOrder.scheduledSlot)}
            </p>
          </div>
          <a className={styles.activeOrderLink} href="/orders">
            Segui l&apos;ordine
          </a>
        </section>
      ) : null}

      <div className={styles.contentGrid}>
        {latestOrder && !activeOrder ? (
          <section className={styles.reorderSection}>
            <h2 className={styles.sectionTitle}>Bentornato!</h2>
            <div className={styles.reorderCard}>
              <div className={styles.reorderInfo}>
                <p className={styles.reorderTitle}>Ordina come l&apos;ultima volta</p>
                <div className={styles.reorderMeta}>
                  {latestOrder.lines.map(line => getProductName(line.productId, seed.products)).join(", ")}
                </div>
                <p className={styles.reorderPrice}>{formatMoney(latestOrder.total.amountCents)}</p>
              </div>
              <Button onClick={handleOrderLikeLastTime} data-testid="client-quick-reorder-button" className={styles.reorderButton}>
                Ripeti
              </Button>
            </div>
            {isQuickReorderReady ? (
              <div className={styles.quickReorderNotice}>
                <span>Carrello aggiornato!</span>
                <a className={styles.cartLink} href="/cart">Vai al carrello</a>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={styles.categoriesSection}>
          <h2 className={styles.sectionTitle}>Esplora le categorie</h2>
          <div className={styles.categoryGrid}>
            <a href="/menu?section=section-classiche" className={styles.categoryTab}>
              <span className={styles.categoryIcon}>🍕</span>
              <span className={styles.categoryLabel}>Classiche</span>
            </a>
            <a href="/menu?section=section-speciali" className={styles.categoryTab}>
              <span className={styles.categoryIcon}>✨</span>
              <span className={styles.categoryLabel}>Speciali</span>
            </a>
            <a href="/menu?section=section-bevande" className={styles.categoryTab}>
              <span className={styles.categoryIcon}>🥤</span>
              <span className={styles.categoryLabel}>Bevande</span>
            </a>
            <a href="/rewards" className={styles.categoryTab}>
              <span className={styles.categoryIcon}>🎁</span>
              <span className={styles.categoryLabel}>Premi</span>
            </a>
          </div>
        </section>

        <section className={styles.loyaltySection}>
          <div className={styles.loyaltyCard}>
            <div className={styles.loyaltyPoints}>
              <span className={styles.pointsValue}>{seed.loyalty.pointsBalance}</span>
              <span className={styles.pointsLabel}>Punti</span>
            </div>
            <div className={styles.loyaltyPromo}>
              <p>Hai {seed.coupons.filter(c => c.status === "active").length} coupon attivi</p>
              <a href="/rewards" className={styles.rewardsLink}>Scopri i tuoi vantaggi</a>
            </div>
          </div>
        </section>

        <section className={styles.demoSection}>
          <Button
            onClick={handleResetClick}
            data-testid="client-reset-button"
            variant="ghost"
            className={styles.resetButton}
          >
            Svuota sessione demo
          </Button>
        </section>
      </div>
    </main>
  );
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}

function formatSlot(isoTimestamp: string): string
{
  const normalizedValue = isoTimestamp.startsWith("slot-")
    ? isoTimestamp.replace(/^slot-/, "")
    : isoTimestamp;
  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime()))
  {
    return isoTimestamp;
  }

  return SLOT_FORMATTER.format(parsedDate);
}

function getProductName(productId: Product["id"], products: readonly Product[]): string
{
  return products.find((product) => product.id === productId)?.name ?? productId;
}


