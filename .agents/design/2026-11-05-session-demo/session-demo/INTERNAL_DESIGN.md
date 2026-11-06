# Implementazione

- `checkout-api/src/demo-access.ts`: HMAC SHA-256 con chiave derivata da AUTH_SECRET e password demo; token JSON base64url con purpose, origin, exp e nonce. Cookie HttpOnly; controllo costante delle credenziali tramite digest. CSRF double-submit firmato e controllo Origin. Nessun accesso DB. Eliminazione cookie Auth.js session-token inclusi chunk.
- `auth-runtime.ts` delega percorsi demo/mode al nuovo runtime; non autentica sessioni demo. Blocca l'email riservata nel callback signIn reale. Cancella demo alla risposta Auth.js con nuova sessione reale.
- Hook `onRequest` del servizio rifiuta demo prima di validazione/esecuzione di tutti i percorsi operativi: deny-by-default fuori dall'autenticazione, salute e webhook Stripe firmato. Non si affida al prefisso URL raw, che può essere percent-encoded.
- Composizione per app: helper HTTP server verificato, root dinamica e layout con barra demo. Middleware limita i percorsi POC e impedisce il passaggio a percorsi live in demo. Redirect su origine canonica e `skipMiddlewareUrlNormalize` preservano l'host del cookie anche su loopback locale.
- Form email unico sceglie demo se l'indirizzo è quello riservato; CSRF demo ottenuto indipendentemente da Auth.js. Logout rileva sessione demo prima di scegliere endpoint.
- Checkout legacy rimuove Stripe e simula la carta con il ritardo locale già previsto; il pagamento reale usa l'entry point Stripe `pure`, che evita caricamenti anticipati dello script quando le route vengono pre-caricate. Nessuna modifica al comportamento di conferma reale.
- Suite demo su porte 3301/3302/3304, output browser in `.codex/test-results/session-demo`, build Next in `.next-session-demo`; nessuna interferenza con le altre suite locali. `PIZZAOS_BUILD_DIRECTORY` consente output Next distinti per processo.

Checklist: credenziali server opzionali; token non falsificabili/scaduti; nessun DB in demo; isolamento API generale; origini/CSRF; logout e cambio account; routing per sessione; navigazione; checkout totalmente simulato; documentazione e verifiche.
