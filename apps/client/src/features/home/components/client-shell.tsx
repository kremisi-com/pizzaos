"use client";

import { getThemeClass } from "@pizzaos/brand";
import type { Order, Product } from "@pizzaos/domain";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
import { useEffect, useState, type ReactElement } from "react";
import type { ClientSeed } from "@pizzaos/mock-data";
import { clearCartState, saveCartState } from "../../cart/cart-model";
import { loadClientDemoState, resetClientDemoState } from "../client-demo-state";
import {
  clearOrderNotifications,
  createCartStateFromOrder,
  deriveLastReorderOrder,
  deriveUnreadOrderNotificationsCount,
  getOrderStatusLabel,
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
  const [isLastOrderPromptVisible, setIsLastOrderPromptVisible] = useState(
    () => deriveLastReorderOrder(seed.orderHistory) !== null
  );
  const [isQuickReorderReady, setIsQuickReorderReady] = useState(false);

  useEffect(() =>
  {
    const storage = resolveStorage();
    const hydratedSeed = loadClientDemoState(storage);

    setSeed(hydratedSeed);
    setIsLastOrderPromptVisible(deriveLastReorderOrder(hydratedSeed.orderHistory) !== null);
    setUnreadNotificationsCount(deriveUnreadOrderNotificationsCount(loadOrderNotifications(storage)));
  }, []);

  function handleResetClick(): void
  {
    const storage = resolveStorage();

    clearCartState(storage);
    clearOrderNotifications(storage);
    setSeed(resetClientDemoState(storage));
    setUnreadNotificationsCount(0);
    setIsQuickReorderReady(false);
    setIsLastOrderPromptVisible(true);
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
    setIsLastOrderPromptVisible(false);
  }

  const activeOrder = seed.activeOrders[0];
  const latestOrder = deriveLastReorderOrder(seed.orderHistory) ?? activeOrder;
  const activeCoupon = seed.coupons.find((coupon) => coupon.status === "active");

  return (
    <main className={`${getThemeClass(seed.surface)} ${styles.shell}`}>
      <section className={styles.hero} aria-labelledby="client-home-title">
        <div className={styles.heroTopRow}>
          <Badge tone="success">Sessione cliente attiva</Badge>
          <span className={styles.heroMeta}>
            {seed.store.displayName} · {seed.store.city}
          </span>
        </div>

        <h1 id="client-home-title" className={styles.heroTitle}>
          Bentornato. Il tuo prossimo ordine è già pronto a ripartire.
        </h1>

        <p className={styles.heroCopy}>
          Riprendi l&apos;ultimo ordine o crea una nuova pizza con ingredienti, allergeni e prezzo sempre chiari.
        </p>

        <div className={styles.heroActions}>
          <a className={`${styles.actionLink} ${styles.primaryActionLink}`} href="/menu">
            Riordina ora
          </a>
          <a
            className={`${styles.actionLink} ${styles.secondaryActionLink}`}
            href="/menu?section=section-speciali"
          >
            Crea la tua pizza
          </a>
          {activeOrder ? (
            <a className={`${styles.actionLink} ${styles.secondaryActionLink}`} href="/orders">
              Segui ordine
            </a>
          ) : null}
        </div>

        {isLastOrderPromptVisible && latestOrder ? (
          <div className={styles.lastOrderPrompt} data-testid="client-last-order-prompt">
            <p className={styles.cardMeta}>
              Ordina come l&apos;ultima volta in un tap e riparti dal checkout.
            </p>
            <div className={styles.lastOrderPromptActions}>
              <Button onClick={handleOrderLikeLastTime} data-testid="client-order-like-last-time-button">
                Ordina come l&apos;ultima volta
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsLastOrderPromptVisible(false)}
              >
                Dopo
              </Button>
            </div>
          </div>
        ) : null}

        {isQuickReorderReady ? (
          <div className={styles.quickReorderNotice} data-testid="client-quick-reorder-notice">
            <p className={styles.cardMeta}>Carrello aggiornato con l&apos;ultimo ordine.</p>
            <a className={styles.quickReorderLink} href="/cart">Vai al carrello</a>
          </div>
        ) : null}

        <dl className={styles.heroStats}>
          <div className={styles.statItem}>
            <dt className={styles.statLabel}>Ordine attivo</dt>
            <dd className={styles.statValue}>{activeOrder ? formatOrderStatus(activeOrder.status) : "Nessuno"}</dd>
          </div>
          <div className={styles.statItem}>
            <dt className={styles.statLabel}>Storico</dt>
            <dd className={styles.statValue}>{seed.orderHistory.length} ordini</dd>
          </div>
          <div className={styles.statItem}>
            <dt className={styles.statLabel}>Punti fedeltà</dt>
            <dd className={styles.statValue}>{seed.loyalty.pointsBalance}</dd>
          </div>
          <div className={styles.statItem}>
            <dt className={styles.statLabel}>Coupon attivi</dt>
            <dd className={styles.statValue}>{seed.coupons.filter((coupon) => coupon.status === "active").length}</dd>
          </div>
          <div className={styles.statItem}>
            <dt className={styles.statLabel}>Notifiche</dt>
            <dd className={styles.statValue}>{unreadNotificationsCount}</dd>
          </div>
        </dl>

        {activeOrder ? (
          <div className={styles.promoStack}>
            <Badge tone="neutral">Ordine in corso</Badge>
            {unreadNotificationsCount > 0 ? (
              <Badge tone="warning">
                {unreadNotificationsCount} notifiche nuove
              </Badge>
            ) : null}
            <p className={styles.cardMeta}>
              Slot previsto {formatSlot(activeOrder.scheduledSlot)} · {formatMoney(activeOrder.total.amountCents)}
            </p>
          </div>
        ) : null}
      </section>

      <div className={styles.panelGrid}>
        <section id="riordino-rapido" className={styles.sectionAnchor}>
          <ShellCard title="Riordino rapido">
            <div className={styles.cardContent}>
              <p className={styles.cardMeta}>Riparti dall&apos;ultimo ordine salvato.</p>

              {latestOrder ? (
                <>
                  <div className={styles.cardTopRow}>
                    <div>
                      <p className={styles.cardTitle}>Ultimo ordine riordinabile</p>
                      <p className={styles.cardMeta}>{formatSlot(latestOrder.createdAtIso)}</p>
                    </div>
                    <Badge tone={latestOrder.status === "delivered" ? "success" : "neutral"}>
                      {formatOrderStatus(latestOrder.status)}
                    </Badge>
                  </div>

                  <ul className={styles.orderLines}>
                    {latestOrder.lines.map((line) => (
                      <li key={`${line.productId}-${line.notes}`} className={styles.orderLine}>
                        <div>
                          <div className={styles.orderLineName}>{getProductName(line.productId, seed.products)}</div>
                          <div className={styles.orderLineNotes}>
                            {line.quantity} x {formatMoney(line.unitPrice.amountCents)}
                            {line.notes ? ` · ${line.notes}` : ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className={styles.priceRow}>
                    <div>
                      <div className={styles.priceValue}>{formatMoney(latestOrder.total.amountCents)}</div>
                      <div className={styles.priceCaption}>Totale dell&apos;ultimo ordine</div>
                    </div>
                    <Badge tone="neutral">Slot salvato</Badge>
                  </div>

                  <Button
                    onClick={handleOrderLikeLastTime}
                    data-testid="client-quick-reorder-button"
                  >
                    Ordina come l&apos;ultima volta
                  </Button>

                  {isQuickReorderReady ? (
                    <a className={styles.quickReorderLink} href="/cart">
                      Vai al carrello
                    </a>
                  ) : null}
                </>
              ) : (
                <p className={styles.cardMeta}>Nessun ordine precedente disponibile.</p>
              )}
            </div>
          </ShellCard>
        </section>

        <section id="costruisci-la-tua-pizza" className={styles.sectionAnchor}>
          <ShellCard title="Costruisci la tua pizza">
            <div className={styles.cardContent}>
              <p className={styles.cardMeta}>Percorso guidato e senza sovraccarico.</p>

              <p className={styles.cardMeta}>
                L&apos;esperienza successiva guiderà l&apos;utente per step, senza nascondere prezzo, allergeni o varianti.
              </p>

              <ul className={styles.checklist}>
                <li>Selezione impasto e formato</li>
                <li>Ingredienti, extra e rimozioni</li>
                <li>Allergeni e suggerimenti di abbinamento</li>
              </ul>
            </div>
          </ShellCard>
        </section>

        <section className={styles.sectionAnchor}>
          <ShellCard title="Promo di stagione">
            <div className={styles.cardContent}>
              <p className={styles.cardMeta}>Sempre visibile, mai bloccante.</p>

              <p className={styles.cardMeta}>
                Hai {seed.loyalty.pointsBalance} punti attivi e una base di riordino rapida pronta a partire.
              </p>

              {activeCoupon ? (
                <div className={styles.promoStack}>
                  <Badge tone="warning">{activeCoupon.code}</Badge>
                  <p className={styles.cardMeta}>
                    Usa {formatMoney(activeCoupon.discountAmount.amountCents)} di sconto per ordini sopra{" "}
                    {formatMoney(activeCoupon.minOrderAmount.amountCents)}.
                  </p>
                </div>
              ) : (
                <p className={styles.cardMeta}>Nessun coupon attivo al momento.</p>
              )}
            </div>
          </ShellCard>
        </section>

        <section className={styles.sectionAnchor}>
          <ShellCard title="Riparti dalla demo">
            <div className={styles.demoFooter}>
              <p className={styles.cardMeta}>Reset esplicito dello stato locale.</p>

              <p className={styles.cardMeta}>
                Il client salva la sessione in locale. Usa il reset per tornare allo seed iniziale in qualsiasi momento.
              </p>

              <Button
                onClick={handleResetClick}
                data-testid="client-reset-button"
                variant="secondary"
                className={styles.resetButton}
              >
                Reset demo
              </Button>

            </div>
          </ShellCard>
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

function formatOrderStatus(status: Order["status"]): string
{
  return getOrderStatusLabel(status);
}
