"use client";

import { formatOrderWindow } from "@pizzaos/domain";
import type { IndividualApi, IndividualOrder, IndividualSession, IndividualStore } from "@pizzaos/domain";
import { Badge, Button } from "@pizzaos/ui";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MealCompositionDetails } from "../../menu";
import { PromotionSummary } from "../../promotions";
import { OrderTimeline } from "./operational-order-timeline";
import poc from "./orders-screen.module.css";
import styles from "./operational-orders-screen.module.css";

export interface OperationalOrdersScreenProps {
  api: IndividualApi;
  refreshVersion?: number;
  connection?: string;
  onReorder: (order: IndividualOrder) => Promise<void>;
  renderAdditions?: (order: IndividualOrder, onChanged: () => Promise<void>) => ReactNode;
}

const statusLabels: Record<IndividualOrder["status"], string> = {
  pending_payment: "Pagamento da completare", awaiting_acceptance: "In attesa del ristorante",
  awaiting_customer: "Il ristorante attende una tua risposta", accepted: "Accettato",
  preparing: "In preparazione", ready: "Pronto", out_for_delivery: "In consegna", completed: "Completato", cancelled: "Annullato"
};
const paymentLabels: Record<IndividualOrder["payment"], string> = {
  requires_action: "Completa il pagamento sicuro", processing: "Pagamento in verifica: non effettuare un altro pagamento",
  failed: "Pagamento non riuscito", paid: "Pagato con carta", cash_due: "Da pagare in contanti al ritiro o alla consegna",
  cash_paid: "Contanti ricevuti", refund_pending: "Rimborso avviato, accredito in attesa", refunded: "Rimborso completato",
  refund_failed: "Il rimborso richiede un intervento del ristorante"
};
const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const archived = (order: IndividualOrder) => ["completed", "cancelled"].includes(order.status) || order.payment === "failed";
const unresolved = (order: IndividualOrder) => order.status === "pending_payment" && ["requires_action", "processing"].includes(order.payment)
  || Boolean(order.additions?.some(addition => !addition.applied && ["requires_action", "processing"].includes(addition.payment)));
const errorCode = (failure: unknown) => failure && typeof failure === "object" && "code" in failure ? String(failure.code) : "";
const accessError = (failure: unknown) => ["unauthorized", "forbidden"].includes(errorCode(failure));
function errorMessage(failure: unknown) {
  if (failure instanceof Error && ["SecurityError", "QuotaExceededError"].includes(failure.name)) return "Il browser non consente il salvataggio del carrello. Riprova prima di continuare.";
  if (failure instanceof SyntaxError) return "Non è stato possibile verificare il tentativo esistente. Riprova senza inviare un nuovo ordine.";
  return failure instanceof Error ? failure.message : "Non è stato possibile completare l’operazione. Riprova.";
}
function referenceFromHash() {
  try { return window.location.hash.startsWith("#ordine-") ? decodeURIComponent(window.location.hash.slice(8)) : ""; }
  catch { return ""; }
}
function orderDate(order: IndividualOrder) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short", timeZone: order.quote.slotTimeZone }).format(new Date(order.createdAt));
}

