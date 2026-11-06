# Contratti pubblici del runtime

`services/checkout-api/src/runtime-config.ts`:

```ts
export interface RuntimeConfiguration {
  databaseUrl: string;
  authSecret: string;
  proxySecret: string;
  origins: string[];
  superadminEmails: string[];
  googleClientId: string;
  googleClientSecret: string;
  smtpUrl: string;
  emailFrom: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  environment: "test" | "production";
  reservationMs: number;
  demoPassword?: string;
}
export declare function readRuntimeConfiguration(env: Record<string, string | undefined>): RuntimeConfiguration;
```

Funzione pura; non legge process.env implicitamente, non apre connessioni e non stampa nulla. Campi validati secondo requisiti. URL database PostgreSQL e SMTP sono richiesti non vuoti; nessuna credenziale deve comparire negli errori. Esempio riserva assente → 600000 ms; PAYMENT_RESERVATION_MINUTES=2.5 → 150000 ms.

`services/checkout-api/src/reconciliation-worker.ts`:

```ts
export interface ReconciliationWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
}
export declare function createReconciliationWorker(options: {
  tick(): Promise<void>;
  intervalMs?: number;
  onError?(error: unknown): void;
}): ReconciliationWorker;
```

start attende il primo tick; tick fallito notifica onError senza respingere start. stop attende il lavoro pendente, incluso il tick iniziale. Nessuna chiusura di database o server è responsabilità di questo helper.

Gli endpoint Fastify pubblici rimangono quelli del README checkout-api. L'entry HTTP non avvia il worker; l'entry worker non espone porte pubbliche. Nessun parametro del browser seleziona ambiente, identità o runtime.
