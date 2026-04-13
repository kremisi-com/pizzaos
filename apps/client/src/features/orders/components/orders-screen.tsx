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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reorderedOrderId, setReorderedOrderId] = useState<string | null>(null);

  useEffect(() =>
  {
    const hydratedSeed = loadClientDemoState(resolveStorage());
    const selectableOrders = deriveSelectableOrders(hydratedSeed);

    setSeed(hydratedSeed);
    setSelectedOrderId((currentSelectedOrderId) => currentSelectedOrderId ?? selectableOrders[0]?.id ?? null);
  }, []);

  const displayedOrders = useMemo(
    () => deriveSelectableOrders(seed),
    [seed]
  );
  const selectedOrder = useMemo(
    () =>
    {
      if (displayedOrders.length === 0)
      {
        return null;
      }

      return displayedOrders.find((order) => order.id === selectedOrderId) ?? displayedOrders[0];
    },
    [displayedOrders, selectedOrderId]
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

        <div className={styles.heroActions}>
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

      <ShellCard title="Storico ordini">
        {displayedOrders.length > 0 ? (
          <ul className={styles.historyList} data-testid="orders-history-list">
            {displayedOrders.map((order) => {
              const isSelected = order.id === selectedOrder?.id;

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    className={`${styles.historyButton} ${isSelected ? styles.historyButtonSelected : ""}`}
                    onClick={() => setSelectedOrderId(order.id)}
                    data-testid={`orders-history-select-${order.id}`}
                  >
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
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.emptyCopy}>Nessun ordine nello storico.</p>
        )}
      </ShellCard>

      {selectedOrder ? (
        <section className={styles.detailStack} data-testid="orders-detail-card">
          <ShellCard title="Dettagli ordine">
            <div className={styles.orderMeta}>
              <p>
                <strong>ID ordine:</strong> {selectedOrder.id}
              </p>
              <p>
                <strong>Creato il:</strong> {formatDateTime(selectedOrder.createdAtIso)}
              </p>
              <p>
                <strong>Slot:</strong> {selectedOrder.scheduledSlot}
              </p>
              <p>
                <strong>Stato:</strong> {getOrderStatusLabel(selectedOrder.status)}
              </p>
            </div>

            <section className={styles.itemsSection} aria-label="Prodotti dell'ordine selezionato">
              {selectedOrder.lines.map((line, lineIndex) => (
                <article
                  key={`${selectedOrder.id}-${line.productId}-${lineIndex}`}
                  className={styles.itemCard}
                >
                  <div className={styles.itemTopRow}>
                    <div className={styles.itemInfo}>
                      <h2 className={styles.itemName}>
                        {line.quantity}x {resolveProductName(line.productId, seed)}
                      </h2>
                      {line.notes ? (
                        <p className={styles.itemNotes}>{line.notes}</p>
                      ) : null}
                    </div>
                    <p className={styles.itemPrice}>
                      {formatMoney(line.unitPrice.amountCents * line.quantity)}
                    </p>
                  </div>
                </article>
              ))}
            </section>
          </ShellCard>

          <ShellCard title="Riepilogo ordine">
            <div className={styles.summaryGrid}>
              <p>Subtotale</p>
              <p>{formatMoney(selectedOrder.subtotal.amountCents)}</p>
              {selectedOrder.discountTotal.amountCents > 0 ? (
                <>
                  <p>Sconti</p>
                  <p>-{formatMoney(selectedOrder.discountTotal.amountCents)}</p>
                </>
              ) : null}
              <p>Consegna</p>
              <p>{formatMoney(selectedOrder.deliveryFee.amountCents)}</p>
            </div>

            <div className={styles.summaryTotalRow}>
              <span className={styles.summaryTotalLabel}>Totale pagato</span>
              <span className={styles.summaryTotalValue}>{formatMoney(selectedOrder.total.amountCents)}</span>
            </div>

            <div className={styles.summaryActions}>
              <Button
                variant="secondary"
                onClick={() => handleQuickReorder(selectedOrder)}
                data-testid={`orders-reorder-${selectedOrder.id}`}
              >
                Riordina veloce
              </Button>
            </div>
          </ShellCard>
        </section>
      ) : null}
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

function resolveProductName(productId: string, seed: ClientSeed): string
{
  return seed.products.find((product) => product.id === productId)?.name ?? productId;
}
