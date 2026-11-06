"use client";

import type { PilotAnalyticsApi, PilotAnalyticsPeriod, PilotAnalyticsQuery, PilotAnalyticsReport } from "@pizzaos/domain";
import { type FormEvent, type ReactElement, useEffect, useId, useState } from "react";
import styles from "./pilot-analytics.module.css";

export interface PilotAnalyticsPanelProps { storeId: string; api: PilotAnalyticsApi; refreshVersion?: number; }
/** Render authorized analytics through an injected browser port. */
export function PilotAnalyticsPanel(props: PilotAnalyticsPanelProps): ReactElement {
  return <StoreAnalytics key={props.storeId} {...props} />;
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

function StoreAnalytics({ storeId, api, refreshVersion = 0 }: PilotAnalyticsPanelProps): ReactElement {
  const id = useId();
  const [period, setPeriod] = useState<PilotAnalyticsPeriod>("today");
  const [fromDate, setFromDate] = useState("");
  const [throughDate, setThroughDate] = useState("");
  const [query, setQuery] = useState<PilotAnalyticsQuery | null>({ storeId, period: "today" });
  const [report, setReport] = useState<PilotAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [validation, setValidation] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!query) return;
    let current = true;
    setLoading(true);
    setError(false);
    setReport(null);
    void api.report(query).then((result) => {
      if (current) setReport(result);
    }).catch(() => {
      if (current) setError(true);
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [api, query, retry, refreshVersion]);

  function selectPeriod(value: PilotAnalyticsPeriod) {
    setPeriod(value);
    setValidation("");
    setError(false);
    setReport(null);
    setLoading(value !== "custom");
    setQuery(value === "custom" ? null : { storeId, period: value });
  }

  function applyDates(event: FormEvent) {
    event.preventDefault();
    if (!fromDate || !throughDate) {
      setValidation("Seleziona entrambe le date.");
      return;
    }
    if (fromDate > throughDate) {
      setValidation("La data iniziale deve precedere o coincidere con quella finale.");
      return;
    }
    setValidation("");
    setQuery({ storeId, period: "custom", fromDate, throughDate });
  }

  return <section className={styles.panel} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Vendite e ordini</h2>
    <div className={styles.controls}>
      <label htmlFor={`${id}-period`}>Periodo</label>
      <select id={`${id}-period`} value={period} onChange={(event) => selectPeriod(event.target.value as PilotAnalyticsPeriod)}>
        <option value="today">Oggi</option>
        <option value="last_7_days">Ultimi 7 giorni</option>
        <option value="last_30_days">Ultimi 30 giorni</option>
        <option value="custom">Intervallo personalizzato</option>
      </select>
    </div>
    {period === "custom" && <form className={styles.controls} onSubmit={applyDates} noValidate>
      <label htmlFor={`${id}-from`}>Dal</label>
      <input id={`${id}-from`} type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
      <label htmlFor={`${id}-through`}>Al</label>
      <input id={`${id}-through`} type="date" value={throughDate} onChange={(event) => setThroughDate(event.target.value)} />
      <button type="submit">Applica</button>
    </form>}
    {validation && <p role="alert">{validation}</p>}
    {loading && <p role="status">Caricamento statistiche…</p>}
    {error && <div role="alert">
      <p>Impossibile caricare le statistiche.</p>
      <button type="button" onClick={() => setRetry((value) => value + 1)}>Riprova</button>
    </div>}
    {report && <>
      <p className={styles.period}>{report.range.fromDate} — {report.range.throughDate} · {report.range.timeZone}</p>
      <dl className={styles.metrics}>
        <div><dt>Ordini completati</dt><dd>{report.completedOrders}</dd></div>
        <div><dt>Vendite</dt><dd>{euro.format(report.salesCents / 100)}</dd></div>
        <div><dt>Valore medio ordine</dt><dd>{euro.format(report.averageOrderCents / 100)}</dd></div>
        <div><dt>Ordini annullati</dt><dd>{report.cancelledOrders}</dd></div>
      </dl>
      <h3>Prodotti più venduti</h3>
      {report.topProducts.length === 0 ? <p>Nessun prodotto venduto nel periodo.</p> :
        <ol className={styles.products}>{report.topProducts.map((product) => <li key={product.productId}>
          <span>{product.name}</span><strong>{product.quantity}</strong>
        </li>)}</ol>}
    </>}
  </section>;
}
