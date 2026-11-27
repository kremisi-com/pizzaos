"use client";

import { formatOrderWindow, productType, resolveMealComposition, resolveMenuComposition } from "@pizzaos/domain";
import type {
  FoodPreferencesApi, GroupCheckout, GroupFulfillment, GroupOrderingApi, GroupParticipant, GroupPaymentResult, GroupQuote, GroupSharePayment, GroupSnapshot,
  IndividualApi, IndividualCheckoutResult, IndividualLine, IndividualSession, IndividualStore, PromotionsApi
} from "@pizzaos/domain";
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DeliveryAddressField, hasDeliveryPoint, IndividualStripeFields, OrderSlotSelect, type ConfirmIndividualPayment } from "../../individual-ordering";
import { appendMenuLine, MealCompositionDetails, MenuLineDetails, MenuLineEditor, OperationalMenu, useMenuPreferences } from "../../menu";
import { PromotionSelectionPanel, PromotionSummary } from "../../promotions";
import styles from "./persistent-group-screen.module.css";

export type SharedCartView = "share" | "menu" | "cart" | "checkout";
const money = (cents: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
const initialFulfillment: GroupFulfillment = { mode: "pickup", slotId: null, notes: "" };
const terms = (store: IndividualStore) => JSON.stringify({ menu: store.menu, products: store.products, ingredients: store.ingredients,
  slots: store.slots, deliveryBands: store.deliveryBands, acceptingOrders: store.acceptingOrders });
const lockedPayment = (payment?: GroupSharePayment) => Boolean(payment && ["processing", "requires_action", "paid", "refund_pending", "refund_failed"].includes(payment.status));
const productCount = (lines: IndividualLine[]) => {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return `${count} ${count === 1 ? "prodotto" : "prodotti"}`;
};
const paymentLabels: Record<GroupSharePayment["status"], string> = {
  processing: "Pagamento in verifica", requires_action: "Pagamento da completare", failed: "Pagamento non riuscito",
  paid: "Pagato", refund_pending: "Rimborso in corso", refunded: "Rimborsato", refund_failed: "Rimborso da verificare"
};
function errorText(value: unknown): string {
  const code = value && typeof value === "object" && "code" in value ? String(value.code) : "";
  const messages: Record<string, string> = {
    revision_conflict: "Le scelte del gruppo sono cambiate. Controlla il riepilogo aggiornato e ripeti l’operazione.",
    group_closed: "Le scelte sono chiuse. L’organizzatore sta confermando l’ordine.",
    checkout_pending: "Un pagamento è in corso. Verifica il tentativo esistente prima di continuare.",
    idempotency_conflict: "Il tentativo originale è già salvato. Recuperalo senza cambiare la richiesta.",
    price_changed: "Il totale è cambiato. Verifica di nuovo il totale e conferma il nuovo riepilogo.",
    customization_changed: "Una personalizzazione è cambiata. Correggi le scelte non pagate prima di continuare.",
    product_unavailable: "Un prodotto non è più disponibile. Correggi le scelte non pagate prima di continuare.",
    inventory_changed: "La disponibilità è cambiata. Riduci le quantità o scegli altri prodotti.",
    slot_unavailable: "La fascia non è più disponibile. Scegli un altro orario e verifica di nuovo il totale.",
    outside_delivery_area: "L’indirizzo è fuori dalla zona di consegna. Puoi scegliere il ritiro.",
    minimum_not_met: "Il gruppo non raggiunge il minimo per la consegna in questa zona.",
    payment_unresolved: "Un pagamento deve essere verificato. Recupera il tentativo prima di continuare.",
    unauthorized: "Accedi per pagare o confermare l’ordine di gruppo.",
    forbidden: "Non puoi effettuare questa operazione. Controlla il link o la tua partecipazione.",
    not_found: "Gruppo o invito non disponibile. Controlla il link ricevuto.",
    invalid_input: "Controlla nome, quantità e dati inseriti. Il pagamento anticipato con carta richiede almeno 0,50 €.",
    service_unavailable: "Connessione al servizio non disponibile. Riprova: il tentativo esistente resta recuperabile.",
    rate_limited: "Troppe richieste. Attendi qualche minuto e riprova.",
    coupon_unavailable: "Un coupon non è applicabile. Controlla codice, validità, prodotti e spesa minima.",
    coupon_limit_reached: "Gli utilizzi del coupon sono terminati. Rimuovilo e verifica il totale.",
    loyalty_insufficient: "I punti dell’organizzatore non bastano per il premio. Togli il riscatto e verifica il totale.",
    loyalty_unavailable: "Il premio non è applicabile. Togli il riscatto e verifica il totale."
  };
  return messages[code] ?? (value instanceof Error ? value.message : "Non è stato possibile completare l’operazione. Riprova.");
}

function estimate(lines: IndividualLine[], store: IndividualStore | null): number | null {
  if (!store) return null;
  let total = 0;
  for (const line of lines) {
    const product = store.products.find(item => item.id === line.productId);
    if (!product) return null;
    const preview = productType(product) === "meal"
      ? resolveMealComposition(product, line.mealSelections ?? [], store.products)
      : resolveMenuComposition(product, line.selections ?? line.optionIds.map(optionId => ({ optionId, quantity: 1 })));
    total += preview.unitCents * line.quantity;
  }
  return total;
}

function LineNote({ title, personName, value, disabled, onSave }: { title: string; personName: string; value: string; disabled: boolean; onSave: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setDraft(value);
    else if (value === draft) dirty.current = false;
  }, [value, draft]);
  return <label>Note per {title}<input aria-label={`Note per ${title} di ${personName}`} maxLength={500} value={draft} disabled={disabled}
    onChange={event => { dirty.current = true; setDraft(event.target.value); }} onBlur={() => { if (draft !== value) onSave(draft); }} /></label>;
}

