// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createDiagnostics, type DiagnosticEvent } from "./diagnostics";
import { createOperationalEmailServices } from "./operational-emails";
import { buyer, cart, fixture, root, store } from "./operational-emails/emails.test-fixture";
import { createReconciliationWorker } from "./reconciliation-worker";

describe("operational diagnostic acceptance", () => {
  it("continues scheduled ticks after failure, deduplicates repeats and records recovery", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const events: DiagnosticEvent[] = [];
    const lines: string[] = [];
    const diagnostics = createDiagnostics({
      now: () => Date.now(), stream: { write: (line) => { lines.push(line); } },
      reporter: { capture: (event) => { events.push(event); }, flush: async () => {} },
    });
    let calls = 0;
    const worker = createReconciliationWorker({
      diagnostics, operation: "reconcile_acceptance", intervalMs: 1_000,
      tick: async () => {
        calls += 1;
        if (calls <= 3) throw new Error("worker-private-secret");
      },
    });
    try {
      await worker.start();
      expect(calls).toBe(1);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ operation: "reconcile_acceptance" });
      await vi.advanceTimersByTimeAsync(2_000);
      expect(calls).toBe(3);
      expect(events).toHaveLength(1);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(calls).toBe(4);
      expect(lines.some((line) => line.includes("worker_recovered"))).toBe(true);
      await worker.stop();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(calls).toBe(4);
      expect(JSON.stringify({ events, lines })).not.toContain("private-secret");
    } finally {
      await worker.stop();
      vi.useRealTimers();
    }
  });

  it("does not overlap ticks and drains in-flight work before stopping", async () => {
    vi.useFakeTimers();
    let release: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    let stoppingFinished = false;
    const worker = createReconciliationWorker({ intervalMs: 100, tick: async () => { calls += 1; await barrier; } });
    const starting = worker.start();
    try {
      await Promise.resolve();
      expect(calls).toBe(1);
      await vi.advanceTimersByTimeAsync(500);
      expect(calls).toBe(1);
      const stopping = worker.stop().then(() => { stoppingFinished = true; });
      await Promise.resolve();
      expect(stoppingFinished).toBe(false);
      release?.();
      await Promise.all([starting, stopping]);
      expect(stoppingFinished).toBe(true);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(calls).toBe(1);
    } finally {
      release?.();
      await starting;
      await worker.stop();
      vi.useRealTimers();
    }
  });

  it("reports uncertain payment once while preserving the pending order and idempotency", async () => {
    const source = await fixture();
    const events: DiagnosticEvent[] = [];
    const diagnostics = createDiagnostics({
      stream: { write: () => {} },
      reporter: { capture: (event) => { events.push(event); }, flush: async () => {} },
    });
    source.payments.create = async () => { throw new Error("payment-provider-private-secret"); };
    const { service } = createOperationalEmailServices({ ...source.options, diagnostics });
    const draft = cart();
    const quote = await service.quote(draft, buyer);
    const input = { cart: draft, fingerprint: quote.fingerprint, phone: "+393331234567", method: "card", idempotencyKey: "diagnostics-payment-checkout" } as const;
    const first = await service.checkout(buyer, input);
    const second = await service.checkout(buyer, input);
    expect(first.order.status).toBe("pending_payment");
    expect(first.order.providerIntentId).toBeNull();
    expect(second.order.id).toBe(first.order.id);
    expect(await service.orders(buyer)).toHaveLength(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ operation: "payment", code: "payment_uncertain", category: "dependency", orderId: first.order.id, storeId: store.id });
    expect(JSON.stringify(events)).not.toContain("private-secret");
  });

  it("reports failed SMTP delivery with identifiers while preserving retrying state and attempts", async () => {
    const source = await fixture();
    const events: DiagnosticEvent[] = [];
    const lines: string[] = [];
    const diagnostics = createDiagnostics({
      stream: { write: (line) => { lines.push(line); } },
      reporter: { capture: (event) => { events.push(event); }, flush: async () => {} },
    });
    const { service, emails } = createOperationalEmailServices({
      ...source.options, diagnostics,
      email: { ...source.options.email, sender: { send: async () => { throw new Error("smtp-password-private-secret"); } } },
    });
    const draft = cart();
    const quote = await service.quote(draft, buyer);
    const checkout = await service.checkout(buyer, {
      cart: draft, fingerprint: quote.fingerprint, phone: "+393331234567",
      method: "cash", idempotencyKey: "diagnostics-email-checkout",
    });
    await emails.dispatch();
    const delivery = await emails.list(root, store.id);
    const retrying = delivery.messages.filter((message) => message.status === "retrying");
    expect(retrying.length).toBeGreaterThan(0);
    for (const message of retrying) {
      expect(message.attempts).toBe(1);
      expect(message.lastError?.code).toBe("smtp_unavailable");
      expect(events).toContainEqual(expect.objectContaining({
        code: "email_delivery_failed", emailId: message.id,
        orderId: message.orderId, storeId: store.id, attempts: 1,
      }));
    }
    expect(await service.orders(buyer)).toHaveLength(1);
    expect(checkout).toBeDefined();
    const output = JSON.stringify({ events, lines });
    for (const secret of ["smtp-password-private-secret", buyer.email, "+393331234567", "Ben cotta", "Nota test"]) expect(output).not.toContain(secret);
  });
});
