"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge } from "@pizzaos/ui";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { loadClientDemoState } from "../../home/client-demo-state";
import {
  clearCartState,
  loadCartState,
  removeCartItem,
  setCartItemQuantity,
  type CartState
} from "../cart-model";
import { DELIVERY_FEE_CENTS, deriveCheckoutTotals } from "../../checkout/checkout-model";
import styles from "./cart-screen.module.css";

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

export function CartScreen(): ReactElement
{
  const [seed, setSeed] = useState<ClientSeed>(() => loadClientDemoState());
  const [cartState, setCartState] = useState<CartState>(() => loadCartState());

  useEffect(() =>
  {
    const storage = resolveStorage();

    setSeed(loadClientDemoState(storage));
    setCartState(loadCartState(storage));
  }, []);

  const totals = useMemo(
    () =>
      deriveCheckoutTotals(cartState.items, {
        tipPercent: 0,
        deliveryFeeCents: DELIVERY_FEE_CENTS
      }),
    [cartState.items]
  );

  function handleQuantityChange(itemId: string, nextQuantity: number): void
  {
    setCartState(setCartItemQuantity(itemId, nextQuantity, resolveStorage()));
  }

  function handleRemove(itemId: string): void
  {
    setCartState(removeCartItem(itemId, resolveStorage()));
  }

  function handleClearCart(): void
  {
    setCartState(clearCartState(resolveStorage()));
  }

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="cart-title">
        <div className={styles.heroTopRow}>
          <a href="/menu" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            Menu
          </a>
          <Badge tone="neutral">{seed.store.displayName}</Badge>
        </div>

        <h1 id="cart-title" className={styles.heroTitle}>Carrello</h1>
        <p className={styles.heroCopy}>
          Rivedi prodotti, quantità e totale prima del checkout.
        </p>

        {cartState.items.length > 0 ? (
          <div className={styles.itemCount}>
            <span className={styles.itemCountDot} />
            {cartState.items.length} {cartState.items.length === 1 ? "prodotto" : "prodotti"}
          </div>
        ) : null}
      </section>

      {cartState.items.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🛒</span>
          <p className={styles.emptyLead}>Carrello vuoto</p>
          <p className={styles.emptyCopy}>
            Apri il menu e personalizza una pizza per iniziare il checkout.
          </p>
          <a href="/menu" className={styles.menuLink}>
            Sfoglia il menu →
          </a>
        </div>
      ) : (
        <>
          <section className={styles.itemsSection} aria-label="Prodotti nel carrello">
            {cartState.items.map((item) => (
              <article key={item.id} className={styles.itemCard}>
                <div className={styles.itemTopRow}>
                  <div className={styles.itemInfo}>
                    <h2 className={styles.itemName}>{item.productName}</h2>
                    {item.notes ? (
                      <p className={styles.itemNotes}>{item.notes}</p>
                    ) : null}
                  </div>
                  <p className={styles.itemPrice}>
                    {formatMoney(item.unitPriceCents * item.quantity)}
                  </p>
                </div>

                <div className={styles.itemActions}>
                  <div className={styles.quantityControl}>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      aria-label={`Diminuisci quantità ${item.productName}`}
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className={styles.quantityValue}>{item.quantity}</span>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      aria-label={`Aumenta quantità ${item.productName}`}
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.removeButton}
                    onClick={() => handleRemove(item.id)}
                  >
                    <span className={styles.removeIcon}>🗑</span>
                    Rimuovi
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.summarySection}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>
                <span className={styles.summaryIcon}>📋</span>
                Riepilogo
              </h2>

              <div className={styles.summaryGrid}>
                <p>Subtotale</p>
                <p>{formatMoney(totals.subtotalCents)}</p>
                <p>Consegna stimata</p>
                <p>{formatMoney(totals.deliveryFeeCents)}</p>
              </div>

              <div className={styles.summaryTotalRow}>
                <span className={styles.summaryTotalLabel}>Totale stimato</span>
                <span className={styles.summaryTotalValue}>
                  {formatMoney(totals.totalCents)}
                </span>
              </div>

              <div className={styles.summaryActions}>
                <a
                  href="/checkout"
                  className={styles.checkoutLink}
                  data-testid="cart-checkout-link"
                >
                  Vai al checkout
                  <span className={styles.checkoutIcon}>→</span>
                </a>
                <button
                  type="button"
                  className={styles.clearCartButton}
                  onClick={handleClearCart}
                >
                  Svuota carrello
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function formatMoney(amountCents: number): string
{
  return MONEY_FORMATTER.format(amountCents / 100);
}
