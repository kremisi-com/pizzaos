// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { Writable } from "node:stream";
import {
  classifyFailure,
  createDiagnostics,
  type DiagnosticContext,
  type DiagnosticEvent,
} from "./diagnostics";

function fixture(options: { now?: () => number; maxKeys?: number } = {}) {
  const lines: string[] = [];
  const events: DiagnosticEvent[] = [];
  const diagnostics = createDiagnostics({
    environment: "acceptance",
    release: "release-acceptance",
    stream: { write: (line) => { lines.push(line); } },
    reporter: { capture: (event) => { events.push(event); }, flush: async () => {} },
    ...options,
  });
  return { diagnostics, lines, events };
}

describe("diagnostics public failure classification", () => {
  it("keeps known application errors and their public message", () => {
    expect(classifyFailure({ code: "invalid_input", statusCode: 400, message: "Dati non validi" }))
      .toEqual({ code: "invalid_input", statusCode: 400, message: "Dati non validi", category: "expected" });
  });

  it("does not trust an unknown code merely because it supplies a client status", () => {
    const result = classifyFailure({ code: "CUSTOM_PRIVATE_ERROR", statusCode: 400, message: "password-secret" });
    expect(result).toMatchObject({ statusCode: 500, code: "internal_error", category: "unexpected" });
    expect(result.message).not.toContain("password-secret");
  });

  it("requires both a known code and a client status for structural expected errors", () => {
    for (const error of [
      { code: "invalid_input", message: "private-secret" },
      { code: "invalid_input", statusCode: 500, message: "private-secret" },
    ]) {
      expect(classifyFailure(error)).toMatchObject({ statusCode: 500, code: "internal_error", category: "unexpected" });
    }
  });

  it("does not classify an arbitrary Fastify internal failure as invalid input", () => {
    expect(classifyFailure({ code: "FST_ERR_REP_ALREADY_SENT", statusCode: 500, message: "private-details" }))
      .toMatchObject({ statusCode: 500, code: "internal_error", category: "unexpected" });
  });

  it.each(["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN", "08006", "53300", "57P01"])(
    "classifies transient connection code %s as dependency failure",
    (code) => {
      expect(classifyFailure(Object.assign(new Error("private-connection-details"), { code })))
        .toMatchObject({ statusCode: 503, code: "service_unavailable", category: "dependency" });
    },
  );

  it.each(["StripeConnectionError", "StripeAPIError"])("classifies %s as dependency failure", (type) => {
    expect(classifyFailure(Object.assign(new Error("private-stripe-details"), { type })))
      .toMatchObject({ statusCode: 503, code: "service_unavailable", category: "dependency" });
  });

  it("does not treat every database or provider exception as transient", () => {
    for (const error of [
      Object.assign(new Error("private-sql-details"), { code: "23505" }),
      Object.assign(new Error("private-card-details"), { type: "StripeCardError" }),
    ]) {
      expect(classifyFailure(error)).toMatchObject({ statusCode: 500, code: "internal_error", category: "unexpected" });
    }
  });

  it("keeps an explicit service_unavailable response at 503", () => {
    expect(classifyFailure({ code: "service_unavailable", statusCode: 503, message: "Servizio temporaneamente non disponibile" }))
      .toMatchObject({ statusCode: 503, code: "service_unavailable" });
  });

  it("classifies exhausted PostgreSQL provider quota as a sanitized dependency failure", () => {
    const failure = classifyFailure(Object.assign(new Error("private provider quota details"), { code: "53000" }));
    expect(failure).toMatchObject({ statusCode: 503, code: "service_unavailable", category: "dependency" });
    expect(failure.message).not.toContain("private provider quota details");
  });

  it("uses a generic public message for unknown exceptions", () => {
    const failure = classifyFailure(new Error("password secret"));
    expect(failure).toMatchObject({ statusCode: 500, code: "internal_error", category: "unexpected" });
    expect(failure.message.length).toBeGreaterThan(0);
    expect(failure.message).not.toMatch(/password|secret/);
  });
});

