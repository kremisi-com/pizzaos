export interface ReconciliationWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/** Keep order deadlines independent of slow email transports and drain both on stop. */
export function createOperationalWorkers(options: {
  reconcileOrders(): Promise<void>;
  dispatchEmails(): Promise<unknown>;
  intervalMs?: number;
  onOrderError?(error: unknown): void;
  onEmailError?(error: unknown): void;
}): ReconciliationWorker {
  const orders = createReconciliationWorker({ tick: options.reconcileOrders, intervalMs: options.intervalMs, onError: options.onOrderError });
  const emails = createReconciliationWorker({ tick: async () => { await options.dispatchEmails(); }, intervalMs: options.intervalMs, onError: options.onEmailError });
  return {
    async start() { void emails.start(); await orders.start(); },
    async stop() { await Promise.all([orders.stop(), emails.stop()]); }
  };
}

/** Own periodic, non-overlapping reconciliation and drain the current tick on stop. */
export function createReconciliationWorker(options: {
  tick(): Promise<void>;
  intervalMs?: number;
  onError?(error: unknown): void;
}): ReconciliationWorker {
  const intervalMs = options.intervalMs ?? 5000;
  if (!Number.isInteger(intervalMs) || intervalMs <= 0) throw new Error("Intervallo riconciliazione non valido.");
  let timer: ReturnType<typeof setInterval> | undefined;
  let active = false;
  let stopped = false;
  let pending: Promise<void> | undefined;
  const tick = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => { await options.tick(); })().catch(error => {
      try { options.onError?.(error); } catch { /* Reporting must not stop reconciliation. */ }
    }).finally(() => { pending = undefined; });
    return pending;
  };
  return {
    async start() {
      if (stopped) return;
      if (active) { await pending; return; }
      active = true;
      timer = setInterval(() => { void tick(); }, intervalMs);
      await tick();
    },
    async stop() {
      stopped = true;
      if (timer !== undefined) clearInterval(timer);
      timer = undefined;
      await pending;
    }
  };
}
