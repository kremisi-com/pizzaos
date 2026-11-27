"use client";

import type { ReactNode } from "react";
import styles from "./cart-screen.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

/** Product presentation shared by individual and group carts; callers own data and permissions. */
export function CartProductRow({ name, title = name, quantity, amount, disabled = false, ariaSuffix = "", details, children, onQuantity, onRemove }: {
  name: string; title?: ReactNode; quantity: number; amount: number | null; disabled?: boolean; ariaSuffix?: string;
  details?: ReactNode; children?: ReactNode; onQuantity?: (quantity: number) => void; onRemove?: () => void;
}) {
  return <article className={styles.itemCard}>
    <div className={styles.itemTopRow}><div className={styles.itemInfo}>
      <h2 className={styles.itemName}>{title}</h2>{details}
    </div><p className={styles.itemPrice}>{amount === null ? "—" : money(amount)}</p></div>
    {(onQuantity || onRemove) && <div className={styles.itemActions}>
      {onQuantity && <div className={styles.quantityControl}>
        <button className={styles.quantityButton} type="button" disabled={disabled} aria-label={`Diminuisci quantità ${name}${ariaSuffix}`} onClick={() => onQuantity(quantity - 1)}>−</button>
        <span className={styles.quantityValue} aria-live="polite">{quantity}</span>
        <button className={styles.quantityButton} type="button" disabled={disabled || quantity >= 100} aria-label={`Aumenta quantità ${name}${ariaSuffix}`} onClick={() => onQuantity(quantity + 1)}>+</button>
      </div>}
      {onRemove && <button className={styles.removeButton} type="button" disabled={disabled} onClick={onRemove}>Rimuovi</button>}
    </div>}
    {children}
  </article>;
}

/** Public presentation styles for row slots such as personalization controls. */
export { styles as cartPresentationStyles };