describe("sanitized diagnostic reporting", () => {
  it("retains the allowed PostgreSQL quota code for diagnostics without retaining provider messages", () => {
    const { diagnostics, events, lines } = fixture();
    diagnostics.report(Object.assign(new Error("private provider quota details"), { code: "53000" }), { operation: "database_connect", provider: "neon" });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ code: "service_unavailable", category: "dependency", error: { code: "53000" } });
    expect(JSON.stringify({ events, lines })).not.toContain("private provider quota details");
  });

  it("preserves useful allowlisted identifiers while filtering exception messages, causes and stack headers", () => {
    const { diagnostics, events, lines } = fixture();
    const cause = new Error("cause-password-secret");
    cause.stack = "Error: cause-password-secret\n    at secretFunction (/project/source/cause.ts:20:4)";
    const error = new Error("postgres://user:password@host/db?token=secret", { cause });
    error.name = "arbitrary-error-name-secret";
    error.stack = "Error: postgres://user:password@host/db?token=secret\n    at secretFunction (/project/source/payment.ts:12:8)";
    const originalStack = error.stack;
    const context: DiagnosticContext & { body: unknown; query: string; headers: unknown } = {
      operation: "payment", orderId: "order-1", storeId: "store-1", provider: "stripe",
      body: { email: "customer@example.invalid", phone: "private-phone", address: "private-address" },
      query: "?token=private-query", headers: { authorization: "Bearer private-token", cookie: "private-cookie" },
    };
    diagnostics.report(error, context);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ operation: "payment", orderId: "order-1", storeId: "store-1", environment: "acceptance", release: "release-acceptance" });
    const output = JSON.stringify({ events, lines });
    for (const secret of ["postgres://", "password", "token=", "cause-password-secret", "arbitrary-error-name-secret", "customer@example.invalid", "private-phone", "private-address", "private-query", "private-token", "private-cookie", "secretFunction"]) {
      expect(output).not.toContain(secret);
    }
    expect(events[0]?.error?.frames).toContainEqual({ file: "payment.ts", line: 12, column: 8 });
    expect(error.stack).toBe(originalStack);
    expect(error.cause).toBe(cause);
    expect(context.body).toEqual({ email: "customer@example.invalid", phone: "private-phone", address: "private-address" });
  });

  it("filters arbitrary messages and objects even through direct and child logger calls", () => {
    const { diagnostics, lines } = fixture();
    const sensitive = {
      body: { password: "body-secret" }, query: "query-secret", headers: { authorization: "auth-secret" },
      email: "email-secret", phone: "phone-secret", address: "address-secret", cookie: "cookie-secret",
      token: "token-secret", arbitrary: "arbitrary-secret", err: new Error("error-secret"),
    };
    diagnostics.logger.info(sensitive, "message-secret");
    diagnostics.logger.error(new Error("direct-error-secret"));
    diagnostics.logger.child({ customer: "child-secret", orderId: "order-logger" }).warn(sensitive, "child-message-secret");
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      expect(line).not.toContain("secret");
    }
  });

  it("filters reserved child bindings rather than trusting them as log metadata", () => {
    const { diagnostics, lines } = fixture();
    diagnostics.logger.child({ time: "time-private-secret", level: "level-private-secret", orderId: "child-order-1" }).info("child-message-private-secret");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      expect(line).not.toContain("private-secret");
    }
  });

  it("does not send expected user errors or informational events to the reporter", () => {
    const { diagnostics, events, lines } = fixture();
    diagnostics.report({ code: "invalid_input", statusCode: 400, message: "Dati mancanti" }, { operation: "http_error" });
    diagnostics.record("http_completed", { operation: "http", statusCode: 400, durationMs: 12 });
    expect(events).toHaveLength(0);
    expect(lines.some((line) => line.includes("http_completed"))).toBe(true);
  });

  it("honors the explicit operational category for a recovered dependency failure", () => {
    const { diagnostics, events } = fixture();
    diagnostics.report(new Error("smtp-private-secret"), { operation: "email_delivery_failed", code: "email_delivery_failed", category: "operational", emailId: "email-1", orderId: "order-1", storeId: "store-1", attempts: 3 });
    expect(events[0]).toMatchObject({ operation: "email_delivery_failed", code: "email_delivery_failed", category: "operational", emailId: "email-1", orderId: "order-1", storeId: "store-1", attempts: 3 });
  });

  it("keeps concurrent async contexts isolated across awaits", async () => {
    const { diagnostics, events } = fixture();
    let releaseFirst: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const first = diagnostics.run({ operation: "http", requestId: "request-first", route: "/orders/:orderId" }, async () => {
      await barrier;
      diagnostics.report(new Error("first-private-secret"), { operation: "payment", orderId: "order-first" });
    });
    await diagnostics.run({ operation: "http", requestId: "request-second", route: "/orders/:orderId" }, async () => {
      await Promise.resolve();
      diagnostics.report(new Error("second-private-secret"), { operation: "payment", orderId: "order-second" });
    });
    releaseFirst?.();
    await first;
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ requestId: "request-first", orderId: "order-first", route: "/orders/:orderId" }),
      expect.objectContaining({ requestId: "request-second", orderId: "order-second", route: "/orders/:orderId" }),
    ]));
    expect(events).toHaveLength(2);
  });

  it("deduplicates repeated failures for sixty seconds and reports the suppressed count", () => {
    let now = 1_000;
    const { diagnostics, events } = fixture({ now: () => now });
    const context = { operation: "order_tick", orderId: "order-1", code: "tick_failed", category: "operational" } as const;
    diagnostics.report(new Error("private-secret"), context);
    now += 20_000;
    diagnostics.report(new Error("private-secret"), context);
    now += 39_999;
    diagnostics.report(new Error("private-secret"), context);
    expect(events).toHaveLength(1);
    now += 1;
    diagnostics.report(new Error("private-secret"), context);
    expect(events).toHaveLength(2);
    expect(events[1]?.suppressed).toBe(2);
  });

  it("keeps separate HTTP requests and distinct failure identities diagnosticable", () => {
    const { diagnostics, events } = fixture();
    for (const requestId of ["request-1", "request-2"]) {
      diagnostics.report(new Error("private-secret"), { operation: "payment", orderId: "order-1", requestId });
    }
    diagnostics.report(new Error("private-secret"), { operation: "payment", orderId: "order-2" });
    diagnostics.report(new Error("private-secret"), { operation: "refund", orderId: "order-1" });
    expect(events).toHaveLength(4);
  });

  it("bounds remembered failure identities by the configured maximum", () => {
    const { diagnostics, events } = fixture({ maxKeys: 2 });
    const report = (orderId: string) => diagnostics.report(new Error("private-secret"), { operation: "order_tick", orderId });
    for (const id of ["order-1", "order-2", "order-3"]) report(id);
    expect(events).toHaveLength(3);
    for (const id of ["order-1", "order-2", "order-3"]) report(id);
    expect(events.length).toBeGreaterThan(3);
  });

  it("isolates throwing reporters and sinks, and rejected flushes", async () => {
    const diagnostics = createDiagnostics({
      stream: { write: () => { throw new Error("sink-private-secret"); } },
      reporter: {
        capture: () => { throw new Error("reporter-private-secret"); },
        flush: async () => { throw new Error("flush-private-secret"); },
      },
    });
    expect(() => diagnostics.report(new Error("application-private-secret"), { operation: "order_tick" })).not.toThrow();
    expect(() => diagnostics.record("http_completed", { operation: "http" })).not.toThrow();
    await expect(diagnostics.flush()).resolves.toBeUndefined();
    expect(diagnostics.run({ operation: "order_tick" }, () => "work-completed")).toBe("work-completed");
  });

  it("finishes flush within two seconds even if the injected reporter never settles", async () => {
    vi.useFakeTimers();
    let finished = false;
    const diagnostics = createDiagnostics({
      stream: { write: () => {} },
      reporter: { capture: () => {}, flush: () => new Promise<void>(() => {}) },
    });
    try {
      const flushing = diagnostics.flush().then(() => { finished = true; });
      await vi.advanceTimersByTimeAsync(2_000);
      expect(finished).toBe(true);
      await flushing;
    } finally {
      vi.useRealTimers();
    }
  });

  it("isolates rejected async capture implementations without an unhandled rejection", async () => {
    const unhandled: unknown[] = [];
    const collect = (reason: unknown) => { unhandled.push(reason); };
    process.on("unhandledRejection", collect);
    const diagnostics = createDiagnostics({
      stream: { write: () => {} },
      reporter: {
        capture: async () => { throw new Error("reporter-private-secret"); },
        flush: async () => {},
      },
    });
    try {
      expect(() => diagnostics.report(new Error("application-private-secret"), { operation: "order_tick" })).not.toThrow();
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      expect(unhandled).toEqual([]);
      expect(diagnostics.run({ operation: "order_tick" }, () => "work-completed")).toBe("work-completed");
    } finally {
      process.off("unhandledRejection", collect);
    }
  });

  it("isolates asynchronous Writable errors without an uncaught exception", async () => {
    const uncaught: unknown[] = [];
    const collect = (error: Error) => { uncaught.push(error); };
    process.on("uncaughtException", collect);
    const sink = new Writable({
      write(chunk, encoding, callback) {
        void chunk;
        void encoding;
        callback(new Error("sink-private-secret"));
      },
    });
    const diagnostics = createDiagnostics({ stream: sink });
    try {
      expect(() => diagnostics.record("worker_started", { operation: "order_tick" })).not.toThrow();
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      expect(uncaught).toEqual([]);
      expect(diagnostics.run({ operation: "order_tick" }, () => "work-completed")).toBe("work-completed");
    } finally {
      process.off("uncaughtException", collect);
      sink.destroy();
    }
  });
});
