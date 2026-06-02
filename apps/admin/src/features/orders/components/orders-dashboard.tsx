"use client";

import type { Order, OrderStatus, Product, Rider } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { type ReactElement, useMemo, useState } from "react";
import { OrderDetails, type OrderDisplayContext } from "./order-details";
import styles from "./orders-dashboard.module.css";

interface OrdersDashboardProps {
  readonly orders: readonly Order[];
  readonly riders?: readonly Rider[];
  readonly lastUpdateIso: string;
  readonly allProducts: readonly Product[];
  readonly onOrderStatusUpdate?: (orderId: string, nextStatus: OrderStatus, riderId?: string) => void;
}

type OrderChannel = "Delivery" | "Asporto" | "Tavolo" | "App";
type PaymentMethod = "Carta online" | "Contanti" | "POS";
type Priority = "Alta" | "Normale" | "Bassa";

interface OrderRowViewModel extends OrderDisplayContext {
  readonly order: Order;
  readonly displayId: string;
  readonly channel: OrderChannel;
  readonly customerName: string;
  readonly customerPhone: string;
  readonly address: string;
  readonly paymentMethod: PaymentMethod;
  readonly priority: Priority;
  readonly statusLabel: string;
  readonly statusTone: "red" | "orange" | "green" | "gray";
  readonly scheduledTime: string;
  readonly elapsedLabel: string;
  readonly slaLabel: string;
  readonly totalLabel: string;
  readonly allergenLabels: readonly string[];
}

interface KpiCard {
  readonly label: string;
  readonly value: number;
  readonly delta: string;
  readonly tone: "purple" | "red" | "orange" | "amber" | "green" | "gray";
  readonly iconSrc: string;
  readonly iconAlt: string;
}

const CUSTOMER_NAMES = [
  "Marco Bianchi",
  "Giulia Rossi",
  "Luca Verdi",
  "Sara Conti",
  "Alessandro Neri",
  "Elena Moretti",
  "Francesco Gallo",
  "Martina De Luca"
] as const;

const ADDRESSES = [
  "Via delle Fornaci, 15",
  "Via Roma, 42",
  "Piazza Vittorio, 8",
  "Viale Trastevere, 91",
  "Corso Italia, 22",
  "Via Garibaldi, 7"
] as const;

const STATUS_VIEW: Record<OrderStatus, Pick<OrderRowViewModel, "statusLabel" | "statusTone">> = {
  received: { statusLabel: "Da confermare", statusTone: "red" },
  confirmed: { statusLabel: "Da confermare", statusTone: "red" },
  preparing: { statusLabel: "In cucina", statusTone: "orange" },
  ready: { statusLabel: "Pronto", statusTone: "green" },
  out_for_delivery: { statusLabel: "In consegna", statusTone: "orange" },
  delivered: { statusLabel: "Completato", statusTone: "green" },
  cancelled: { statusLabel: "Annullato", statusTone: "gray" }
};

const CHANNELS: readonly OrderChannel[] = ["Delivery", "Asporto", "Tavolo", "App"];
const PAYMENTS: readonly PaymentMethod[] = ["Carta online", "Contanti", "POS"];

