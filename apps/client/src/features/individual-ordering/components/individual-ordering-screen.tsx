"use client";

import type { IndividualApi, IndividualCart, IndividualCheckout, IndividualOrder, IndividualProduct, IndividualQuote, IndividualSession, IndividualStore, PromotionsApi } from "@pizzaos/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { readIndividualDraft, writeIndividualDraft } from "../draft";
import { createCheckoutAttempt, readCheckoutAttempt, removeCheckoutAttempt, writeCheckoutAttempt, type IndividualCheckoutAttempt } from "../checkout-attempt";
import { IndividualStripeFields, type ConfirmIndividualPayment } from "./individual-stripe-fields";
import { IndividualAdditions } from "./individual-additions";
import { SignOutButton } from "../../identity/components/sign-in-screen";
import { PromotionSelectionPanel, PromotionSummary } from "../../promotions";
import styles from "./individual-ordering.module.css";

const EMPTY_CART: IndividualCart = { storeId: "", lines: [], mode: "pickup", slotId: null, notes: "" };
const catalogTerms = (store: IndividualStore) => JSON.stringify({ id: store.id, acceptingOrders: store.acceptingOrders,
  products: store.products, ingredients: store.ingredients, slots: store.slots, deliveryBands: store.deliveryBands });
const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const statusLabels: Record<IndividualOrder["status"], string> = {
  pending_payment: "Pagamento da completare", awaiting_acceptance: "In attesa del ristorante", awaiting_customer: "Il ristorante attende una tua risposta",
  accepted: "Accettato", preparing: "In preparazione", ready: "Pronto", out_for_delivery: "In consegna", completed: "Completato", cancelled: "Annullato"
};
const paymentLabels: Record<IndividualOrder["payment"], string> = {
  requires_action: "Completa il pagamento sicuro", processing: "Pagamento in verifica: non effettuare un altro pagamento", failed: "Pagamento non riuscito",
  paid: "Pagato con carta", cash_due: "Da pagare in contanti al ritiro o alla consegna", cash_paid: "Contanti ricevuti", refund_pending: "Rimborso avviato, accredito in attesa",
  refunded: "Rimborso completato", refund_failed: "Il rimborso richiede un intervento del ristorante"
};

function errorText(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    price_changed: "Il totale è cambiato. Verifica il nuovo riepilogo e confermalo prima di inviare.",
    product_unavailable: "Un prodotto non è più disponibile. Correggi il carrello e verifica il totale.",
    inventory_changed: "La disponibilità è cambiata. Riduci le quantità o scegli altri prodotti.",
    slot_unavailable: "La fascia non è più disponibile. Scegline un'altra e verifica il totale.",
    outside_delivery_area: "L'indirizzo è fuori dalla zona di consegna. Puoi scegliere il ritiro.",
    minimum_not_met: "Non hai raggiunto il minimo per questa zona di consegna.",
    payment_unresolved: "Un pagamento è ancora in verifica. Recupera il tentativo esistente senza pagare di nuovo.",
    unauthorized: "Accedi per continuare con l'ordine.", forbidden: "Non puoi accedere a questo ordine.",
    invalid_input: "Controlla i dati dell'ordine e verifica nuovamente il totale.",
    service_unavailable: "Il servizio non è disponibile. Mantieni il tentativo esistente e riprova il recupero.",
    idempotency_conflict: "Il tentativo è già associato a un altro riepilogo. Recupera prima lo stato dell'ordine.",
    coupon_unavailable: "Un coupon non è applicabile o non produce sconto. Controlla codice, validità, prodotti e spesa minima.",
    coupon_limit_reached: "Gli utilizzi del coupon sono terminati o impegnati. Rimuovilo e verifica il totale.",
    loyalty_insufficient: "I punti disponibili non bastano per il premio. Togli il riscatto e verifica il totale.",
    loyalty_unavailable: "Il premio non è applicabile a questo carrello. Togli il riscatto e verifica il totale."
  };
  return messages[code] ?? "Non è stato possibile completare l'operazione. Riprova senza inviare un nuovo ordine.";
}

