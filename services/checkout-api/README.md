# Checkout API

Servizio Fastify che possiede checkout, tentativi di pagamento Stripe e persistenza PostgreSQL. Richiede `DATABASE_URL` e `STRIPE_SECRET_KEY`; entrambi sono esclusivamente server-side. Il client riceve soltanto ID PaymentMethod, client secret e riepiloghi carta sicuri.

Eseguire `pnpm --filter @pizzaos/checkout-api dev`. Applicare prima `src/schema.sql` al database.
