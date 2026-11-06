"use client";

import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import { useEffect, useMemo } from "react";

export type ConfirmIndividualPayment = (clientSecret: string) => Promise<void>;

function SecureCard({ onReady }: { onReady: (confirm: ConfirmIndividualPayment | null) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  useEffect(() => {
    if (!stripe || !elements) { onReady(null); return; }
    onReady(async clientSecret => {
      const card = elements.getElement(CardElement);
      if (!card) throw new Error("Completa i dati della carta.");
      const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
      if (result.error) throw new Error(result.error.message ?? "Il pagamento non è riuscito.");
    });
    return () => onReady(null);
  }, [stripe, elements, onReady]);
  return <div aria-label="Dati carta sicuri"><CardElement options={{ hidePostalCode: true }} /></div>;
}

export function IndividualStripeFields({ onReady }: { onReady: (confirm: ConfirmIndividualPayment | null) => void }) {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripe = useMemo(() => key ? loadStripe(key) : null, [key]);
  if (!stripe) return <p role="alert">Pagamento carta non configurato. Puoi scegliere i contanti.</p>;
  return <Elements stripe={stripe}><SecureCard onReady={onReady} /></Elements>;
}
