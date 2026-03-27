"use client";

import type { ClientSeed } from "@pizzaos/mock-data";
import { Badge, Button, ShellCard } from "@pizzaos/ui";
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
          <a href="/menu" className={styles.backLink}>Menu</a>
          <Badge tone="neutral">{seed.store.displayName}</Badge>
        </div>

        <h1 id="cart-title" className={styles.heroTitle}>Carrello</h1>
        <p className={styles.heroCopy}>Rivedi prodotti, quantità e totale prima del checkout.</p>
      </section>

      {cartState.items.length === 0 ? (
        <ShellCard title="Carrello vuoto">
          <div className={styles.emptyState}>
            <p className={styles.emptyLead}>Nessun prodotto nel carrello.</p>
            <p className={styles.emptyCopy}>Apri il menu e personalizza una pizza per iniziare il checkout.</p>
            <a href="/menu" className={styles.menuLink}>Vai al menu</a>
          </div>
        </ShellCard>
      ) : (
        <>
          <section className={styles.itemsSection} aria-label="Prodotti nel carrello">
            {cartState.items.map((item) => (
              <article key={item.id} className={styles.itemCard}>
                <div className={styles.itemTopRow}>
                  <div>
                    <h2 className={styles.itemName}>{item.productName}</h2>
                    <p className={styles.itemNotes}>{item.notes}</p>
                  </div>
                  <p className={styles.itemPrice}>{formatMoney(item.unitPriceCents * item.quantity)}</p>
                </div>

                <div className={styles.itemActions}>
                  <div className={styles.quantityControl}>
                    <Button
                      variant="secondary"
                      aria-label={`Diminuisci quantità ${item.productName}`}
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    >
                      -
                    </Button>
                    <span className={styles.quantityValue}>Qta {item.quantity}</span>
                    <Button
                      variant="secondary"
                      aria-label={`Aumenta quantità ${item.productName}`}
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    >
                      +
                    </Button>
                  </div>

                  <Button variant="ghost" onClick={() => handleRemove(item.id)}>
                    Rimuovi
                  </Button>
                </div>
              </article>
            ))}
          </section>

          <section className={styles.summarySection}>
            <ShellCard title="Riepilogo ordine">
              <div className={styles.summaryGrid}>
                <p>Subtotale</p>
                <p>{formatMoney(totals.subtotalCents)}</p>
                <p>Consegna stimata</p>
                <p>{formatMoney(totals.deliveryFeeCents)}</p>
                <p className={styles.summaryTotalLabel}>Totale stimato</p>
                <p className={styles.summaryTotalValue}>{formatMoney(totals.totalCents)}</p>
              </div>

              <div className={styles.summaryActions}>
                <a href="/checkout" className={styles.checkoutLink} data-testid="cart-checkout-link">
                  Vai al checkout
                </a>
                <Button variant="secondary" onClick={handleClearCart}>
                  Svuota carrello
                </Button>
              </div>
            </ShellCard>
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
