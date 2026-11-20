import { createServer } from "node:http";
import { createOrderingRuntime } from "./runtime";
import { createOperationalWorkers, type ReconciliationWorker } from "./reconciliation-worker";
import { createRuntimeDiagnostics } from "./sentry-reporter";

/** Persistent hosts own timers, process failures, liveness and bounded shutdown. */
export async function startOrderingHost(http: boolean): Promise<void> {
  const diagnostics = await createRuntimeDiagnostics();
  let initialization: ReturnType<typeof createOrderingRuntime> | undefined;
  let listening: Promise<string> | undefined;
  let worker: ReconciliationWorker | undefined;
  let stopping = false;
  const health = http ? undefined : createServer((_request, response) => { response.writeHead(stopping ? 503 : 200); response.end(); });
  async function shutdown(error?: unknown, fatal = false) {
    if (fatal || error !== undefined) diagnostics.report(error, { operation: fatal ? "process_fatal" : "process_shutdown", code: fatal ? "process_fatal" : "shutdown_failed" });
    if (fatal) {
      process.exitCode = 1;
      void worker?.stop().catch(() => {});
      await diagnostics.flush();
      process.exit(1);
    }
    if (stopping) return;
    stopping = true;
    health?.close();
    const deadline = setTimeout(() => { process.exit(1); }, 45_000);
    deadline.unref();
    try {
      await worker?.stop();
      await listening?.catch(() => {});
      const runtime = await initialization?.catch(() => undefined);
      await runtime?.close();
    }
    catch (failure) { process.exitCode = 1; diagnostics.report(failure, { operation: "process_shutdown" }); }
    finally { await diagnostics.flush(); clearTimeout(deadline); }
  }
  process.once("uncaughtException", error => { void shutdown(error, true); });
  process.once("unhandledRejection", error => { void shutdown(error, true); });
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void shutdown(); });
  try {
    initialization = createOrderingRuntime(process.env, diagnostics);
    const runtime = await initialization;
    if (stopping) return;
    worker = createOperationalWorkers({ reconcileOrders: runtime.reconcileOrders, dispatchEmails: runtime.dispatchEmails, diagnostics });
    health?.once("error", error => { void shutdown(error, true); });
    health?.listen(3005, "0.0.0.0");
    await worker.start();
    if (stopping) return;
    if (http) {
      listening = runtime.app.listen({ port: Number(process.env.PORT ?? 3004), host: process.env.HOST ?? "127.0.0.1" });
      await listening;
    }
    if (!stopping) diagnostics.record("process_started", { operation: http ? "api_host" : "worker_host" });
  } catch (error) {
    diagnostics.report(error, { operation: "process_startup", code: "startup_failed" });
    process.exitCode = 1;
    await shutdown();
  }
}
