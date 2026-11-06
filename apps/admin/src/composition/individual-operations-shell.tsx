"use client";

import type { IndividualAction, IndividualOrder, IndividualSession, IndividualStore } from "@pizzaos/domain";
import { Button } from "@pizzaos/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SignOutButton } from "../features/identity/components/sign-in-screen";
import { StoreConfiguration, type StoreConfigurationSection } from "../features/individual-ordering";
import { OperationalOrders } from "../features/orders";
import { StoreSwitcher } from "../features/store-switch/components/store-switcher";
import { AdminFrame, type AdminTab } from "./admin-frame";
import { createIndividualApi } from "./api/individual-api";
import { OperationalDashboard } from "./operational-dashboard";
import { PilotOperationalPanels } from "./pilot-operational-panels";
import styles from "./admin-shell.module.css";

const titles: Record<AdminTab, string> = {
  dashboard: "Dashboard", orders: "Ordini", catalog: "Menu", inventory: "Magazzino",
  marketing: "Marketing", analytics: "Analytics & AI", delivery: "Consegne",
  integrations: "Integrazioni", profile: "Profilo"
};
const emptyStore: IndividualStore = {
  id: "", name: "", latitude: 0, longitude: 0, acceptingOrders: false,
  products: [], ingredients: [], slots: [], deliveryBands: []
};

function errorText(failure: unknown) {
  return failure instanceof Error ? failure.message : "Operazione non riuscita. Riprova.";
}

function isSettings(tab: AdminTab): tab is StoreConfigurationSection {
  return tab === "catalog" || tab === "inventory" || tab === "profile";
}

function mergeStoreChanges(current: IndividualStore, original: IndividualStore, draft: IndividualStore): IndividualStore {
  const next = { ...current };
  function apply<K extends keyof IndividualStore>(key: K) {
    if (JSON.stringify(draft[key]) === JSON.stringify(original[key])) return;
    if (JSON.stringify(current[key]) !== JSON.stringify(original[key])) {
      throw new Error("La configurazione è cambiata. Ricarica la sede e ripeti la modifica.");
    }
    next[key] = draft[key];
  }
  (Object.keys(draft) as (keyof IndividualStore)[]).forEach(apply);
  return next;
}