function MenuProduct({ product, onAdd }: { product: IndividualProduct; onAdd: (product: IndividualProduct, options: string[]) => void }) {
  const [options, setOptions] = useState<string[]>([]);
  return <article className={styles.product}>
    <div><h3>{product.name}</h3><p>{product.description}</p><p className={styles.price}>{money(product.priceCents)}</p></div>
    {product.allergens.length > 0 && <p className={styles.small}>Allergeni: {product.allergens.join(", ")}</p>}
    {product.options.length > 0 && <fieldset><legend>Personalizza {product.name}</legend>{product.options.map(option => <label className={styles.check} key={option.id}>
      <input type="checkbox" checked={options.includes(option.id)} onChange={event => setOptions(current => event.target.checked ? [...current, option.id] : current.filter(id => id !== option.id))} />
      {option.name} {option.priceCents > 0 ? `(+${money(option.priceCents)})` : ""}
    </label>)}</fieldset>}
    <button type="button" disabled={!product.available} onClick={() => onAdd(product, options)}>{product.available ? `Aggiungi ${product.name}` : "Non disponibile"}</button>
  </article>;
}

export function IndividualOrderingScreen({ api, promotionsApi, refreshVersion = 0, connection = "" }: { api: IndividualApi; promotionsApi?: PromotionsApi; refreshVersion?: number; connection?: string }) {
  const [session, setSession] = useState<IndividualSession | null>(null);
  const [stores, setStores] = useState<IndividualStore[]>([]);
  const [store, setStore] = useState<IndividualStore | null>(null);
  const [cart, setCart] = useState<IndividualCart>(EMPTY_CART);
  const [orders, setOrders] = useState<IndividualOrder[]>([]);
  const [quote, setQuote] = useState<IndividualQuote | null>(null);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"card" | "cash">("cash");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [resumeOrderId, setResumeOrderId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<IndividualCheckoutAttempt | null>(null);
  const [catalogReload, setCatalogReload] = useState(0);
  const [benefitsRefresh, setBenefitsRefresh] = useState(0);
  const attemptRef = useRef<IndividualCheckoutAttempt | null>(null);
  const cartRef = useRef<IndividualCart>(EMPTY_CART);
  const draftLoaded = useRef(false);
  const storeRef = useRef<IndividualStore | null>(null);
  const quoteRequest = useRef(0);
  const confirmPayment = useRef<ConfirmIndividualPayment | null>(null);
  const onCardReady = useCallback((confirm: ConfirmIndividualPayment | null) => { confirmPayment.current = confirm; }, []);
  const invalidatePromotionQuote = useCallback(() => { quoteRequest.current++; setQuote(null); }, []);

  const reloadOrders = useCallback(async () => { setOrders(await api.orders()); setBenefitsRefresh(value => value + 1); }, [api]);
  const load = useCallback(async () => {
    setError("");
    try {
      const [nextSession, nextStores] = await Promise.all([api.session(), api.stores()]);
      setSession(nextSession); setStores(nextStores);
      let draft: IndividualCart | null = null;
      try {
        draft = readIndividualDraft(localStorage);
        const pending = attemptRef.current ?? readCheckoutAttempt(localStorage);
        attemptRef.current = pending; setAttempt(pending);
      } catch { /* Ordering remains usable when browser storage is unavailable. */ }
      const chosen = draftLoaded.current ? cartRef.current
        : draft && nextStores.some(item => item.id === draft.storeId) ? draft : { ...EMPTY_CART, storeId: nextStores[0]?.id ?? "" };
      draftLoaded.current = true;
      cartRef.current = chosen; setCart(chosen); setQuote(null); quoteRequest.current++;
      if (nextSession.actor) await reloadOrders();
      else setOrders([]);
      setLoaded(true);
    } catch (failure) { setError(errorText(failure)); setLoaded(true); }
  }, [api, reloadOrders]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!cart.storeId) { storeRef.current = null; setStore(null); return; }
    let current = true;
    if (storeRef.current?.id !== cart.storeId) { storeRef.current = null; setStore(null); }
    void api.catalog(cart.storeId).then(value => {
      if (!current) return;
      if (storeRef.current && catalogTerms(storeRef.current) !== catalogTerms(value)) {
        quoteRequest.current++; setQuote(null);
      }
      storeRef.current = value; setStore(value);
    }).catch(failure => { if (current) setError(errorText(failure)); });
    return () => { current = false; };
  }, [api, cart.storeId, refreshVersion, catalogReload]);
  useEffect(() => {
    if (!session?.actor || refreshVersion === 0) return;
    let active = true;
    void api.orders().then(value => { if (active) setOrders(value); }).catch(failure => { if (active) setError(errorText(failure)); });
    return () => { active = false; };
  }, [api, refreshVersion, session?.actor]);

  function changeCart(next: IndividualCart) {
    cartRef.current = next; quoteRequest.current++; setCart(next); setQuote(null); setNotice("");
    try { writeIndividualDraft(localStorage, next); } catch { setNotice("Il browser non consente il salvataggio locale: mantieni aperta questa pagina fino all'invio."); }
  }
  function add(product: IndividualProduct, optionIds: string[]) {
    const key = [...optionIds].sort().join("|");
    const existing = cart.lines.findIndex(line => line.productId === product.id && [...line.optionIds].sort().join("|") === key);
    changeCart({ ...cart, lines: existing < 0 ? [...cart.lines, { productId: product.id, quantity: 1, optionIds, notes: "" }]
      : cart.lines.map((line, index) => index === existing ? { ...line, quantity: line.quantity + 1 } : line) });
  }
  async function verifyQuote() {
    setBusy(true); setError(""); setQuote(null);
    const request = ++quoteRequest.current;
    try { const next = await api.quote(cart); if (request === quoteRequest.current) setQuote(next); }
    catch (failure) { setError(errorText(failure)); setCatalogReload(current => current + 1); }
    finally { setBusy(false); }
  }
  function rememberAttempt(next: IndividualCheckoutAttempt) {
    attemptRef.current = next; setAttempt(next);
    try { writeCheckoutAttempt(localStorage, next); }
    catch { setNotice("Il browser non consente il salvataggio del tentativo: mantieni aperta questa pagina e recuperalo qui."); }
  }
  function forgetAttempt() {
    attemptRef.current = null; setAttempt(null);
    try { removeCheckoutAttempt(localStorage); } catch { /* The completed attempt is also cleared in memory. */ }
  }
  function clearSubmittedCart(order: IndividualOrder, submitted: IndividualCheckoutAttempt | null) {
    if (!submitted || attemptRef.current?.key !== submitted.key) return;
    if (order.status !== "pending_payment" && order.payment !== "failed") {
      setResumeOrderId(null);
      if (submitted.input && JSON.stringify(cartRef.current) === JSON.stringify(submitted.input.cart)) {
        changeCart({ ...cartRef.current, lines: [], notes: "", benefits: undefined });
      }
      forgetAttempt();
    } else if (order.payment === "failed") forgetAttempt();
  }
  async function sendOrder() {
    if (!quote || !session?.actor || busy || attemptRef.current) return;
    if (method === "card" && quote.totalCents > 0 && !confirmPayment.current) { setError("Attendi il caricamento del pagamento sicuro o scegli i contanti."); return; }
    const input: IndividualCheckout = { cart, fingerprint: quote.fingerprint, phone, method, idempotencyKey: crypto.randomUUID() };
    const submitted = createCheckoutAttempt(session.actor.id, input);
    rememberAttempt(submitted);
    await submitAttempt(submitted, true);
  }
  async function submitAttempt(submitted: IndividualCheckoutAttempt, completePayment: boolean) {
    if (!submitted.input || submitted.actorId !== session?.actor?.id || busy) return;
    setBusy(true); setError(""); setNotice("");
    let receivedOrder = false;
    try {
      const result = await api.checkout(submitted.input);
      receivedOrder = true;
      const known = { ...submitted, orderId: result.order.id }; rememberAttempt(known);
      if (completePayment && result.clientSecret && submitted.input.method === "card") {
        try { await confirmPayment.current?.(result.clientSecret); }
        catch (failure) { setError(errorText(failure)); }
      }
      const settled = result.order.method === "card" ? await api.reconcile(result.order.id) : result;
      clearSubmittedCart(settled.order, known);
      await reloadOrders();
      setNotice(settled.order.status === "pending_payment" ? "Il tentativo è stato salvato. Verifica il pagamento qui sotto." : "Ordine inviato. Il ristorante deve ancora accettarlo.");
    } catch (failure) {
      setError(errorText(failure));
      const code = failure && typeof failure === "object" && "code" in failure ? String(failure.code) : "";
      if (!receivedOrder && ["price_changed", "product_unavailable", "inventory_changed", "slot_unavailable", "outside_delivery_area", "minimum_not_met", "invalid_input", "coupon_unavailable", "coupon_limit_reached", "loyalty_insufficient", "loyalty_unavailable"].includes(code)) { setQuote(null); forgetAttempt(); setCatalogReload(current => current + 1); setBenefitsRefresh(value => value + 1); }
      await reloadOrders().catch(() => undefined);
    } finally { setBusy(false); }
  }
  async function recover(order: IndividualOrder, completePayment: boolean) {
    setBusy(true); setError("");
    try {
      let result = await api.reconcile(order.id);
      if (completePayment && result.clientSecret) {
        if (!confirmPayment.current) throw new Error("Seleziona carta e completa i dati nel campo sicuro per riprendere questo pagamento.");
        await confirmPayment.current(result.clientSecret);
        result = await api.reconcile(order.id);
      }
      clearSubmittedCart(result.order, attemptRef.current?.orderId === result.order.id ? attemptRef.current : null); await reloadOrders();
    } catch (failure) { setError(errorText(failure)); await reloadOrders().catch(() => undefined); }
    finally { setBusy(false); }
  }
  async function orderAction(order: IndividualOrder, action: "cancel" | "notes") {
    setBusy(true); setError("");
    try {
      if (action === "cancel") await api.action(order.id, { action });
      else await api.notes(order.id, editedNotes[order.id] ?? order.notes);
      await reloadOrders();
    } catch (failure) { setError(errorText(failure)); }
    finally { setBusy(false); }
  }
  function repeat(order: IndividualOrder) {
    changeCart({ ...order.cart, slotId: null, lines: order.cart.lines.filter(line => !order.unavailableProductIds.includes(line.productId)) });
    setNotice("Carrello ricreato senza i prodotti segnalati indisponibili. Puoi modificarlo e verificare un nuovo totale.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const unresolved = orders.some(order => (order.status === "pending_payment" && (order.payment === "requires_action" || order.payment === "processing")) || order.additions?.some(item => !item.applied && ["requires_action", "processing"].includes(item.payment)));

  return <div className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>PizzaOS · Ordina direttamente</span><h1>La tua prossima pizza.</h1><p>Scegli, personalizza e segui il tuo ordine.</p></div>
      {session?.actor ? <div className={styles.account}><span>{session.actor.name || session.actor.email}</span><SignOutButton /></div> : <a href="/accesso">Accedi</a>}
    </header>
    <p><a href="/ordina/gruppo">Ordine di gruppo</a> · Invita gli amici e conferma un solo ordine.</p>
    {connection && <p className={styles.connection} role="status">{connection}</p>}
    {error && <div className={styles.error} role="alert">{error}<div><button type="button" className={styles.secondary} disabled={busy} onClick={() => void load()}>Riprova caricamento</button></div></div>}
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {attempt && <aside className={styles.notice} aria-label="Tentativo ordine da recuperare"><p>L&apos;esito del tentativo precedente deve essere verificato prima di inviare un altro ordine. Il carrello attuale resta salvato.</p>
      {attempt.input && attempt.actorId === session?.actor?.id ? <button type="button" disabled={busy} onClick={() => void submitAttempt(attempt, false)}>Recupera tentativo ordine</button>
        : <p>{attempt.input ? "Accedi con lo stesso account usato per il tentativo per recuperarlo." : "Questo tentativo precedente non contiene il riepilogo originale. Contatta il ristorante e verifica i tuoi ordini prima di continuare."}</p>}
    </aside>}
    {!loaded && <p role="status">Caricamento del menu…</p>}
    {loaded && stores.length === 0 && <section className={styles.card}><h2>Menu non ancora disponibile</h2><p>Non ci sono sedi disponibili per ordinare.</p><button type="button" onClick={() => void load()}>Riprova</button></section>}
    {stores.length > 0 && <>
      <div className={styles.storeSelector}><label>Scegli la sede<select aria-label="Scegli la sede" value={cart.storeId} disabled={busy || unresolved} onChange={event => changeCart({ ...EMPTY_CART, storeId: event.target.value })}>{stores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <fieldset className={styles.layout} disabled={busy} aria-label="Composizione dell'ordine"><section><h2>Il menu</h2>{!store && <p>Caricamento della sede…</p>}{store && !store.acceptingOrders && <p className={styles.error}>Gli ordini sono temporaneamente sospesi.</p>}
        <div className={styles.products}>{store?.products.map(product => <MenuProduct key={`${store.id}-${product.id}`} product={product} onAdd={add} />)}</div>
      </section><section className={styles.card} id="il-tuo-ordine" aria-labelledby="cart-title"><h2 id="cart-title">Il tuo ordine</h2>
        {cart.lines.length === 0 ? <p>Il carrello è vuoto. Scegli dal menu.</p> : <ul className={styles.cartLines}>{cart.lines.map((line, index) => {
          const product = store?.products.find(item => item.id === line.productId);
          return <li key={`${line.productId}-${index}`}><strong>{product?.name ?? "Prodotto non più nel menu"}</strong>
            {line.optionIds.length > 0 && <p className={styles.small}>{line.optionIds.map(id => product?.options.find(option => option.id === id)?.name ?? "Opzione non disponibile").join(", ")}</p>}
            <div className={styles.quantity}><label>Quantità {product?.name}<input type="number" min="1" max="99" value={line.quantity} onChange={event => { const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity > 0) changeCart({ ...cart, lines: cart.lines.map((item, i) => i === index ? { ...item, quantity } : item) }); }} /></label>
              <button type="button" className={styles.secondary} onClick={() => changeCart({ ...cart, lines: cart.lines.filter((_, i) => i !== index) })}>Rimuovi</button></div>
            <label>Note per {product?.name}<input maxLength={500} value={line.notes} onChange={event => changeCart({ ...cart, lines: cart.lines.map((item, i) => i === index ? { ...item, notes: event.target.value } : item) })} /></label></li>;
        })}</ul>}
        <label>Modalità<select aria-label="Modalità" value={cart.mode} onChange={event => changeCart({ ...cart, mode: event.target.value === "delivery" ? "delivery" : "pickup", address: undefined })}><option value="pickup">Ritiro in pizzeria</option><option value="delivery">Consegna a domicilio</option></select></label>
        {cart.mode === "delivery" && <fieldset><legend>Dove consegniamo?</legend><label>Indirizzo completo<input required value={cart.address?.text ?? ""} onChange={event => changeCart({ ...cart, address: { text: event.target.value, latitude: cart.address?.latitude ?? 0, longitude: cart.address?.longitude ?? 0 } })} /></label>
          <p className={styles.small}>Conferma il punto di consegna per verificare zona e costo.</p><div className={styles.twoColumns}>
            <label>Latitudine<input type="number" step="any" min="-90" max="90" value={cart.address?.latitude ?? ""} onChange={event => changeCart({ ...cart, address: { text: cart.address?.text ?? "", latitude: Number(event.target.value), longitude: cart.address?.longitude ?? 0 } })} /></label>
            <label>Longitudine<input type="number" step="any" min="-180" max="180" value={cart.address?.longitude ?? ""} onChange={event => changeCart({ ...cart, address: { text: cart.address?.text ?? "", latitude: cart.address?.latitude ?? 0, longitude: Number(event.target.value) } })} /></label></div>
          <button type="button" className={styles.secondary} onClick={() => { if (!navigator.geolocation) { setError("Il browser non supporta la posizione."); return; } navigator.geolocation.getCurrentPosition(position => changeCart({ ...cart, address: { text: cart.address?.text ?? "", latitude: position.coords.latitude, longitude: position.coords.longitude } }), () => setError("Posizione non disponibile. Inserisci il punto di consegna.")); }}>Usa la mia posizione</button>
        </fieldset>}
        <label>Quando?<select aria-label="Quando?" value={cart.slotId ?? ""} onChange={event => changeCart({ ...cart, slotId: event.target.value || null })}><option value="">Appena possibile</option>{store?.slots.filter(slot => Date.parse(slot.startsAt) > Date.now()).map(slot => <option key={slot.id} value={slot.id}>{date(slot.startsAt)}</option>)}</select></label>
        <label>Note per l&apos;ordine<textarea maxLength={1000} value={cart.notes} onChange={event => changeCart({ ...cart, notes: event.target.value })} /></label>
        {promotionsApi && session?.actor && <PromotionSelectionPanel api={promotionsApi} storeId={cart.storeId} selection={cart.benefits} disabled={busy || unresolved || !!attempt} refreshVersion={refreshVersion + benefitsRefresh} onChange={benefits => changeCart({ ...cart, benefits })} onTermsChange={invalidatePromotionQuote} />}
        <button type="button" disabled={busy || !cart.lines.length || !store?.acceptingOrders || unresolved} onClick={() => void verifyQuote()}>Verifica disponibilità e totale</button>
        {quote && <div className={styles.summary}><h3>Riepilogo da confermare</h3>{quote.lines.map((line, index) => <p key={`${line.productId}-${index}`}><span>{line.quantity} × {line.name}</span><strong>{money(line.unitCents * line.quantity)}</strong></p>)}
          <PromotionSummary quote={quote} />
          {!quote.promotions && <><p><span>Consegna</span><strong>{money(quote.deliveryCents)}</strong></p><p className={styles.total}><span>Totale</span><strong>{money(quote.totalCents)}</strong></p></>}<p>Orario: {date(quote.slotStartsAt)}</p></div>}
        {session?.actor ? <><p className={styles.small}>Ordine di {session.actor.name} · {session.actor.email}</p><label>Telefono per l&apos;ordine<input type="tel" required autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></label>
          <label>Come paghi?<select aria-label="Come paghi?" value={method} onChange={event => setMethod(event.target.value === "card" ? "card" : "cash")}><option value="cash">Contanti al ritiro o alla consegna</option><option value="card">Carta</option></select></label>
          {method === "card" && quote?.totalCents !== 0 && <div className={styles.stripe}><IndividualStripeFields onReady={onCardReady} /></div>}
          {resumeOrderId && method === "card" && <button type="button" disabled={busy} onClick={() => { const order = orders.find(item => item.id === resumeOrderId); if (order) void recover(order, true); }}>Riprendi pagamento esistente</button>}
          <button type="button" disabled={busy || !quote || !phone.trim() || unresolved || !!attempt || (method === "card" && quote?.totalCents !== 0 && !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)} onClick={() => void sendOrder()}>{busy ? "Verifica in corso…" : method === "card" ? `Conferma e paga${quote ? ` ${money(quote.totalCents)}` : ""}` : "Conferma e invia ordine"}</button>
          <p className={styles.small}>Il ristorante deve accettare l&apos;ordine. Se viene annullato, il rimborso della carta viene avviato automaticamente.</p>
        </> : <div className={styles.login}><h3>Accedi quando sei pronto</h3><p>Il carrello resta su questo dispositivo mentre accedi con Google o con un link via email.</p><a className={styles.linkButton} href="/accesso">Accedi per completare l&apos;ordine</a></div>}
        {unresolved && <p className={styles.notice}>Hai un pagamento da verificare. Recuperalo nei tuoi ordini prima di inviarne un altro.</p>}
      </section></fieldset>
    </>}
    {session?.actor && <section className={styles.history} id="i-tuoi-ordini"><div className={styles.headingRow}><h2>I tuoi ordini</h2><button type="button" className={styles.secondary} disabled={busy} onClick={() => void reloadOrders().catch(failure => setError(errorText(failure)))}>Aggiorna ordini</button></div>
      {orders.length === 0 && <p>Non hai ancora inviato ordini.</p>}
      {orders.map(order => <article key={order.id} className={`${styles.order} ${order.status === "awaiting_customer" ? styles.waiting : ""}`}><div className={styles.headingRow}><div><p className={styles.small}>Ordine {order.id}</p><h3>{statusLabels[order.status]}</h3></div><strong>{money(order.quote.totalCents)}</strong></div>
        <p>{paymentLabels[order.payment]}</p>{order.additions?.filter(item => item.payment === "refund_pending" || item.payment === "refund_failed").map(item => <p key={item.id} className={styles.notice}>Rimborso aggiunta {money(item.deltaCents)}: {paymentLabels[item.payment]}</p>)}<p className={styles.small}>{order.cart.mode === "delivery" ? "Consegna" : "Ritiro"} · {date(order.quote.slotStartsAt)}</p>
        {order.acceptanceDeadline && order.status === "awaiting_acceptance" && <p>Risposta del ristorante entro le {new Date(order.acceptanceDeadline).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>}
        <ul>{order.quote.lines.map((line, index) => <li key={`${line.productId}-${index}`}>{line.quantity} × {line.name}{line.notes ? ` — ${line.notes}` : ""}</li>)}</ul>
        {order.status === "awaiting_customer" && <p className={styles.notice}>Il ristorante ti contatta via email o WhatsApp per un prodotto indisponibile. L&apos;ordine resta in attesa della tua risposta.</p>}
        {["pending_payment", "awaiting_acceptance", "awaiting_customer", "accepted"].includes(order.status) && <div><label>Note ordine {order.id}<textarea maxLength={1000} value={editedNotes[order.id] ?? order.notes} onChange={event => setEditedNotes(current => ({ ...current, [order.id]: event.target.value }))} /></label><button type="button" className={styles.secondary} disabled={busy} onClick={() => void orderAction(order, "notes")}>Aggiorna note</button></div>}
        <IndividualAdditions api={api} order={order} onChanged={reloadOrders} />
        <div className={styles.actions}>
          {order.status === "pending_payment" && order.payment !== "failed" && <><button type="button" disabled={busy} onClick={() => void recover(order, false)}>Verifica pagamento</button>{order.payment === "requires_action" && <button type="button" disabled={busy} onClick={() => { setMethod("card"); setResumeOrderId(order.id); setNotice("Completa i dati della carta nel pagamento sicuro e premi Riprendi pagamento."); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Completa pagamento esistente</button>}</>}
          {["awaiting_acceptance", "awaiting_customer"].includes(order.status) && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void orderAction(order, "cancel")}>Annulla ordine</button>}
          {(order.status === "cancelled" || order.status === "completed" || order.payment === "failed") && <button type="button" className={styles.secondary} disabled={busy || unresolved} onClick={() => repeat(order)}>{order.status === "cancelled" ? "Ripeti ordine annullato" : "Ripeti ordine"}</button>}
        </div>
        {["accepted", "preparing", "ready", "out_for_delivery"].includes(order.status) && <p className={styles.small}>Per chiedere l&apos;annullamento dopo l&apos;accettazione contatta il ristorante via email o WhatsApp.
          {stores.find(item => item.id === order.storeId)?.contactEmail && <> <a href={`mailto:${stores.find(item => item.id === order.storeId)?.contactEmail}`}>Scrivi al ristorante</a></>}
          {stores.find(item => item.id === order.storeId)?.contactPhone && <> · <a href={`https://wa.me/${stores.find(item => item.id === order.storeId)?.contactPhone?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">WhatsApp ristorante</a></>}
        </p>}
      </article>)}
    </section>}
  </div>;
}
