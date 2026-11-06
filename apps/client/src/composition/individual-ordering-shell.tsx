"use client";

import { useEffect, useMemo, useState } from "react";
import { IndividualOrderingScreen } from "../features/individual-ordering/components/individual-ordering-screen";
import { createIndividualApi } from "./api/individual-api";
import { createPromotionsApi } from "./api/promotions-api";

export function IndividualOrderingShell() {
  const api = useMemo(() => createIndividualApi(), []);
  const promotionsApi = useMemo(() => createPromotionsApi(), []);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [connection, setConnection] = useState("Connessione in corso");
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
          if (alive) { setConnection(stream?.readyState === 1 ? "Aggiornamenti in tempo reale" : "Aggiornamenti periodici attivi"); if (update.events.length) changed(); }
        } catch { if (alive) setConnection("Connessione interrotta. Riprovo automaticamente."); }
        finally { pollingInFlight = false; }
      };
      if (typeof EventSource !== "undefined") {
        stream = new EventSource("/api/pilot/v1/pilot/stream?cursor=0");
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
      polling = setInterval(() => void poll(), 5000);
      void poll();
    }).catch(() => { if (alive) setConnection("Servizio non raggiungibile"); });
    return () => { alive = false; stream?.close(); if (polling) clearInterval(polling); };
  }, [api]);
  return <IndividualOrderingScreen api={api} promotionsApi={promotionsApi} refreshVersion={refreshVersion} connection={connection} />;
}