export function IndividualOperationsShell({ riderHref }: { riderHref?: string }) {
  const api = useMemo(() => createIndividualApi(), []);
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [session, setSession] = useState<IndividualSession | null>(null);
  const [stores, setStores] = useState<IndividualStore[]>([]);
  const [storeId, setStoreId] = useState("");
  const [catalog, setCatalog] = useState<IndividualStore | null>(null);
  const [queue, setQueue] = useState<{ storeId: string; orders: IndividualOrder[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [configurationVersion, setConfigurationVersion] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [connection, setConnection] = useState("Connessione agli aggiornamenti in corso");
  const refresh = useCallback(() => setRefreshVersion(value => value + 1), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const current = await api.session();
      setSession(current);
      const available = current.actor
        ? (await api.stores()).filter(item => current.superadmin || current.storeIds.includes(item.id))
        : [];
      setStores(available);
      setStoreId(previous => available.some(item => item.id === previous) ? previous : available[0]?.id ?? "");
      setCatalog(null);
      setCatalogError("");
      refresh();
    } catch (failure) {
      setLoadError(errorText(failure));
    } finally {
      setLoading(false);
    }
  }, [api, refresh]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    void api.orders(storeId).then(orders => {
      if (!active) return;
      setQueue(previous => {
        const previousOrders = new Map(previous?.storeId === storeId ? previous.orders.map(order => [order.id, order]) : []);
        return { storeId, orders: orders.map(order => {
          const prior = previousOrders.get(order.id);
          return prior && prior.revision > order.revision ? prior : order;
        }) };
      });
      setOrderError("");
    }).catch(failure => { if (active) setOrderError(errorText(failure)); });
    return () => { active = false; };
  }, [api, storeId, refreshVersion]);

  useEffect(() => {
    if (!storeId) return;
    let active = true;
    void api.catalog(storeId).then(store => {
      if (active) { setCatalog(store); setCatalogError(""); }
    }).catch(failure => { if (active) setCatalogError(errorText(failure)); });
    return () => { active = false; };
  }, [api, storeId, refreshVersion, configurationVersion]);

  useEffect(() => {
    if (!storeId) return;
    setConnection("Connessione agli aggiornamenti in corso");
    let alive = true;
    let cursor = 0;
    let stream: EventSource | null = null;
    let pollingInFlight = false;
    const changed = () => { if (alive) setRefreshVersion(value => value + 1); };
    async function poll() {
      if (pollingInFlight || !alive) return;
      pollingInFlight = true;
      try {
        const update = await api.events(cursor, storeId); cursor = Math.max(cursor, update.cursor);
        if (alive) { setConnection(stream?.readyState === 1 ? "Aggiornamenti in tempo reale" : "Aggiornamenti periodici attivi"); if (update.events.length) changed(); }
      } catch { if (alive) setConnection("Connessione interrotta. Riprovo automaticamente."); }
      finally { pollingInFlight = false; }
    }
    if (typeof EventSource !== "undefined") {
      stream = new EventSource(`/api/pilot/v1/pilot/stream?cursor=0&storeId=${encodeURIComponent(storeId)}`);
      stream.onopen = () => { if (alive) setConnection("Aggiornamenti in tempo reale"); };
      stream.onmessage = event => {
        try {
          const envelope = JSON.parse(event.data) as { cursor?: number; events?: unknown[] };
          if (typeof envelope.cursor === "number" && Number.isSafeInteger(envelope.cursor)) cursor = Math.max(cursor, envelope.cursor);
          if (Array.isArray(envelope.events) && envelope.events.length > 0) changed();
        } catch { /* Polling recovers malformed or interrupted stream messages. */ }
      };
      stream.onerror = () => { if (alive) setConnection("Recupero aggiornamenti in corso"); void poll(); };
    }
    const polling = setInterval(() => void poll(), 5000); void poll();
    return () => { alive = false; stream?.close(); clearInterval(polling); };
  }, [api, storeId]);

  function navigate(next: AdminTab) {
    if (next === tab) return;
    setTab(next);
    setCreating(false);
    setError("");
    setNotice("");
  }

  function selectStore(id: string) {
    if (id === storeId) return;
    setStoreId(id);
    setCatalog(null);
    setQueue(null);
    setCreating(false);
    setInviteEmail("");
    setError("");
    setOrderError("");
    setCatalogError("");
    setNotice("");
  }

  async function action(orderId: string, input: IndividualAction) {
    setBusy(true);
    setError("");
    try {
      const updated = await api.action(orderId, input);
      setQueue(previous => previous?.storeId !== updated.storeId ? previous : {
        storeId: updated.storeId,
        orders: previous.orders.map(order => order.id === updated.id && order.revision <= updated.revision ? updated : order)
      });
      refresh();
    } catch (failure) {
      setError(errorText(failure));
      refresh();
    } finally {
      setBusy(false);
    }
  }

  async function save(draft: IndividualStore, original: IndividualStore) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = creating ? draft : mergeStoreChanges(await api.catalog(original.id), original, draft);
      const saved = await api.saveStore(next);
      if (storeId !== saved.id) selectStore(saved.id);
      setCreating(false);
      setCatalog(saved);
      setConfigurationVersion(value => value + 1);
      setStores(previous => previous.some(item => item.id === saved.id)
        ? previous.map(item => item.id === saved.id ? saved : item)
        : [...previous, saved]);
      setNotice("Configurazione salvata.");
      refresh();
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api.invite(storeId, inviteEmail);
      setInviteEmail("");
      setNotice("Operatore invitato. Potrà accedere con questa email.");
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  const store = catalog?.id === storeId ? catalog : null;
  const orders = useMemo(() => queue?.storeId === storeId
    ? [...queue.orders].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    : null, [queue, storeId]);
  const timeZone = store?.timeZone ?? stores.find(item => item.id === storeId)?.timeZone ?? "Europe/Rome";
  const failure = error || loadError || ((tab === "orders" || tab === "dashboard" || tab === "delivery") ? orderError : "") ||
    (isSettings(tab) || tab === "marketing" ? catalogError : "");

  return <AdminFrame activeTab={tab} onTabChange={navigate}
    storeSelector={<StoreSwitcher stores={stores.map(item => ({ id: item.id, displayName: item.name }))}
      activeStoreId={storeId} onStoreChange={selectStore} disabled={busy || loading} />}
    sidebarFooter={session?.actor && <>
      <strong>{session.actor.name || session.actor.email}</strong>
      <Button type="button" variant="secondary" onClick={() => void load()} disabled={busy || loading}>Ricarica sedi</Button>
      <div className={styles.operationalSignOut}><SignOutButton allowDemo={false} /></div>
    </>}>
    <header className={styles.operationalHeading}>
      <h1>{titles[tab]}</h1>
      {tab === "orders" && <p>Gestione ordini · {connection}</p>}
    </header>
    {failure && <p role="alert" className={styles.operationalError}>{failure}</p>}
    {loadError && <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Riprova caricamento</Button>}
    {notice && <p role="status" className={styles.operationalNotice}>{notice}</p>}
    {loading && <p role="status">Caricamento dell’area operativa…</p>}
    {!loading && !session?.actor && !loadError && <p><a href="/accesso">Accedi all’area ristorante</a></p>}
    {!loading && session?.actor && !storeId && !creating && <p>Nessuna sede assegnata.</p>}
    {storeId && tab === "dashboard" && (orders
      ? <OperationalDashboard key={storeId} storeId={storeId} orders={orders} connection={connection}
          refreshVersion={refreshVersion} timeZone={timeZone} onNavigate={navigate} />
      : <p role="status">Caricamento degli ordini…</p>)}
    {storeId && tab === "orders" && (orders
      ? <OperationalOrders key={storeId} orders={orders} timeZone={timeZone} busy={busy} onRefresh={refresh} onAction={action} />
      : <Button type="button" variant="secondary" onClick={refresh}>Aggiorna ordini</Button>)}
    {isSettings(tab) && session?.actor && <div className={styles.operationalSettings}>
      {tab === "profile" && session.superadmin && !creating &&
        <Button type="button" variant="secondary" disabled={busy} onClick={() => { setCreating(true); setError(""); setNotice(""); }}>Nuova sede</Button>}
      {creating || store ? <StoreConfiguration key={creating ? "new" : `${storeId}:${tab}:${configurationVersion}`}
        store={creating ? emptyStore : store ?? emptyStore} isNew={creating} section={tab} busy={busy} onSave={save} />
        : storeId && !catalogError && <p role="status">Caricamento configurazione…</p>}
      {tab === "profile" && creating && <Button type="button" variant="secondary" disabled={busy} onClick={() => setCreating(false)}>Annulla creazione</Button>}
      {tab === "profile" && session.superadmin && storeId && !creating &&
        <form className={styles.operationalInvite} onSubmit={event => { event.preventDefault(); void invite(); }}>
          <h2>Invita un operatore</h2>
          <label>Email operatore<input required type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} /></label>
          <Button type="submit" disabled={busy}>Invita operatore</Button>
        </form>}
    </div>}
    {storeId && (tab === "delivery" || tab === "analytics" || tab === "marketing" || tab === "integrations") &&
      <PilotOperationalPanels key={storeId} tab={tab} storeId={storeId} store={store} orders={orders}
        refreshVersion={refreshVersion} onChanged={refresh} riderHref={riderHref} />}
  </AdminFrame>;
}
