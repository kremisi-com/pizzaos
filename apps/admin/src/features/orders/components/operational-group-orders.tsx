"use client";

import type { GroupOperationalOrder, GroupSharePayment, IndividualProduct } from "@pizzaos/domain";
import { useState } from "react";
import styles from "./operational-group-orders.module.css";

const currency = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
const money = (cents: number) => currency.format(cents / 100);

export type RefundGroup = (groupId: string, paymentId?: string, cashReturned?: boolean) => Promise<void>;

const paymentLabels: Record<GroupSharePayment["status"], string> = {
  processing: "Pagamento in verifica", requires_action: "Autenticazione carta da completare", failed: "Pagamento fallito",
  paid: "Pagato", refund_pending: "Rimborso in attesa", refunded: "Rimborsato", refund_failed: "Rimborso fallito: intervento necessario"
};

function refundable(payment: GroupSharePayment) {
  return payment.status === "paid" || payment.status === "refund_failed";
}

/** The same ledger remains visible before and after the final order is submitted. */
export function OperationalGroupPayments({ group, busy, onRefund }: {
  group: GroupOperationalOrder; busy: boolean; onRefund: RefundGroup;
}) {
  const [returnedCash, setReturnedCash] = useState<Set<string>>(() => new Set());
  const cashToReturn = group.payments.filter(payment => payment.method === "cash" && refundable(payment));
  return <section aria-label="Pagamenti e rimborsi del gruppo">
    <ul className={styles.payments}>{group.payments.map(payment => {
      const person = group.participants.find(item => item.id === payment.participantId);
      const name = person?.name ?? payment.participantName ?? "Ordine di gruppo";
      const cashConfirmed = payment.method !== "cash" || returnedCash.has(payment.id);
      return <li key={payment.id} className={styles.paymentRow}>
        <div><strong>{name} · {money(payment.amountCents)}</strong>
          <p role={payment.status === "refund_failed" ? "alert" : undefined} className={payment.status === "refund_failed" ? styles.failed : styles.small}>{payment.method === "cash" && payment.status === "processing" ? "Contanti da incassare" : payment.method === "cash" && payment.status === "paid" ? "Contanti incassati" : paymentLabels[payment.status]}</p>
          {payment.method === "cash" && refundable(payment) && <label className={styles.small}>
            <input type="checkbox" checked={returnedCash.has(payment.id)} disabled={busy} onChange={event => {
              const checked = event.target.checked;
              setReturnedCash(previous => { const next = new Set(previous); if (checked) next.add(payment.id); else next.delete(payment.id); return next; });
            }} /> Ho restituito {money(payment.amountCents)} in contanti a {name}
          </label>}
        </div>
        {refundable(payment) && <button type="button" disabled={busy || !cashConfirmed}
          aria-label={`${payment.status === "refund_failed" ? "Riprova rimborso" : "Rimborsa quota"} ${name}`}
          onClick={() => void onRefund(group.id, payment.id, payment.method === "cash" ? true : undefined)}>{payment.status === "refund_failed" ? "Riprova rimborso" : "Rimborsa quota"}</button>}
      </li>;
    })}</ul>
    {group.payments.some(refundable) && <button type="button" className={styles.refundAll} disabled={busy || cashToReturn.some(payment => !returnedCash.has(payment.id))}
      onClick={() => void onRefund(group.id, undefined, cashToReturn.length > 0 ? true : undefined)}>Rimborsa ordine</button>}
  </section>;
}

export function OperationalGroupOrders({ groups, products, busy, onRefund }: {
  groups: GroupOperationalOrder[]; products: IndividualProduct[]; busy: boolean; onRefund: RefundGroup;
}) {
  const pending = groups.filter(group => group.status !== "submitted");
  if (pending.length === 0) return null;
  const names = new Map(products.map(product => [product.id, product.name]));
  return <section className={styles.groups} aria-label="Ordini di gruppo ancora in corso">
    {pending.map(group => <article key={group.id} className={styles.group} aria-label={`Ordine di gruppo ${group.id}`}>
      <div className={styles.heading}>
        <div><h2>Ordine di gruppo</h2><span className={styles.badge}>{group.status === "cancelled" ? "Annullato" : "Ordine di gruppo ancora in corso"}</span></div>
        <strong>{money(group.payments.filter(payment => payment.status === "paid").reduce((sum, payment) => sum + payment.amountCents, 0))}</strong>
      </div>
      {group.status !== "cancelled" && <p className={styles.small}>La preparazione inizia dopo la conferma finale del creatore. Gli ingredienti delle quote pagate restano riservati.</p>}
      <ul className={styles.participants}>{group.participants.map(person => <li key={person.id}>
        <details><summary><strong>{person.name}</strong>{person.host ? " · Creatore" : ""}</summary>
          {person.lines.length === 0 ? <p className={styles.small}>Non ha ancora scelto.</p> : <ul>{person.lines.map((line, index) => <li key={`${line.productId}-${index}`}>
            {line.quantity} × {person.quotedLines?.[index]?.name ?? names.get(line.productId) ?? "Prodotto non più nel menu"}
            {person.quotedLines?.[index]?.composition?.choices.map(choice => <p className={styles.small} key={choice.optionId}>{choice.quantity} × {choice.name}</p>)}
            {line.notes && <p className={styles.small}>{line.notes}</p>}
          </li>)}</ul>}
        </details>
      </li>)}</ul>
      <OperationalGroupPayments group={group} busy={busy} onRefund={onRefund} />
    </article>)}
  </section>;
}