function ParticipantChoices({ person, store, editable, busy, avoid, onReplace, onRemove }: {
  person: GroupParticipant; store: IndividualStore | null; editable: boolean; busy: boolean; avoid: string[];
  onReplace: (lines: IndividualLine[]) => void; onRemove?: () => void;
}) {
  return <section aria-label={person.name} className={styles.choices}>
    {person.lines.length === 0 && <p className={styles.small}>Nessun articolo scelto.</p>}
    <ul className={styles.lines}>{person.lines.map((line, index) => {
      const product = store?.products.find(item => item.id === line.productId);
      const frozen = lockedPayment(person.payment) ? person.quotedLines?.[index] : undefined;
      const title = frozen?.name ?? product?.name ?? line.productId;
      return <li key={`${line.productId}-${index}`}>
        <div className={styles.lineTitle}><strong>{line.quantity} × {title}</strong>
          {editable && <div className={styles.quantity}>
            <button type="button" aria-label={`Diminuisci quantità ${title} di ${person.name}`} disabled={busy} onClick={() => onReplace(line.quantity === 1 ? person.lines.filter((_, i) => i !== index) : person.lines.map((item, i) => i === index ? { ...item, quantity: item.quantity - 1 } : item))}>−</button>
            <button type="button" aria-label={`Aumenta quantità ${title} di ${person.name}`} disabled={busy || line.quantity >= 100} onClick={() => onReplace(person.lines.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item))}>+</button>
          </div>}
        </div>
        {frozen?.composition ? <><MealCompositionDetails composition={frozen.composition} />{frozen.composition.choices.length > 0 && <p className={styles.small}>{frozen.composition.choices.map(choice => `${choice.quantity > 1 ? `${choice.quantity} × ` : ""}${choice.name}`).join(", ")}</p>}</>
          : <MenuLineDetails product={product} line={line} products={store?.products} avoid={avoid} showUnknown={Boolean(store?.menu)} />}
        {editable ? <LineNote title={title} personName={person.name} value={line.notes} disabled={busy}
          onSave={notes => onReplace(person.lines.map((item, i) => i === index ? { ...item, notes } : item))} /> : line.notes && <p>{line.notes}</p>}
        {editable && <div className={styles.row}>
          {store && product && <MenuLineEditor store={store} product={product} line={line} disabled={busy} avoid={avoid}
            onSave={updated => onReplace(person.lines.map((item, i) => i === index ? updated : item))} />}
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => onReplace(person.lines.filter((_, i) => i !== index))}>Rimuovi articolo di {person.name}</button>
        </div>}
      </li>;
    })}</ul>
    {editable && <a className={styles.addLink} href={`/ordina?partecipante=${encodeURIComponent(person.id)}#il-menu`}>Aggiungi prodotto</a>}
    {onRemove && <button type="button" className={styles.textButton} disabled={busy} onClick={onRemove}>Rimuovi partecipante {person.name}</button>}
  </section>;
}

