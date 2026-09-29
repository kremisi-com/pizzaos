# @pizzaos/checkout-api

## Responsibility

Fastify service that owns checkout creation, payment attempts, Stripe PaymentIntents, idempotency, and PostgreSQL persistence.

The service is the authoritative owner of payment and checkout state. It returns provider-safe summaries and never exposes raw card credentials.

## Public HTTP surface

- `POST /v1/checkouts` creates an idempotent checkout. It requires the `Idempotency-Key` header and supports card or cash payment metadata.
- `GET /v1/checkouts/:orderId` reads the checkout and reconciles Stripe status when applicable.
- `POST /v1/checkouts/:orderId/reconcile` refreshes the payment state after a Stripe.js action such as 3DS.

The request and response domain shapes are defined through the shared `@pizzaos/domain` contracts where applicable. Applications call the service boundary; they do not import this service's implementation.

## Persistence

Apply [`src/schema.sql`](src/schema.sql) to PostgreSQL before starting the service. The schema owns checkout orders, payment attempts, and idempotency records.

## Environment

- `DATABASE_URL` — required PostgreSQL connection string.
- `STRIPE_SECRET_KEY` — required server-only Stripe secret.
- `CLIENT_ORIGIN` — optional CORS origin.
- `PORT` — optional port, defaulting to `3004`.

Never put these values in client code, browser storage, domain contracts, or logs.

## Commands

From this directory:

- `pnpm dev`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