export function OrdersDashboard(props: OrdersDashboardProps): ReactElement {
  const { allProducts, lastUpdateIso, onOrderStatusUpdate, orders, riders = [] } = props;

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(() => formatDateInputValue(lastUpdateIso));

  const productById = useMemo(() => {
    return new Map(allProducts.map((product) => [product.id, product]));
  }, [allProducts]);

  const rows = useMemo(() => {
    return [...orders]
      .sort((a, b) => Date.parse(b.createdAtIso) - Date.parse(a.createdAtIso))
      .map((order, index) => buildOrderRow(order, index, productById));
  }, [orders, productById]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery = normalizedQuery.length === 0 ||
        row.displayId.toLowerCase().includes(normalizedQuery) ||
        row.customerName.toLowerCase().includes(normalizedQuery) ||
        row.customerPhone.includes(normalizedQuery);
      const matchesStatus = statusFilter === "all" || row.order.status === statusFilter;
      const matchesChannel = channelFilter === "all" || row.channel === channelFilter;

      return matchesQuery && matchesStatus && matchesChannel;
    });
  }, [channelFilter, query, rows, statusFilter]);

  const selectedRow = useMemo(() => {
    return filteredRows.find((row) => row.order.id === selectedOrderId) ?? filteredRows[0] ?? null;
  }, [filteredRows, selectedOrderId]);

  const kpis = useMemo(() => buildKpis(rows), [rows]);
  const kitchenQueue = useMemo(() => buildStationQueue(rows, "Cucina"), [rows]);
  const barQueue = useMemo(() => buildStationQueue(rows, "Bar"), [rows]);

  return (
    <section className={styles.dashboard} aria-label="Dashboard ordini">
      <header className={styles.pageHeader}>
        <div>
          <h1>Ordini</h1>
          <p>Gestione ordini in tempo reale</p>
        </div>
        <div className={styles.headerActions} aria-label="Azioni operative">
          <button className={styles.iconButton} type="button" aria-label="Notifiche">
            <span className={styles.notificationDot}>3</span>
            <img src="/images/header/notification.png" alt="" />
          </button>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Apri calendario"
            aria-expanded={isCalendarOpen}
            aria-controls="orders-calendar-panel"
            onClick={() => setIsCalendarOpen((current) => !current)}
          >
            <img src="/images/header/calendar.png" alt="" />
          </button>
          <button
            className={styles.dateButton}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isCalendarOpen}
            aria-controls="orders-calendar-panel"
            onClick={() => setIsCalendarOpen((current) => !current)}
          >
            {formatHeaderDate(lastUpdateIso)}
          </button>
          {isCalendarOpen ? (
            <div
              id="orders-calendar-panel"
              className={styles.calendarPanel}
              role="dialog"
              aria-label="Calendario ordini"
            >
              <label>
                Data ordini
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </label>
              <span>Vista demo locale, senza sincronizzazione esterna.</span>
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.kpiGrid}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className={styles.kpiCard} data-tone={kpi.tone}>
            <span className={styles.kpiIcon} aria-hidden="true">
              <img src={kpi.iconSrc} alt={kpi.iconAlt} />
            </span>
            <div>
              <span className={styles.kpiLabel}>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <small>{kpi.delta}</small>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.contentGrid}>
        <main className={styles.ordersPanel}>
          <div className={styles.toolbar}>
            <label className={styles.searchField}>
              <span className={styles.srOnly}>Cerca ordine, cliente o telefono</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cerca ordine, cliente o telefono"
              />
            </label>
            <select
              aria-label="Filtra stato"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Tutti gli stati</option>
              <option value="received">Da confermare</option>
              <option value="preparing">In cucina</option>
              <option value="out_for_delivery">In consegna</option>
              <option value="delivered">Completati</option>
              <option value="cancelled">Annullati</option>
            </select>
            <select
              aria-label="Filtra canale"
              value={channelFilter}
              onChange={(event) => setChannelFilter(event.target.value)}
            >
              <option value="all">Tutti i canali</option>
              {CHANNELS.map((channel) => (
                <option key={channel} value={channel}>{channel}</option>
              ))}
            </select>
            <button className={styles.secondaryAction} type="button">Aggiorna</button>
            <button className={styles.secondaryAction} type="button">Esporta</button>
            <Button
              onClick={() => alert("Nuovo ordine manuale disponibile nella demo finale")}
              style={{ padding: "9px 13px", borderRadius: "8px" }}
            >
              + Nuovo ordine
            </Button>
          </div>

          <div className={styles.tableShell}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th aria-label="Seleziona ordine"><span className={styles.checkbox} /></th>
                  <th>ID ordine</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Stato</th>
                  <th>Orario</th>
                  <th>Totale</th>
                  <th>Pagamento</th>
                  <th>Priorita</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.order.id}
                    className={selectedRow?.order.id === row.order.id ? styles.selectedRow : undefined}
                    onClick={() => setSelectedOrderId(row.order.id)}
                  >
                    <td><span className={styles.checkbox} /></td>
                    <td>
                      <strong>{row.displayId}</strong>
                      <small>{row.order.demoOrderRef}</small>
                    </td>
                    <td>
                      <strong>{row.customerName}</strong>
                      <small>{row.customerPhone}</small>
                    </td>
                    <td><span className={styles.channel}>{row.channel}</span></td>
                    <td><span className={styles.statusBadge} data-tone={row.statusTone}>{row.statusLabel}</span></td>
                    <td>
                      <strong>{row.scheduledTime}</strong>
                      <small className={styles.lateText}>{row.elapsedLabel}</small>
                    </td>
                    <td><strong>{row.totalLabel}</strong></td>
                    <td>
                      <span className={styles.payment}>{row.paymentMethod}</span>
                    </td>
                    <td>
                      <span className={styles.priority} data-priority={row.priority}>{row.priority}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions} aria-label={`Azioni ${row.displayId}`}>
                        <button type="button" aria-label={`Vedi ${row.displayId}`}>o</button>
                        <button type="button" aria-label={`Stampa ${row.displayId}`}>p</button>
                        <button type="button" aria-label={`Altro ${row.displayId}`}>...</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredRows.length === 0 && (
              <div className={styles.emptyState}>
                <strong>Nessun ordine trovato.</strong>
                <span>Modifica filtri o ricerca per tornare alla coda completa.</span>
              </div>
            )}
          </div>

          <footer className={styles.tableFooter}>
            <span>Mostra 1-{filteredRows.length} di {rows.length} ordini</span>
            <div className={styles.pagination} aria-label="Paginazione demo">
              <button type="button">&lt;</button>
              <button type="button" className={styles.activePage}>1</button>
              <button type="button">2</button>
              <button type="button">&gt;</button>
            </div>
            <label>
              Righe per pagina
              <select aria-label="Righe per pagina" defaultValue="10">
                <option value="10">10</option>
                <option value="25">25</option>
              </select>
            </label>
          </footer>
        </main>

        <aside className={styles.detailColumn} aria-label="Dettaglio ordine selezionato">
          {selectedRow ? (
            <>
              <OrderDetails
                order={selectedRow.order}
                allProducts={allProducts}
                riders={riders}
                displayContext={selectedRow}
                onStatusUpdate={(id, status, riderId) => onOrderStatusUpdate?.(id, status, riderId)}
                onClose={() => setSelectedOrderId(null)}
              />
              <div className={styles.routingCards}>
                <article>
                  <div>
                    <strong>Coda live cucina</strong>
                    <button type="button">Vedi reparto</button>
                  </div>
                  {kitchenQueue.map((item) => (
                    <span key={item.label}>
                      {item.label}
                      <strong>{item.count}</strong>
                    </span>
                  ))}
                </article>
                <article>
                  <strong>Tempi medi oggi</strong>
                  <span>Conferma <strong>14.2 min</strong></span>
                  <span>Preparazione <strong>18.9 min</strong></span>
                  <span>Consegna <strong>26.0 min</strong></span>
                </article>
                <article className={styles.barQueue}>
                  <strong>Coda bar</strong>
                  {barQueue.map((item) => (
                    <span key={item.label}>
                      {item.label}
                      <strong>{item.count}</strong>
                    </span>
                  ))}
                </article>
              </div>
            </>
          ) : (
            <div className={styles.noSelection}>Seleziona un ordine per vedere il dettaglio.</div>
          )}
        </aside>
      </div>
    </section>
  );
}

