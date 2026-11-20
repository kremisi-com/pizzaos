import type { IncomingMessage, ServerResponse } from "node:http";
import { createOrderingRuntime } from "./runtime";
import { createRuntimeDiagnostics } from "./sentry-reporter";
import { randomUUID } from "node:crypto";

let runtime: ReturnType<typeof createOrderingRuntime> | undefined;
let diagnostics: ReturnType<typeof createRuntimeDiagnostics> | undefined;

/** HTTP functions never own periodic work. Preserve Fastify raw webhook and SSE handling. */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  diagnostics ??= createRuntimeDiagnostics();
  const reporting = await diagnostics;
  try {
    runtime ??= createOrderingRuntime(process.env, reporting).catch(error => { runtime = undefined; throw error; });
    const current = await runtime;
    if (response.destroyed || response.writableFinished) return;
    await new Promise<void>((resolve, reject) => {
      const complete = () => { response.off("finish", complete); response.off("close", complete); resolve(); };
      response.once("finish", complete); response.once("close", complete);
      try { current.app.server.emit("request", request, response); }
      catch (error) { response.off("finish", complete); response.off("close", complete); reject(error); }
    });
  } catch (error) {
    const requestId = randomUUID();
    reporting.report(error, { operation: "function_startup", requestId, code: "startup_failed" });
    if (response.destroyed || response.writableFinished) return;
    if (!response.headersSent) {
      response.writeHead(503, { "content-type": "application/json", "cache-control": "no-store", "x-request-id": requestId });
      response.end(JSON.stringify({ code: "service_unavailable", message: "Servizio temporaneamente non disponibile.", requestId }));
    } else response.end();
  } finally { await reporting.flush(); }
}
