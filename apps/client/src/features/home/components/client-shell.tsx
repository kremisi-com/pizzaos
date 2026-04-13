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
  deriveLastReorderOrder
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

  const [isQuickReorderReady, setIsQuickReorderReady] = useState(false);

  useEffect(() =>
  {
    const storage = resolveStorage();
    const hydratedSeed = loadClientDemoState(storage);

    setSeed(hydratedSeed);
  }, []);

  function handleResetClick(): void
  {
    const storage = resolveStorage();

    clearCartState(storage);
    clearClientFeedbackState(storage);
    clearOrderNotifications(storage);
    setSeed(resetClientDemoState(storage));
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
      <div className={styles.headerBanner}>

      </div>

      <section className={styles.hero} aria-labelledby="client-home-title">
        <h1 id="client-home-title" className={styles.heroTitle}>
          Pizzeria PizzaOS
        </h1>

        <div className={styles.heroStatsRow}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>★</span>
            <span className={styles.ratingText}>4.8 Eccellente <span className={styles.ratingCount}>(500+)</span></span>
            <span className={styles.statLink}>›</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>ⓘ</span>
            <span>Allergeni e informazioni</span>
            <span className={styles.statLink}>›</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>🛵</span>
            <span>Consegna fra circa 25 min · 1.5 km</span>
            <span className={styles.statLink}>›</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>💰</span>
            <span>Minimo d&apos;ordine: 10,00 € · <strong>Aperto</strong></span>
          </div>
        </div>

        <div className={styles.heroActions}>
          <a
            className={styles.primaryActionLink}
            href="/menu?section=section-speciali"
          >
            Crea la tua pizza
          </a>
          <a
            className={styles.secondaryActionLink}
            href="/group-order"
          >
            Ordina con i tuoi amici
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
              <span className={styles.categoryIcon}>🥨</span>
              <span className={styles.categoryLabel}>Stuzzicherie</span>
            </a>
            <a href="/menu?section=section-bevande" className={styles.categoryTab}>
              <span className={styles.categoryIcon}>🥤</span>
              <span className={styles.categoryLabel}>Bevande</span>
            </a>
            <a href="/menu" className={styles.categoryTab}>
              <span className={styles.categoryIcon}>🧁</span>
              <span className={styles.categoryLabel}>dolci</span>
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

        <section className={styles.rewardsActionSection}>
          <a href="/rewards" className={styles.secondaryActionButton}>
            I tuoi premi e coupon
          </a>
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
