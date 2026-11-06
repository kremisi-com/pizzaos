import type { IncomingMessage, ServerResponse } from "node:http";
import { createOrderingRuntime } from "./runtime";

let runtime: ReturnType<typeof createOrderingRuntime> | undefined;

/** HTTP functions never own periodic work. Preserve Fastify raw webhook and SSE handling. */
export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  runtime ??= createOrderingRuntime().catch(error => { runtime = undefined; throw error; });
  const current = await runtime;
  current.app.server.emit("request", request, response);
}
