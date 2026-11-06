"use client";

import type { IndividualProduct, PromotionConfiguration, PromotionCoupon, PromotionCouponInput, PromotionProgram, PromotionsApi } from "@pizzaos/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./promotions.module.css";

interface CouponForm {
  id?: string; revision?: number; code: string; active: boolean; kind: "percent" | "fixed"; value: string;
  startsAt: string; endsAt: string; minimum: string; productIds: string[]; globalLimit: string; perCustomerLimit: string;
}
const freshCoupon = (): CouponForm => ({ code: "", active: true, kind: "percent", value: "", startsAt: "", endsAt: "", minimum: "0", productIds: [], globalLimit: "", perCustomerLimit: "" });
const localDate = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const errorText = (error: unknown) => {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  return code === "revision_conflict" ? "La configurazione è stata aggiornata da un altro operatore. Controlla i valori aggiornati prima di salvare."
    : code === "forbidden" || code === "unauthorized" ? "Non hai accesso alle promozioni di questa sede."
      : code === "invalid_input" ? "Controlla codice, importi, prodotti, date e limiti. Nessun dato è stato salvato."
        : "Impossibile salvare o caricare le promozioni. Riprova.";
};

export function PromotionAdminPanel({ api, storeId, products, refreshVersion = 0 }: { api: PromotionsApi; storeId: string; products: IndividualProduct[]; refreshVersion?: number }) {
  const [configuration, setConfiguration] = useState<PromotionConfiguration | null>(null);
  const [program, setProgram] = useState<PromotionProgram | null>(null);
  const [rewardEuro, setRewardEuro] = useState("");
  const [coupon, setCoupon] = useState<CouponForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = useRef(false);
  const scope = useRef(storeId);
  const reload = useCallback(async (force = false) => {
    const next = await api.configuration(storeId);
    if (scope.current !== storeId) return;
    setConfiguration(next);
    if (force || !dirty.current) { setProgram(next.program); setRewardEuro((next.program.rewardCents / 100).toFixed(2)); }
  }, [api, storeId]);
  useEffect(() => {
    scope.current = storeId; dirty.current = false; setConfiguration(null); setProgram(null); setCoupon(null); setError(""); setNotice(""); setBusy(false);
    void reload(true).catch(failure => { if (scope.current === storeId) setError(errorText(failure)); });
  }, [storeId, reload]);
  useEffect(() => {
    if (refreshVersion === 0) return;
    void reload().catch(failure => { if (scope.current === storeId) setError(errorText(failure)); });
  }, [refreshVersion, reload, storeId]);

  async function save(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await work(); }
    catch (failure) {
      if (scope.current !== storeId) return;
      setError(errorText(failure));
      if (failure && typeof failure === "object" && "code" in failure && failure.code === "revision_conflict") {
        dirty.current = false; setCoupon(null); await reload(true).catch(() => {});
      }
    } finally { if (scope.current === storeId) setBusy(false); }
  }
  async function saveProgram() {
    if (!program) return;
    const next = await api.saveProgram(storeId, { ...program, rewardCents: Math.round(Number(rewardEuro) * 100) });
    if (scope.current !== storeId) return;
    dirty.current = false; setProgram(next); setRewardEuro((next.rewardCents / 100).toFixed(2));
    setConfiguration(current => current ? { ...current, program: next } : current); setNotice("Programma salvato.");
  }
  async function saveCoupon() {
    if (!coupon) return;
    const input: PromotionCouponInput = {
      ...(coupon.id ? { id: coupon.id, revision: coupon.revision } : {}),
      code: coupon.code.trim().toUpperCase(), active: coupon.active, kind: coupon.kind, value: Math.round(Number(coupon.value) * 100),
      startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString() : null, endsAt: coupon.endsAt ? new Date(coupon.endsAt).toISOString() : null,
      minimumCents: Math.round(Number(coupon.minimum) * 100), productIds: coupon.productIds,
      globalLimit: coupon.globalLimit === "" ? null : Number(coupon.globalLimit), perCustomerLimit: coupon.perCustomerLimit === "" ? null : Number(coupon.perCustomerLimit)
    };
    const next = await api.saveCoupon(storeId, input);
    if (scope.current !== storeId) return;
    setConfiguration(current => current ? { ...current, coupons: [...current.coupons.filter(item => item.id !== next.id), next] } : current);
    setCoupon(null); setNotice("Coupon salvato.");
  }
  function editCoupon(value: PromotionCoupon) {
    setNotice(""); setCoupon({ id: value.id, revision: value.revision, code: value.code, active: value.active, kind: value.kind, value: (value.value / 100).toFixed(2),
      startsAt: localDate(value.startsAt), endsAt: localDate(value.endsAt), minimum: (value.minimumCents / 100).toFixed(2), productIds: [...value.productIds],
      globalLimit: value.globalLimit === null ? "" : String(value.globalLimit), perCustomerLimit: value.perCustomerLimit === null ? "" : String(value.perCustomerLimit) });
  }
  return <section className={styles.panel} aria-label="Coupon e fedeltà"><header className={styles.header}><div><h2>Coupon e fedeltà</h2><p>Regole della sede, applicate e verificate dal servizio al checkout.</p></div>
    <button type="button" className={styles.secondary} disabled={busy} onClick={() => void save(async () => { dirty.current = false; await reload(true); setCoupon(null); })}>Ricarica promozioni</button></header>
    {error && <p role="alert" className={styles.error}>{error}</p>}{notice && <p role="status" className={styles.notice}>{notice}</p>}
    {!program && !error && <p role="status">Caricamento programma…</p>}
    {program && <div className={styles.layout}><form className={styles.card} onSubmit={event => { event.preventDefault(); void save(saveProgram); }}><h3>Programma fedeltà</h3>
      <fieldset disabled={busy}><legend>Regole punti e premio</legend><label className={styles.check}><input type="checkbox" checked={program.enabled} onChange={event => { dirty.current = true; setProgram({ ...program, enabled: event.target.checked }); }} />Programma attivo</label>
        <label>Punti per euro<input type="number" min={1} max={10000} step={1} required value={program.pointsPerEuro} onChange={event => { dirty.current = true; setProgram({ ...program, pointsPerEuro: Number(event.target.value) }); }} /></label>
        <label>Punti per premio<input type="number" min={1} max={100000000} step={1} required value={program.rewardPoints} onChange={event => { dirty.current = true; setProgram({ ...program, rewardPoints: Number(event.target.value) }); }} /></label>
        <label>Valore premio (€)<input type="number" min="0.01" max="1000000" step="0.01" required value={rewardEuro} onChange={event => { dirty.current = true; setRewardEuro(event.target.value); }} /></label>
        <p className={styles.small}>Punti solo a ordine completato sul netto prodotti, escluse consegna e mance. Un premio per ordine, senza scadenza punti.</p><button type="submit">Salva programma</button>
      </fieldset></form>
      <section className={styles.card}><div className={styles.header}><h3>Coupon della sede</h3><button type="button" disabled={busy} onClick={() => { setCoupon(freshCoupon()); setNotice(""); }}>Nuovo coupon</button></div>
        {configuration?.coupons.length === 0 && <p>Nessun coupon configurato.</p>}
        <ul className={styles.list}>{configuration?.coupons.map(item => { const usage = configuration.usage.find(record => record.couponId === item.id); return <li key={item.id}><div><strong>{item.code}</strong> · {item.active ? "Attivo" : "Disattivato"}<p className={styles.small}>{item.kind === "percent" ? `${item.value / 100}%` : `${(item.value / 100).toFixed(2)} €`} · {usage?.consumed ?? 0} utilizzi · {usage?.reserved ?? 0} impegnati</p></div><button type="button" className={styles.secondary} disabled={busy} onClick={() => editCoupon(item)}>Modifica {item.code}</button></li>; })}</ul>
        {coupon && <form onSubmit={event => { event.preventDefault(); void save(saveCoupon); }}><h3>{coupon.id ? `Modifica ${coupon.code}` : "Crea un coupon"}</h3><fieldset disabled={busy}><legend>Regole coupon</legend>
          <label>Codice coupon<input required maxLength={50} pattern={"[A-Za-z0-9_\\-]+"} value={coupon.code} onChange={event => setCoupon({ ...coupon, code: event.target.value })} /></label>
          <label className={styles.check}><input type="checkbox" checked={coupon.active} onChange={event => setCoupon({ ...coupon, active: event.target.checked })} />Coupon attivo</label>
          <label>Tipo coupon<select aria-label="Tipo coupon" value={coupon.kind} onChange={event => setCoupon({ ...coupon, kind: event.target.value === "fixed" ? "fixed" : "percent" })}><option value="percent">Percentuale</option><option value="fixed">Importo fisso</option></select></label>
          <label>Valore coupon<input type="number" required min="0.01" step="0.01" max={coupon.kind === "percent" ? 100 : 1000000} value={coupon.value} onChange={event => setCoupon({ ...coupon, value: event.target.value })} /></label><p className={styles.small}>{coupon.kind === "percent" ? "Percentuale di sconto, da 0,01% a 100%." : "Importo in euro sui prodotti ammessi."}</p>
          <div className={styles.columns}><label>Valido dal<input type="datetime-local" value={coupon.startsAt} onChange={event => setCoupon({ ...coupon, startsAt: event.target.value })} /></label><label>Valido fino al<input type="datetime-local" value={coupon.endsAt} onChange={event => setCoupon({ ...coupon, endsAt: event.target.value })} /></label></div>
          <label>Spesa minima (€)<input type="number" required min={0} max={1000000} step="0.01" value={coupon.minimum} onChange={event => setCoupon({ ...coupon, minimum: event.target.value })} /></label>
          <fieldset><legend>Prodotti ammessi</legend><p className={styles.small}>Nessuna selezione: tutti i prodotti.</p>{products.map(product => <label className={styles.check} key={product.id}><input type="checkbox" checked={coupon.productIds.includes(product.id)} onChange={event => setCoupon({ ...coupon, productIds: event.target.checked ? [...coupon.productIds, product.id] : coupon.productIds.filter(id => id !== product.id) })} />{product.name}</label>)}</fieldset>
          <div className={styles.columns}><label>Limite totale<input type="number" min={1} max={100000000} step={1} value={coupon.globalLimit} placeholder="Illimitato" onChange={event => setCoupon({ ...coupon, globalLimit: event.target.value })} /></label><label>Limite per cliente<input type="number" min={1} max={100000000} step={1} value={coupon.perCustomerLimit} placeholder="Illimitato" onChange={event => setCoupon({ ...coupon, perCustomerLimit: event.target.value })} /></label></div>
          <button type="submit">Salva coupon</button><button type="button" className={styles.secondary} onClick={() => setCoupon(null)}>Chiudi modifica</button>
        </fieldset></form>}
      </section></div>}
  </section>;
}
