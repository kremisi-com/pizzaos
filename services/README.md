# PizzaOS Services

## Responsibility

`services/` owns server-side capabilities, persistence, payments, and external integrations. Service implementations keep secrets and server-only behavior inside the owning service.

Applications consume explicit public contracts or HTTP boundaries; they must not import service implementation files.

## Service map

- [`checkout-api`](checkout-api/README.md) — Fastify service for checkout attempts, Stripe payment intents, idempotency, and PostgreSQL persistence. Read [`checkout-api/AGENTS.md`](checkout-api/AGENTS.md) before changing it.

## Service boundaries

- Credentials and provider clients remain server-side.
- Persistence schemas and migrations belong to the service that owns the data.
- Payment state and idempotency are authoritative in the checkout service.
- Service changes must preserve explicit contracts with the client and shared domain types.
- Do not introduce direct dependencies from shared packages to a service.

## Verification

Service-local commands are documented in each service README. When a service change affects an application contract, run the relevant application tests and the repository architecture checks as well.
