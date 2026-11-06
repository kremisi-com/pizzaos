# Primo flusso completo: ordine individuale e pagamento

Stato: implementazione e verifiche locali del perimetro individuale completate il 2026-11-05; evidenze e limiti in REVIEW.md. Fonte canonica: `../../product-definition/decisions.md` (D49-D55 e decisioni precedenti richiamate).

## Risultato osservabile

Il superadmin crea una sede e invita operatori. Un operatore configura menu, ingredienti, disponibilità, fasce e consegne dall'admin. Un cliente compone un carrello guest, accede con Google/magic link, riconferma il preventivo e invia un ordine individuale a prezzi ordinari pagando con carta o contanti. L'operatore riceve l'ordine, accetta o annulla; il cliente segue lo stesso stato persistito, anche dopo reload. Scadenze, pagamenti e rimborsi sopravvivono al riavvio del processo.

## Perimetro e dipendenze

Include controllo sede/identità, prezzi e ricette autorevoli, slot concorrenti, riserve, timeout 5/10/15 minuti, attesa alternativa senza limite, annullamento/riordino, note, evasione, riconciliazione carta e rimborsi, SSE con recupero polling. Include anche aggiunte del cliente prima dell’accettazione, con consenso sul delta e pagamento aggiuntivo; originale invariato finché il delta non è confermato. Annullamento e timeout riconciliano/rimborsano anche i delta.

Coupon, premi, abbonamenti e gruppo non incidono sul totale di questo incremento (D53). Definizioni analytics e tassonomia dettagliata dei ruoli non sono dipendenze. D16/D31 restano rinviate: nessuna pubblicazione o messa in esercizio con dati reali è parte di questa task; l'incremento è verificato in locale e con credenziali di test. Le integrazioni richiedono configurazioni esterne (PostgreSQL, Stripe test, OAuth Google, SMTP) e non si simulano in produzione quando assenti.

## Ownership e compatibilità

- `packages/domain`: contratto pubblico `IndividualApi`, tipi `Individual*`, esposti dall'entry point. Contratto durevole separato dalle capacità loyalty/gruppo ancora simulate del `ClientApiContract`; le feature ricevono il port dalla composizione, mai un repository concreto.
- `services/checkout-api`: dominio ordine, identità Auth.js, persistenza PostgreSQL, Stripe, autorizzazioni, configurazioni, aggiornamenti e worker scadenze. Il servizio esistente evolve mantenendo un confine HTTP versionato; vecchie route non autenticate che accettano importi dal client vengono rimosse esplicitamente.
- `apps/client`: composizione e schermata italiana `/ordina`, cartella feature `individual-ordering`. In modalità `PIZZAOS_MODE=live` diventa anche home. Demo esistente resta disponibile quando non attivata.
- `apps/admin`: composizione e schermata italiana `/operazioni`, con configurazione sede e gestione ordini. In modalità live diventa home.
- Ogni app possiede un proxy HTTP same-origin `/api/pilot/[...path]` verso il servizio, senza accesso al database. Auth.js vive nel servizio; nessun segreto è pubblico.

## Scelte tecniche e compromessi

PostgreSQL conserva un documento di stato del pilota con transazione serializzata tramite lock di riga; consente riserve atomiche anche tra processi. È una scelta per il basso volume del pilota: mantiene confini e permette futura normalizzazione senza cambiare il contratto. Lo stato Auth.js usa le tabelle del suo adapter PostgreSQL.

Operazioni Stripe usano chiavi idempotenti stabili per tentativo e identità cliente. Prima di un'operazione remota si conserva l'intento durevole; rete incerta rimane in verifica e non libera risorse finché il provider non conferma cancellazione/fallimento. Worker periodico e webhook firmati riconciliano; eventi duplicati/vecchi non fanno regredire stato definitivo. Nessun client secret o dato carta viene persistito.

Per indirizzi il cliente fornisce un indirizzo e un punto su mappa/coordinate confermate, il servizio calcola distanza geodetica dalla sede; nessun costo è accettato dal browser. Geocodifica automatica è un miglioramento separato. Slot e bande sono configurazioni dell'admin, non costanti nel codice. Durata tecnica iniziale riserva pagamento: configurabile nel servizio, default 10 minuti; alla scadenza prima si riconcilia/cancella il tentativo, poi si libera.

SSE trasporta eventi filtrati per cliente/sede, con cursore durevole e recupero polling. Nessun accoppiamento runtime fra app. Le scritture browser richiedono origine consentita e sessione valida; nessuna impersonificazione tramite header browser.

## Verifica

Test indipendenti derivati solo da requisiti e contratti, poi implementazione. Prove di concorrenza, retry, scadenze con clock controllato, isolamento tenant, importi manomessi, riserve e rimborsi. Test HTTP per autenticazione, validazione e webhook; E2E attraverso entrambe le app con servizio locale e boundary Auth/Stripe sostituiti solo nell'harness di test. Verificare lint, typecheck, test, build, architettura e flusso Playwright; registrare separatamente verifiche che necessitano servizi esterni non configurati.

Riferimenti tecnici verificati il 2026-11-05: https://authjs.dev/reference/core , https://authjs.dev/getting-started/adapters/pg , https://docs.stripe.com/payments/payment-intents , https://docs.stripe.com/webhooks , https://docs.stripe.com/refunds .
