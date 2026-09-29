# Client Agent Guidelines

## Product role

`client` owns the customer ordering experience.

## UX priorities

Design mobile-first and prioritize fast reorder, clear availability, transparent pricing, allergens, delivery and pickup slots, guided pizza customization, and low-friction checkout.

Use the warm-tech-premium expression of the shared PizzaOS brand: approachable and food-oriented, with precise interactions and clear feedback.

## Local constraints

- Product-facing UI and copy remain Italian.
- Feature code consumes the `ClientApiContract` through the app composition boundary; do not make features depend on the local repository implementation.
- `localStorage` is limited to explicitly browser-owned demo state. It must not replace server persistence or contain raw card data, secrets, or payment client secrets beyond the provider-approved flow.
- Order timeline, availability, slot conflicts, and payment state must follow their owning contract; do not invent a second source of truth inside a feature.
- Keep client code independent from `landing`, `admin`, and service implementation files.

## Required verification

Run the client lint, typecheck, test, and build commands from [`client/README.md`](README.md), plus `pnpm architecture:check` for boundary changes and the relevant Playwright flow for ordering changes.
