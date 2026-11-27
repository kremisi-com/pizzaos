"use client";

import type { IndividualApi } from "@pizzaos/domain";
import { useEffect, useState } from "react";

/** Events invalidate server reads; heartbeats never advance an order in the browser. */
export function useCustomerOrderUpdates(api: IndividualApi) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [connection, setConnection] = useState("");
  useEffect(() => {
    let alive = true;
    let cursor = 0;
    let stream: EventSource | null = null;
    let polling: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;
    const poll = async () => {
      if (!alive || inFlight) return;
      inFlight = true;
      try {
        const update = await api.events(cursor);
        cursor = Math.max(cursor, update.cursor);
        if (alive) {
          setConnection(stream?.readyState === 1 ? "" : "Aggiornamenti periodici attivi");
          if (update.events.length) setRefreshVersion(value => value + 1);
        }
      } catch { if (alive) { setConnection("Connessione interrotta. Riprovo automaticamente."); setRefreshVersion(value => value + 1); } }
      finally { inFlight = false; }
    };
    void api.session().then(session => {
      if (!alive || !session.actor) return;
      if (typeof EventSource !== "undefined") {
        stream = new EventSource("/api/pilot/v1/pilot/stream?cursor=0");
        stream.onopen = () => { if (alive) setConnection(""); };
        stream.onmessage = event => {
          try {
            const update = JSON.parse(event.data) as { cursor?: number; events?: unknown[] };
            if (typeof update.cursor === "number" && Number.isSafeInteger(update.cursor)) cursor = Math.max(cursor, update.cursor);
            if (alive && Array.isArray(update.events) && update.events.length) setRefreshVersion(value => value + 1);
          } catch { void poll(); }
        };
        stream.onerror = () => { if (alive) setConnection("Recupero aggiornamenti in corso"); void poll(); };
      }
      polling = setInterval(() => void poll(), 5000);
      void poll();
    }).catch(() => { if (alive) setConnection("Servizio non raggiungibile"); });
    return () => { alive = false; stream?.close(); if (polling) clearInterval(polling); };
  }, [api]);
  return { refreshVersion, connection };
}
