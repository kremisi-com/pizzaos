import { createServer } from "node:http";
import { createOrderingRuntime } from "./runtime";
import { createOperationalWorkers } from "./reconciliation-worker";

const runtime = await createOrderingRuntime();
const worker = createOperationalWorkers({ reconcileOrders: runtime.reconcileOrders, dispatchEmails: runtime.dispatchEmails,
  onOrderError: () => { process.stderr.write("Riconciliazione ordini da riprovare.\n"); },
  onEmailError: () => { process.stderr.write("Invio email da riprovare.\n"); } });
let stopping = false;
// Daemon liveness is private to the container, not an API ingress.
const health = createServer((_request, response) => { response.writeHead(stopping ? 503 : 200); response.end(); });
health.listen(3005, "0.0.0.0");
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => {
  stopping = true;
  health.close();
  void worker.stop().then(() => runtime.close()).catch(() => { process.exitCode = 1; });
});
await worker.start();
