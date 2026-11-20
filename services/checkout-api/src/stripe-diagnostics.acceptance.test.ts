// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { createDiagnostics, type DiagnosticEvent } from "./diagnostics";
import { createStripeOrderingPayments } from "./stripe-payments";

describe("Stripe recovered cancellation diagnostics", () => {
  it("records uncertain cancellation even when retrieving the final intent recovers successfully", async () => {
    const events: DiagnosticEvent[] = [];
    const lines: string[] = [];
    const diagnostics = createDiagnostics({
      stream: { write: (line) => { lines.push(line); } },
      reporter: { capture: (event) => { events.push(event); }, flush: async () => {} },
    });
    const sdk = {
      paymentIntents: {
        create: vi.fn(),
        retrieve: vi.fn(async () => ({ id: "pi_test", status: "canceled", client_secret: null, last_payment_error: null })),
        cancel: vi.fn(async () => { throw new Stripe.errors.StripeConnectionError({ type: "api_error", message: "stripe-cancel-private-secret" }); }),
      },
      refunds: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn() },
    };
    const payments = createStripeOrderingPayments(sdk as unknown as Stripe, diagnostics);
    await expect(payments.cancel("pi_test")).resolves.toEqual({ id: "pi_test", status: "cancelled" });
    expect(sdk.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ operation: "cancel_payment", code: "payment_uncertain", provider: "stripe", category: "dependency" });
    expect(JSON.stringify({ events, lines })).not.toContain("private-secret");
  });
});
