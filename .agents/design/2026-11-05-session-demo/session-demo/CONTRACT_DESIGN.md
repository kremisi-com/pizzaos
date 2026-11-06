# Contratti pubblici

## Servizio

`createOrderingAuth` accetta l'opzione aggiuntiva facoltativa `demoPassword?: string`. Il risultato, consumato da `buildOrderingApp`, include `isDemoRequest(request): boolean`. `buildOrderingApp` accetta questo controllo opzionale e rifiuta ogni API operativa quando restituisce true, prima di chiamare il servizio: tutti i `/v1/pilot/*`, URL equivalenti codificati e futuri endpoint. Sono consentiti solo accesso, salute e webhook firmato Stripe. Anche `authenticate` rifiuta con errore 403/code `demo_session` una sessione demo valida.

Tutti gli endpoint sono protetti dall'autorizzazione proxy preesistente. `x-pizzaos-origin` identifica l'origine canonica configurata.

- `GET /api/pilot/auth/mode` → 200 `{ mode: "live" | "demo" }`.
- `GET /api/pilot/auth/demo` → 200 `{ enabled: boolean, active: boolean, csrfToken: string }` e cookie CSRF HttpOnly. Se disabilitata csrfToken può essere vuoto.
- `POST /api/pilot/auth/demo` form-urlencoded `{ email, password, csrfToken }`, con Origin corretto e cookie CSRF: successo 303 Location `/` + cookie sessione demo; credenziali errate/disabilitato 303 `/accesso?errore=demo`; CSRF/origine non validi 403.
- `POST /api/pilot/auth/demo/signout` form-urlencoded `{ csrfToken }`: con Origin/CSRF validi 303 `/accesso` e cancellazione cookie demo e sessione reale; altrimenti 403.

La password è definita da `PIZZAOS_DEMO_PASSWORD` nel solo servizio. Non ci sono credenziali predefinite. I cookie demo hanno nomi `pizzaos.demo-session` e `pizzaos.demo-csrf` (prefisso `__Host-` in HTTPS). Auth.js conserva i suoi percorsi attuali. Sessione demo e CSRF hanno scadenza otto ore; i token non sono trasferibili tra origini. Il servizio non deve accedere al database per il flusso demo.

## App

Ogni app espone alla propria composizione `getExperienceMode(cookieHeader: string): Promise<"live" | "demo">`, interrogando il contratto `/api/pilot/auth/mode` attraverso le credenziali server configurate. Solo risposta verificata `demo` attiva il POC; nessun cookie demo = `live`. Errore upstream = nessuna demo.

`SignInScreen({ returnTo: string })` e `SignOutButton()` mantengono le firme. Il login demo ritorna sempre alla home della propria app; login reale conserva returnTo. Gli URL POC esistenti sono preservati per la sessione demo.
