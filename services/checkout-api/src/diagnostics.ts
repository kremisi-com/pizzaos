import { AsyncLocalStorage } from "node:async_hooks";
import pino, { type Logger } from "pino";

export type FailureCategory = "expected" | "dependency" | "unexpected" | "operational";
export interface DiagnosticContext {
  operation: string; code?: string; category?: FailureCategory;
  requestId?: string; route?: string; method?: string; statusCode?: number; durationMs?: number;
  orderId?: string; storeId?: string; additionId?: string; jobId?: string; emailId?: string;
  provider?: string; attempts?: number;
}
interface SafeError { type: string; code?: string; frames: { file: string; line: number; column: number }[]; cause?: SafeError; }
export interface DiagnosticEvent extends DiagnosticContext {
  code: string; category: FailureCategory; environment: string; release: string;
  error?: SafeError; suppressed?: number;
}
export interface DiagnosticReporter { capture(event: DiagnosticEvent): void; flush(): Promise<void>; }
interface DiagnosticSink { write(line: string): unknown; on?(event: "error", listener: (error: Error) => void): unknown; }
const watchedSinks = new WeakSet<DiagnosticSink>();
export interface Diagnostics {
  logger: Logger;
  run<T>(context: DiagnosticContext, work: () => T): T;
  report(error: unknown, context: DiagnosticContext): void;
  record(code: string, context: DiagnosticContext): void;
  flush(): Promise<void>;
}
const expectedCodes = new Set([
  "unauthorized", "forbidden", "not_found", "invalid_input", "product_unavailable", "inventory_changed",
  "slot_unavailable", "price_changed", "outside_delivery_area", "minimum_not_met", "idempotency_conflict",
  "payment_unresolved", "invalid_transition", "revision_conflict", "coupon_unavailable", "coupon_limit_reached",
  "loyalty_insufficient", "loyalty_unavailable", "demo_session", "group_closed", "checkout_pending", "group_full", "participant_removed",
]);
const temporaryCodes = new Set(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "EPIPE", "08000", "08001", "08003", "08006", "08004", "08007", "08P01", "57P01", "57P02", "57P03", "53000", "53300", "53400", "40001", "40P01"]);
const requestCodes = new Map([
  ["FST_ERR_CTP_BODY_TOO_LARGE", 413], ["FST_ERR_CTP_INVALID_MEDIA_TYPE", 415],
  ["FST_ERR_CTP_INVALID_JSON_BODY", 400], ["FST_ERR_CTP_EMPTY_JSON_BODY", 400],
  ["FST_ERR_VALIDATION", 400], ["FST_ERR_BAD_URL", 400],
]);
const diagnosticCodes = new Set([...temporaryCodes, ...requestCodes.keys(), ...expectedCodes, "service_unavailable", "internal_error",
  "23505", "23503", "42P01", "42703", "42501", "28P01", "3D000", "ECONNECTION", "EAUTH", "ESOCKET", "ETLS", "ENOENT", "EACCES"]);
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : {};
}
/** Map only recognized public failures; unknown exceptions never expose their message. */
export function classifyFailure(error: unknown): { statusCode: number; code: string; message: string; category: FailureCategory } {
  const failure = object(error); const code = typeof failure.code === "string" ? failure.code : "";
  const requestStatus = requestCodes.get(code);
  if (requestStatus || (failure.validation && failure.statusCode === 400)) {
    return { statusCode: requestStatus ?? 400, code: "invalid_input", message: "Controlla i dati inseriti.", category: "expected" };
  }
  if (expectedCodes.has(code) && typeof failure.statusCode === "number" && failure.statusCode >= 400 && failure.statusCode < 500) {
    return { statusCode: failure.statusCode, code, message: typeof failure.message === "string" ? failure.message : "Operazione non disponibile.", category: "expected" };
  }
  if (code === "service_unavailable" || temporaryCodes.has(code) || ["StripeConnectionError", "StripeAPIError", "StripeRateLimitError"].some(type => failure.type === type || failure.name === type)) {
    return { statusCode: 503, code: "service_unavailable", message: "Servizio temporaneamente non disponibile.", category: "dependency" };
  }
  return { statusCode: 500, code: "internal_error", message: "Si è verificato un errore. Riprova il recupero dell’operazione.", category: "unexpected" };
}
const errorTypes = new Set(["Error", "TypeError", "RangeError", "SyntaxError", "ReferenceError", "OrderingError", "GroupOrderingError", "DeliveryError", "PilotAnalyticsError", "StripeConnectionError", "StripeAPIError", "StripeRateLimitError", "StripeCardError", "StripeInvalidRequestError"]);
const categories = new Set<unknown>(["expected", "dependency", "unexpected", "operational"]);
function token(value: unknown, fallback = "unknown"): string {
  return typeof value === "string" && /^[a-zA-Z0-9_.-]{1,100}$/.test(value) ? value : fallback;
}
/** Keep locations, never exception messages, absolute paths, source text or function arguments. */
function safeError(value: unknown, depth = 0, seen = new Set<unknown>()): SafeError {
  const source = object(value);
  const type = [source.type, source.name].find(name => typeof name === "string" && errorTypes.has(name));
  const frames: SafeError["frames"] = [];
  if (typeof source.stack === "string") for (const line of source.stack.split("\n").slice(1, 25)) {
    const match = line.match(/(?:^\s+at\s+.*[(/\\]|^\s+at\s+)([a-zA-Z0-9_.-]+\.(?:[cm]?js|tsx?)):(\d+):(\d+)\)?\s*$/);
    if (match) frames.push({ file: match[1], line: Number(match[2]), column: Number(match[3]) });
  }
  // Refilter already normalized diagnostics passed to logger or Sentry.
  if (Array.isArray(source.frames)) for (const entry of source.frames.slice(0, 24)) {
    const frame = object(entry);
    if (typeof frame.file === "string" && /^[a-zA-Z0-9_.-]+\.(?:[cm]?js|tsx?)$/.test(frame.file) && Number.isSafeInteger(frame.line) && Number.isSafeInteger(frame.column)) {
      frames.push({ file: frame.file, line: Number(frame.line), column: Number(frame.column) });
    }
  }
  const result: SafeError = { type: typeof type === "string" ? type : "Error", frames };
  if (typeof source.code === "string" && diagnosticCodes.has(source.code)) result.code = source.code;
  seen.add(value);
  if (depth < 2 && source.cause !== undefined && !seen.has(source.cause)) result.cause = safeError(source.cause, depth + 1, seen);
  return result;
}
/** Explicit field allowlist, also used for child logger bindings and reporter envelopes. */
export function sanitizeDiagnostic(value: unknown): Record<string, unknown> {
  const source = object(value); const result: Record<string, unknown> = {};
  for (const key of ["operation", "code", "requestId", "orderId", "storeId", "additionId", "jobId", "emailId", "provider", "environment", "release"]) {
    if (source[key] !== undefined) result[key] = token(source[key]);
  }
  if (result.requestId === undefined && source.reqId !== undefined) result.requestId = token(source.reqId);
  if (categories.has(source.category)) result.category = source.category;
  if (typeof source.route === "string" && /^\/[a-zA-Z0-9_/:.*-]*$/.test(source.route) && source.route.length <= 250) result.route = source.route;
  if (["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(String(source.method))) result.method = source.method;
  for (const key of ["statusCode", "durationMs", "attempts", "suppressed"]) if (typeof source[key] === "number" && Number.isFinite(source[key]) && source[key] >= 0) result[key] = source[key];
  if (source.error !== undefined || source.err !== undefined || value instanceof Error) result.error = safeError(source.error ?? source.err ?? value);
  return result;
}

export function createDiagnostics(options: {
  environment?: string; release?: string; level?: string; stream?: DiagnosticSink;
  reporter?: DiagnosticReporter; now?: () => number; repetitionWindowMs?: number; maxKeys?: number;
} = {}): Diagnostics {
  const context = new AsyncLocalStorage<DiagnosticContext>();
  const environment = token(options.environment, "development"); const release = token(options.release, "local");
  const now = options.now ?? Date.now;
  const windowMs = Number.isFinite(options.repetitionWindowMs) && options.repetitionWindowMs! > 0 ? options.repetitionWindowMs! : 60_000;
  const maxKeys = Number.isSafeInteger(options.maxKeys) && options.maxKeys! > 0 ? options.maxKeys! : 1000;
  const repeats = new Map<string, { at: number; suppressed: number }>();
  const destination = options.stream ?? process.stdout;
  if (destination.on && !watchedSinks.has(destination)) {
    try { destination.on("error", () => {}); watchedSinks.add(destination); } catch { /* Optional sink. */ }
  }
  const logger = pino({
    level: ["trace", "debug", "info", "warn", "error", "fatal", "silent"].includes(options.level ?? "") ? options.level : "info",
    base: { environment, release },
    formatters: { bindings: sanitizeDiagnostic, log: sanitizeDiagnostic },
    hooks: { logMethod(args, method) {
      // No free-text messages or printf arguments are ever serialized.
      try { method.call(this, sanitizeDiagnostic(args[0]), "Evento backend"); } catch { /* A broken sink cannot affect work. */ }
    } },
  }, { write(line) {
    try {
      // Pino child bindings can bypass inherited formatters. Filter the final envelope as well.
      const parsed = object(JSON.parse(line));
      const level = typeof parsed.level === "number" && [10, 20, 30, 40, 50, 60].includes(parsed.level) ? parsed.level : 30;
      const time = typeof parsed.time === "number" && Number.isFinite(parsed.time) ? parsed.time : now();
      const delivery = destination.write(JSON.stringify({ level, time, ...sanitizeDiagnostic(parsed), msg: "Evento backend" }) + "\n");
      void Promise.resolve(delivery).catch(() => {});
    } catch { /* Isolate diagnostic sink failures. */ }
  } });
  function record(code: string, input: DiagnosticContext) {
    logger.info({ ...context.getStore(), ...input, code, environment, release });
  }
  function report(error: unknown, input: DiagnosticContext) {
    try {
      const failure = classifyFailure(error);
      const event = { ...sanitizeDiagnostic({ ...context.getStore(), ...input }),
        operation: token(input.operation), code: token(input.code, failure.code), category: categories.has(input.category) ? input.category! : failure.category,
        environment, release, error: safeError(error) } as DiagnosticEvent;
      const key = JSON.stringify([event.operation, event.code, event.category, event.orderId, event.additionId, event.emailId, event.requestId]);
      const previous = repeats.get(key); const instant = now();
      if (previous && instant - previous.at < windowMs) { previous.suppressed++; return; }
      if (previous) { event.suppressed = previous.suppressed; repeats.delete(key); }
      if (repeats.size >= maxKeys) repeats.delete(repeats.keys().next().value!);
      repeats.set(key, { at: instant, suppressed: 0 });
      if (event.category === "expected") logger.info(event);
      else if (event.category === "dependency") logger.warn(event);
      else logger.error(event);
      if (event.category !== "expected") {
        try { const delivery: unknown = options.reporter?.capture(structuredClone(event)); void Promise.resolve(delivery).catch(() => {}); }
        catch { /* Reporter is optional. */ }
      }
    } catch { /* Malformed diagnostic data never changes application behavior. */ }
  }
  return { logger, run: (input, work) => context.run({ ...context.getStore(), ...input }, work), record, report,
    async flush() {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([options.reporter?.flush(), new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); timer.unref?.(); })]); } catch { /* Best effort. */ }
      finally { if (timer) clearTimeout(timer); }
    }
  };
}
