import { createOrderingRuntime } from "./runtime";
import { createOperationalWorkers } from "./reconciliation-worker";

const runtime = await createOrderingRuntime();
const worker = createOperationalWorkers({ reconcileOrders: runtime.reconcileOrders, dispatchEmails: runtime.dispatchEmails,
  onOrderError: () => { process.stderr.write("Riconciliazione ordini da riprovare.\n"); },
  onEmailError: () => { process.stderr.write("Invio email da riprovare.\n"); } });
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => { void worker.stop().then(() => runtime.close()); });
try {
  await worker.start();
  await runtime.app.listen({ port: Number(process.env.PORT ?? 3004), host: process.env.HOST ?? "127.0.0.1" });
} catch (error) {
  await worker.stop();
  await runtime.close();
  throw error;
}
