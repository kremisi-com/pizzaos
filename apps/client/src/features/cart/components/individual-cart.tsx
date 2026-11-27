"use client";

import { productType, resolveMealComposition, resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualCart, IndividualStore } from "@pizzaos/domain";
import { MenuLineDetails, MenuLineEditor } from "../../menu";
import styles from "./cart-screen.module.css";

import liveStyles from "./operational-cart.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

export function IndividualCartScreen({ cart, store, avoid, disabled, onChange }: {
  cart: IndividualCart; store: IndividualStore | null; avoid: string[]; disabled: boolean;
  onChange: (cart: IndividualCart) => void;
}) {
  const rows = cart.lines.map((line, index) => {
    const product = store?.products.find(item => item.id === line.productId);
    const preview = product && (productType(product) === "meal"
      ? resolveMealComposition(product, line.mealSelections ?? [], store?.products ?? [])
      : resolveMenuComposition(product, line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 }))));
    return { line, index, product, amount: preview ? preview.unitCents * line.quantity : null };
  });
  const subtotal = rows.every(row => row.amount !== null) ? rows.reduce((sum, row) => sum + (row.amount ?? 0), 0) : null;
  const count = cart.lines.reduce((sum, line) => sum + line.quantity, 0);
  function remove(index: number) { onChange({ ...cart, lines: cart.lines.filter((_, i) => i !== index) }); }
  function quantity(index: number, next: number) {
    if (next === 0) remove(index);
    else if (next > 0 && next <= 100) onChange({ ...cart, lines: cart.lines.map((line, i) => i === index ? { ...line, quantity: next } : line) });
  }

  return <div className={`${styles.screen} ${liveStyles.screen}`}>
    <header className={styles.hero}>
      <div className={styles.heroTopRow}><a className={styles.backButton} href="/ordina#il-menu">← Menu</a></div>
      <h1 className={styles.heroTitle}>Carrello</h1>
      <p className={styles.heroCopy}>Rivedi prodotti, quantità e totale prima del checkout.</p>
      {count > 0 && <div className={styles.itemCount}>{count} {count === 1 ? "prodotto" : "prodotti"}</div>}
    </header>
    {!count ? <div className={styles.emptyState}>
      <p className={styles.emptyLead}>Carrello vuoto</p><p className={styles.emptyCopy}>Apri il menu e personalizza una pizza per iniziare il checkout.</p>
      <a className={styles.menuLink} href="/ordina#il-menu">Sfoglia il menu →</a>
    </div> : <>
      <section className={styles.itemsSection} aria-label="Prodotti nel carrello">
        {rows.map(({ line, index, product, amount }) => {
          const name = product?.name ?? line.productId;
          return <article key={`${line.productId}-${index}`} className={styles.itemCard}>
            <div className={styles.itemTopRow}><div className={styles.itemInfo}>
              <h2 className={styles.itemName}>{name}</h2>
              <MenuLineDetails product={product} line={line} products={store?.products} avoid={avoid} showUnknown={Boolean(store?.menu)} />
              {line.notes && <p className={styles.itemNotes}>{line.notes}</p>}
            </div><p className={styles.itemPrice}>{amount === null ? "—" : money(amount)}</p></div>
            <div className={styles.itemActions}><div className={styles.quantityControl}>
              <button className={styles.quantityButton} type="button" disabled={disabled} aria-label={`Diminuisci quantità ${name}`} onClick={() => quantity(index, line.quantity - 1)}>−</button>
              <span className={styles.quantityValue} aria-live="polite">{line.quantity}</span>
              <button className={styles.quantityButton} type="button" disabled={disabled || line.quantity >= 100} aria-label={`Aumenta quantità ${name}`} onClick={() => quantity(index, line.quantity + 1)}>+</button>
            </div><button className={styles.removeButton} type="button" disabled={disabled} onClick={() => remove(index)}>Rimuovi</button></div>
            {store && product && (product.options.length > 0 || product.meal || line.optionIds.length > 0 || Boolean(line.selections?.length)) && <MenuLineEditor className={styles.removeButton} store={store} product={product} line={line} avoid={avoid} disabled={disabled}
              onSave={next => onChange({ ...cart, lines: cart.lines.map((item, i) => i === index ? next : item) })} />}
            <label>Note per {name}<input maxLength={500} disabled={disabled} value={line.notes} onChange={event => onChange({ ...cart, lines: cart.lines.map((item, i) => i === index ? { ...item, notes: event.target.value } : item) })} /></label>
          </article>;
        })}
      </section>
      <section className={styles.summarySection} aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title" className={styles.summaryTitle}>Riepilogo ordine</h2>
        <div className={styles.summaryGrid}><p>Subtotale</p><p>{subtotal === null ? "—" : money(subtotal)}</p></div>
        <p className={styles.heroCopy}>Consegna, disponibilità e totale saranno verificati al checkout.</p>
        <div className={styles.summaryActions}>
          <button className={styles.clearCartButton} type="button" disabled={disabled} onClick={() => onChange({ ...cart, lines: [], notes: "", benefits: undefined })}>Svuota carrello</button>
        </div>
      </section>
      <div className={liveStyles.checkoutDock}>
        <div className={styles.summaryTotalRow}><span className={styles.summaryTotalLabel}>Totale stimato</span><strong className={styles.summaryTotalValue}>{subtotal === null ? "—" : money(subtotal)}</strong></div>
        <a className={styles.checkoutLink} href="/ordina/checkout" data-testid="cart-checkout-link">Vai al checkout →</a>
      </div>
    </>}
  </div>;
}
