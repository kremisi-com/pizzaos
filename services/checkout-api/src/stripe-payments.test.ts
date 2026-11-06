// @vitest-environment node
// Independent SDK-boundary tests from the public Stripe adapter contract only.
import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { createStripeOrderingPayments } from "./stripe-payments";

function intent(status = "requires_payment_method", lastError = false) {
  return { id: "pi_test", status, client_secret: "secret_only_for_browser_action", last_payment_error: lastError ? { message: "private card decline" } : null };
}
function refund(status = "pending", key = "") {
  return { id: "re_test", status, metadata: key ? { pizzaosOperationKey: key } : {} };
}
function fixture() {
  const sdk = {
    paymentIntents: {
      create: vi.fn(async () => intent()),
      retrieve: vi.fn(async () => intent()),
      cancel: vi.fn(async () => intent("canceled")),
    },
    refunds: {
      list: vi.fn(async () => ({ data: [] as ReturnType<typeof refund>[], has_more: false })),
      create: vi.fn(async () => refund()),
      retrieve: vi.fn(async () => refund()),
    },
  };
  return { sdk, payments: createStripeOrderingPayments(sdk as unknown as Stripe) };
}
const checkout = { orderId: "order-1", totalCents: 1800, key: "charge-operation-1" };
const refundInput = { intentId: "pi_test", key: "refund-operation-1" };

