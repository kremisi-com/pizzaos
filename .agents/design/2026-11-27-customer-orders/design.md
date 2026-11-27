# Pagina Ordini cliente

Richiesta approvata: pagina dedicata con UI/UX del POC e dati persistenti; esclusi GPS, feedback e centro notifiche.

La pagina `/ordina/ordini` usa il contratto `IndividualApi`, gli snapshot acquistati e gli stati autorevoli. Riprende intestazione, storico compatto con riordino e pannelli di avanzamento del POC. Gli ordini attivi restano separati dai terminali; nessuna stima temporale inventata. Conserva note, aggiunte, annullamento e recupero pagamenti già supportati. Il riordino scrive soltanto il draft corrente, richiede successivo preventivo e non invia ordini.

La composizione usa il medesimo contratto eventi SSE/polling del flusso esistente e fornisce salvataggio draft e UI aggiunte dai rispettivi entry pubblici. Il servizio e i contratti backend non cambiano. La demo conserva `/orders` e le proprie simulazioni. Navbar, conferme e gruppo puntano alla nuova pagina; le precedenti ancore operative raggiungono la stessa destinazione. Login necessario con stato esplicito per ospiti.

Verifica: test contrattuali indipendenti prima dell'implementazione, regressioni client, lint, TypeScript, build isolata, architettura e Playwright del flusso cliente. Verifiche locali distinte dal deploy.
