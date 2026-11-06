"use client";

import type { OperationalEmailApi, OperationalEmailDelivery, OperationalEmailOverview } from "@pizzaos/domain";
import { useEffect, useState } from "react";
import styles from "./operational-emails.module.css";

const statusLabels: Record<OperationalEmailDelivery["status"], string> = {
  pending: "In attesa", sending: "Invio in corso", retrying: "Nuovo tentativo", blocked: "Bloccato", sent: "Inviato"
};
const eventLabels: Record<OperationalEmailDelivery["event"], string> = {
  received: "Ordine ricevuto", accepted: "Ordine accettato", ready: "Pronto al ritiro", out_for_delivery: "In consegna",
  cancelled: "Ordine annullato", refund_succeeded: "Rimborso completato", refund_failed: "Rimborso non riuscito"
};
const errorLabels = {
  smtp_unavailable: "Servizio email temporaneamente non disponibile.",
  not_configured: "Configurazione email non disponibile. L'invio resta in attesa di configurazione.",
  recipient_not_allowed: "Destinatario non autorizzato dalla modalità test. Nessuna email inviata."
};
const date = (value: string) => new Date(value).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "medium" });

/** Server snapshots are authoritative; this panel never sends or advances messages locally. */
export function OperationalEmailPanel({ api, storeId, refreshVersion = 0, pollMs = 3000 }: {
  api: OperationalEmailApi; storeId: string; refreshVersion?: number; pollMs?: number;
}) {
  const [snapshot, setSnapshot] = useState<{ storeId: string; overview: OperationalEmailOverview } | null>(null);
  const [failure, setFailure] = useState<{ storeId: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    let inFlight = false;
    setLoading(true); setFailure(null);
    const read = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const overview = await api.list(storeId);
        if (!active) return;
        setSnapshot(current => current?.storeId === storeId && current.overview.revision > overview.revision ? current : { storeId, overview });
        setFailure(null);
      } catch (error) {
        if (!active) return;
        const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
        setFailure({ storeId, message: code === "unauthorized" || code === "forbidden" ? "Non hai accesso agli invii di questa sede." : "Impossibile aggiornare gli invii. Le informazioni mostrate potrebbero non essere aggiornate. Riprova." });
      } finally { inFlight = false; if (active) setLoading(false); }
    };
    void read();
    const timer = pollMs > 0 ? setInterval(() => void read(), Math.max(100, pollMs)) : undefined;
    return () => { active = false; if (timer !== undefined) clearInterval(timer); };
  }, [api, storeId, refreshVersion, reload, pollMs]);
  const current = snapshot?.storeId === storeId ? snapshot.overview : null;
  const error = failure?.storeId === storeId ? failure.message : null;
  return <section className={styles.panel} aria-label="Email operative"><header className={styles.header}><div><h2>Email operative</h2>
    <p>Il servizio riprova automaticamente gli invii non riusciti. Lo stato dell&apos;ordine resta sempre disponibile nell&apos;app; WhatsApp rimane manuale.</p></div>
    <button type="button" disabled={loading} onClick={() => setReload(value => value + 1)}>Aggiorna invii</button></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {!current && loading && <p role="status">Caricamento invii…</p>}
    {current && current.messages.length === 0 && <p>Nessuna email operativa</p>}
    <div className={styles.messages}>{current?.messages.map(message => <article key={message.id} aria-label={`Email ${message.id}`} className={styles.message} data-status={message.status}>
      <div className={styles.heading}><h3>{eventLabels[message.event]}</h3><strong className={styles.status}>{statusLabels[message.status]}</strong></div>
      <p className={styles.small}>Ordine {message.orderId}</p><p>Destinatario: <span>{message.recipient}</span></p>
      <dl><div><dt>Tentativi</dt><dd>{message.attempts}</dd></div><div><dt>Evento</dt><dd>{date(message.createdAt)}</dd></div><div><dt>Ultimo aggiornamento</dt><dd>{date(message.updatedAt)}</dd></div>
        {message.nextAttemptAt && <div><dt>Prossimo tentativo</dt><dd>{date(message.nextAttemptAt)}</dd></div>}
        {message.sentAt && <div><dt>Inviata al servizio email</dt><dd>{date(message.sentAt)}</dd></div>}</dl>
      {message.lastError && <p className={styles.error}>{errorLabels[message.lastError.code]}</p>}
    </article>)}</div>
  </section>;
}
