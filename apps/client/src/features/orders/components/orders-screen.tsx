"use client";

import type { Order } from "@pizzaos/domain";
import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { saveCartState } from "../../cart/cart-model";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  createCartStateFromOrder,
  getOrderStatusLabel,
  isArchivedOrder
} from "../orders-model";
import styles from "./orders-screen.module.css";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
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

  function handleQuickReorder(order: Order): void
  {
    const storage = resolveStorage();
    const nextCartState = createCartStateFromOrder(order, seed.products);

    saveCartState(nextCartState, storage);
    setReorderedOrderId(order.id);
  }

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="orders-title">
        <div className={styles.heroTopRow}>
          <a href="/" className={styles.backLink}>Home</a>
          <Badge tone="neutral">
            {displayedOrders.length} {displayedOrders.length === 1 ? "ordine" : "ordini"}
          </Badge>
        </div>

        <h1 id="orders-title" className={styles.heroTitle}>Ordini passati</h1>
        <p className={styles.heroCopy}>
          Apri uno storico per rivedere prodotti, note e totale con lo stesso dettaglio del carrello.
        </p>
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

      <ShellCard title="Storico ordini">
        {displayedOrders.length > 0 ? (
          <ul className={styles.historyList} data-testid="orders-history-list">
            {displayedOrders.map((order) => (
              <li key={order.id} className={styles.historyItem}>
                <div className={styles.historyCard}>
                  <div className={styles.historyTopRow}>
                    <p className={styles.historyTitle}>{order.id}</p>
                    <Badge tone={order.status === "cancelled" ? "warning" : "neutral"}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className={styles.historyMeta}>
                    {formatDateTime(order.createdAtIso)} · {order.lines.length} {order.lines.length === 1 ? "riga" : "righe"}
                  </p>
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
      </ShellCard>
    </main>
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
  return MONEY_FORMATTER.format(amountCents / 100);
}
