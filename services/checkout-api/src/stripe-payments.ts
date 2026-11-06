import Stripe from "stripe";
import type { OrderingPayments, ProviderPayment, ProviderRefund } from "./ordering-contract";

function payment(intent: Stripe.PaymentIntent): ProviderPayment {
  const status: ProviderPayment["status"] = intent.status === "succeeded" ? "paid" : intent.status === "canceled" ? "cancelled" : intent.status === "requires_payment_method" && intent.last_payment_error ? "failed" : ["requires_payment_method", "requires_confirmation", "requires_action"].includes(intent.status) ? "requires_action" : "processing";
  return { id: intent.id, status, ...(intent.client_secret && status === "requires_action" ? { clientSecret: intent.client_secret } : {}) };
}
function refund(value: Stripe.Refund): ProviderRefund {
  return { id: value.id, status: value.status === "succeeded" ? "succeeded" : ["failed", "canceled"].includes(value.status ?? "") ? "failed" : "pending" };
}

export function createStripeOrderingPayments(stripe: Stripe): OrderingPayments {
  return {
    async create(input) {
      try {
        return payment(await stripe.paymentIntents.create({ amount: input.totalCents, currency: "eur", payment_method_types: ["card"], metadata: { individualOrderId: input.orderId } }, { idempotencyKey: input.key }));
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError || error instanceof Stripe.errors.StripeCardError) {
          throw Object.assign(new Error("Pagamento rifiutato dal provider."), { definitive: true });
        }
        throw error;
      }
    },
    async read(id) { return payment(await stripe.paymentIntents.retrieve(id)); },
    async cancel(id) {
      try { return payment(await stripe.paymentIntents.cancel(id, {}, { idempotencyKey: `cancel:${id}` })); }
      catch { return payment(await stripe.paymentIntents.retrieve(id)); }
    },
    async refund(input) {
      // Recover an acknowledged operation even after the provider's idempotency
      // cache expires. A failed lookup remains uncertain and never starts a refund.
      const previous = await stripe.refunds.list({ payment_intent: input.intentId, limit: 100 });
      const existing = previous.data.find(value => value.metadata?.pizzaosOperationKey === input.key);
      if (existing) return refund(existing);
      try { return refund(await stripe.refunds.create({ payment_intent: input.intentId, metadata: { pizzaosOperationKey: input.key } }, { idempotencyKey: input.key })); }
      catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError || error instanceof Stripe.errors.StripeCardError) {
          throw Object.assign(new Error("Rimborso rifiutato dal provider."), { definitive: true });
        }
        throw error;
      }
    },
    async readRefund(id) { return refund(await stripe.refunds.retrieve(id)); }
  };
}
