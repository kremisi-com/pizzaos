"use client";

import { useEffect, useMemo, useState } from "react";
import { IndividualOrderingScreen, type IndividualOrderingView } from "../features/individual-ordering/components/individual-ordering-screen";
import { createIndividualApi } from "./api/individual-api";
import { createFoodPreferencesApi } from "./api/food-preferences-api";
import { createPromotionsApi } from "./api/promotions-api";
import type { GroupContext } from "@pizzaos/domain";
import { createGroupOrderingApi } from "./api/group-ordering-api";
import { PersistentGroupScreen } from "../features/group-order/components/persistent-group-screen";
import { readSharedCartDraft, readSharedCartStoreId, rememberSharedCartStore, suspendSharedCart } from "./shared-cart-bootstrap";
import contextStyles from "./shared-cart-context.module.css";

export function IndividualOrderingShell({ storefront, view = "menu" }: { storefront?: boolean; view?: IndividualOrderingView }) {
  const api = useMemo(() => createIndividualApi(), []);
  const preferencesApi = useMemo(() => createFoodPreferencesApi(), []);
  const promotionsApi = useMemo(() => createPromotionsApi(), []);
  const groupsApi = useMemo(() => createGroupOrderingApi(), []);
  const [sharedContext, setSharedContext] = useState<GroupContext | null>(null);
  const [contextError, setContextError] = useState("");
  const [contextVersion, setContextVersion] = useState(0);
  const [hash, setHash] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [connection, setConnection] = useState("Connessione in corso");
  useEffect(() => {
    let alive = true;
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    setContextError("");
    void api.stores().then(async stores => {
      const draft = readSharedCartDraft();
      const hint = readSharedCartStoreId();
      const selected = draft && stores.some(store => store.id === draft.storeId) ? draft.storeId : stores.find(store => store.id === hint)?.id ?? stores[0]?.id;
      const context = selected ? await groupsApi.context(selected) : { activeId: null, groups: [] };
      if (alive) setSharedContext(context);
    }).catch(failure => { if (alive) setContextError(failure instanceof Error ? failure.message : "Non è stato possibile recuperare il carrello."); });
    return () => { alive = false; window.removeEventListener("hashchange", sync); window.removeEventListener("popstate", sync); };
  }, [api, groupsApi, contextVersion]);
  useEffect(() => {
    let alive = true;
    let cursor = 0;
    let stream: EventSource | null = null;
    let polling: ReturnType<typeof setInterval> | null = null;
    let pollingInFlight = false;
    const changed = () => { if (alive) setRefreshVersion(value => value + 1); };
    void api.session().then(session => {
      if (!alive || !session.actor) { if (alive) setConnection("Accedi per seguire gli ordini"); return; }
      const poll = async () => {
        if (pollingInFlight || !alive) return;
        pollingInFlight = true;
        try {
          const update = await api.events(cursor);
          cursor = Math.max(cursor, update.cursor);
          if (alive) { setConnection(stream?.readyState === 1 ? "" : "Aggiornamenti periodici attivi"); if (update.events.length) changed(); }
        } catch { if (alive) setConnection("Connessione interrotta. Riprovo automaticamente."); }
        finally { pollingInFlight = false; }
      };
      if (typeof EventSource !== "undefined") {
        stream = new EventSource("/api/pilot/v1/pilot/stream?cursor=0");
        stream.onopen = () => { if (alive) setConnection(""); };
        stream.onmessage = event => {
          try {
            const envelope = JSON.parse(event.data) as { cursor?: number; events?: unknown[] };
            if (typeof envelope.cursor === "number" && Number.isSafeInteger(envelope.cursor)) cursor = Math.max(cursor, envelope.cursor);
            if (Array.isArray(envelope.events) && envelope.events.length > 0) changed();
          } catch { /* Polling recovers malformed or interrupted stream messages. */ }
        };
        stream.onerror = () => { if (alive) setConnection("Recupero aggiornamenti in corso"); void poll(); };
      }
      polling = setInterval(() => void poll(), 5000);
      void poll();
    }).catch(() => { if (alive) setConnection("Servizio non raggiungibile"); });
    return () => { alive = false; stream?.close(); if (polling) clearInterval(polling); };
  }, [api]);
  const activeGroup = sharedContext?.groups.find(group => group.id === sharedContext.activeId && !["submitted", "cancelled"].includes(group.status));
  const history = view === "menu" && (hash === "#i-tuoi-ordini" || hash.startsWith("#ordine-"));
  if (contextError) return <div role="alert"><p>{contextError}</p><button type="button" onClick={() => setContextVersion(value => value + 1)}>Riprova</button></div>;
  if (!sharedContext) return <p role="status">Caricamento del carrello…</p>;
  if (activeGroup && !history && view !== "all") return <PersistentGroupScreen key={`${activeGroup.id}-${view}`} view={view} api={groupsApi} individualApi={api}
    promotionsApi={promotionsApi} preferencesApi={preferencesApi} groupId={activeGroup.id} initialGroup={activeGroup} storefront={storefront} onUseIndividual={group => suspendSharedCart(groupsApi, group)} />;
  const savedGroups = sharedContext.groups.filter(group => !["submitted", "cancelled"].includes(group.status));
  return <>
    {savedGroups.length > 0 && !history && <aside className={contextStyles.switcher} aria-label="Carrelli condivisi">
      {savedGroups.map(group => <button type="button" key={group.id} onClick={() => {
        void groupsApi.activate(group.storeId, group.id).then(context => { rememberSharedCartStore(group.storeId); setSharedContext(context); }).catch(failure => setContextError(failure instanceof Error ? failure.message : "Non è stato possibile aprire il carrello condiviso."));
      }}>Carrello condiviso · {group.participants.find(person => person.host)?.name}</button>)}
    </aside>}
    <IndividualOrderingScreen key={view} view={view} api={api} promotionsApi={promotionsApi} preferencesApi={preferencesApi} refreshVersion={refreshVersion} connection={connection} storefront={storefront} />
  </>;
}
