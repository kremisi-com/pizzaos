// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnostics";

const sdk = vi.hoisted(() => ({
  init: vi.fn((options: unknown) => { void options; }),
  captureEvent: vi.fn((event: unknown) => { void event; return "event-id"; }),
  captureException: vi.fn((error: unknown) => { void error; return "event-id"; }),
  flush: vi.fn(async (timeout?: number) => { void timeout; return true; }),
  close: vi.fn(async (timeout?: number) => { void timeout; return true; }),
}));
vi.mock("@sentry/node", () => sdk);

import { createSentryReporter } from "./sentry-reporter";

function event(overrides: Partial<DiagnosticEvent> = {}): DiagnosticEvent {
  return {
    operation: "payment", code: "service_unavailable", category: "dependency",
    environment: "acceptance", release: "release-1", requestId: "request-1",
    orderId: "order-1", storeId: "store-1", provider: "stripe",
    error: { type: "Error", frames: [{ file: "payment.ts", line: 12, column: 8 }] },
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("Sentry reporter acceptance without network", () => {
  it("does not initialize or communicate externally when no DSN is configured", async () => {
    const reporter = await createSentryReporter({});
    reporter.capture(event());
    await reporter.flush();
    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.captureEvent).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
    expect(sdk.flush).not.toHaveBeenCalled();
    expect(sdk.close).not.toHaveBeenCalled();
  });

  it("configures environment and release without automatic request or PII collection", async () => {
    await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1", PIZZAOS_ENVIRONMENT: "staging", PIZZAOS_RELEASE: "release-explicit", VERCEL_GIT_COMMIT_SHA: "fallback-sha" });
    expect(sdk.init).toHaveBeenCalledTimes(1);
    const options: unknown = sdk.init.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      environment: "staging", release: "release-explicit",
      dataCollection: {
        userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
        graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false },
        mcp: { inputs: false, outputs: false }, databaseQueryData: false, queues: false,
        stackFrameVariables: false, frameContextLines: 0,
      },
    });
    expect(options).toHaveProperty("defaultIntegrations");
    const integrations = (options as { defaultIntegrations: unknown }).defaultIntegrations;
    expect(integrations === false || (Array.isArray(integrations) && integrations.length === 0)).toBe(true);
  });

  it("uses the Vercel commit as release fallback", async () => {
    await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1", VERCEL_GIT_COMMIT_SHA: "fallback-sha" });
    expect(sdk.init).toHaveBeenCalledWith(expect.objectContaining({ release: "fallback-sha" }));
  });

  it("sends dependency, operational and unexpected events with stable fingerprints", async () => {
    const reporter = await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1" });
    reporter.capture(event());
    reporter.capture(event({ requestId: "request-2", orderId: "order-2" }));
    reporter.capture(event({ category: "operational", operation: "email_delivery_failed", code: "email_delivery_failed" }));
    reporter.capture(event({ category: "unexpected", code: "internal_error" }));
    expect(sdk.captureEvent).toHaveBeenCalledTimes(4);
    const calls: unknown[] = sdk.captureEvent.mock.calls.map((call) => call[0]);
    for (const call of calls) {
      expect(call).toHaveProperty("fingerprint", expect.any(Array));
      expect(JSON.stringify(call)).not.toContain("private-key");
    }
    expect(calls[0]).toHaveProperty("fingerprint", (calls[1] as { fingerprint: string[] }).fingerprint);
    expect(JSON.stringify(calls[0])).toContain("request-1");
    expect(JSON.stringify(calls[0])).toContain("payment.ts");
  });

  it("does not send expected user errors", async () => {
    const reporter = await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1" });
    reporter.capture(event({ category: "expected", code: "invalid_input" }));
    expect(sdk.captureEvent).not.toHaveBeenCalled();
    expect(sdk.captureException).not.toHaveBeenCalled();
  });

  it("keeps arbitrary fields outside the reporter event payload", async () => {
    const reporter = await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1" });
    const source = Object.assign(event(), {
      body: { email: "customer-private-secret" }, query: "token=query-private-secret",
      headers: { cookie: "cookie-private-secret", authorization: "Bearer token-private-secret" },
      message: "message-private-secret",
    });
    reporter.capture(source);
    expect(sdk.captureEvent).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(sdk.captureEvent.mock.calls)).not.toContain("private-secret");
    expect(source.body.email).toBe("customer-private-secret");
  });

  it("rebuilds the final SDK event after scope contamination without leaking data or arbitrary fingerprint types", async () => {
    const reporter = await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1" });
    reporter.capture(event());
    const captured = sdk.captureEvent.mock.calls[0]?.[0];
    const options = sdk.init.mock.calls[0]?.[0];
    if (typeof captured !== "object" || captured === null || typeof options !== "object" || options === null || !("beforeSend" in options) || typeof options.beforeSend !== "function") {
      throw new Error("Sentry must configure a final beforeSend privacy boundary");
    }
    const originalExtra = "extra" in captured && typeof captured.extra === "object" && captured.extra !== null ? captured.extra : {};
    const contaminated = {
      ...captured,
      message: "message-private-secret",
      user: { email: "customer-private-secret", ip_address: "ip-private-secret" },
      request: { url: "https://example.invalid/?token=query-private-secret", headers: { authorization: "Bearer auth-private-secret" }, data: { password: "body-private-secret" } },
      breadcrumbs: [{ message: "breadcrumb-private-secret" }],
      contexts: { runtime: { name: "runtime-private-secret" } },
      tags: { arbitrary: "tag-private-secret" },
      fingerprint: ["fingerprint-private-secret"],
      exception: { values: [{ type: "exception-type-private-secret", value: "exception-value-private-secret", stacktrace: { frames: [{ filename: "path-private-secret", vars: { token: "vars-private-secret" } }] } }] },
      extra: {
        ...originalExtra,
        header: "extra-header-private-secret",
        error: { type: "error-type-private-secret", frames: [
          { file: "payment.ts", line: 12, column: 8, function: "function-private-secret", vars: { password: "frame-vars-private-secret" }, context_line: "source-private-secret" },
          { file: "payment-view.tsx", line: 21, column: 4 },
          { file: "dependency.js", line: 30, column: 2 },
        ] },
      },
    };
    const source = structuredClone(contaminated);
    const sanitized: unknown = await options.beforeSend(contaminated, { originalException: new Error("hint-private-secret") });
    expect(sanitized).not.toBeNull();
    expect.soft(sanitized).toHaveProperty("platform", "node");
    expect(sanitized).toHaveProperty("fingerprint", expect.any(Array));
    expect(sanitized).toHaveProperty("exception.values.0.stacktrace.frames", expect.arrayContaining([
      expect.objectContaining({ filename: "payment.ts", in_app: true }),
      expect.objectContaining({ filename: "payment-view.tsx", in_app: true }),
      expect.objectContaining({ filename: "dependency.js", in_app: false }),
    ]));
    expect(JSON.stringify(sanitized)).not.toContain("private-secret");
    expect(JSON.stringify(sanitized)).toContain("order-1");
    expect(JSON.stringify(sanitized)).toContain("payment.ts");
    expect(contaminated).toEqual(source);
  });

  it("attempts bounded flush and isolates SDK failures", async () => {
    const reporter = await createSentryReporter({ SENTRY_DSN: "https://private-key@example.invalid/1" });
    sdk.captureEvent.mockImplementationOnce(() => { throw new Error("sdk-private-secret"); });
    expect(() => reporter.capture(event())).not.toThrow();
    sdk.flush.mockRejectedValueOnce(new Error("flush-private-secret"));
    await expect(reporter.flush()).resolves.toBeUndefined();
    expect(sdk.flush).toHaveBeenCalledTimes(1);
    const timeout: unknown = sdk.flush.mock.calls[0]?.[0];
    expect(timeout).toEqual(expect.any(Number));
    expect(Number(timeout)).toBeGreaterThan(0);
    expect(Number(timeout)).toBeLessThanOrEqual(10_000);
  });
});
