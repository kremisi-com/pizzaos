"use client";

import type { GroupFulfillment, GroupQuote, GroupSnapshot, IndividualApi, IndividualSession, IndividualStore, PromotionsApi } from "@pizzaos/domain";
import { useEffect, useId, useRef } from "react";
import { OrderActionDock } from "../../cart";
import {
  CheckoutChoices, CheckoutFrame, CheckoutHeader, CheckoutSummary, checkoutPresentationStyles as styles,
  DeliveryAddressField, hasDeliveryPoint, IndividualStripeFields, OrderSlotSelect, type ConfirmIndividualPayment
} from "../../individual-ordering";
import { PromotionSelectionPanel } from "../../promotions";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

interface GroupCheckoutProps {
  group: GroupSnapshot;
  store: IndividualStore | null;
  session: IndividualSession | null;
  sessionLoading: boolean;
  sessionError: string;
  fulfillment: GroupFulfillment;
  quote: GroupQuote | null;
  estimate: number | null;
  prepaidCents: number;
  phone: string;
  method: "cash" | "card";
  busy: boolean;
  pending: boolean;
  error: string;
  cardReady: boolean;
  canConfirm: boolean;
  signIn: string;
  promotionsApi?: PromotionsApi;
  individualApi: IndividualApi;
  onFulfillment: (next: GroupFulfillment) => void;
  onPhone: (value: string) => void;
  onMethod: (value: "cash" | "card") => void;
  onVerify: () => void;
  onSubmit: () => void;
  onRecover: () => void;
  onCardReady: (confirm: ConfirmIndividualPayment | null) => void;
  onTermsChange: () => void;
}

