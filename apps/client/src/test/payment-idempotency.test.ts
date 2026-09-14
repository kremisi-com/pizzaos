import { describe, expect, it } from "vitest";
import { clearCheckoutAttempt, loadOrCreateCheckoutAttempt, replaceCheckoutAttempt } from "../features/checkout/payment-idempotency";

describe("checkout idempotency", () => {
  it("reuses a key for a network retry and rotates it after a terminal decline", () => {
    const storage = window.localStorage;
    storage.clear();
    const first = loadOrCreateCheckoutAttempt(storage);
    expect(loadOrCreateCheckoutAttempt(storage).key).toBe(first.key);
    expect(replaceCheckoutAttempt(storage).key).not.toBe(first.key);
    clearCheckoutAttempt(storage);
    expect(storage.length).toBe(0);
  });
});
