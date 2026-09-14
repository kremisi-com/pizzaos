const CHECKOUT_ATTEMPT_STORAGE_KEY = "pizzaos.client.checkout.payment-attempt";

export interface CheckoutAttemptIdentity
{
  readonly key: string;
  readonly createdAtIso: string;
}

function createKey(): string
{
  return crypto.randomUUID();
}

export function loadOrCreateCheckoutAttempt(storage: Storage): CheckoutAttemptIdentity
{
  const current = storage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  if (current)
  {
    try { return JSON.parse(current) as CheckoutAttemptIdentity; } catch { storage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY); }
  }
  const attempt = { key: createKey(), createdAtIso: new Date().toISOString() };
  storage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
  return attempt;
}

/** Call only after a terminal decline: network retries must retain the existing key. */
export function replaceCheckoutAttempt(storage: Storage): CheckoutAttemptIdentity
{
  storage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  return loadOrCreateCheckoutAttempt(storage);
}

export function clearCheckoutAttempt(storage: Storage): void
{
  storage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
}