export function PersistentGroupScreen({ api, individualApi, promotionsApi, preferencesApi, groupId, inviteToken, pollMs = 2000, view = "share", initialGroup, onUseIndividual }: {
  storefront?: boolean; view?: SharedCartView; initialGroup?: GroupSnapshot;
  api: GroupOrderingApi; individualApi: IndividualApi; promotionsApi?: PromotionsApi; preferencesApi?: FoodPreferencesApi; groupId?: string; inviteToken?: string; pollMs?: number;
  onUseIndividual?: (group: GroupSnapshot) => Promise<void>;
}) {
  const [group, setGroup] = useState<GroupSnapshot | null>(initialGroup ?? null);
  const [session, setSession] = useState<IndividualSession | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [store, setStore] = useState<IndividualStore | null>(null);
  const [fulfillment, setFulfillment] = useState<GroupFulfillment>(initialGroup?.fulfillment ?? initialFulfillment);
  const [quote, setQuote] = useState<GroupQuote | null>(null);
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const [localPending, setLocalPending] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [result, setResult] = useState<IndividualCheckoutResult | null>(null);
  const [showSharePayment, setShowSharePayment] = useState(false);
  const [changedSharePayment, setChangedSharePayment] = useState<GroupPaymentResult | null>(null);
  const preferences = useMenuPreferences(preferencesApi, session?.actor?.id);
  const groupRef = useRef<GroupSnapshot | null>(initialGroup ?? null);
  const storeRef = useRef<IndividualStore | null>(null);
  const busyRef = useRef(false);
  const quoteRequest = useRef(0);
  const initialDetails = useRef(Boolean(initialGroup));
  const fulfillmentRef = useRef(fulfillment);
  const confirmPayment = useRef<ConfirmIndividualPayment | null>(null);
  const shareAttempt = useRef<string | null>(null);
  const identityGeneration = useRef(0);
  const identityMounted = useRef(false);
  const loadIdentity = useCallback(async () => {
    const request = ++identityGeneration.current;
    setSessionLoading(true); setSessionError("");
    try {
      const identity = await individualApi.session();
      if (identityMounted.current && request === identityGeneration.current) setSession(identity);
    } catch (failure) {
      if (identityMounted.current && request === identityGeneration.current) setSessionError(errorText(failure));
    } finally { if (identityMounted.current && request === identityGeneration.current) setSessionLoading(false); }
  }, [individualApi]);
  const onCardReady = useCallback((confirm: ConfirmIndividualPayment | null) => { confirmPayment.current = confirm; setCardReady(Boolean(confirm)); }, []);
  const invalidateQuote = useCallback(() => { quoteRequest.current++; setQuote(null); }, []);
  const applyGroup = useCallback((next: GroupSnapshot) => {
    const previous = groupRef.current;
    if (previous?.id === next.id && previous.revision > next.revision) return;
    if (!previous || previous.revision !== next.revision || previous.status !== next.status) invalidateQuote();
    groupRef.current = next; setGroup(next); setLocalPending(Boolean(next.checkoutPending));
    if (!initialDetails.current) {
      initialDetails.current = true;
      const details = next.fulfillment ?? initialFulfillment;
      fulfillmentRef.current = details; setFulfillment(details);
    }
  }, [invalidateQuote]);
  const activeId = groupId ?? initialGroup?.id;
  const refresh = useCallback(async () => {
    if (!activeId) return;
    const next = await api.read(activeId, inviteToken);
    applyGroup(next);
    const catalog = await individualApi.catalog(next.storeId);
    if (groupRef.current?.id !== next.id) return;
    if (storeRef.current && terms(storeRef.current) !== terms(catalog)) invalidateQuote();
    storeRef.current = catalog; setStore(catalog);
  }, [activeId, api, individualApi, inviteToken, applyGroup, invalidateQuote]);

  useEffect(() => {
    identityMounted.current = true;
    setTargetId(new URLSearchParams(window.location.search).get("partecipante"));
    void loadIdentity();
    return () => { identityMounted.current = false; };
  }, [loadIdentity]);
  useEffect(() => {
    if (!activeId) return;
    let alive = true;
    let inFlight = false;
    const poll = async () => {
      if (!alive || inFlight || busyRef.current) return;
      inFlight = true;
      try { await refresh(); if (alive) setConnection(""); }
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
    catch (failure) { setError(errorText(failure)); invalidateQuote(); if (activeId) await refresh().catch(() => {}); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function replace(participantId: string, lines: IndividualLine[]) {
    const current = groupRef.current;
    if (!current) return;
    applyGroup(await api.replaceLines(current.id, { participantId, revision: current.revision, lines }));
  }
  function changeFulfillment(next: GroupFulfillment) {
    fulfillmentRef.current = next; setFulfillment(next); invalidateQuote();
  }
  async function verify() {
    const current = groupRef.current;
    if (!current) return;
    const request = ++quoteRequest.current;
    const expected = JSON.stringify(fulfillmentRef.current);
    const next = await api.quote(current.id, { revision: current.revision, fulfillment: fulfillmentRef.current });
    if (request === quoteRequest.current && next.revision === groupRef.current?.revision && expected === JSON.stringify(fulfillmentRef.current)) setQuote(next);
  }
  async function acceptResult(next: IndividualCheckoutResult) {
    setResult(next);
    if (next.clientSecret && confirmPayment.current) {
      await confirmPayment.current(next.clientSecret);
      setResult(await individualApi.reconcile(next.order.id));
    }
    await refresh();
  }
  async function submit() {
    const current = groupRef.current;
    if (!current || !quote) return;
    const input: GroupCheckout = { revision: quote.revision, fingerprint: quote.quote.fingerprint, fulfillment: fulfillmentRef.current,
      phone, method, idempotencyKey: crypto.randomUUID() };
    setLocalPending(true);
    await acceptResult(await api.checkout(current.id, input));
  }
  async function recover() {
    if (!groupRef.current) return;
    setLocalPending(true);
    await acceptResult(await api.recover(groupRef.current.id));
  }
  async function payShare() {
    const current = groupRef.current;
    if (!current) return;
    shareAttempt.current ??= crypto.randomUUID();
    const next = await api.payShare(current.id, { revision: current.revision, idempotencyKey: shareAttempt.current });
    // Keep the current Elements mounted until its confirmation, including 3DS, completes.
    if (next.payment.amountCents !== amount) { applyGroup(next.group); setChangedSharePayment(next); return; }
    if (next.clientSecret && confirmPayment.current) await confirmPayment.current(next.clientSecret);
    const reconciled = await api.reconcileShare(current.id, next.payment.id);
    applyGroup(reconciled.group);
    if (["paid", "failed"].includes(reconciled.payment.status)) shareAttempt.current = null;
  }
  async function confirmChangedShare() {
    if (!changedSharePayment || !groupRef.current) return;
    if (changedSharePayment.clientSecret && confirmPayment.current) await confirmPayment.current(changedSharePayment.clientSecret);
    const next = await api.reconcileShare(groupRef.current.id, changedSharePayment.payment.id);
    applyGroup(next.group); setChangedSharePayment(null);
    if (["paid", "failed"].includes(next.payment.status)) shareAttempt.current = null;
  }
  async function reconcileShare(payment: GroupSharePayment) {
    if (!groupRef.current) return;
    const next = await api.reconcileShare(groupRef.current.id, payment.id);
    applyGroup(next.group);
    if (next.clientSecret && confirmPayment.current) { await confirmPayment.current(next.clientSecret); applyGroup((await api.reconcileShare(groupRef.current.id, payment.id)).group); }
  }
  async function shareInvitation(invitation: string) {
    setInviteCopied(false);
    if (navigator.share) {
      try { await navigator.share({ title: "Ordine di gruppo", url: invitation }); return; }
      catch (failure) { if (failure instanceof Error && failure.name === "AbortError") return; }
    }
    if (!navigator.clipboard) throw new Error("Seleziona il link e copialo per condividerlo.");
    try { await navigator.clipboard.writeText(invitation); setInviteCopied(true); }
    catch { throw new Error("Non è stato possibile copiare il link. Selezionalo e copialo per condividerlo."); }
  }

  const host = group?.role === "host";
  const pending = localPending || Boolean(group?.checkoutPending);
  const own = group?.participants.find(person => person.id === group.participantId);
  const ownPayment = own?.payment ?? group?.payments?.find(payment => payment.participantId === own?.id && payment.status !== "refunded" && payment.status !== "failed");
  const ownLocked = lockedPayment(ownPayment);
  const open = group?.status === "open";
  const editable = (person: GroupParticipant) => Boolean((open || host && group?.status === "closed") && !pending && !lockedPayment(person.payment) && (host || person.id === own?.id));
  const target = host && targetId ? group?.participants.find(person => person.id === targetId) ?? own : own;
  const invitationToken = group?.inviteToken ?? inviteToken;
  const invitation = group && invitationToken ? `${typeof window === "undefined" ? "" : window.location.origin}/ordina/gruppo/${encodeURIComponent(group.id)}#invito=${encodeURIComponent(invitationToken)}` : "";
  const validQuote = quote && quote.revision === group?.revision && !pending;
  const remaining = quote?.remainingCents ?? quote?.quote.totalCents ?? 0;
  const canConfirm = host && session?.actor && validQuote && phone.trim() && (method === "cash" || remaining === 0 || remaining >= 50 && cardReady);
  const amount = ownPayment && ownLocked ? ownPayment.amountCents : estimate(own?.lines ?? [], store);
  const signIn = `/accesso?ritorno=${encodeURIComponent(view === "checkout" ? "/ordina/checkout" : "/ordina/carrello")}`;

  return <main className={`${styles.page} ${view === "share" ? styles.sharePage : ""}`}>
    <header className={styles.header}><span className={styles.eyebrow}>PizzaOS · Insieme a tavola</span>
      <h1>{view === "share" ? "Ordine di gruppo" : view === "menu" ? "Il menu" : view === "checkout" ? "Consegna e pagamento" : "Carrello condiviso"}</h1>
      {view === "share" && <p className={styles.lead}>Pensa solo a cosa vuoi mangiare, mentre i tuoi amici scelgono.</p>}
    </header>
    {error && <div role="alert" className={styles.error}>{error}</div>}
    {sessionError && <div role="alert" className={styles.error}><p>{sessionError}</p><button type="button" disabled={busy || sessionLoading} onClick={() => void run(async () => { await Promise.all([loadIdentity(), refresh()]); })}>Riprova accesso</button></div>}
    {!session && sessionLoading && <p role="status" className={styles.small}>Verifica dell’accesso…</p>}
    {connection && <p role="status" className={styles.small}>{connection}</p>}
    {!group && <p role="status">Caricamento del gruppo…</p>}
    {group && <>
      {view === "share" && <>
        {invitation && <section className={styles.invitation} aria-label="Invita al gruppo">
          <div className={styles.qrFrame}><QRCodeSVG value={invitation} size={256} level="M" marginSize={4} fgColor="#0A384F" bgColor="#FFFFFF" role="img" aria-label="QR code per entrare nel gruppo" /></div>
          <div className={styles.inviteRow}><label className={styles.linkField}><span className={styles.srOnly}>Link invito</span><input readOnly value={invitation} onFocus={event => event.currentTarget.select()} /></label>
            <button type="button" className={styles.shareButton} aria-label="Condividi link" disabled={busy} onClick={() => void run(() => shareInvitation(invitation))}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4m-6.8 7 6.8 4" /></svg>
            </button></div>
          {inviteCopied && <p role="status" className={styles.copyStatus}>Link copiato</p>}
        </section>}
        {group.participants.length > 0 && <section className={styles.people} aria-label="Partecipanti">{group.participants.map(person => <details className={styles.person} key={person.id}>
          <summary><span className={styles.avatar} aria-hidden="true">{person.name.slice(0, 1).toLocaleUpperCase("it")}</span><span className={styles.personName}>{person.name}<small>{person.payment ? paymentLabels[person.payment.status] : person.lines.length ? productCount(person.lines) : "Sta scegliendo"}</small></span><span className={styles.chevron} aria-hidden="true">⌄</span></summary>
          <ParticipantChoices person={person} store={store} editable={false} busy={busy} avoid={preferences.avoid} onReplace={() => {}} />
        </details>)}</section>}
      </>}
      {view !== "share" && <nav className={styles.context} aria-label="Carrello condiviso"><a href={`/ordina/gruppo/${encodeURIComponent(group.id)}`}>Ordine di gruppo</a><span>{own?.name}</span>
        <button type="button" className={styles.textButton} disabled={busy} onClick={() => void run(async () => { if (onUseIndividual) await onUseIndividual(group); else await api.activate(group.storeId, null); window.location.assign("/ordina"); })}>Carrello individuale</button></nav>}
      {group.role === "visitor" && <p>Apri il link invito per entrare nel carrello condiviso.</p>}
      {group.payments?.some(payment => payment.own && payment.participantId !== own?.id) && <section className={styles.stack} aria-label="I tuoi pagamenti">
        {group.payments.filter(payment => payment.own && payment.participantId !== own?.id).map(payment => <article key={payment.id}><p>{money(payment.amountCents)} · <span role="status">{paymentLabels[payment.status]}</span></p>
          {payment.canRefund && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void run(async () => applyGroup(await api.refundShare(group.id, { paymentId: payment.id, idempotencyKey: crypto.randomUUID() })))}>Rimborsa la mia quota</button>}
        </article>)}
      </section>}
      {view === "menu" && <>
        {target && target.id !== own?.id && <p>Stai scegliendo per <strong>{target.name}</strong>.</p>}
        {store && target && <OperationalMenu key={store.id} store={store} preferences={preferences} disabled={busy || !editable(target)} onAdd={line => void run(() => replace(target.id, appendMenuLine(target.lines, line)))} />}
        {ownLocked && <p className={styles.notice}>Le tue scelte sono bloccate dal pagamento.</p>}
        <a className={styles.primaryLink} href="/ordina/carrello">Carrello →</a>
      </>}
      {view === "cart" && <>
        {own && <section className={styles.personal} aria-label="Le mie scelte"><div className={styles.sectionHeading}><h2>Le mie scelte</h2><button type="button" className={styles.textButton} disabled={busy} onClick={() => { setName(own.name); setEditingName(current => !current); }}>Modifica nome</button></div>
          {editingName && <form className={styles.nameForm} onSubmit={event => { event.preventDefault(); void run(async () => { applyGroup(await api.rename(group.id, { name, revision: groupRef.current?.revision ?? group.revision })); setEditingName(false); }); }}><label>Nome<input maxLength={120} required value={name} onChange={event => setName(event.target.value)} /></label><button type="submit" disabled={busy || !name.trim()}>Salva nome</button></form>}
          <ParticipantChoices person={own} store={store} editable={editable(own)} busy={busy} avoid={preferences.avoid} onReplace={lines => void run(() => replace(own.id, lines))} />
          {amount !== null && <p className={styles.total}>La tua quota <strong>{money(amount)}</strong></p>}
          {ownPayment && <p role="status">{paymentLabels[ownPayment.status]}</p>}
          {changedSharePayment && <div className={styles.notice} role="status"><p>Il prezzo aggiornato della tua quota è <strong>{money(changedSharePayment.payment.amountCents)}</strong>. Conferma questo importo per pagare.</p><IndividualStripeFields onReady={onCardReady} /><button type="button" disabled={busy || !cardReady} onClick={() => void run(confirmChangedShare)}>Conferma pagamento quota · {money(changedSharePayment.payment.amountCents)}</button></div>}
          {ownPayment?.canRefund && <button type="button" className={styles.secondary} disabled={busy} onClick={() => void run(async () => applyGroup(await api.refundShare(group.id, { paymentId: ownPayment.id, idempotencyKey: crypto.randomUUID() })))}>Rimborsa la mia quota</button>}
          {open && own.lines.length > 0 && !ownLocked && <>
            {amount !== null && amount < 50 ? <p className={styles.small}>La quota resta nel residuo dell’organizzatore: il pagamento anticipato con carta richiede almeno 0,50 €.</p>
              : session?.actor ? <><button type="button" className={styles.secondary} disabled={busy} onClick={() => setShowSharePayment(current => !current)}>Paga la mia quota</button>
                {showSharePayment && <div className={styles.stripe}><IndividualStripeFields onReady={onCardReady} /><button type="button" disabled={busy || !cardReady} onClick={() => void run(payShare)}>Conferma pagamento quota</button></div>}</>
                : session ? <a href={signIn}>Accedi per pagare la tua quota</a> : null}
          </>}
          {ownPayment && !changedSharePayment && ["requires_action", "processing"].includes(ownPayment.status) && session?.actor && <div className={styles.stripe}>
            <IndividualStripeFields onReady={onCardReady} /><button type="button" disabled={busy || ownPayment.status === "requires_action" && !cardReady} onClick={() => void run(() => reconcileShare(ownPayment))}>Recupera pagamento quota</button>
          </div>}
        </section>}
        <section className={styles.stack} aria-label="Le scelte del gruppo">{group.participants.filter(person => person.id !== own?.id).map(person => <details className={styles.person} key={person.id}>
          <summary><span className={styles.personName}>{person.name}<small>{person.payment ? paymentLabels[person.payment.status] : "Non pagato"}</small></span><span aria-hidden="true">⌄</span></summary>
          <ParticipantChoices person={person} store={store} editable={editable(person)} busy={busy} avoid={preferences.avoid} onReplace={lines => void run(() => replace(person.id, lines))}
            onRemove={host && editable(person) ? () => void run(async () => applyGroup(await api.removeParticipant(group.id, { participantId: person.id, revision: groupRef.current?.revision ?? group.revision }))) : undefined} />
        </details>)}</section>
        {host && !["submitted", "cancelled"].includes(group.status) && group.participants.some(person => person.lines.length) && <a className={styles.primaryLink} href="/ordina/checkout">Vai al checkout →</a>}
        {!host && <p className={styles.small}>L’organizzatore conferma un solo ordine e copre il residuo.</p>}
      </>}
      {view === "checkout" && host && !["submitted", "cancelled"].includes(group.status) && <>
        {!session ? null : !session.actor ? <a className={styles.primaryLink} href={signIn}>Accedi per confermare l’ordine</a> : <>
          {pending && <div className={styles.notice}><p>Un tentativo deve essere verificato prima di cambiare il gruppo.</p><button type="button" disabled={busy} onClick={() => void run(recover)}>Recupera tentativo gruppo</button></div>}
          {(open || group.status === "closed") && <fieldset disabled={busy || pending}><legend>Consegna e pagamento</legend>
            <label>Modalità<select aria-label="Modalità" value={fulfillment.mode} onChange={event => changeFulfillment({ ...fulfillment, mode: event.target.value === "delivery" ? "delivery" : "pickup", address: undefined })}><option value="pickup">Ritiro in pizzeria</option><option value="delivery">Consegna a domicilio</option></select></label>
            {fulfillment.mode === "delivery" && <DeliveryAddressField key={group.id} storeId={group.storeId} address={fulfillment.address} search={individualApi.searchDeliveryAddresses} disabled={busy || pending} onChange={address => changeFulfillment({ ...fulfillment, address })} />}
            <OrderSlotSelect store={store} value={fulfillment.slotId} onChange={slotId => changeFulfillment({ ...fulfillment, slotId })} />
            <label>Note per l&apos;ordine<textarea maxLength={1000} value={fulfillment.notes} onChange={event => changeFulfillment({ ...fulfillment, notes: event.target.value })} /></label>
            {promotionsApi && <PromotionSelectionPanel api={promotionsApi} storeId={group.storeId} selection={fulfillment.benefits} disabled={busy || pending} onChange={benefits => changeFulfillment({ ...fulfillment, benefits })} onTermsChange={invalidateQuote} />}
            <button type="button" disabled={!group.participants.some(person => person.lines.length) || fulfillment.mode === "delivery" && !hasDeliveryPoint(fulfillment.address)} onClick={() => void run(verify)}>Verifica totale gruppo</button>
            {validQuote && <section aria-label="Riepilogo da confermare"><h2>Riepilogo da confermare</h2>{quote.quote.lines.map((line, index) => <p key={`${line.productId}-${index}`}>{line.quantity} × {line.name} · {money(line.quantity * line.unitCents)}<br /><span className={styles.small}>{line.notes}</span><MealCompositionDetails composition={line.composition} /></p>)}
              <PromotionSummary quote={quote.quote} />
              <p>Consegna: {money(quote.quote.deliveryCents)}</p><p>Totale: <strong>{money(quote.quote.totalCents)}</strong></p>
              <p>Quote già pagate: <strong>{money(quote.prepaidCents ?? 0)}</strong></p><p className={styles.total}>Da pagare <strong>{money(remaining)}</strong></p>
              <p>Orario: {formatOrderWindow(quote.quote.slotStartsAt, quote.quote.slotEndsAt, quote.quote.slotTimeZone)}</p>
            </section>}
            <label>Telefono per l&apos;ordine<input type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></label>
            <label>Come paghi?<select aria-label="Come paghi?" value={method} onChange={event => setMethod(event.target.value === "card" ? "card" : "cash")}><option value="cash">Contanti al ritiro o alla consegna</option><option value="card" disabled={Boolean(validQuote && remaining > 0 && remaining < 50)}>Carta</option></select></label>
            {validQuote && remaining > 0 && remaining < 50 && <p className={styles.small}>Il residuo sotto 0,50 € si salda in contanti.</p>}
            {method === "card" && validQuote && remaining >= 50 && <div className={styles.stripe}><IndividualStripeFields onReady={onCardReady} /></div>}
            <button type="button" disabled={!canConfirm} onClick={() => void run(submit)}>Conferma ordine di gruppo</button>
          </fieldset>}
        </>}
      </>}
      {view === "checkout" && !host && <p>Solo l’organizzatore può confermare l’ordine e il residuo.</p>}
      {group.status === "submitted" && <section className={styles.notice}><p>{result?.order.payment === "requires_action" ? "Pagamento carta da completare nei tuoi ordini." : "Ordine di gruppo inviato."}</p>{host && <a href="/ordina/ordini">Apri i tuoi ordini</a>}</section>}
      {group.status === "cancelled" && <p role="status">Ordine di gruppo annullato. I rimborsi restano consultabili.</p>}
      {view === "share" && <a className={styles.backLink} href="/ordina#il-menu">Sfoglia il menu →</a>}
    </>}
  </main>;
}

export { PersistentGroupScreen as SharedCartScreen };
