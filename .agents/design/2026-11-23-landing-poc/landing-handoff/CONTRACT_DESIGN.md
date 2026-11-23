# Contratto pubblico

La landing riceve `POST /api/demo-request` con i campi esistenti e risponde con `success` e i campi di esito già supportati. Quando il provider mail risponde con successo per una richiesta demo e il pass è configurato, la risposta include `demoAccess` in questo formato:

```ts
type DemoAccess = {
  client: { action: string; pass: string };
  admin: { action: string; pass: string };
};
```

Gli URL di azione sono `<origine del destinatario>/api/pilot/auth/demo/handoff`. Gli URL di accesso manuale predefiniti sono `https://client.pizzaos.app/poc` e `https://admin.pizzaos.app/poc`. Il server emette i pass con chiave `PIZZAOS_DEMO_HANDOFF_SECRET` lunga almeno 32 caratteri. L'ambiente landing può configurare `LINK_CLIENT`, `LINK_ADMIN` e `KREMISI_MAIL_ENDPOINT`. Le risposte con esito positivo e pass sono `Cache-Control: no-store`. Le richieste di contatto e gli errori mantengono la forma precedente e non contengono un pass.

Il corpo (form-urlencoded) di `POST /api/pilot/auth/demo/handoff` contiene un campo `pass`. Il pass v1 ha due segmenti base64url separati da punto. Il primo contiene JSON `{ purpose: "landing-demo", origin: string, expires: number }` (Unix epoch in millisecondi). Il secondo è HMAC SHA-256 del primo segmento con il segreto di handoff. Il pass scade entro 10 minuti, può essere riutilizzato entro la scadenza e non contiene dati del lead. Il backend verifica anche l'origine browser configurata `PIZZAOS_DEMO_LANDING_ORIGIN` e che il normale accesso demo sia abilitato.

Il servizio espone ad applicazioni server la factory esistente `createDemoAccess` da `services/checkout-api/src/demo-access.ts`. L'opzione additiva è `handoff?: { secret: string; origin: string }`. La funzione risultante `handle(request: Request): Promise<Response | null>` elabora il percorso di handoff. Richiesta valida: 303 a `/poc` con un cookie demo valido, host-only e HttpOnly. Token scaduto, alterato, assente o destinato all'altro host da origine approvata: 303 a `/poc?errore=invito` senza cookie di sessione. Origine mancante o errata: 403. Metodo diverso da POST: 405. Una sessione demo è verificabile con `GET /api/pilot/auth/mode`.
