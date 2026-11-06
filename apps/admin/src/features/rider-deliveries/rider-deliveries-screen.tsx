"use client";

import type { RiderDelivery, RiderDeliveryApi, RiderSession } from "@pizzaos/domain";
import { useEffect, useRef, useState, type ReactElement } from "react";
import styles from "./rider-deliveries.module.css";

export interface RiderDeliveriesScreenProps {
  api: RiderDeliveryApi;
  loginUrl: string;
  refreshMs?: number;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Operazione non riuscita. Riprova.";
}

const euros = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

export function RiderDeliveriesScreen({ api, loginUrl, refreshMs = 5000 }: RiderDeliveriesScreenProps): ReactElement {
  const [session, setSession] = useState<RiderSession | null>(null);
  const [deliveries, setDeliveries] = useState<RiderDelivery[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const actionPending = useRef(false);
  const intervalMs = Number.isInteger(refreshMs) && refreshMs > 0 ? refreshMs : 5000;

  useEffect(() => {
    let active = true;
    let inFlight = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh(): Promise<void> {
      if (inFlight || !active) return;
      inFlight = true;
      try {
        const currentSession = await api.session();
        if (!active) return;
        setSession(currentSession);
        if (!currentSession.actor || currentSession.storeIds.length === 0) {
          setDeliveries([]);
          setError(null);
          setLoaded(true);
          if (timer !== undefined) clearInterval(timer);
          timer = undefined;
          return;
        }
        const currentDeliveries = await api.deliveries();
        if (!active) return;
        setDeliveries(currentDeliveries);
        setError(null);
        setLoaded(true);
        if (timer === undefined) timer = setInterval(() => { void refresh(); }, intervalMs);
      } catch (cause) {
        if (active) {
          setDeliveries([]);
          setError(message(cause));
          setLoaded(true);
        }
      } finally {
        inFlight = false;
      }
    }

    void refresh();
    return () => {
      active = false;
      if (timer !== undefined) clearInterval(timer);
    };
  }, [api, intervalMs, refreshKey]);

  async function perform(orderId: string, action: () => Promise<void>): Promise<void> {
    if (actionPending.current) return;
    actionPending.current = true;
    setBusy(orderId);
    setError(null);
    try {
      await action();
      setRefreshKey(value => value + 1);
    } catch (cause) {
      setError(message(cause));
    } finally {
      actionPending.current = false;
      setBusy(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Le mie consegne</h1>
          <p>Le consegne assegnate a te dal ristorante.</p>
        </div>
        <button className={`${styles.button} ${styles.secondary}`} type="button" disabled={busy !== null}
          onClick={() => { setRefreshKey(value => value + 1); }}>Aggiorna</button>
      </header>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {!loaded && <p role="status">Caricamento delle consegne…</p>}
      {loaded && !session?.actor && !error && (
        <section className={styles.card}>
          <h2>Accesso rider</h2>
          <p>Accedi con l&apos;email abilitata dal ristorante.</p>
          <a className={styles.button} href={loginUrl}>Accedi</a>
        </section>
      )}
      {loaded && session?.actor && session.storeIds.length === 0 && (
        <p className={styles.notice}>Il tuo account non è abilitato come rider. Contatta il ristorante.</p>
      )}
      {loaded && session?.actor && session.storeIds.length > 0 && !error && deliveries.length === 0 && (
        <p>Nessuna consegna assegnata in questo momento.</p>
      )}

      <div className={styles.list}>
        {deliveries.map(delivery => (
          <article className={styles.card} key={delivery.orderId} aria-labelledby={`delivery-${delivery.orderId}`}>
            <h2 id={`delivery-${delivery.orderId}`}>{delivery.storeName} · {delivery.orderId}</h2>
            <span className={styles.status}>{delivery.status === "ready" ? "Pronta per partire" : "In consegna"}</span>
            <address>{delivery.address.text}</address>
            <p>{delivery.contact.name} · <a href={`tel:${delivery.contact.phone}`}>{delivery.contact.phone}</a></p>
            {delivery.notes && <p>{delivery.notes}</p>}
            <ul>{delivery.items.map((item, index) => <li key={`${item.name}-${index}`}>{item.quantity} × {item.name}</li>)}</ul>
            <p className={styles.cash}>{delivery.cashDueCents > 0
              ? `Contanti da riscuotere: ${euros.format(delivery.cashDueCents / 100)}`
              : "Nessun contante da riscuotere"}</p>

            {delivery.issue ? (
              <div className={styles.notice}>
                <strong>Problema segnalato</strong>
                <p>{delivery.issue.note}</p>
                <span>In attesa dell&apos;intervento del ristorante.</span>
              </div>
            ) : (
              <>
                <div className={styles.actions}>
                  {delivery.status === "ready" ? (
                    <button type="button" className={styles.button} disabled={busy !== null}
                      onClick={() => { void perform(delivery.orderId, () => api.dispatch(delivery.orderId)); }}>Avvia consegna</button>
                  ) : (
                    <button type="button" className={styles.button} disabled={busy !== null}
                      onClick={() => { void perform(delivery.orderId, () => api.complete(delivery.orderId)); }}>Completa consegna</button>
                  )}
                </div>
                {delivery.status === "out_for_delivery" && (
                  <form className={styles.form} onSubmit={event => {
                    event.preventDefault();
                    const note = (notes[delivery.orderId] ?? "").trim();
                    if (!note) { setError("Descrivi il problema prima di inviare."); return; }
                    void perform(delivery.orderId, async () => {
                      await api.reportFailure(delivery.orderId, note);
                      setNotes(current => ({ ...current, [delivery.orderId]: "" }));
                    });
                  }}>
                    <label htmlFor={`issue-${delivery.orderId}`}>Descrivi il problema</label>
                    <textarea id={`issue-${delivery.orderId}`} required maxLength={2000} disabled={busy !== null}
                      value={notes[delivery.orderId] ?? ""}
                      onChange={event => { setNotes(current => ({ ...current, [delivery.orderId]: event.target.value })); }} />
                    <button className={`${styles.button} ${styles.secondary}`} type="submit" disabled={busy !== null}>Segnala problema</button>
                  </form>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
