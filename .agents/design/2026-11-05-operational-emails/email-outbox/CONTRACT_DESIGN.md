# Port pubblici

Stub firme senza corpi `public.stub.ts`. Contratto runtime dominio `packages/domain/src/operational-emails.ts`, esportato da `@pizzaos/domain`.

```ts
type OperationalEmailEvent='received'|'accepted'|'ready'|'out_for_delivery'|'cancelled'|'refund_succeeded'|'refund_failed';
type OperationalEmailStatus='pending'|'sending'|'retrying'|'blocked'|'sent';
type OperationalEmailErrorCode='smtp_unavailable'|'not_configured'|'recipient_not_allowed';
interface OperationalEmailDelivery {
 id:string;orderId:string;event:OperationalEmailEvent;recipient:string;status:OperationalEmailStatus;
 attempts:number;createdAt:string;updatedAt:string;sentAt:string|null;nextAttemptAt:string|null;
 lastError:{code:OperationalEmailErrorCode;message:string}|null;
}
interface OperationalEmailOverview { revision:number;messages:OperationalEmailDelivery[]; }
interface OperationalEmailApi { list(storeId:string):Promise<OperationalEmailOverview>; }
```

Server entry `services/checkout-api/src/operational-emails/index.ts` esporta:

```ts
interface OperationalEmailMessage {to:string;from:string;messageId:string;subject:string;text:string;}
interface OperationalEmailSender {send(message:OperationalEmailMessage):Promise<void>;close?():void|Promise<void>;}
interface OperationalEmailOptions {
 mode?:'test'|'live';environment?:'test'|'production';testRecipients?:string[];
 from?:string;sender?:OperationalEmailSender;
 leaseMs?:number;retryBaseMs?:number;maxRetryMs?:number;batchSize?:number;
}
interface OperationalEmailService {
 list(actor:IndividualActor|null,storeId:string):Promise<OperationalEmailOverview>;
 dispatch():Promise<{sent:number;failed:number;blocked:number}>;
}
declare function createOperationalEmailServices(options:OrderingServiceOptions & {email:OperationalEmailOptions}): {
 repository:OrderingRepository;service:OperationalOrderingService;analytics:PilotAnalyticsService;
 delivery:DeliveryService;promotions:PromotionsService;emails:OperationalEmailService;
};
declare function registerOperationalEmailRoutes(app:FastifyInstance,options:{emails:OperationalEmailService;authenticate:(request:FastifyRequest)=>Promise<IndividualActor|null>}):void;
declare function createSmtpOperationalEmailSender(options:{smtpUrl:string;from:string;localOnly?:boolean;sendTimeoutMs?:number}):OperationalEmailSender;
declare function readOperationalEmailConfiguration(env:Record<string,string|undefined>):OperationalEmailOptions;
```

Le factory operative/port dei precedenti incrementi restano pubbliche compatibili; i test usano solo l'entry sopra e i tipi/factory pubblici esistenti, non implementazioni. Sender e clock sono server-injected, mai scelti da richieste HTTP. `localOnly:true` rifiuta un SMTPURL non127.0.0.1/localhost/[::1] prima di aprire socket; usare127.0.0.1 per la prova senza DNS. Factory senza provider funzionante non finge sent. La policy destinatari viene applicata dalla dispatch anche ai sender iniettati. Mittente/to devono essere indirizzi singoli senza CRLF; from può essere nome display più indirizzo validi server. La conferma SMTP positiva risolve send, failure/unknown rigetta. Nessuna garanzia esattamente-una-volta esterna.

HTTP unico `GET /v1/pilot/stores/:id/emails` lista own-store; proxy app `/api/pilot` davanti al path servizio. Nessun body o query extra. Risposta no-store. Errori `{code,message}` 401 unauthorized,403 forbidden,404 not_found,400 invalid_input. Nessun endpoint browser modifica outbox/provider o esegue invio manuale.

Configurazione server: `OPERATIONAL_EMAIL_MODE` defaulttest; `OPERATIONAL_EMAIL_TEST_RECIPIENTS` comma-separated allowlist exact (defaultvuota); `OPERATIONAL_SMTP_URL` fallbackSMTP_URL; `OPERATIONAL_EMAIL_FROM` fallbackAUTH_EMAIL_FROM. Live richiede `PIZZAOS_ENVIRONMENT=production`, sender e from validi; test resta default anche in environment production. Errori configurazione riportano solo il nome campo, mai valori. Default backoff5000/900000ms, lease60000ms, batch10; valori positivi interi bounded. I blocchi policy/config rimangono recuperabili e possono essere rivalutati al prossimo tentativo dopo configurazione corretta/riavvio. La lista è snapshot completo ordinato per creazione/sequence, revisioni monotone per sede; nessun dettaglio di altre sedi.

Ricevuto è legato alla submission canonica, non alla creazione pending. Refund scope distingue base e singole aggiunte e nuovi tentativi reali; non confondere `refunded` sintetico senza addebito con rimborso effettivo. L'ordine per messaggi dello stesso ordine vale anche tra scopi rimborso diversi. Documento e Message-ID sono immutabili dopo enqueue.

To/subject/text/evento/Message-ID sono snapshot business; from e sender restano configurazione corrente della dispatch. Configurare mittente/SMTP dopo un enqueue bloccato permette il recupero senza rigenerare il messaggio. La allowlist viene rivalutata a ogni tentativo, anche dopo un precedente errore o lease scaduto.

SMTP `sendTimeoutMs` intero1..30000, default30000: limita l'intera operazione e chiude il trasporto/socket sul timeout, non solo la Promise. Nuovo port server in `services/checkout-api/src/reconciliation-worker.ts`: `createOperationalWorkers({reconcileOrders:()=>Promise<void>,dispatchEmails:()=>Promise<unknown>,intervalMs?:number,onOrderError?:(error:unknown)=>void,onEmailError?:(error:unknown)=>void}):ReconciliationWorker`. Il suo start non attende il sender sospeso; i tick ordini continuano mentre dispatch è in attesa; stop attende entrambi i lavori correnti. Gli entrypoint continuo e daemon usano questo runner; la riconciliazione webhook resta orders-only. I testi refund riportano esplicitamente importo positivo e ambito base/aggiunta del rimborso reale, oltre al riepilogo ordine congelato.

Orari nel testo in locale it-IT, usando la zona IANA già configurata sulla sede (fallback Europe/Rome) e indicando la zona; data evento/slot vengono formattati all'enqueue e non cambiano in seguito. Il cliente non deve scambiare un ISO UTC per l'ora locale.
