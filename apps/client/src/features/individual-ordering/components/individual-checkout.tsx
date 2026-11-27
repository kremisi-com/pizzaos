"use client";

import { formatOrderWindow, productType, resolveMealComposition, resolveMenuComposition } from "@pizzaos/domain";
import type { IndividualApi, IndividualCart, IndividualOrder, IndividualQuote, IndividualSession, IndividualStore, PromotionsApi } from "@pizzaos/domain";
import { useEffect, useId, useRef } from "react";
import type { IndividualCheckoutAttempt } from "../checkout-attempt";
import { MealCompositionDetails } from "../../menu";
import { PromotionSelectionPanel, PromotionSummary } from "../../promotions";
import { DeliveryAddressField, hasDeliveryPoint } from "./delivery-address-field";
import { IndividualStripeFields, type ConfirmIndividualPayment } from "./individual-stripe-fields";
import { OrderSlotSelect } from "./order-slot-select";
import styles from "./individual-checkout.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

interface IndividualCheckoutProps {
  api: IndividualApi;
  cart: IndividualCart;
  store: IndividualStore | null;
  session: IndividualSession | null;
  quote: IndividualQuote | null;
  phone: string;
  method: "cash" | "card";
  busy: boolean;
  verifying: boolean;
  cardReady: boolean;
  error: string;
  unresolved: boolean;
  attempt: IndividualCheckoutAttempt | null;
  pendingOrder: IndividualOrder | undefined;
  promotionsApi?: PromotionsApi;
  refreshVersion: number;
  onChange: (cart: IndividualCart) => void;
  onPhone: (phone: string) => void;
  onMethod: (method: "cash" | "card") => void;
  onVerify: () => void;
  onSend: () => void;
  onRecoverAttempt: () => void;
  onRecoverPayment: (complete: boolean) => void;
  onCardReady: (confirm: ConfirmIndividualPayment | null) => void;
  onCatalogRefresh: () => void;
  onPromotionTermsChange: () => void;
}

