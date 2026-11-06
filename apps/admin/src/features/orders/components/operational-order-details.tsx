"use client";

import type { IndividualAction, IndividualOrder, IndividualOrderAction } from "@pizzaos/domain";
import { useEffect, useState } from "react";
import styles from "./operational-order-details.module.css";

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export const money = (cents: number) => currency.format(cents / 100);
export const statusLabels: Record<IndividualOrder["status"], string> = {
  pending_payment: "Pagamento in corso", awaiting_acceptance: "Da accettare", awaiting_customer: "In attesa del cliente", accepted: "Accettato", preparing: "In preparazione", ready: "Pronto", out_for_delivery: "In consegna", completed: "Completato", cancelled: "Annullato"
};
export const paymentLabels: Record<IndividualOrder["payment"], string> = {
  requires_action: "Autenticazione carta da completare", processing: "Pagamento in verifica", failed: "Pagamento fallito", paid: "Carta pagata", cash_due: "Contanti da incassare", cash_paid: "Contanti incassati", refund_pending: "Rimborso in attesa", refunded: "Rimborsato", refund_failed: "Rimborso fallito: intervento necessario"
};
const actionLabels: Record<IndividualOrderAction, string> = { accept: "Accetta ordine", wait_for_customer: "Attendi risposta cliente", cancel: "Annulla ordine", prepare: "Inizia preparazione", ready: "Segna pronto", dispatch: "Avvia consegna", complete: "Completa ordine", retry_refund: "Riprova rimborso" };
function availableActions(order: IndividualOrder): IndividualOrderAction[] {
  const actions: IndividualOrderAction[] = [];
  if (order.status === "awaiting_acceptance" || order.status === "awaiting_customer") actions.push("accept", "cancel");
  if (order.status === "accepted") actions.push("prepare", "cancel");
  if (order.status === "preparing") actions.push("ready", "cancel");
  if (order.status === "ready") actions.push(order.cart.mode === "delivery" ? "dispatch" : "complete", "cancel");
  if (order.status === "out_for_delivery") actions.push("complete", "cancel");
  if (order.status === "cancelled" && (order.payment === "refund_failed" || order.additions?.some(item => item.payment === "refund_failed"))) actions.push("retry_refund");
  return actions;
}

export function OperationalOrderDetails({ order, timeZone, busy, action }: {
  order: IndividualOrder;
  timeZone?: string;
  busy: boolean;
  action: (orderId: string, input: IndividualAction) => Promise<void>;
}) {
  const [missing, setMissing] = useState<string[]>([]);
  const [clock, setClock] = useState(Date.now);
  useEffect(() => {
    if (!order.acceptanceDeadline || order.status !== "awaiting_acceptance") return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [order.acceptanceDeadline, order.status]);

  const seconds = order.acceptanceDeadline ? Math.max(0, Math.ceil((Date.parse(order.acceptanceDeadline) - clock) / 1000)) : null;
  const isNew = order.status === "awaiting_acceptance";
  const isWaiting = order.status === "awaiting_customer";
  const orderClass = isWaiting ? styles.waiting : isNew ? styles.newOrder : "";
  const products = new Map(order.quote.lines.map(line => [line.productId, line.name]));
  const canAccept = seconds !== 0 && !order.additions?.some(item => !item.applied && ["processing", "requires_action"].includes(item.payment));
  return <article aria-label="Dettaglio ordine" className={`${styles.order} ${orderClass}`}>
    <div className={styles.headingRow}>
      <div><p className={styles.small}>Ordine {order.id}</p><h3>{statusLabels[order.status]}</h3></div>
      <strong>{money(order.quote.totalCents)}</strong>
    </div>
    <p><strong>{order.contact.name}</strong> · {order.cart.mode === "delivery" ? "Consegna" : "Ritiro"} · {new Date(order.quote.slotStartsAt).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short", timeZone })}</p>
    {order.cart.address && <p>{order.cart.address.text}</p>}<p className={order.payment === "refund_failed" ? styles.refundError : styles.small}>{paymentLabels[order.payment]}</p>
    {order.additions?.map(addition => <p key={addition.id} className={addition.payment === "refund_failed" ? styles.refundError : styles.small}>Aggiunta {money(addition.deltaCents)} · {addition.applied ? "Applicata" : "Non applicata"} · {paymentLabels[addition.payment]}</p>)}
    {isNew && seconds !== null && <p className={styles.countdown} role="timer">{seconds > 0 ? `Accetta entro ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Tempo scaduto: annullamento in verifica"}</p>}
    {isWaiting && <p className={styles.notice}>Attesa senza scadenza. Scorte e fascia restano riservate fino alla risoluzione manuale.</p>}
    <ul>{order.quote.lines.map((line, index) => <li key={`${line.productId}-${index}`}><strong>{line.quantity} × {line.name}</strong>{line.notes && <p>{line.notes}</p>}</li>)}</ul>
    {order.quote.promotions && <div className={styles.notice} aria-label="Benefici applicati all'ordine"><p>Prodotti lordi: {money(order.quote.promotions.originalSubtotalCents)} · Prodotti netti: {money(order.quote.subtotalCents)}</p>
      {order.quote.promotions.coupons.map(coupon => <p key={coupon.id}>Coupon {coupon.code}: −{money(coupon.discountCents)}</p>)}
      <p>Premio fedeltà: −{money(order.quote.promotions.rewardDiscountCents)} ({order.quote.promotions.redeemedPoints} {order.quote.promotions.redeemedPoints === 1 ? "punto" : "punti"}) · Consegna: {money(order.quote.deliveryCents)}</p><strong>Totale netto ordine: {money(order.quote.totalCents)}</strong></div>}
    {order.notes && <p className={styles.notes}>Note del cliente: {order.notes}</p>}
    <div className={styles.contacts}><a href={`mailto:${order.contact.email}?subject=${encodeURIComponent(`Ordine ${order.id}`)}`}>Scrivi email</a><a href={`https://wa.me/${order.contact.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Ti contattiamo per il tuo ordine ${order.id}.`)}`} target="_blank" rel="noreferrer">Apri WhatsApp</a></div>
    {isNew && <details>
      <summary>Articolo non disponibile?</summary>
      <fieldset>
        <legend>Seleziona i prodotti da discutere con il cliente</legend>
        {Array.from(products, ([id, name]) => <label className={styles.check} key={id}>
          <input type="checkbox" checked={missing.includes(id)} onChange={event => {
            setMissing(event.target.checked ? [...missing, id] : missing.filter(productId => productId !== id));
          }} />{name}
        </label>)}
      </fieldset>
      <p className={styles.small}>Contatta il cliente via email o WhatsApp. Se concordate un&apos;alternativa, annulla questo ordine: il cliente ricrea il carrello e invia un nuovo pagamento.</p>
      <button className={styles.secondary} type="button" disabled={busy || missing.length === 0}
        onClick={() => void action(order.id, { action: "wait_for_customer", unavailableProductIds: missing })}>Attendi risposta cliente</button>
    </details>}
    <div className={styles.actions}>{availableActions(order).map(kind => <button key={kind} type="button"
      className={kind === "cancel" ? styles.danger : kind === "retry_refund" ? styles.secondary : undefined}
      disabled={busy || (kind === "accept" && !canAccept)} onClick={() => void action(order.id, { action: kind })}>{actionLabels[kind]}</button>)}</div>
  </article>;
}
