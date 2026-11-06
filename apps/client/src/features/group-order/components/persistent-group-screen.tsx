"use client";

import type {
  GroupCheckout, GroupFulfillment, GroupOrderingApi, GroupQuote, GroupSnapshot,
  IndividualApi, IndividualCheckoutResult, IndividualLine, IndividualProduct, IndividualSession, IndividualStore, PromotionsApi
} from "@pizzaos/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { IndividualStripeFields, type ConfirmIndividualPayment } from "../../individual-ordering";
import { PromotionSelectionPanel, PromotionSummary } from "../../promotions";
import styles from "./persistent-group-screen.module.css";

const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const date = (iso: string) => new Date(iso).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
const initialFulfillment: GroupFulfillment = { mode: "pickup", slotId: null, notes: "" };
const terms = (store: IndividualStore) => JSON.stringify({ products: store.products, ingredients: store.ingredients,
  slots: store.slots, deliveryBands: store.deliveryBands, acceptingOrders: store.acceptingOrders });
const localDeadline = () => {
  const value = new Date(Date.now() + 60 * 60_000);
  return new Date(value.getTime() - value.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
function errorText(value: unknown): string {
  const code = value && typeof value === "object" && "code" in value ? String(value.code) : "";
  const messages: Record<string, string> = {
    revision_conflict: "Le scelte del gruppo sono cambiate. Controlla il riepilogo aggiornato e ripeti l'operazione.",
    group_closed: "La raccolta è chiusa. Solo l'organizzatore può correggere le scelte prima del checkout.",
    checkout_pending: "Un tentativo è già in corso. Recupera il tentativo gruppo prima di procedere.",
    idempotency_conflict: "Il tentativo originale è già salvato. Recuperalo senza cambiare la richiesta.",
    price_changed: "Il totale è cambiato. Verifica di nuovo il totale e conferma il nuovo riepilogo.",
    product_unavailable: "Un prodotto non è più disponibile. L'organizzatore può rimuoverlo e verificare di nuovo il totale.",
    inventory_changed: "La disponibilità è cambiata. Riduci le quantità o rimuovi gli articoli e verifica di nuovo il totale.",
    slot_unavailable: "La fascia non è più disponibile. Scegli un altro orario e verifica di nuovo il totale.",
    outside_delivery_area: "L'indirizzo è fuori dalla zona di consegna. Puoi scegliere il ritiro.",
    minimum_not_met: "Il gruppo non raggiunge il minimo per la consegna in questa zona.",
    payment_unresolved: "Hai un pagamento in verifica. Recupera il tentativo esistente nei tuoi ordini.",
    unauthorized: "Accedi per creare e gestire il tuo gruppo.",
    forbidden: "Non puoi effettuare questa operazione. Controlla il link o la tua partecipazione.",
    not_found: "Gruppo o invito non disponibile. Controlla il link ricevuto.",
    invalid_input: "Controlla nome, quantità, scadenza e dati inseriti.",
    service_unavailable: "Connessione al servizio non disponibile. Riprova: il tentativo esistente resta recuperabile.",
    coupon_unavailable: "Un coupon non è applicabile o non produce sconto. Controlla codice, validità, prodotti e spesa minima.",
    coupon_limit_reached: "Gli utilizzi del coupon sono terminati o impegnati. Rimuovilo e verifica il totale.",
    loyalty_insufficient: "I punti dell'organizzatore non bastano per il premio. Togli il riscatto e verifica il totale.",
    loyalty_unavailable: "Il premio non è applicabile. Togli il riscatto e verifica il totale."
  };
  return messages[code] ?? "Non è stato possibile completare l'operazione. Aggiorna il gruppo e riprova.";
}

function GroupProduct({ product, disabled, onAdd }: {
  product: IndividualProduct; disabled: boolean; onAdd: (product: IndividualProduct, options: string[]) => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  return <article className={styles.card}><h3>{product.name}</h3><p>{product.description}</p><p className={styles.price}>{money(product.priceCents)}</p>
    {product.allergens.length > 0 && <p className={styles.small}>Allergeni: {product.allergens.join(", ")}</p>}
    {product.options.length > 0 && <fieldset disabled={disabled}><legend>Personalizza {product.name}</legend>{product.options.map(option => <label className={styles.check} key={option.id}>
      <input type="checkbox" checked={options.includes(option.id)} onChange={event => setOptions(current => event.target.checked ? [...current, option.id] : current.filter(id => id !== option.id))} />{option.name} (+{money(option.priceCents)})
    </label>)}</fieldset>}
    <button type="button" disabled={disabled || !product.available} onClick={() => onAdd(product, options)}>Aggiungi {product.name}</button>
  </article>;
}

export function PersistentGroupScreen({ api, individualApi, promotionsApi, groupId, inviteToken, pollMs = 2000 }: {
  api: GroupOrderingApi; individualApi: IndividualApi; promotionsApi?: PromotionsApi; groupId?: string; inviteToken?: string; pollMs?: number;
}) {
  const [activeId, setActiveId] = useState(groupId);
  const [group, setGroup] = useState<GroupSnapshot | null>(null);
  const [session, setSession] = useState<IndividualSession | null>(null);
  const [stores, setStores] = useState<IndividualStore[]>([]);
  const [store, setStore] = useState<IndividualStore | null>(null);
  const [storeId, setStoreId] = useState("");
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState(localDeadline);
  const [ownLines, setOwnLines] = useState<IndividualLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [fulfillment, setFulfillment] = useState<GroupFulfillment>(initialFulfillment);
  const [quote, setQuote] = useState<GroupQuote | null>(null);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [cardReady, setCardReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localPending, setLocalPending] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Caricamento del gruppo…");
  const [result, setResult] = useState<IndividualCheckoutResult | null>(null);
  const groupRef = useRef<GroupSnapshot | null>(null);
  const storeRef = useRef<IndividualStore | null>(null);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const quoteRequest = useRef(0);
  const fulfillmentRef = useRef(fulfillment);
  const confirmPayment = useRef<ConfirmIndividualPayment | null>(null);
  const onCardReady = useCallback((confirm: ConfirmIndividualPayment | null) => { confirmPayment.current = confirm; setCardReady(Boolean(confirm)); }, []);
  const invalidateQuote = useCallback(() => { quoteRequest.current++; setQuote(null); }, []);
  const applyGroup = useCallback((next: GroupSnapshot) => {
    const previous = groupRef.current;
    if (previous?.id === next.id && previous.revision > next.revision) return;
    if (!previous || previous.revision !== next.revision || previous.status !== next.status) invalidateQuote();
    groupRef.current = next; setGroup(next); setLocalPending(Boolean(next.checkoutPending));
    if (!dirtyRef.current || previous?.participantId !== next.participantId) {
      setOwnLines(next.participants.find(person => person.id === next.participantId)?.lines ?? []);
      dirtyRef.current = false; setDirty(false);
    }
  }, [invalidateQuote]);

  const refresh = useCallback(async () => {
    if (!activeId) return;
    const next = await api.read(activeId, inviteToken);
    applyGroup(next);
    const catalog = await individualApi.catalog(next.storeId);
    if (groupRef.current?.id !== next.id) return;
    if (storeRef.current && terms(storeRef.current) !== terms(catalog)) invalidateQuote();
    storeRef.current = catalog; setStore(catalog);
    setConnection("Scelte condivise aggiornate dal ristorante");
  }, [activeId, api, individualApi, inviteToken, applyGroup, invalidateQuote]);

  useEffect(() => {
    let alive = true;
    void Promise.all([individualApi.session(), individualApi.stores()]).then(([identity, locations]) => {
      if (!alive) return;
      setSession(identity); setStores(locations); setStoreId(current => current || locations[0]?.id || "");
      if (!groupId) setName(current => current || identity.actor?.name || "");
    }).catch(failure => { if (alive) setError(errorText(failure)); });
    return () => { alive = false; };
  }, [individualApi, groupId]);

  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    let inFlight = false;
    const poll = async () => {
      if (!alive || inFlight || busyRef.current) return;
      inFlight = true;
      try { await refresh(); }
      catch (failure) { if (alive) { setConnection("Aggiornamenti interrotti. Riprovo automaticamente."); setError(errorText(failure)); } }
      finally { inFlight = false; }
    };
    void poll();
    const timer = setInterval(() => void poll(), Math.max(100, pollMs));
    return () => { alive = false; clearInterval(timer); };
  }, [activeId, pollMs, refresh]);

  async function run(work: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError("");
    try { await work(); }
    catch (failure) {
      setError(errorText(failure)); invalidateQuote();
      if (activeId) await refresh().catch(() => {});
    } finally { busyRef.current = false; setBusy(false); }
  }
  async function create() {
    const next = await api.create({ storeId, name, deadline: new Date(deadline).toISOString() });
    applyGroup(next); setActiveId(next.id);
    window.history.replaceState(null, "", `/ordina/gruppo/${encodeURIComponent(next.id)}`);
  }
  async function join() {
    if (!group || !inviteToken) return;
    applyGroup(await api.join(group.id, { inviteToken, name }));
    window.history.replaceState(null, "", `/ordina/gruppo/${encodeURIComponent(group.id)}`);
  }
  function editLines(lines: IndividualLine[]) {
    dirtyRef.current = true; setDirty(true); setOwnLines(lines); invalidateQuote();
  }
  async function saveOwn(lines: IndividualLine[]) {
    const current = groupRef.current;
    if (!current?.participantId) return;
    const next = await api.replaceLines(current.id, { participantId: current.participantId, revision: current.revision, lines });
    dirtyRef.current = false; setDirty(false); applyGroup(next);
  }
  function add(product: IndividualProduct, optionIds: string[]) {
    const lines = [...ownLines, { productId: product.id, quantity: 1, optionIds, notes: "" }];
    void run(() => saveOwn(lines));
  }
  function changeFulfillment(next: GroupFulfillment) {
    fulfillmentRef.current = next; setFulfillment(next); invalidateQuote();
  }
  async function verify() {
    if (!group) return;
    invalidateQuote();
    const request = ++quoteRequest.current;
    const expected = JSON.stringify(fulfillmentRef.current);
    const next = await api.quote(group.id, { revision: group.revision, fulfillment });
    if (request === quoteRequest.current && next.revision === groupRef.current?.revision && expected === JSON.stringify(fulfillmentRef.current)) setQuote(next);
  }
  async function acceptResult(next: IndividualCheckoutResult) {
    setResult(next);
    setLocalPending(false);
    if (next.clientSecret && confirmPayment.current) {
      await confirmPayment.current(next.clientSecret);
      setResult(await individualApi.reconcile(next.order.id));
    }
    await refresh();
  }
  async function submit() {
    if (!group || !quote) return;
    const input: GroupCheckout = { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment,
      phone, method, idempotencyKey: crypto.randomUUID() };
    setLocalPending(true);
    await acceptResult(await api.checkout(group.id, input));
  }
  async function recover() {
    if (!group) return;
    setLocalPending(true);
    await acceptResult(await api.recover(group.id));
  }

  const host = group?.role === "host";
  const pending = localPending || Boolean(group?.checkoutPending);
  const own = group?.participants.find(person => person.id === group.participantId);
  const canEdit = Boolean(own && group?.status !== "submitted" && (group?.status === "open" || host) && !pending);
  const canCheckout = host && group?.status === "closed" && !pending;
  const invitation = group?.inviteToken ? `${typeof window === "undefined" ? "" : window.location.origin}/ordina/gruppo/${encodeURIComponent(group.id)}#invito=${encodeURIComponent(group.inviteToken)}` : "";
  const validQuote = quote && quote.revision === group?.revision && !dirty && !pending;
  const canConfirm = canCheckout && validQuote && phone.trim() && (method === "cash" || quote?.quote.totalCents === 0 || cardReady);
  return <main className={styles.page}>
    <header className={styles.header}><div><span className={styles.eyebrow}>PizzaOS · Insieme a tavola</span><h1>Ordine di gruppo</h1><p>Ognuno sceglie, l&apos;organizzatore conferma un solo ordine.</p></div><a href="/ordina">Torna agli ordini</a></header>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    {activeId && <p role="status" className={styles.small}>{connection}</p>}
    {!activeId && <section className={`${styles.card} ${styles.create}`}><h2>Apri una raccolta</h2><p>Il link funziona anche per chi non ha un account.</p>
      {session?.actor ? <form onSubmit={event => { event.preventDefault(); void run(create); }}>
        <label>Sede<select aria-label="Sede" value={storeId} disabled={busy} onChange={event => setStoreId(event.target.value)}>{stores.map(location => <option value={location.id} key={location.id}>{location.name}</option>)}</select></label>
        <label>Nome<input maxLength={120} required value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
        <label>Scadenza raccolta<input type="datetime-local" required value={deadline} disabled={busy} onChange={event => setDeadline(event.target.value)} /></label>
        <p className={styles.small}>La scadenza chiude solo le scelte: non è uno slot di consegna e non avvia pagamenti. Scorte e fasce si verificano al checkout.</p>
        <button type="submit" disabled={busy || !storeId || !name.trim() || !deadline}>Crea gruppo</button>
      </form> : <a href="/accesso">Accedi per creare un gruppo</a>}
    </section>}
    {group && <><section className={styles.card}><h2>{group.status === "open" ? "Raccolta aperta" : group.status === "closed" ? "Raccolta chiusa" : "Ordine di gruppo inviato"}</h2>
      <p>Scadenza raccolta: <strong>{date(group.deadline)}</strong></p><p className={styles.small}>Le scelte non riservano scorte o orari. Nessun ordine o pagamento parte automaticamente.</p>
      {host && invitation && <label>Link invito<input readOnly value={invitation} onFocus={event => event.currentTarget.select()} /></label>}
      {host && group.status === "open" && <button type="button" disabled={busy || pending || dirty} onClick={() => void run(async () => applyGroup(await api.close(group.id, { revision: group.revision })))}>Chiudi raccolta</button>}
      {group.role === "visitor" && group.status === "open" && inviteToken && <form onSubmit={event => { event.preventDefault(); void run(join); }}><label>Nome<input required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label><button type="submit" disabled={busy || !name.trim()}>Entra nel gruppo</button></form>}
      {group.role !== "host" && group.status !== "open" && <p>Le scelte sono chiuse. L&apos;organizzatore verifica il totale e gestisce l&apos;ordine.</p>}
      {host && group.status === "submitted" && <p><a href="/ordina#i-tuoi-ordini">Gestisci l&apos;ordine e segui il ristorante</a></p>}
    </section>
    <div className={styles.layout}><section className={styles.stack}>
      {canEdit && <><h2>Il menu</h2>{store?.products.map(product => <GroupProduct key={`${store.id}-${product.id}`} product={product} disabled={busy} onAdd={add} />)}
        <section className={styles.card} aria-label="Le mie scelte"><h2>Le mie scelte</h2>{ownLines.length === 0 && <p>Non hai ancora scelto articoli.</p>}
          <fieldset disabled={busy}><legend>Personalizza le tue scelte</legend><ul className={styles.lines}>{ownLines.map((line, index) => {
            const product = store?.products.find(item => item.id === line.productId);
            const title = product?.name ?? line.productId;
            return <li key={`${line.productId}-${index}`}><strong>{title}</strong><div className={styles.row}><label>Quantità {title}<input type="number" min={1} max={100} value={line.quantity} onChange={event => {
              const quantity = Number(event.target.value); if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 100) editLines(ownLines.map((item, i) => i === index ? { ...item, quantity } : item));
            }} /></label><button type="button" className={styles.secondary} onClick={() => editLines(ownLines.filter((_, i) => i !== index))}>Rimuovi mia scelta</button></div>
              <label>Note per {title}<input maxLength={500} value={line.notes} onChange={event => editLines(ownLines.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} /></label>
              {line.optionIds.length > 0 && <p className={styles.small}>{line.optionIds.map(id => product?.options.find(option => option.id === id)?.name ?? id).join(", ")}</p>}</li>;
          })}</ul><button type="button" disabled={!dirty} onClick={() => void run(() => saveOwn(ownLines))}>Salva le mie scelte</button></fieldset>
        </section></>}
      <section className={styles.stack}><h2>Le scelte del gruppo</h2>{group.participants.map(person => <article key={person.id} aria-label={person.name} className={styles.card}><h3>{person.name}{person.host ? " · Organizzatore" : ""}</h3>
        {person.lines.length === 0 && <p>Nessun articolo scelto.</p>}<ul className={styles.lines}>{person.lines.map((line, index) => <li key={`${line.productId}-${index}`}>
          <strong>{line.quantity} × {store?.products.find(product => product.id === line.productId)?.name ?? line.productId}</strong>{line.notes && <p>{line.notes}</p>}
          {host && group.status !== "submitted" && <button type="button" className={styles.secondary} disabled={busy || pending || dirty} onClick={() => void run(async () => {
            const next = await api.replaceLines(group.id, { participantId: person.id, revision: group.revision, lines: person.lines.filter((_, i) => i !== index) }); applyGroup(next);
          })}>Rimuovi articolo di {person.name}</button>}
        </li>)}</ul>
        {host && !person.host && group.status !== "submitted" && <button type="button" className={styles.secondary} disabled={busy || pending || dirty} onClick={() => void run(async () => applyGroup(await api.removeParticipant(group.id, { participantId: person.id, revision: group.revision })))}>Rimuovi partecipante {person.name}</button>}
      </article>)}</section>
    </section>
    <aside className={styles.card}><h2>Conferma unica</h2><p>Un solo indirizzo, uno slot e un pagamento dell&apos;organizzatore.</p>
      {host && pending && <div className={styles.notice}><p>Un tentativo deve essere verificato prima di cambiare il gruppo o inviare un altro ordine.</p><button type="button" disabled={busy} onClick={() => void run(recover)}>Recupera tentativo gruppo</button></div>}
      {host && group.status === "closed" && <fieldset disabled={busy || pending}><legend>Consegna e pagamento</legend>
        <label>Modalità<select aria-label="Modalità" value={fulfillment.mode} onChange={event => changeFulfillment({ ...fulfillment, mode: event.target.value === "delivery" ? "delivery" : "pickup", address: undefined })}><option value="pickup">Ritiro in pizzeria</option><option value="delivery">Consegna a domicilio</option></select></label>
        {fulfillment.mode === "delivery" && <><label>Indirizzo completo<input required value={fulfillment.address?.text ?? ""} onChange={event => changeFulfillment({ ...fulfillment, address: { text: event.target.value, latitude: fulfillment.address?.latitude ?? 0, longitude: fulfillment.address?.longitude ?? 0 } })} /></label>
          <p className={styles.small}>Conferma il punto di consegna per verificare zona e costo.</p><div className={styles.columns}>
            <label>Latitudine<input type="number" step="any" min={-90} max={90} value={fulfillment.address?.latitude ?? ""} onChange={event => changeFulfillment({ ...fulfillment, address: { text: fulfillment.address?.text ?? "", latitude: Number(event.target.value), longitude: fulfillment.address?.longitude ?? 0 } })} /></label>
            <label>Longitudine<input type="number" step="any" min={-180} max={180} value={fulfillment.address?.longitude ?? ""} onChange={event => changeFulfillment({ ...fulfillment, address: { text: fulfillment.address?.text ?? "", latitude: fulfillment.address?.latitude ?? 0, longitude: Number(event.target.value) } })} /></label>
          </div></>}
        <label>Quando?<select aria-label="Quando?" value={fulfillment.slotId ?? ""} onChange={event => changeFulfillment({ ...fulfillment, slotId: event.target.value || null })}><option value="">Appena possibile</option>{store?.slots.filter(slot => Date.parse(slot.startsAt) > Date.now()).map(slot => <option key={slot.id} value={slot.id}>{date(slot.startsAt)}</option>)}</select></label>
        <label>Note per l&apos;ordine<textarea maxLength={1000} value={fulfillment.notes} onChange={event => changeFulfillment({ ...fulfillment, notes: event.target.value })} /></label>
        {promotionsApi && <PromotionSelectionPanel api={promotionsApi} storeId={group.storeId} selection={fulfillment.benefits} disabled={busy || pending} onChange={benefits => changeFulfillment({ ...fulfillment, benefits })} onTermsChange={invalidateQuote} />}
        <button type="button" disabled={!canCheckout || dirty || !group.participants.some(person => person.lines.length)} onClick={() => void run(verify)}>Verifica totale gruppo</button>
        {validQuote && <section aria-label="Riepilogo da confermare"><h3>Riepilogo da confermare</h3>{quote.quote.lines.map((line, index) => <p key={`${line.productId}-${index}`}>{line.quantity} × {line.name} · {money(line.quantity * line.unitCents)}<br /><span className={styles.small}>{line.notes}</span></p>)}
          <PromotionSummary quote={quote.quote} />
          {!quote.quote.promotions && <><p>Consegna: {money(quote.quote.deliveryCents)}</p><p className={styles.total}>Totale: <strong>{money(quote.quote.totalCents)}</strong></p></>}<p>Orario: {date(quote.quote.slotStartsAt)}</p></section>}
        <label>Telefono per l&apos;ordine<input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></label>
        <label>Come paghi?<select aria-label="Come paghi?" value={method} onChange={event => setMethod(event.target.value === "card" ? "card" : "cash")}><option value="cash">Contanti al ritiro o alla consegna</option><option value="card">Carta</option></select></label>
        {method === "card" && quote?.quote.totalCents !== 0 && <div className={styles.stripe}><IndividualStripeFields onReady={onCardReady} /></div>}
        <button type="button" disabled={!canConfirm} onClick={() => void run(submit)}>Conferma ordine di gruppo</button>
      </fieldset>}
      {host && group.status === "submitted" && <><p>{result?.order.payment === "requires_action" ? "Pagamento carta da completare nei tuoi ordini." : "L'ordine è disponibile nei tuoi ordini."}</p>
        <p className={styles.small}>Nei tuoi ordini puoi riprendere il pagamento esistente e verificarne l&apos;esito. Se il pagamento è fallito puoi ricreare l&apos;ordine scegliendo anche i contanti. Recupera sempre un esito incerto prima di inviare di nuovo.</p>
        <a href="/ordina#i-tuoi-ordini">Apri i tuoi ordini</a></>}
      {!host && <p>Solo l&apos;organizzatore può confermare e pagare.</p>}
      {host && group.status === "open" && <p>Chiudi la raccolta quando tutti hanno scelto per verificare disponibilità e totale.</p>}
    </aside></div></>}
  </main>;
}