export function OperationalOrdersScreen({ api, refreshVersion = 0, connection = "", onReorder, renderAdditions }: OperationalOrdersScreenProps) {
  const [session, setSession] = useState<IndividualSession | null>(null);
  const [orders, setOrders] = useState<IndividualOrder[]>([]);
  const [contacts, setContacts] = useState<Pick<IndividualStore, "id" | "contactEmail" | "contactPhone">[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reordered, setReordered] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState("");
  const account = useRef<string | null>(null);
  const requestVersion = useRef(0);
  const mounted = useRef(false);
  const commandInFlight = useRef(false);
  const lastRefresh = useRef(refreshVersion);

  const expireSession = useCallback(() => {
    account.current = null; requestVersion.current++;
    setSession({ actor: null, superadmin: false, storeIds: [] });
    setOrders([]); setContacts([]); setNotes({}); setReordered(false);
  }, []);
  const readOrders = useCallback(async () => {
    const actorId = account.current;
    if (!actorId) return;
    const version = ++requestVersion.current;
    try {
      const next = await api.orders();
      if (mounted.current && version === requestVersion.current && actorId === account.current) {
        setOrders(previous => next.map(order => {
          const known = previous.find(item => item.id === order.id);
          return known && known.revision > order.revision ? known : order;
        })); setError("");
      }
    } catch (failure) {
      if (mounted.current && version === requestVersion.current && actorId === account.current) {
        if (accessError(failure)) expireSession();
        setError(errorMessage(failure));
      }
    }
  }, [api, expireSession]);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setError(""); setLoaded(false);
    try {
      const next = await api.session();
      if (!mounted.current || version !== requestVersion.current) return;
      if (account.current !== (next.actor?.id ?? null)) { setOrders([]); setContacts([]); setNotes({}); setReordered(false); }
      account.current = next.actor?.id ?? null; setSession(next);
      if (next.actor) await readOrders();
    } catch (failure) {
      if (mounted.current && version === requestVersion.current) {
        if (accessError(failure)) expireSession();
        setError(errorMessage(failure));
      }
    } finally { if (mounted.current) setLoaded(true); }
  }, [api, readOrders, expireSession]);
  useEffect(() => {
    mounted.current = true; void load();
    return () => { mounted.current = false; account.current = null; };
  }, [load]);
  useEffect(() => {
    if (!session?.actor) return;
    let active = true;
    void api.stores().then(stores => { if (active) setContacts(stores.map(({ id, contactEmail, contactPhone }) => ({ id, contactEmail, contactPhone }))); })
      .catch(() => { /* Contact links are optional; purchased snapshots remain available. */ });
    return () => { active = false; };
  }, [api, session?.actor]);
  useEffect(() => {
    if (lastRefresh.current === refreshVersion) return;
    lastRefresh.current = refreshVersion;
    void readOrders();
  }, [refreshVersion, readOrders]);
  useEffect(() => {
    const sync = () => setSelectedId(referenceFromHash());
    sync(); window.addEventListener("hashchange", sync); window.addEventListener("popstate", sync);
    return () => { window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, []);
  useEffect(() => {
    if (loaded && selectedId) document.getElementById(`ordine-${encodeURIComponent(selectedId)}`)?.focus();
  }, [loaded, selectedId]);

  async function run(command: () => Promise<unknown>) {
    if (commandInFlight.current) return;
    commandInFlight.current = true; setBusy(true); setError(""); requestVersion.current++;
    try { await command(); await readOrders(); }
    catch (failure) {
      // An operation rejected by the service does not authorize a local transition.
      await readOrders();
      if (mounted.current) setError(errorMessage(failure));
    } finally { commandInFlight.current = false; if (mounted.current) setBusy(false); }
  }
  async function repeat(order: IndividualOrder) {
    if (commandInFlight.current || orders.some(unresolved)) return;
    commandInFlight.current = true; setBusy(true); setError(""); setReordered(false);
    try { await onReorder(order); if (mounted.current) setReordered(true); }
    catch (failure) { if (mounted.current) { if (accessError(failure)) expireSession(); setError(errorMessage(failure)); } }
    finally { commandInFlight.current = false; if (mounted.current) setBusy(false); }
  }
  function details(order: IndividualOrder) {
    const contact = contacts.find(store => store.id === order.storeId);
    const editable = ["pending_payment", "awaiting_acceptance", "awaiting_customer", "accepted"].includes(order.status);
    return <div className={styles.details}>
      <p>{paymentLabels[order.payment]}</p>
      <p>{order.cart.mode === "delivery" ? "Consegna" : "Ritiro"} · {formatOrderWindow(order.quote.slotStartsAt, order.quote.slotEndsAt, order.quote.slotTimeZone)}</p>
      {order.cart.mode === "delivery" && order.cart.address && <p>{order.cart.address.text}</p>}
      {order.acceptanceDeadline && order.status === "awaiting_acceptance" && <p>Risposta del ristorante entro le {new Date(order.acceptanceDeadline).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: order.quote.slotTimeZone })}</p>}
      <ul className={styles.lines}>{order.quote.lines.map((line, index) => <li key={`${line.productId}-${index}`}>
        <div className={styles.lineHeading}><strong>{line.quantity} × {line.name}</strong><span>{money(line.unitCents * line.quantity)}</span></div>
        {line.notes && <p>{line.notes}</p>}
        <MealCompositionDetails composition={line.composition} />
        {Boolean(line.composition?.choices.length) && <p>{line.composition?.choices.map(choice => `${choice.quantity} × ${choice.name}`).join(", ")}</p>}
      </li>)}</ul>
      <PromotionSummary quote={order.quote} />
      {!order.quote.promotions && order.quote.deliveryCents > 0 && <p>Consegna: {money(order.quote.deliveryCents)}</p>}
      {order.additions?.filter(addition => ["refund_pending", "refund_failed", "refunded"].includes(addition.payment)).map(addition =>
        <p key={addition.id}>Rimborso aggiunta {money(addition.deltaCents)}: {paymentLabels[addition.payment]}</p>)}
      {order.status === "awaiting_customer" && <p className={styles.message}>Il ristorante ti contatta via email o WhatsApp per un prodotto indisponibile. L&apos;ordine resta in attesa della tua risposta.</p>}
      {editable ? <div className={styles.notes}><label htmlFor={`note-${order.id}`}>Note ordine {order.id}</label><textarea id={`note-${order.id}`} maxLength={1000} disabled={busy} value={notes[order.id] ?? order.notes}
        onChange={event => setNotes(current => ({ ...current, [order.id]: event.target.value }))} />
        <Button variant="secondary" disabled={busy} onClick={() => {
          const submitted = notes[order.id] ?? order.notes;
          void run(async () => {
            const saved = await api.notes(order.id, submitted);
            if (!mounted.current) return;
            setOrders(current => current.map(item => item.id === saved.id && item.revision <= saved.revision ? saved : item));
            setNotes(current => {
            if (current[order.id] !== submitted) return current;
            const next = { ...current }; delete next[order.id]; return next;
          }); });
        }}>Aggiorna note</Button></div> : order.notes && <p>Note: {order.notes}</p>}
      {["awaiting_acceptance", "awaiting_customer"].includes(order.status) && renderAdditions?.(order, readOrders)}
      <div className={styles.actions}>
        {order.status === "pending_payment" && order.payment !== "failed" && <>
          <Button variant="secondary" disabled={busy} onClick={() => void run(() => api.reconcile(order.id))}>Verifica pagamento</Button>
          {order.payment === "requires_action" && <a href={`/ordina/checkout#ordine-${encodeURIComponent(order.id)}`}>Completa pagamento esistente</a>}
        </>}
        {["awaiting_acceptance", "awaiting_customer"].includes(order.status) && <Button variant="secondary" disabled={busy}
          onClick={() => void run(() => api.action(order.id, { action: "cancel" }))}>Annulla ordine</Button>}
      </div>
      {["accepted", "preparing", "ready", "out_for_delivery"].includes(order.status) && <p>Per chiedere l&apos;annullamento dopo l&apos;accettazione contatta il ristorante via email o WhatsApp.
        {contact?.contactEmail && <> <a href={`mailto:${contact.contactEmail}`}>Scrivi al ristorante</a></>}
        {contact?.contactPhone && <> · <a href={`https://wa.me/${contact.contactPhone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp ristorante</a></>}
      </p>}
    </div>;
  }
  const active = orders.filter(order => !archived(order));
  const history = orders.filter(archived);
  return <section className={`${poc.screen} ${styles.screen}`} aria-labelledby="customer-orders-title">
    <header className={poc.header}><div className={poc.headerTopRow}>
      <a href="/ordina" className={poc.backLink}>← Home</a>
      {session?.actor && <span className={poc.orderCount}>{orders.length} {orders.length === 1 ? "ordine" : "ordini"}</span>}
    </div><h1 id="customer-orders-title" className={poc.title}>Ordini passati</h1><p className={poc.subtitle}>Riordina in un tap o rivedi i dettagli del tuo storico.</p>
      {session?.actor && <div className={styles.actions}><Button variant="secondary" disabled={busy} onClick={() => void readOrders()}>Aggiorna ordini</Button></div>}
    </header>
    {!loaded && <p className={styles.message} role="status">Caricamento degli ordini…</p>}
    {error && <div className={styles.error} role="alert"><p>{error}</p><Button variant="secondary" disabled={busy} onClick={() => void load()}>Riprova</Button></div>}
    {loaded && session && !session.actor && <section className={styles.message}><p>Accedi per seguire gli ordini</p><a href="/accesso?ritorno=%2Fordina%2Fordini">Accedi</a></section>}
    {session?.actor && <>
      {connection && <p className={styles.message} role="status">{connection}</p>}
      {reordered && <div className={poc.reorderNotice} role="status"><span className={poc.reorderNoticeText}>Carrello pronto.</span><a className={poc.reorderNoticeLink} href="/ordina/carrello">Vai al carrello</a></div>}
      <div className={styles.content}>
        {active.map(order => <article tabIndex={-1} id={`ordine-${encodeURIComponent(order.id)}`} key={order.id} className={`${poc.activeOrderSection} ${styles.active}`} aria-label={`Ordine in corso ${order.id}`}>
          <div className={styles.cardHeading}><span className={styles.reference}>#{order.id}</span><Badge tone="neutral">In corso</Badge></div>
          <h2 className={styles.status}>{statusLabels[order.status]}</h2>
          <p className={poc.historyItemMeta}>{orderDate(order)}</p>
          <OrderTimeline status={order.status} mode={order.cart.mode} />
          <div className={styles.total}><span>{order.quote.lines.map(line => `${line.quantity} × ${line.name}`).join(", ")}</span><strong>{money(order.quote.totalCents)}</strong></div>
          <details open><summary>Vedi dettagli</summary>{details(order)}</details>
        </article>)}
        <section className={poc.historySection} aria-label="Storico"><h2 className={poc.sectionLabel}>Storico</h2>
          {loaded && orders.length === 0 && !error && <p className={poc.emptyState}>Non hai ancora inviato ordini.</p>}
          {loaded && orders.length > 0 && history.length === 0 && <p className={poc.emptyState}>Nessun ordine nello storico.</p>}
          <ul className={poc.historyList}>{history.map(order => <li key={order.id} className={poc.historyItem}>
            <article id={`ordine-${encodeURIComponent(order.id)}`} tabIndex={-1} className={styles.archived} aria-label={`Ordine ${order.id}`}>
              <div className={poc.historyItemInner}><div className={poc.historyItemLeft}>
                <div className={styles.cardHeading}><span className={styles.reference}>#{order.id}</span><Badge tone={order.status === "cancelled" ? "warning" : "neutral"}>{statusLabels[order.status]}</Badge></div>
                <p className={poc.historyItemProducts}>{order.quote.lines.map(line => `${line.quantity} × ${line.name}`).join(", ")}</p>
                <p className={poc.historyItemMeta}>{orderDate(order)}</p>
                <p className={poc.historyItemMeta}>{paymentLabels[order.payment]}</p>
              </div><div className={poc.historyItemRight}><p className={poc.historyItemTotal}>{money(order.quote.totalCents)}</p>
                <Button variant="secondary" disabled={busy || orders.some(unresolved)} onClick={() => void repeat(order)}>Riordina</Button>
              </div></div>
              <details open={selectedId === order.id || undefined}><summary>Vedi dettagli</summary>{details(order)}</details>
            </article>
          </li>)}</ul>
        </section>
      </div>
    </>}
  </section>;
}
