"use client";

import type { AdminDeliveryItem, DeliveryAdminApi, DeliveryRider, IndividualOrder } from "@pizzaos/domain";
import { type FormEvent, type ReactElement, useCallback, useEffect, useId, useRef, useState } from "react";
import styles from "./delivery-assignment-panel.module.css";

export interface DeliveryAssignmentsPanelProps {
  storeId: string;
  orders: IndividualOrder[];
  api: DeliveryAdminApi;
  onChanged?: () => void;
  refreshVersion?: number;
  riderHref?: string;
}

/** Operate rider availability and assignments using the authenticated public port. */
export function DeliveryAssignmentsPanel(props: DeliveryAssignmentsPanelProps): ReactElement {
  return <StoreDeliveryAssignments key={props.storeId} {...props} />;
}

function StoreDeliveryAssignments({ storeId, orders, api, onChanged, refreshVersion = 0, riderHref = "/rider" }: DeliveryAssignmentsPanelProps): ReactElement {
  const id = useId();
  const alive = useRef(true);
  const generation = useRef(0);
  const mutationInProgress = useRef(false);
  const [riders, setRiders] = useState<DeliveryRider[]>([]);
  const [assignments, setAssignments] = useState<AdminDeliveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"load" | "mutation" | null>(null);
  const [validation, setValidation] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [selectedRiders, setSelectedRiders] = useState<Record<string, string>>({});

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; generation.current += 1; };
  }, []);

  const load = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const [nextRiders, nextAssignments] = await Promise.all([api.riders(storeId), api.assignments(storeId)]);
      if (alive.current && request === generation.current) {
        setRiders(nextRiders.filter((rider) => rider.storeId === storeId));
        setAssignments(nextAssignments);
      }
    } catch {
      if (alive.current && request === generation.current) setError("load");
    } finally {
      if (alive.current && request === generation.current) setLoading(false);
    }
  }, [api, storeId]);

  useEffect(() => {
    void load();
    return () => { generation.current += 1; };
  }, [load, refreshVersion]);

  async function mutate(operation: () => Promise<unknown>): Promise<boolean> {
    if (mutationInProgress.current || loading) return false;
    mutationInProgress.current = true;
    setBusy(true);
    setError(null);
    setValidation("");
    try {
      await operation();
      if (!alive.current) return false;
      onChanged?.();
      await load();
      return alive.current;
    } catch {
      if (alive.current) setError("mutation");
      return false;
    } finally {
      mutationInProgress.current = false;
      if (alive.current) setBusy(false);
    }
  }

  async function enableRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !name.trim()) {
      setValidation("Inserisci email e nome del rider.");
      return;
    }
    if (!event.currentTarget.checkValidity()) {
      setValidation("Inserisci un indirizzo email valido.");
      return;
    }
    const succeeded = await mutate(() => api.inviteRider(storeId, email.trim(), name.trim()));
    if (succeeded) { setEmail(""); setName(""); }
  }

  const activeRiders = riders.filter((rider) => rider.active);
  const actionableOrders = orders.filter((order) =>
    order.storeId === storeId && order.cart.mode === "delivery" && (order.status === "ready" || order.status === "out_for_delivery")
  );
  const disabled = busy || loading;

  return <section className={styles.panel} aria-labelledby={`${id}-title`}>
    <header className={styles.header}>
      <h2 id={`${id}-title`}>Rider e consegne</h2>
      <a href={riderHref}>Area rider</a>
    </header>
    <form className={styles.form} onSubmit={(event) => { void enableRider(event); }} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-email`}>Email rider</label>
        <input id={`${id}-email`} type="email" value={email} required disabled={disabled} onChange={(event) => setEmail(event.target.value)} />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-name`}>Nome rider</label>
        <input id={`${id}-name`} value={name} required disabled={disabled} onChange={(event) => setName(event.target.value)} />
      </div>
      <button className={styles.primary} type="submit" disabled={disabled}>Abilita rider</button>
    </form>
    {validation && <p role="alert">{validation}</p>}
    {busy ? <p role="status">Aggiornamento consegne…</p> : loading && <p role="status">Caricamento consegne…</p>}
    {error && <div role="alert">
      <p>{error === "load" ? "Impossibile caricare le consegne." : "Impossibile aggiornare le consegne."}</p>
      <button type="button" disabled={disabled} onClick={() => { void load(); }}>Riprova</button>
    </div>}
    {!loading && error !== "load" && <>
      <h3>Rider della sede</h3>
      {riders.length === 0 ? <p>Nessun rider abilitato.</p> : <ul className={styles.list}>
        {riders.map((rider) => <li className={styles.rider} key={rider.id}>
          <div><strong>{rider.name}</strong><p>{rider.email}</p><span>{rider.active ? "Attivo" : "Disattivato"}</span></div>
          <button type="button" disabled={disabled} aria-label={`${rider.active ? "Disattiva" : "Riattiva"} ${rider.name}`}
            onClick={() => { void mutate(() => api.setRiderActive(storeId, rider.id, !rider.active)); }}>
            {rider.active ? "Disattiva" : "Riattiva"}
          </button>
        </li>)}
      </ul>}
      <h3>Consegne da assegnare</h3>
      {actionableOrders.length === 0 ? <p>Nessuna consegna da assegnare.</p> : <ul className={styles.list}>
        {actionableOrders.map((order) => {
          const assignment = assignments.find((item) => item.orderId === order.id);
          const assigned = riders.find((rider) => rider.id === assignment?.riderId);
          const selection = activeRiders.some((rider) => rider.id === selectedRiders[order.id]) ? selectedRiders[order.id] : "";
          return <li className={styles.order} key={order.id}>
            <strong>Ordine {order.id}</strong>
            <p>{order.contact.name} · {order.cart.address?.text ?? "Indirizzo non disponibile"}</p>
            <p>{assigned ? `Rider assegnato: ${assigned.name}` : "Non assegnato"}</p>
            {assignment?.issue && <div className={styles.issue}><strong>Consegna da risolvere</strong><p>{assignment.issue.note}</p></div>}
            <div className={styles.form}>
              <div className={styles.field}>
                <label htmlFor={`${id}-${order.id}`}>Rider per ordine {order.id}</label>
                <select id={`${id}-${order.id}`} value={selection} disabled={disabled || activeRiders.length === 0}
                  onChange={(event) => setSelectedRiders((current) => ({ ...current, [order.id]: event.target.value }))}>
                  <option value="">Seleziona rider</option>
                  {activeRiders.map((rider) => <option value={rider.id} key={rider.id}>{rider.name}</option>)}
                </select>
              </div>
              <button className={styles.primary} type="button" disabled={disabled || !selection} aria-label={`Assegna per ordine ${order.id}`}
                onClick={() => { void mutate(() => api.assign(order.id, selection)); }}>Assegna</button>
            </div>
          </li>;
        })}
      </ul>}
    </>}
    <p className={styles.guidance}>Per annullare un ordine e avviare il rimborso usa le azioni dell&apos;ordine.</p>
  </section>;
}
