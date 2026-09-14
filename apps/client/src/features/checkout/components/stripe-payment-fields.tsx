"use client";

import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, type ReactElement } from "react";

export interface StripePaymentFieldsProps
{
  readonly onReady: (createPaymentMethodId: () => Promise<string>) => void;
}

/** Stripe hosts the iframe fields; PizzaOS never observes PAN, expiry or CVC. */
function StripeCardFields({ onReady }: StripePaymentFieldsProps): ReactElement
{
  const stripe = useStripe();
  const elements = useElements();
  useEffect(() => onReady(async () => {
      if (!stripe || !elements) throw new Error("Il pagamento sicuro non è ancora disponibile.");
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Completa i dati della carta.");
      const result = await stripe.createPaymentMethod({ type: "card", card });
      if (result.error || !result.paymentMethod) throw new Error(result.error?.message ?? "Carta non valida.");
      return result.paymentMethod.id;
    }), [elements, onReady, stripe]);
  return <div aria-label="Dati carta sicuri"><CardElement options={{ hidePostalCode: true }} /></div>;
}

export function StripePaymentFields(props: StripePaymentFieldsProps): ReactElement
{
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) return <p role="alert">Pagamento carta non configurato. Scegli contanti alla consegna.</p>;
  return <Elements stripe={loadStripe(publishableKey)}><StripeCardFields {...props} /></Elements>;
}
