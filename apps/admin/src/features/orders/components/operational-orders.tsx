"use client";

import type { IndividualAction, IndividualOrder } from "@pizzaos/domain";
import Image from "next/image";
import { useState } from "react";
import { money, OperationalOrderDetails, paymentLabels, statusLabels } from "./operational-order-details";
import styles from "./orders-dashboard.module.css";

const PAGE_SIZE = 10;
const tones: Record<IndividualOrder["status"], string> = {
  pending_payment: "gray", awaiting_acceptance: "red", awaiting_customer: "orange",
  accepted: "orange", preparing: "orange", ready: "green", out_for_delivery: "orange",
  completed: "green", cancelled: "gray"
};

export function OperationalOrders({ orders, timeZone, busy, onRefresh, onAction }: {
  orders: IndividualOrder[];
  timeZone?: string;
  busy: boolean;
  onRefresh: () => void;
  onAction: (orderId: string, input: IndividualAction) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = orders.filter(order =>
    (!status || order.status === status) &&
    [order.id, order.contact.name, order.contact.phone].some(value => value.toLowerCase().includes(normalizedQuery))
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const visible = matches.slice(offset, offset + PAGE_SIZE);
  const selected = visible.find(order => order.id === selectedId) ?? visible[0];
  const metrics = [
    { label: "Da accettare", count: orders.filter(order => order.status === "awaiting_acceptance").length, tone: "red", icon: "/images/live-orders/writing.png" },
    { label: "Ordini in corso", count: orders.filter(order => !["completed", "cancelled", "pending_payment"].includes(order.status)).length, tone: "orange", icon: "/images/live-orders/chef.png" },
    { label: "Rimborsi da gestire", count: orders.filter(order => order.payment === "refund_failed" || order.additions?.some(item => item.payment === "refund_failed")).length, tone: "purple", icon: "/images/live-orders/check.png" }
  ];
  const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "short", timeStyle: "short", timeZone });

  return <section className={styles.dashboard} aria-label="Dashboard ordini">
    <div className={styles.operationalKpis}>
      {metrics.map(metric => <article key={metric.label} className={styles.kpiCard} data-tone={metric.tone}>
        <span className={styles.kpiIcon} aria-hidden="true"><Image src={metric.icon} alt="" width={24} height={24} /></span>
        <div><span className={styles.kpiLabel}>{metric.label}</span><strong>{metric.count}</strong></div>
      </article>)}
    </div>
    <div className={styles.contentGrid}>
      <section className={styles.ordersPanel} aria-label="Elenco ordini">
        <div className={`${styles.toolbar} ${styles.operationalToolbar}`}>
          <label className={styles.searchField}>
            <span className={styles.srOnly}>Cerca ordine, cliente o telefono</span>
            <input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Cerca ordine, cliente o telefono" />
          </label>
          <select aria-label="Filtra stato" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Tutti gli stati</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" className={styles.secondaryAction} disabled={busy} onClick={onRefresh}>
            <Image src="/images/orders-toolbar/update.png" alt="" width={16} height={16} />Aggiorna ordini
          </button>
        </div>
        <div className={styles.tableShell}>
          <table className={`${styles.ordersTable} ${styles.operationalTable}`}>
            <thead><tr><th>Ordine</th><th>Cliente</th><th>Tipo</th><th>Stato</th><th>Orario</th><th>Totale</th><th>Pagamento</th></tr></thead>
            <tbody>{visible.map(order => <tr key={order.id} className={selected?.id === order.id ? styles.selectedRow : undefined} onClick={() => setSelectedId(order.id)}>
              <td><button type="button" className={styles.orderLink} aria-label={`Apri ordine ${order.id} di ${order.contact.name}`} aria-pressed={selected?.id === order.id} onClick={() => setSelectedId(order.id)}>#{order.id.slice(0, 8)}</button></td>
              <td><strong>{order.contact.name}</strong><small>{order.contact.phone}</small></td>
              <td>{order.cart.mode === "delivery" ? "Consegna" : "Ritiro"}</td>
              <td><span className={styles.statusBadge} data-tone={tones[order.status]}>{statusLabels[order.status]}</span></td>
              <td>{date.format(new Date(order.quote.slotStartsAt))}</td>
              <td><strong>{money(order.quote.totalCents)}</strong></td>
              <td><span className={styles.payment}>{paymentLabels[order.payment]}</span></td>
            </tr>)}</tbody>
          </table>
          {visible.length === 0 && <div className={styles.emptyState}><strong>{orders.length ? "Nessun ordine trovato." : "Non ci sono ordini per questa sede."}</strong></div>}
        </div>
        {matches.length > 0 && <footer className={styles.tableFooter}>
          <span>Mostra {offset + 1}–{offset + visible.length} di {matches.length} ordini</span>
          {pageCount > 1 && <div className={styles.pagination} aria-label="Paginazione ordini">
            <button type="button" aria-label="Pagina precedente" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
            <button type="button" aria-label="Pagina successiva" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>›</button>
          </div>}
        </footer>}
      </section>
      {selected && <aside className={styles.detailColumn}>
        <OperationalOrderDetails key={selected.id} order={selected} timeZone={timeZone} busy={busy} action={onAction} />
      </aside>}
    </div>
  </section>;
}