function buildOrderRow(
  order: Order,
  index: number,
  productById: ReadonlyMap<string, Product>
): OrderRowViewModel {
  const seed = hashText(order.id);
  const channel = CHANNELS[seed % CHANNELS.length];
  const status = STATUS_VIEW[order.status];
  const customerName = CUSTOMER_NAMES[seed % CUSTOMER_NAMES.length];
  const address = ADDRESSES[seed % ADDRESSES.length];
  const paymentMethod = PAYMENTS[seed % PAYMENTS.length];
  const priority = getPriority(order.status, seed);
  const allergens = new Set<string>();

  for (const line of order.lines) {
    const product = productById.get(line.productId);

    for (const allergen of product?.allergens ?? []) {
      allergens.add(allergen.label);
    }
  }

  return {
    ...status,
    order,
    displayId: `#${String(104 + index).padStart(3, "0")}`,
    channel,
    customerName,
    customerPhone: `333 ${String(1200000 + seed * 37).slice(0, 7)}`,
    address,
    paymentMethod,
    priority,
    scheduledTime: formatTime(order.scheduledSlot),
    elapsedLabel: buildElapsedLabel(order.createdAtIso, order.status),
    slaLabel: buildSlaLabel(order.status),
    totalLabel: formatMoney(order.total.amountCents),
    allergenLabels: Array.from(allergens)
  };
}

