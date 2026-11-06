# Contratti pubblici

`apps/admin/src/composition/operational-host.ts`:

```ts
export type OperationalSurface = "admin" | "rider";
export interface OperationalHost {
  origin: string;
  surface: OperationalSurface;
  separateHosts: boolean;
}
export declare function resolveOperationalHost(request: {
  url: string; headers: Headers;
}): OperationalHost | null;
```

Legge le origini server dai due env nei requisiti. Usa Host della richiesta (o URL se assente), confrontato con gli host esatti delle origini configurate. Restituisce l'origine canonica configurata, area e presenza di host distinti. `x-forwarded-host`, `x-pizzaos-origin` e header identità forniti dal browser non scelgono l'area. Configurazioni con credenziali, query, fragment, path non radice, origini uguali, protocollo diverso da HTTPS (eccetto HTTP loopback in sviluppo/test), o host sconosciuti producono null. In development senza origini è ammesso soltanto l'URL loopback per la singola app locale. Esempio: URL interno `http://localhost:3002` e Host `rider.pizzaos.app` con le due origini HTTPS restituisce `{origin:'https://rider.pizzaos.app',surface:'rider',separateHosts:true}`.

`apps/admin/src/composition/operational-access.ts`:

```ts
export type OperationalAccess = "allowed" | "anonymous" | "denied" | "unavailable";
export declare function getOperationalAccess(surface: OperationalSurface,
  cookieHeader: string, origin: string): Promise<OperationalAccess>;
```

Richiede `/v1/pilot/session` per admin o `/v1/pilot/rider/session` per rider al servizio configurato, con segreto proxy e origine/cookie. Actor null → anonymous; admin con superadmin true o storeIds non vuoto → allowed; rider con storeIds non vuoto → allowed; identità senza permesso → denied; errori e risposte malformate → unavailable. L'origine deve essere una delle origini configurate. Nessuna cache o elevazione da cookie/header/parametri.

Contratti HTTP esistenti: `apps/admin/middleware.ts` seleziona l'area delle pagine; `apps/admin/app/api/pilot/[...path]/route.ts` mantiene gli export GET/POST/PUT/PATCH e formato errori `{code,message}` (403 su origine o host vietati, 503 configurazione mancante). L'host rider vieta API fuori da `auth/*` e `v1/pilot/rider/*` con 403 prima di fetch. Cookie e Location restano quelli del servizio Auth.js; il suo redirect callback è limitato all'origine della richiesta.

Componente login: `SignInScreen({returnTo, area?})`, con `area: 'admin'|'rider'` opzionale e default admin. Il componente non importa server config. Le route server derivano area e callback da host verificato, non da un URL utente.

Nell'area rider il login non richiede disponibilità demo, non mostra l'invito demo e non commuta a password demo per `poc@pizzaos.app`. Il proxy rider rifiuta tutti i percorsi `auth/demo` (incluso signout) con 403 prima del fetch. `SignOutButton({allowDemo?})`, default true, con false usa solo CSRF e signout Auth.js normali; composizione e pagine rider passano false.
