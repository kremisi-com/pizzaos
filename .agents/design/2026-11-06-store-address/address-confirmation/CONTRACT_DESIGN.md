# Contratto

- `POST /v1/pilot/stores/:id/address-search`, body `{query: string}`. Restituisce `[{address: string, confirmation: string}]`, vuoto se nessun indirizzo è confermabile. Un operatore può cercare per una propria sede, un superadmin anche per un identificativo nuovo. Richiesta senza sessione 401, sessione senza permesso 403, servizio di ricerca non disponibile 503.
- `PUT /v1/pilot/stores/:id` mantiene il contratto esistente e accetta `addressConfirmation?: string` oltre ai dati della sede. Con un risultato confermato salva indirizzo e coordinate della ricerca. Le coordinate eventualmente inviate nel body non prevalgono. Conferme non valide danno 400. Una conferma relativa a una posizione cambiata nel frattempo dà 409. La posizione già confermata richiede una nuova conferma per cambiare.
- Il catalogo riservato espone `address?: string`. Le sedi preesistenti possono ometterlo. Le richieste di salvataggio già esistenti mantengono la compatibilità. Il catalogo pubblico mantiene il contratto precedente.
- Browser: «Indirizzo della sede», «Cerca indirizzo», un pulsante «Conferma <indirizzo>» per ogni risultato e «Salva configurazione» per una sede esistente.
- Per i test di integrazione, `createOrderingService` accetta l'opzione `storeGeocoding?: { search(query: string): Promise<{address: string; latitude: number; longitude: number}[]>; signingSecret: string }`.
