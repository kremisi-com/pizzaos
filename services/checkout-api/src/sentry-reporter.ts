import type { DiagnosticEvent, DiagnosticReporter } from "./diagnostics";
import { createDiagnostics, sanitizeDiagnostic } from "./diagnostics";

/** Explicit capture only: automatic HTTP instrumentation could collect secrets before filtering. */
export async function createSentryReporter(env: Record<string, string | undefined> = process.env): Promise<DiagnosticReporter> {
  const inactive: DiagnosticReporter = { capture() {}, async flush() {} };
  if (!env.SENTRY_DSN?.trim()) return inactive;
  try {
    const sdk = await import("@sentry/node");
    const environment = env.PIZZAOS_ENVIRONMENT ?? "production";
    const release = env.PIZZAOS_RELEASE?.trim() || env.VERCEL_GIT_COMMIT_SHA?.trim() || "local";
    const envelope = (event: DiagnosticEvent) => {
      const safe = sanitizeDiagnostic(event);
      const normalized = safe as unknown as DiagnosticEvent;
      return {
        platform: "node",
        level: event.category === "dependency" ? "warning" as const : "error" as const,
        message: "Errore backend PizzaOS", environment: String(safe.environment ?? "production"), release: String(safe.release ?? "local"),
        fingerprint: [String(safe.operation), String(safe.code), String(safe.route ?? "background"), normalized.error?.type ?? "Error",
          normalized.error?.frames[0] ? `${normalized.error.frames[0].file}:${normalized.error.frames[0].line}` : "unknown"],
        exception: normalized.error ? { values: [{ type: normalized.error.type, value: "Errore backend",
          stacktrace: { frames: normalized.error.frames.map(frame => ({ filename: frame.file, lineno: frame.line, colno: frame.column,
            in_app: /\.tsx?$/.test(frame.file) })).reverse() } }] } : undefined,
        tags: { operation: String(safe.operation), code: String(safe.code), category: String(safe.category) },
        extra: safe,
      };
    };
    sdk.init({ dsn: env.SENTRY_DSN.trim(), environment, release, defaultIntegrations: false,
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
        graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false }, mcp: { inputs: false, outputs: false },
        databaseQueryData: false, queues: false, stackFrameVariables: false, frameContextLines: 0 },
      attachStacktrace: false, tracesSampleRate: 0, maxBreadcrumbs: 0, includeServerName: false,
      normalizeDepth: 10, normalizeMaxBreadth: 100,
      beforeSend(event) {
        // Rebuild, including scope-added data: no user, request, breadcrumbs or arbitrary extras survive.
        const safe = sanitizeDiagnostic(event.extra);
        if (typeof safe.operation !== "string" || typeof safe.code !== "string") return null;
        const diagnostic = { ...safe, environment, release } as unknown as DiagnosticEvent;
        return { type: event.type, event_id: event.event_id, timestamp: event.timestamp, ...envelope(diagnostic) };
      }
    });
    return {
      capture(event) { if (event.category === "expected") return; try { sdk.captureEvent(envelope(event)); } catch { /* Reporting cannot fail the order. */ } },
      async flush() { try { await sdk.flush(1500); } catch { /* Best effort. */ } }
    };
  } catch { return inactive; }
}

/** Compose once per host/function instance, including startup and shutdown diagnostics. */
export async function createRuntimeDiagnostics(env: Record<string, string | undefined> = process.env) {
  return createDiagnostics({ environment: env.PIZZAOS_ENVIRONMENT ?? "production",
    release: env.PIZZAOS_RELEASE?.trim() || env.VERCEL_GIT_COMMIT_SHA?.trim(), level: env.LOG_LEVEL,
    reporter: await createSentryReporter(env) });
}