describe("Stripe ordering payment adapter", () => {
  it("does not make remote calls when the adapter is constructed", () => {
    const { sdk } = fixture();
    for (const operation of [...Object.values(sdk.paymentIntents), ...Object.values(sdk.refunds)]) expect(operation).not.toHaveBeenCalled();
  });

  it("creates an unconfirmed EUR card intent using only authoritative amount and stable idempotency", async () => {
    const { sdk, payments } = fixture();
    await payments.create(checkout);
    expect(sdk.paymentIntents.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 1800, currency: "eur", payment_method_types: ["card"], metadata: { individualOrderId: "order-1" } }), expect.objectContaining({ idempotencyKey: checkout.key }));
    expect(sdk.paymentIntents.create).toHaveBeenCalledWith(expect.not.objectContaining({ confirm: true }), expect.anything());
  });

  it.each([
    ["succeeded", false, "paid"],
    ["canceled", false, "cancelled"],
    ["requires_payment_method", true, "failed"],
    ["requires_payment_method", false, "requires_action"],
    ["requires_confirmation", false, "requires_action"],
    ["requires_action", false, "requires_action"],
    ["processing", false, "processing"],
  ] as const)("maps %s (last error %s) consistently for create and read to %s", async (status, lastError, expected) => {
    const { sdk, payments } = fixture();
    sdk.paymentIntents.create.mockResolvedValue(intent(status, lastError));
    sdk.paymentIntents.retrieve.mockResolvedValue(intent(status, lastError));
    const created = await payments.create(checkout);
    const read = await payments.read("pi_test");
    for (const result of [created, read]) {
      expect(result).toMatchObject({ id: "pi_test", status: expected });
      expect(result.clientSecret).toBe(expected === "requires_action" ? "secret_only_for_browser_action" : undefined);
    }
    expect(sdk.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test");
  });

  it("cancels with a stable operation key and maps the final status", async () => {
    const { sdk, payments } = fixture();
    expect(await payments.cancel("pi_test")).toMatchObject({ id: "pi_test", status: "cancelled" });
    await payments.cancel("pi_test");
    for (const args of sdk.paymentIntents.cancel.mock.calls as unknown[][]) {
      expect(args[0]).toBe("pi_test");
      expect(args).toContainEqual(expect.objectContaining({ idempotencyKey: "cancel:pi_test" }));
    }
  });

  it("rereads a non-cancellable intent instead of treating a successful charge as cancelled", async () => {
    const { sdk, payments } = fixture();
    sdk.paymentIntents.cancel.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "Intent already succeeded" }));
    sdk.paymentIntents.retrieve.mockResolvedValue(intent("succeeded"));
    expect(await payments.cancel("pi_test")).toEqual({ id: "pi_test", status: "paid" });
    expect(sdk.paymentIntents.retrieve).toHaveBeenCalledWith("pi_test");
  });

  it("looks up an existing refund before creating and tags new refunds with the durable operation key", async () => {
    const { sdk, payments } = fixture();
    await payments.refund(refundInput);
    expect(sdk.refunds.list).toHaveBeenCalledWith({ payment_intent: "pi_test", limit: 100 });
    expect(sdk.refunds.create).toHaveBeenCalledWith({ payment_intent: "pi_test", metadata: { pizzaosOperationKey: refundInput.key } }, expect.objectContaining({ idempotencyKey: refundInput.key }));
    expect(sdk.refunds.list.mock.invocationCallOrder[0]).toBeLessThan(sdk.refunds.create.mock.invocationCallOrder[0]!);
  });

  it("recovers a matching metadata refund without issuing a duplicate after provider key retention", async () => {
    const { sdk, payments } = fixture();
    sdk.refunds.list.mockResolvedValue({ data: [{ ...refund("succeeded", "different-operation"), id: "re_other" }, { ...refund("succeeded", refundInput.key), id: "re_historical" }], has_more: false });
    expect(await payments.refund(refundInput)).toEqual({ id: "re_historical", status: "succeeded" });
    expect(sdk.refunds.create).not.toHaveBeenCalled();
  });

  it.each([["succeeded", "succeeded"], ["failed", "failed"], ["canceled", "failed"], ["pending", "pending"], ["requires_action", "pending"]] as const)("maps refund %s consistently to %s", async (status, expected) => {
    const { sdk, payments } = fixture();
    sdk.refunds.create.mockResolvedValue(refund(status));
    sdk.refunds.retrieve.mockResolvedValue(refund(status));
    expect(await payments.refund(refundInput)).toEqual({ id: "re_test", status: expected });
    expect(await payments.readRefund("re_test")).toEqual({ id: "re_test", status: expected });
    expect(sdk.refunds.retrieve).toHaveBeenCalledWith("re_test");
  });

  const errors = [
    { name: "invalid request", create: () => new Stripe.errors.StripeInvalidRequestError({ type: "invalid_request_error", message: "private provider details" }), definitive: true },
    { name: "card error", create: () => new Stripe.errors.StripeCardError({ type: "card_error", message: "private card details" }), definitive: true },
    { name: "network", create: () => new Stripe.errors.StripeConnectionError({ type: "api_error", message: "private network details" }), definitive: false },
    { name: "API", create: () => new Stripe.errors.StripeAPIError({ type: "api_error", message: "private API details" }), definitive: false },
    { name: "rate limit", create: () => new Stripe.errors.StripeRateLimitError({ type: "rate_limit_error", message: "private rate limit details" }), definitive: false },
    { name: "idempotency", create: () => new Stripe.errors.StripeIdempotencyError({ type: "idempotency_error", message: "private idempotency details" }), definitive: false },
  ];
  it.each(errors)("classifies rejected creates/refunds: $name", async ({ create, definitive }) => {
    const { sdk, payments } = fixture();
    sdk.paymentIntents.create.mockRejectedValue(create());
    sdk.refunds.create.mockRejectedValue(create());
    for (const operation of [() => payments.create(checkout), () => payments.refund(refundInput)]) {
      const error: unknown = await operation().then(() => null, (rejected: unknown) => rejected);
      expect(error).toBeInstanceOf(Error);
      if (definitive) {
        expect(error).toMatchObject({ definitive: true });
        expect((error as Error).message).not.toContain("private");
      } else expect(error).not.toMatchObject({ definitive: true });
    }
  });

  it("keeps refund lookup failures uncertain and never creates when prior refunds cannot be checked", async () => {
    const { sdk, payments } = fixture();
    sdk.refunds.list.mockRejectedValue(new Stripe.errors.StripeConnectionError({ type: "api_error", message: "Uncertain history" }));
    const error: unknown = await payments.refund(refundInput).then(() => null, (rejected: unknown) => rejected);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toMatchObject({ definitive: true });
    expect(sdk.refunds.create).not.toHaveBeenCalled();
  });
});
