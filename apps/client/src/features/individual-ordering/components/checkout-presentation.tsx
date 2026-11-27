"use client";

import { formatOrderWindow, type IndividualQuote } from "@pizzaos/domain";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { MealCompositionDetails } from "../../menu";
import { PromotionSummary } from "../../promotions";
import styles from "./individual-checkout.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

/** Shared checkout presentation; callers retain state, permissions and persistence. */
export function CheckoutFrame({ children }: { children: ReactNode }) {
  return <section className={`${styles.page} ${styles.screen}`} aria-label="Consegna e pagamento">{children}</section>;
}

export function CheckoutHeader({ storeName }: { storeName?: string }) {
  return <header className={styles.hero}>
    <nav className={styles.topRow} aria-label="Navigazione checkout">
      <a className={styles.backButton} href="/ordina/carrello">← Carrello</a>
      <a className={styles.menuLink} href="/ordina#il-menu">Menu</a>
    </nav>
    <h1>Consegna e pagamento</h1>
    {storeName && <p className={styles.muted}>{storeName}</p>}
  </header>;
}

/** Accessible visible choices shared by individual and group checkout. */
export function CheckoutChoices<Value extends string>({ label, value, options, disabled, onChange }: {
  label: string; value: Value; options: readonly { value: Value; label: string; disabled?: boolean }[];
  disabled: boolean; onChange: (value: Value) => void;
}) {
  const name = useId();
  return <fieldset className={styles.choices} aria-label={label} disabled={disabled}>
    <legend>{label}</legend>
    <div className={styles.choiceGrid}>{options.map(option => <label className={styles.choice} key={option.value}>
      <input type="radio" name={name} value={option.value} checked={value === option.value} disabled={option.disabled}
        onChange={() => onChange(option.value)} /><span>{option.label}</span>
    </label>)}</div>
  </fieldset>;
}

/** A newly verified quote receives focus; children contain flow-specific amounts. */
export function CheckoutSummary({ quote, children }: { quote: IndividualQuote; children?: ReactNode }) {
  const id = useId();
  const summary = useRef<HTMLElement>(null);
  useEffect(() => { summary.current?.focus(); }, [quote]);
  return <section ref={summary} tabIndex={-1} className={`${styles.section} ${styles.summary}`} aria-labelledby={id}>
    <h2 id={id}>Riepilogo da confermare</h2>
    <ul className={styles.lines}>{quote.lines.map((line, index) => <li key={`${line.productId}-${index}`}>
      <div><strong>{line.quantity} × {line.name}</strong>
        <MealCompositionDetails composition={line.composition} />
        {Boolean(line.composition?.choices.length) && <small>{line.composition?.choices.map(choice => `${choice.quantity > 1 ? `${choice.quantity} × ` : ""}${choice.name}`).join(", ")}</small>}
        {Boolean(line.composition?.extraDiscountCents) && <small>Sconto extra {money((line.composition?.extraDiscountCents ?? 0) * line.quantity)}</small>}
        {line.notes && <small>{line.notes}</small>}
      </div><strong>{money(line.unitCents * line.quantity)}</strong>
    </li>)}</ul>
    <PromotionSummary quote={quote} />
    {!quote.promotions && <dl className={styles.amounts}>
      <div><dt>Consegna</dt><dd>{money(quote.deliveryCents)}</dd></div>
      <div className={styles.total}><dt>Totale</dt><dd>{money(quote.totalCents)}</dd></div>
    </dl>}
    {children}
    <p className={styles.muted}>Orario: {formatOrderWindow(quote.slotStartsAt, quote.slotEndsAt, quote.slotTimeZone)}</p>
  </section>;
}

/** Public style vocabulary for the fields and actions composed inside CheckoutFrame. */
export { styles as checkoutPresentationStyles };
