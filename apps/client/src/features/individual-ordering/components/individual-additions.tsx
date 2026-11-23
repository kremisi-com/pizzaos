"use client";

import type { IndividualAdditionQuote, IndividualApi, IndividualLine, IndividualOrder, IndividualStore } from "@pizzaos/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { MenuLineDetails, MenuLineEditor } from "../../menu";
import { IndividualStripeFields, type ConfirmIndividualPayment } from "./individual-stripe-fields";
import styles from "./individual-ordering.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);

export function IndividualAdditions({ api, order, avoid, onChanged }: { api: IndividualApi; order: IndividualOrder; avoid: string[]; onChanged: () => Promise<void> }) {
  const [store, setStore] = useState<IndividualStore | null>(null);
  const [lines, setLines] = useState<IndividualLine[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [quote, setQuote] = useState<IndividualAdditionQuote | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = useRef<ConfirmIndividualPayment | null>(null);
  const onReady = useCallback((value: ConfirmIndividualPayment | null) => { confirm.current = value; }, []);
  const pending = order.additions?.find(item => !item.applied && ["requires_action", "processing"].includes(item.payment));
  const enabled = ["awaiting_acceptance", "awaiting_customer"].includes(order.status);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void api.catalog(order.storeId).then(value => { if (active) { setStore(value); setProductId(value.products.find(product => product.available)?.id ?? ""); } }).catch(failure => { if (active) setError(failure instanceof Error ? failure.message : "Menu non disponibile."); });
    return () => { active = false; };
  }, [api, order.storeId, enabled]);
  if (!enabled || !api.additionQuote || !api.additions) return null;
  const product = store?.products.find(item => item.id === productId);
  const keyName = `pizzaos.individual-addition.${order.id}`;
  function addLine(line: IndividualLine) {
    setLines(current => [...current, { ...line, quantity }]);
    setQuote(null);
  }
  async function verify() {
    if (!api.additionQuote) return;
    setBusy(true); setError(""); setQuote(null);
    try { setQuote(await api.additionQuote(order.id, lines)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Non è stato possibile verificare l'aggiunta."); }
    finally { setBusy(false); }
  }
  async function settle(resume: boolean) {
    if (!api.additions || (!resume && !quote)) return;
    if (order.method === "card" && !confirm.current) { setError("Completa il caricamento del pagamento sicuro prima di continuare."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      let key = crypto.randomUUID();
      try { key = localStorage.getItem(keyName) ?? key; localStorage.setItem(keyName, key); } catch { /* Server idempotency protects the operation. */ }
      let result = resume ? await api.reconcile(order.id) : await api.additions(order.id, { lines, fingerprint: quote?.fingerprint ?? "", idempotencyKey: key });
      if (result.clientSecret && order.method === "card") {
        await confirm.current?.(result.clientSecret);
        result = await api.reconcile(order.id);
      }
      const unresolved = result.order.additions?.some(item => !item.applied && ["processing", "requires_action"].includes(item.payment));
      if (unresolved) setNotice("Pagamento dell'aggiunta in verifica. Non inviare un'altra aggiunta.");
      else {
        try { localStorage.removeItem(keyName); } catch { /* No credentials are stored. */ }
        setQuote(null); setLines([]);
        setNotice(result.order.additions?.at(-1)?.applied ? "Aggiunta confermata nell'ordine." : "L'aggiunta non è stata applicata. L'ordine originale resta invariato.");
      }
      await onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Verifica lo stato del pagamento prima di riprovare.");
      const code = failure && typeof failure === "object" && "code" in failure ? String(failure.code) : "";
      if (["price_changed", "product_unavailable", "customization_changed", "inventory_changed", "invalid_input", "invalid_transition"].includes(code)) {
        setQuote(null);
        try { localStorage.removeItem(keyName); } catch { /* Browser storage may be unavailable. */ }
      }
      await onChanged().catch(() => undefined);
    } finally { setBusy(false); }
  }
  return <details className={styles.additions}><summary>Aggiungi prodotti a questo ordine</summary><p className={styles.small}>Puoi aggiungere prodotti prima dell&apos;accettazione. L&apos;ordine originale resta invariato finché l&apos;eventuale pagamento aggiuntivo non è confermato.</p>
    {error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.notice} role="status">{notice}</p>}
    {!pending && <><label>Prodotto da aggiungere<select value={productId} onChange={event => setProductId(event.target.value)}>{store?.products.filter(item => item.available).map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.priceCents)}</option>)}</select></label>
      <label>Quantità da aggiungere<input type="number" min="1" max="99" step="1" value={quantity} onChange={event => setQuantity(Number(event.target.value))} /></label>
      {store && product && product.options.length > 0 && <MenuLineEditor key={product.id} store={store} product={product} quantity={quantity} disabled={busy || !Number.isInteger(quantity) || quantity < 1 || quantity > 100}
        avoid={avoid} onSave={addLine} />}
      {!product?.groups?.length && <button type="button" className={styles.secondary} disabled={busy || !product || !Number.isInteger(quantity) || quantity < 1 || quantity > 100}
        onClick={() => addLine({ productId, quantity, optionIds: [], notes: "" })}>Inserisci nell&apos;aggiunta</button>}
      {lines.length > 0 && <ul>{lines.map((line, index) => {
        const entry = store?.products.find(item => item.id === line.productId);
        return <li key={`${line.productId}-${index}`}>{line.quantity} × {entry?.name ?? line.productId}
          <MenuLineDetails product={entry} line={line} avoid={avoid} showUnknown={Boolean(store?.menu)} />
          <button type="button" className={styles.secondary} disabled={busy} onClick={() => { setLines(current => current.filter((_, i) => i !== index)); setQuote(null); }}>Rimuovi dall&apos;aggiunta</button>
        </li>;
      })}</ul>}
      <button type="button" disabled={busy || !lines.length} onClick={() => void verify()}>Verifica totale aggiunta</button>
    </>}
    {quote && <div className={styles.summary}><p><span>Da aggiungere</span><strong>{money(quote.deltaCents)}</strong></p><p><span>Nuovo totale ordine</span><strong>{money(quote.quote.totalCents)}</strong></p></div>}
    {(quote || pending) && order.method === "card" && <div className={styles.stripe}><IndividualStripeFields onReady={onReady} /></div>}
    {quote && !pending && <button type="button" disabled={busy || (order.method === "card" && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)} onClick={() => void settle(false)}>{order.method === "card" ? `Conferma e paga aggiunta ${money(quote.deltaCents)}` : `Conferma aggiunta ${money(quote.deltaCents)} in contanti`}</button>}
    {pending && <><p className={styles.notice}>L&apos;aggiunta è in verifica. Non verrà applicata finché il pagamento non sarà confermato.</p><button type="button" disabled={busy} onClick={() => void settle(true)}>Recupera pagamento aggiunta</button></>}
  </details>;
}