function buildKpis(rows: readonly OrderRowViewModel[]): readonly KpiCard[] {
  const received = rows.filter((row) => row.order.status === "received" || row.order.status === "confirmed").length;
  const preparing = rows.filter((row) => row.order.status === "preparing").length;
  const delivery = rows.filter((row) => row.order.status === "out_for_delivery").length;
  const completed = rows.filter((row) => row.order.status === "delivered").length;
  const cancelled = rows.filter((row) => row.order.status === "cancelled").length;

  return [
    {
      label: "Totali oggi",
      value: rows.length,
      delta: "+ 6% vs ieri",
      tone: "purple",
      iconSrc: "/images/live-orders/writing.png",
      iconAlt: "Ordini totali"
    },
    {
      label: "Da confermare",
      value: received,
      delta: received > 0 ? "+ 2" : "=",
      tone: "red",
      iconSrc: "/images/live-orders/hourglass.png",
      iconAlt: "Ordini in attesa"
    },
    {
      label: "In preparazione",
      value: preparing,
      delta: "=",
      tone: "orange",
      iconSrc: "/images/live-orders/chef.png",
      iconAlt: "Ordini in preparazione"
    },
    {
      label: "In consegna",
      value: delivery,
      delta: delivery > 0 ? "+ 2" : "=",
      tone: "amber",
      iconSrc: "/images/live-orders/scooter.png",
      iconAlt: "Ordini in consegna"
    },
    {
      label: "Completati",
      value: completed,
      delta: "+ 8%",
      tone: "green",
      iconSrc: "/images/live-orders/check.png",
      iconAlt: "Ordini completati"
    },
    {
      label: "Annullati",
      value: cancelled,
      delta: cancelled > 0 ? "- 1" : "=",
      tone: "gray",
      iconSrc: "/images/live-orders/remove.png",
      iconAlt: "Ordini annullati"
    }
  ];
}

function buildStationQueue(
  rows: readonly OrderRowViewModel[],
  station: "Cucina" | "Bar"
): readonly { readonly label: string; readonly count: number }[] {
  const activeRows = rows.filter((row) => !["delivered", "cancelled"].includes(row.order.status));
  const labels = station === "Cucina" ? ["Pizzeria", "Forno", "Fritti"] : ["Bevande", "Banco"];

  return labels.map((label, index) => ({
    label,
    count: Math.max(1, activeRows.length - index * 2)
  }));
}

function getPriority(status: OrderStatus, seed: number): Priority {
  if (status === "received" || seed % 7 === 0) {
    return "Alta";
  }

  if (status === "delivered" || status === "cancelled" || seed % 5 === 0) {
    return "Bassa";
  }

  return "Normale";
}

function buildElapsedLabel(createdAtIso: string, status: OrderStatus): string {
  if (status === "delivered") {
    return "34 min fa";
  }

  if (status === "cancelled") {
    return "56 min fa";
  }

  const minutes = Math.max(2, Math.min(28, Math.round((Date.now() - Date.parse(createdAtIso)) / 60000)));

  return `${minutes} min fa`;
}

function buildSlaLabel(status: OrderStatus): string {
  if (status === "received" || status === "confirmed") {
    return "SLA 30 min";
  }

  if (status === "out_for_delivery") {
    return "Tra 30 min";
  }

  return "In orario";
}

function formatHeaderDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDateInputValue(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatTime(value: string): string {
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  return new Date(value).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

function formatMoney(amountCents: number): string {
  return new Intl.NumberFormat("it-IT", {
    currency: "EUR",
    style: "currency"
  }).format(amountCents / 100);
}

function hashText(value: string): number {
  return value.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
}
