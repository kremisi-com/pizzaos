"use client";

import { useEffect, useMemo, useState, type ReactElement } from "react";
import type { ClientCart } from "@pizzaos/domain";
import { useClientApi } from "../../../api/client-api-provider";
import { loadCartState, type CartItem, type CartState } from "../cart-model";
import { DELIVERY_FEE_CENTS, deriveCheckoutTotals } from "../../checkout/checkout-model";
import styles from "./cart-screen.module.css";

const MONEY_FORMATTER = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

const CLIENT_CONTEXT = { customerId: "customer-client-demo", storeId: "store-roma-centro" };

function resolveStorage(): Storage | undefined
{
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function CartScreen(): ReactElement
{
  const api = useClientApi();
  const [cartState, setCartState] = useState<CartState>(() => loadCartState(resolveStorage()));

  useEffect(() =>
  {
    void api.getCart(CLIENT_CONTEXT).then((response) => setCartState(toCartState(response.cart)));
  }, [api]);

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
    void api.updateCartLine({ cartId: "client-cart", lineId: itemId, quantity: nextQuantity })
      .then((response) => setCartState(toCartState(response.cart)));
  }

  function handleRemove(itemId: string): void
  {
    void api.removeCartLine({ cartId: "client-cart", lineId: itemId })
      .then((response) => setCartState(toCartState(response.cart)));
  }

  function handleClearCart(): void
  {
    setCartState({ items: [] });
    void Promise.all(cartState.items.map((item) => api.removeCartLine({ cartId: "client-cart", lineId: item.id })))
      .then((responses) => setCartState(toCartState(responses.at(-1)?.cart ?? { id: "client-cart", ...CLIENT_CONTEXT, lines: [], updatedAtIso: new Date().toISOString() })));
  }

  return (
    <main className={styles.screen}>
      <section className={styles.hero} aria-labelledby="cart-title">
        <div className={styles.heroTopRow}>
          <a href="/menu" className={styles.backButton}>
            <span className={styles.backIcon}>←</span>
            Menu
          </a>
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
                    {item.removedIngredients.length > 0 ? (
                      <p className={styles.itemNotes}>
                        Senza: {item.removedIngredients.join(", ")}
                      </p>
                    ) : null}
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

          <section className={styles.summarySection} aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title" className={styles.summaryTitle}>
              Riepilogo ordine
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

function toCartState(cart: ClientCart): CartState
{
  return {
    items: cart.lines.map((line): CartItem => ({
      id: line.id,
      productId: line.productId,
      productName: line.productId,
      unitPriceCents: line.unitPrice.amountCents,
      quantity: line.quantity,
      notes: line.notes,
      removedIngredients: [],
      customization: line.customization
    }))
  };
}
