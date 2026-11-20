import { randomUUID } from "node:crypto";
import type { Diagnostics } from "./diagnostics";

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
  diagnostics?: Diagnostics;
}): ReconciliationWorker {
  const orders = createReconciliationWorker({ tick: options.reconcileOrders, intervalMs: options.intervalMs, onError: options.onOrderError, diagnostics: options.diagnostics, operation: "order_worker" });
  const emails = createReconciliationWorker({ tick: async () => { await options.dispatchEmails(); }, intervalMs: options.intervalMs, onError: options.onEmailError, diagnostics: options.diagnostics, operation: "email_worker" });
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
  diagnostics?: Diagnostics;
  operation?: string;
}): ReconciliationWorker {
  const intervalMs = options.intervalMs ?? 5000;
  if (!Number.isInteger(intervalMs) || intervalMs <= 0) throw new Error("Intervallo riconciliazione non valido.");
  let timer: ReturnType<typeof setInterval> | undefined;
  let active = false;
  let stopped = false;
  let pending: Promise<void> | undefined;
  let failed = false;
  const tick = (): Promise<void> => {
    if (stopped) return Promise.resolve();
    if (pending) return pending;
    const context = { operation: options.operation ?? "reconciliation_worker", jobId: randomUUID() };
    const execute = async () => {
      await options.tick();
      if (failed) options.diagnostics?.record("worker_recovered", context);
      failed = false;
    };
    pending = (options.diagnostics ? options.diagnostics.run(context, execute) : execute()).catch(error => {
      failed = true;
      options.diagnostics?.report(error, context);
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
