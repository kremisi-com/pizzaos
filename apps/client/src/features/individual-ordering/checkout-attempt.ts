import type { IndividualCheckout } from "@pizzaos/domain";
import { copyIndividualCart, isIndividualCart } from "./draft";

const KEY = "pizzaos.individual-checkout.v1";

export interface IndividualCheckoutAttempt {
  key: string;
  actorId?: string;
  input?: IndividualCheckout;
  orderId?: string;
}

/** Keep only the original retry payload, never provider credentials or response secrets. */
export function createCheckoutAttempt(actorId: string, input: IndividualCheckout): IndividualCheckoutAttempt {
  return { key: input.idempotencyKey, actorId, input: {
    cart: copyIndividualCart(input.cart), fingerprint: input.fingerprint,
    phone: input.phone, method: input.method, idempotencyKey: input.idempotencyKey
  } };
}

export function readCheckoutAttempt(storage: Pick<Storage, "getItem">): IndividualCheckoutAttempt | null {
  const raw: unknown = JSON.parse(storage.getItem(KEY) ?? "null");
  if (!raw || typeof raw !== "object" || !("key" in raw) || typeof raw.key !== "string") return null;
  // Old key-only attempts remain blocking: their original request cannot safely be reconstructed.
  if (!("version" in raw) || raw.version !== 1 || !("actorId" in raw) || typeof raw.actorId !== "string"
    || !("input" in raw) || !raw.input || typeof raw.input !== "object") return { key: raw.key };
  const input = raw.input;
  if (!("cart" in input) || !isIndividualCart(input.cart)
    || !("fingerprint" in input) || typeof input.fingerprint !== "string"
    || !("phone" in input) || typeof input.phone !== "string"
    || !("method" in input) || (input.method !== "cash" && input.method !== "card")
    || !("idempotencyKey" in input) || input.idempotencyKey !== raw.key) return { key: raw.key };
  const attempt = createCheckoutAttempt(raw.actorId, {
    cart: input.cart, fingerprint: input.fingerprint, phone: input.phone,
    method: input.method, idempotencyKey: raw.key
  });
  if ("orderId" in raw && typeof raw.orderId === "string") attempt.orderId = raw.orderId;
  return attempt;
}

export function writeCheckoutAttempt(storage: Pick<Storage, "setItem">, attempt: IndividualCheckoutAttempt): void {
  if (!attempt.actorId || !attempt.input) return;
  storage.setItem(KEY, JSON.stringify({ version: 1, ...createCheckoutAttempt(attempt.actorId, attempt.input),
    ...(attempt.orderId ? { orderId: attempt.orderId } : {}) }));
}

export function removeCheckoutAttempt(storage: Pick<Storage, "removeItem">): void {
  storage.removeItem(KEY);
}
