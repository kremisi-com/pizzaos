# Implementazione

Feature client e admin presentazionali ricevono IndividualApi, auth URL e subscribe eventi dalla rispettiva composizione. Adapter fetch same-origin /api/pilot/v1/* restituisce errore tipizzato italiano. Due proxy app equivalenti, nessuna importazione app-to-app. CSS Modules coerenti ai token brand; form accessibili e layout responsive.

Draft utility clock iniettabile; ordine recuperato tramite orders/reconcile dopo mount. Idempotency key e fingerprint di invio persistiti separatamente come metadati di recupero, mai client secret. Per Stripe componente espone confirm(clientSecret) tramite callback, usa CardElement/confirmCardPayment. Non usare stato demo né timer di avanzamento.

Checklist: guest draft, login, quote, conferma, carta/contanti, recupero, conflitti, operazioni, setup, aggiornamenti, errori/accessibilità, demo invariata, E2E.