/** Dedicated operational checkout; the ordering screen retains payment and attempt ownership. */
export function IndividualCheckout({ api, cart, store, session, quote, phone, method, busy, verifying, cardReady, error,
  unresolved, attempt, pendingOrder, promotionsApi, refreshVersion, onChange, onPhone, onMethod, onVerify, onSend,
  onRecoverAttempt, onRecoverPayment, onCardReady, onCatalogRefresh, onPromotionTermsChange }: IndividualCheckoutProps) {
  const id = useId();
  const screenRef = useRef<HTMLElement>(null);
  const dockRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const hadQuote = useRef(false);
  useEffect(() => {
    if (quote) {
      hadQuote.current = true;
      summaryRef.current?.focus();
    }
  }, [quote]);

  const amounts = cart.lines.map(line => {
    const product = store?.products.find(item => item.id === line.productId);
    if (!product) return null;
    const composition = productType(product) === "meal"
      ? resolveMealComposition(product, line.mealSelections ?? [], store?.products ?? [])
      : resolveMenuComposition(product, line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 })));
    return composition.unitCents * line.quantity;
  });
  const estimate = amounts.every(amount => amount !== null) ? amounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0) : null;
  const hasLines = cart.lines.length > 0;
  const recovering = Boolean(attempt || pendingOrder);
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock || typeof ResizeObserver === "undefined") return;
    const measure = () => screenRef.current?.style.setProperty("--checkout-extra-space", `${dock.getBoundingClientRect().height + 32}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, [hasLines, recovering, unresolved]);
  const needsCard = pendingOrder ? pendingOrder.payment === "requires_action" : method === "card" && quote?.totalCents !== 0;
  const amount = pendingOrder?.quote.totalCents ?? (attempt ? null : quote?.totalCents ?? estimate);
  const canRecoverAttempt = Boolean(attempt?.input && attempt.actorId === session?.actor?.id);
  const verifyBlocked = busy || !hasLines || !store?.acceptingOrders || unresolved || !!attempt ||
    (cart.mode === "delivery" && !hasDeliveryPoint(cart.address));
  const hasCardKey = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  let reason = "";
  if (pendingOrder) reason = pendingOrder.payment === "processing"
    ? "Pagamento in verifica: non effettuare un altro pagamento."
    : "Completa il pagamento dell'ordine esistente prima di inviarne un altro.";
  else if (attempt) reason = canRecoverAttempt
    ? "Recupera l'esito del tentativo precedente. Il carrello attuale resta salvato."
    : attempt.input ? "Accedi con lo stesso account usato per il tentativo per recuperarlo."
      : "Verifica i tuoi ordini e contatta il ristorante per recuperare il tentativo precedente.";
  else if (unresolved) reason = "Hai un pagamento da verificare. Recuperalo nei tuoi ordini prima di inviarne un altro.";
  else if (!hasLines) reason = "Il carrello è vuoto. Scegli dal menu.";
  else if (!store) reason = "Caricamento della sede…";
  else if (!store.acceptingOrders) reason = "Gli ordini sono temporaneamente sospesi.";
  else if (cart.mode === "delivery" && !hasDeliveryPoint(cart.address)) reason = "Scegli l'indirizzo completo dai suggerimenti per verificare il totale.";
  else if (!quote && hadQuote.current) reason = "L'ordine è cambiato. Verifica nuovamente disponibilità e totale prima di confermare.";
  else if (!session?.actor) reason = "Accedi per completare l'ordine. Il carrello resta su questo dispositivo.";
  else if (!quote) reason = "Verifica disponibilità e totale prima di confermare l'ordine.";
  else if (!phone.trim()) reason = "Inserisci il telefono per l'ordine prima di confermare.";
  else if (needsCard && !hasCardKey) reason = "Pagamento carta non configurato. Puoi scegliere i contanti.";
  else if (needsCard && !cardReady) reason = "Attendi il caricamento del pagamento sicuro o scegli i contanti.";

  const confirmBlocked = busy || !quote || !phone.trim() || unresolved || !!attempt || (needsCard && (!hasCardKey || !cardReady));
  const helpId = `${id}-next-step`;
  const frozen = busy || recovering;

  return <section ref={screenRef} className={styles.screen} aria-labelledby={`${id}-title`}>
    <header className={styles.hero}>
      <nav className={styles.topRow} aria-label="Navigazione checkout">
        <a className={styles.backButton} href="/ordina/carrello">← Carrello</a>
        <a className={styles.menuLink} href="/ordina#il-menu">Menu</a>
      </nav>
      <h1 id={`${id}-title`}>Consegna e pagamento</h1>
      {store && <p className={styles.muted}>{store.name}</p>}
    </header>

    {hasLines && !recovering && <>
      <section className={styles.section} aria-label="Consegna e ritiro">
        <fieldset className={styles.choices} aria-label="Modalità" disabled={frozen}>
          <legend>Modalità</legend>
          <div className={styles.choiceGrid}>
            <label className={styles.choice}><input type="radio" name={`${id}-mode`} value="pickup" checked={cart.mode === "pickup"}
              onChange={() => onChange({ ...cart, mode: "pickup", address: undefined })} /><span>Ritiro in pizzeria</span></label>
            <label className={styles.choice}><input type="radio" name={`${id}-mode`} value="delivery" checked={cart.mode === "delivery"}
              onChange={() => onChange({ ...cart, mode: "delivery", address: undefined })} /><span>Consegna a domicilio</span></label>
          </div>
        </fieldset>
        {cart.mode === "delivery" && <div className={styles.address}>
          <DeliveryAddressField key={cart.storeId} storeId={cart.storeId} address={cart.address} search={api.searchDeliveryAddresses}
            disabled={frozen} onChange={address => onChange({ ...cart, address })} />
        </div>}
        <fieldset className={styles.fields} disabled={frozen}>
          <OrderSlotSelect store={store} value={cart.slotId} detailed onChange={slotId => onChange({ ...cart, slotId })} onFocus={onCatalogRefresh} />
          <label>Note per l&apos;ordine<textarea maxLength={1000} value={cart.notes} onChange={event => onChange({ ...cart, notes: event.target.value })} /></label>
        </fieldset>
      </section>

      {session?.actor && <section className={styles.section} aria-labelledby={`${id}-contact`}>
        <h2 id={`${id}-contact`}>Ordine di {session.actor.name}</h2>
        <p className={styles.muted}>{session.actor.email}</p>
        <label className={styles.field}>Telefono per l&apos;ordine<input type="tel" required autoComplete="tel" disabled={frozen}
          value={phone} onChange={event => onPhone(event.target.value)} /></label>
      </section>}

      {promotionsApi && session?.actor && <div className={styles.promotions}>
        <PromotionSelectionPanel api={promotionsApi} storeId={cart.storeId} selection={cart.benefits}
          disabled={frozen || unresolved} refreshVersion={refreshVersion} onChange={benefits => onChange({ ...cart, benefits })}
          onTermsChange={onPromotionTermsChange} />
      </div>}
    </>}

    {session?.actor && (hasLines || pendingOrder || attempt?.input?.method === "card") && <section className={styles.section} aria-label="Pagamento">
      {!recovering && <fieldset className={styles.choices} aria-label="Come paghi?" disabled={frozen}>
        <legend>Come paghi?</legend>
        <div className={styles.choiceGrid}>
          <label className={styles.choice}><input type="radio" name={`${id}-payment`} value="cash" checked={method === "cash"} onChange={() => onMethod("cash")} /><span>Contanti al ritiro o alla consegna</span></label>
          <label className={styles.choice}><input type="radio" name={`${id}-payment`} value="card" checked={method === "card"} onChange={() => onMethod("card")} /><span>Carta</span></label>
        </div>
      </fieldset>}
      {pendingOrder && <h2>Pagamento da completare</h2>}
      {needsCard && <div className={styles.stripe} aria-busy={!cardReady && hasCardKey}><IndividualStripeFields onReady={onCardReady} /></div>}
      <p className={styles.small}>Il ristorante deve accettare l&apos;ordine. Se viene annullato, il rimborso della carta viene avviato automaticamente.</p>
    </section>}

    {quote && <section ref={summaryRef} tabIndex={-1} className={`${styles.section} ${styles.summary}`} aria-labelledby={`${id}-summary`}>
      <h2 id={`${id}-summary`}>Riepilogo da confermare</h2>
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
      <p className={styles.muted}>Orario: {formatOrderWindow(quote.slotStartsAt, quote.slotEndsAt, quote.slotTimeZone)}</p>
    </section>}

    {!session?.actor && hasLines && <section className={styles.section} aria-label="Accesso">
      <h2>Accedi quando sei pronto</h2>
      <p className={styles.muted}>Il carrello resta su questo dispositivo mentre accedi con Google o con un link via email.</p>
      {!quote && <button type="button" className={styles.secondary} disabled={verifyBlocked} onClick={onVerify}>
        {verifying ? "Verifica in corso…" : "Verifica disponibilità e totale"}
      </button>}
    </section>}

    {!hasLines && !recovering && <section className={styles.section}>
      <p className={styles.muted}>Il carrello è vuoto. Scegli dal menu.</p>
      <a className={styles.secondary} href="/ordina#il-menu">Sfoglia il menu</a>
    </section>}

    {(hasLines || recovering || unresolved) && <aside ref={dockRef} className={styles.dock} aria-label="Riepilogo ordine" data-testid="checkout-dock">
      <div className={styles.totalRow}><span>{quote || recovering ? "Totale" : "Totale stimato"}</span>
        <strong>{amount === null ? "—" : money(amount)}</strong></div>
      <p id={helpId} className={styles.nextStep} role="status">{busy ? verifying ? "Verifica in corso…" : "Verifica dell'ordine in corso…" : error || reason || "Riepilogo verificato. Puoi confermare l'ordine."}</p>
      {pendingOrder ? <button type="button" className={styles.primary} disabled={busy || (pendingOrder.payment === "requires_action" && !cardReady)}
        aria-describedby={helpId} onClick={() => onRecoverPayment(pendingOrder.payment === "requires_action")}>
        {busy ? "Verifica in corso…" : pendingOrder.payment === "requires_action" ? "Riprendi pagamento esistente" : "Verifica pagamento"}
      </button> : attempt ? canRecoverAttempt
        ? <button type="button" className={styles.primary} disabled={busy} aria-describedby={helpId} onClick={onRecoverAttempt}>Recupera tentativo ordine</button>
        : <a className={styles.primary} href={attempt.input ? "/accesso" : "/ordina#i-tuoi-ordini"}>{attempt.input ? "Accedi per completare l'ordine" : "I tuoi ordini"}</a>
        : unresolved ? <a className={styles.primary} href="/ordina#i-tuoi-ordini">I tuoi ordini</a>
          : !session?.actor ? <a className={styles.primary} href="/accesso" aria-describedby={helpId}>Accedi per completare l&apos;ordine</a>
            : !quote ? <button type="button" className={styles.primary} disabled={verifyBlocked} aria-describedby={helpId} onClick={onVerify}>
              {verifying ? "Verifica in corso…" : "Verifica disponibilità e totale"}</button>
              : <button type="button" className={styles.primary} disabled={confirmBlocked} aria-describedby={helpId} onClick={onSend}>
                {busy ? "Verifica in corso…" : method === "card" ? `Conferma e paga ${money(quote.totalCents)}` : "Conferma e invia ordine"}</button>}
    </aside>}
  </section>;
}