/** Presentation only: the group owner retains authoritative revisions and payment transitions. */
export function GroupCheckout({ group, store, session, sessionLoading, sessionError, fulfillment, quote, estimate, prepaidCents,
  phone, method, busy, pending, error, cardReady, canConfirm, signIn, promotionsApi, individualApi,
  onFulfillment, onPhone, onMethod, onVerify, onSubmit, onRecover, onCardReady, onTermsChange }: GroupCheckoutProps) {
  const id = useId();
  const hadQuote = useRef(false);
  useEffect(() => { if (quote) hadQuote.current = true; }, [quote]);
  const hasLines = group.participants.some(person => person.lines.length > 0);
  const frozen = busy || pending;
  const remaining = quote ? quote.remainingCents ?? quote.quote.totalCents : null;
  const belowCardMinimum = remaining !== null && remaining > 0 && remaining < 50;
  const estimatedRemaining = estimate === null ? null : Math.max(0, estimate - prepaidCents);
  const verifyBlocked = frozen || !hasLines || !store?.acceptingOrders ||
    (fulfillment.mode === "delivery" && !hasDeliveryPoint(fulfillment.address));
  // Retain only card fields already required by the verified amount, including while the quote is hidden for 3DS.
  const needsCard = remaining !== null && remaining >= 50;
  const retainedCard = useRef(false);
  useEffect(() => { if (!busy && !pending) retainedCard.current = needsCard; }, [busy, pending, needsCard]);
  const showCard = method === "card" && (needsCard || (busy || pending) && retainedCard.current);

  let reason = "";
  if (sessionLoading) reason = "Verifica dell’accesso…";
  else if (sessionError) reason = sessionError;
  else if (!session) reason = "Verifica dell’accesso…";
  else if (!session.actor) reason = "Accedi per confermare l’ordine";
  else if (pending) reason = "Un tentativo deve essere verificato prima di cambiare il gruppo.";
  else if (!hasLines) reason = "Il carrello è vuoto. Scegli dal menu.";
  else if (!store) reason = "Caricamento della sede…";
  else if (!store.acceptingOrders) reason = "Gli ordini sono temporaneamente sospesi.";
  else if (fulfillment.mode === "delivery" && !hasDeliveryPoint(fulfillment.address)) reason = "Scegli l'indirizzo completo dai suggerimenti per verificare il totale.";
  else if (!quote && hadQuote.current) reason = "Le scelte del gruppo sono cambiate. Verifica di nuovo il totale prima di confermare.";
  else if (!quote) reason = "Verifica disponibilità e totale prima di confermare l'ordine.";
  else if (!phone.trim()) reason = "Inserisci il telefono per l'ordine prima di confermare.";
  else if (method === "card" && belowCardMinimum) reason = "Il residuo sotto 0,50 € si salda in contanti.";
  else if (method === "card" && remaining !== 0 && !cardReady) reason = "Attendi il caricamento del pagamento sicuro o scegli i contanti.";

  return <CheckoutFrame>
    <CheckoutHeader storeName={store?.name} />
    {hasLines && <>
      <section className={styles.section} aria-label="Consegna e ritiro">
        <CheckoutChoices label="Modalità" value={fulfillment.mode} disabled={frozen}
          options={[{ value: "pickup", label: "Ritiro in pizzeria" }, { value: "delivery", label: "Consegna a domicilio" }]}
          onChange={mode => onFulfillment({ ...fulfillment, mode, address: undefined })} />
        {fulfillment.mode === "delivery" && <div className={styles.address}>
          <DeliveryAddressField key={group.id} storeId={group.storeId} address={fulfillment.address} search={individualApi.searchDeliveryAddresses}
            disabled={frozen} onChange={address => onFulfillment({ ...fulfillment, address })} />
        </div>}
        <fieldset className={styles.fields} disabled={frozen}>
          <OrderSlotSelect store={store} value={fulfillment.slotId} detailed onChange={slotId => onFulfillment({ ...fulfillment, slotId })} />
          <label>Note per l&apos;ordine<textarea maxLength={1000} value={fulfillment.notes}
            onChange={event => onFulfillment({ ...fulfillment, notes: event.target.value })} /></label>
        </fieldset>
      </section>
      {session?.actor && <>
        <section className={styles.section} aria-labelledby={`${id}-contact`}>
          <h2 id={`${id}-contact`}>Ordine di {session.actor.name}</h2>
          <p className={styles.muted}>{session.actor.email}</p>
          <label className={styles.field}>Telefono per l&apos;ordine<input type="tel" required autoComplete="tel" disabled={frozen}
            value={phone} onChange={event => onPhone(event.target.value)} /></label>
        </section>
        {promotionsApi && <div className={styles.promotions}>
          <PromotionSelectionPanel api={promotionsApi} storeId={group.storeId} selection={fulfillment.benefits} disabled={frozen}
            onChange={benefits => onFulfillment({ ...fulfillment, benefits })} onTermsChange={onTermsChange} />
        </div>}
        <section className={styles.section} aria-label="Pagamento">
          <CheckoutChoices label="Come paghi?" value={method} disabled={frozen}
            options={[{ value: "cash", label: "Contanti al ritiro o alla consegna" }, { value: "card", label: "Carta", disabled: belowCardMinimum }]}
            onChange={onMethod} />
          {belowCardMinimum && <p className={styles.small}>Il residuo sotto 0,50 € si salda in contanti.</p>}
          {showCard && <div className={styles.stripe}><IndividualStripeFields onReady={onCardReady} /></div>}
          <p className={styles.small}>L’organizzatore conferma un solo ordine e copre il residuo.</p>
        </section>
      </>}
    </>}
    {quote && <CheckoutSummary quote={quote.quote}>
      <dl className={styles.amounts}>
        <div><dt>Quote già pagate:</dt><dd>{money(quote.prepaidCents ?? 0)}</dd></div>
        <div className={styles.total}><dt>Da pagare</dt><dd>{money(remaining ?? 0)}</dd></div>
      </dl>
    </CheckoutSummary>}
    {!hasLines && !pending && <section className={styles.section}>
      <p className={styles.muted}>Il carrello è vuoto. Scegli dal menu.</p>
      <a className={styles.secondary} href="/ordina#il-menu">Sfoglia il menu</a>
    </section>}
    {(hasLines || pending) && <OrderActionDock label="Da pagare"
      amount={pending ? null : remaining ?? estimatedRemaining} testId="checkout-dock"
      message={<span id={`${id}-next-step`}>{busy ? "Verifica dell'ordine in corso…" : error || reason || "Riepilogo verificato. Puoi confermare l'ordine."}</span>}
      breakdown={<><div><span>{quote ? "Totale" : "Totale stimato"}</span><strong>{quote ? money(quote.quote.totalCents) : estimate === null ? "—" : money(estimate)}</strong></div>
        <div><span>Quote già pagate:</span><strong>{money(quote?.prepaidCents ?? prepaidCents)}</strong></div></>}>
      {!session || sessionLoading || sessionError ? <button type="button" disabled>Verifica totale gruppo</button>
          : !session.actor ? <a href={signIn} aria-describedby={`${id}-next-step`}>Accedi per confermare l’ordine</a>
            : pending ? <button type="button" disabled={busy} aria-describedby={`${id}-next-step`} onClick={onRecover}>Recupera tentativo gruppo</button>
            : !quote ? <button type="button" disabled={verifyBlocked} aria-describedby={`${id}-next-step`} onClick={onVerify}>Verifica totale gruppo</button>
              : <button type="button" disabled={busy || !canConfirm || method === "card" && belowCardMinimum}
                aria-describedby={`${id}-next-step`} onClick={onSubmit}>Conferma ordine di gruppo</button>}
    </OrderActionDock>}
  </CheckoutFrame>;
}
