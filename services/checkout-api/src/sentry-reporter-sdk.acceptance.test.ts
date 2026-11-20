// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => ({ envelopes: [] as unknown[] }));
vi.mock("@sentry/node", async () => {
  const actual = await vi.importActual<typeof import("@sentry/node")>("@sentry/node");
  return {
    ...actual,
    init: (options: Parameters<typeof actual.init>[0]) => actual.init({
      ...options,
      transport: () => ({
        send: async (envelope) => { memory.envelopes.push(envelope); return { statusCode: 200 }; },
        flush: async () => true,
      }),
    }),
  };
});

import * as Sentry from "@sentry/node";
import { createSentryReporter } from "./sentry-reporter";

afterEach(async () => { await Sentry.close(500); memory.envelopes.length = 0; });

describe("Sentry SDK pipeline acceptance with an in-memory transport", () => {
  it("accepts the sanitized beforeSend result and delivers one event without scope data", async () => {
    const reporter = await createSentryReporter({ SENTRY_DSN: "https://0123456789abcdef0123456789abcdef@example.invalid/1", PIZZAOS_ENVIRONMENT: "acceptance", PIZZAOS_RELEASE: "release-sdk" });
    Sentry.withScope((scope) => {
      scope.setUser({ email: "user-private-secret", ip_address: "ip-private-secret" });
      scope.setExtra("headers", { authorization: "Bearer header-private-secret" });
      scope.setContext("request", { body: "body-private-secret", query: "query-private-secret" });
      scope.addBreadcrumb({ message: "breadcrumb-private-secret", category: "http" });
      reporter.capture({
        operation: "payment", code: "service_unavailable", category: "dependency",
        environment: "acceptance", release: "release-sdk", orderId: "sdk-order-1",
        error: { type: "Error", frames: [
          { file: "payment.ts", line: 12, column: 8 },
          { file: "payment-view.tsx", line: 21, column: 4 },
          { file: "dependency.js", line: 30, column: 2 },
        ] },
      });
    });
    await reporter.flush();
    const payloads: unknown[] = [];
    for (const envelope of memory.envelopes) {
      if (!Array.isArray(envelope) || !Array.isArray(envelope[1])) continue;
      for (const item of envelope[1]) {
        if (!Array.isArray(item) || typeof item[0] !== "object" || item[0] === null || !("type" in item[0]) || item[0].type !== "event") continue;
        payloads.push(item[1]);
      }
    }
    expect(payloads).toHaveLength(1);
    const output = JSON.stringify(payloads);
    expect(output).toContain("sdk-order-1");
    expect(output).toContain("payment.ts");
    expect(output).not.toContain("private-secret");
    expect(payloads[0]).toHaveProperty("fingerprint", expect.any(Array));
    expect.soft(payloads[0]).toMatchObject({ environment: "acceptance", release: "release-sdk", platform: "node" });
    expect(payloads[0]).toHaveProperty("exception.values.0.stacktrace.frames", expect.arrayContaining([
      expect.objectContaining({ filename: "payment.ts", in_app: true }),
      expect.objectContaining({ filename: "payment-view.tsx", in_app: true }),
      expect.objectContaining({ filename: "dependency.js", in_app: false }),
    ]));
  });
});
