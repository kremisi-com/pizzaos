# Testing strategy

## Test layers

- Vitest covers package, model, contract, and application behavior.
- React Testing Library covers component and screen behavior through the shared `@pizzaos/testing` helpers.
- Playwright covers critical user flows, including customer ordering and group ordering.
- `scripts/check-architecture.mjs` checks import boundaries and circular dependencies.

## Determinism

Demo seeds, clocks, local persistence, and simulations must be deterministic. Tests should use explicit reset helpers and frozen or injected time rather than relying on wall-clock timing.

## Verification commands

From the repository root:

- `pnpm test`
- `pnpm test:workspaces`
- `pnpm e2e`
- The default browser suite signs in to the POC with fixture-only demo credentials. It starts its own service on 3114, client/admin on 3001/3002 and landing on 3010, refusing unrelated existing servers. Dedicated demo-session acceptance uses 3301/3302/3304 and `.next-session-demo` build output; `PIZZAOS_BUILD_DIRECTORY` selects a separate Next output for isolated runs.
- `pnpm architecture:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm exec playwright test --config playwright.individual.config.ts` verifies guest cart persistence, authenticated individual checkout, and fulfillment across two real Next apps with an isolated service fixture. Identity/payment substitutions exist only in `tests/fixtures/individual-service.ts`, never in the live service entry point.
- `pnpm exec playwright test --config playwright.session-demo.config.ts` verifies email/password demo access, protected POC routes, operational API isolation, simulated card checkout without Stripe, and logout on both real Next apps. The fixture supplies only test credentials; production has no default demo password. Node demo acceptance tests assert that no database connection or query occurs during demo access.
- `pnpm exec playwright test --config playwright.group-ordering.config.ts` verifies durable group collection across separate browser identities, participant permissions, deadlines and submission by the organizer.
- `pnpm exec playwright test --config playwright.promotions-loyalty.config.ts` verifies coupon/program configuration, individual and group discounts, points credited at completion and benefits restored on cancellation.
- `pnpm exec playwright test --config playwright.operational-emails.config.ts` verifies email failure isolation, automatic retry and the operational status shown in admin.
- `pnpm exec playwright test --config playwright.operational-domains.config.ts` verifies separate admin/rider entry points, host-local sessions and API restrictions.

The default `pnpm e2e` suite selects only POC smoke, ordering, group and reorder scenarios. Durable ordering, group collection, promotions, operational emails, domains, rider and demo-session acceptance run through their dedicated configurations. Run the configurations sequentially to avoid sharing service state or Next build output. The group, promotions and email configurations also include earlier ordering scenarios as regression coverage; pass a spec filename to run only the new scenarios when those regressions have already passed in the same verification.

Service tests run in Node; browser suites keep DOM setup. PostgreSQL/real Auth.js tests require `PIZZAOS_TEST_DATABASE_URL` whose database name is exactly `pizzaos_individual_test`, migrated with the checkout service schema. They are skipped without that explicit local-test configuration. The repository suite resets its singleton state and must not share a database with a running live pilot. Magic-link tests use a real local SMTP protocol fixture. Actual Google OAuth and Stripe/3DS require external test credentials and are reported separately from isolated boundary tests.

Use the nearest app, package, or service README for narrower commands while iterating.

`pnpm exec playwright test --config playwright.pilot-extensions.config.ts` verifies the operator/rider flow using an isolated service harness: enablement, assignment, failed delivery, retry, canonical completion, cash, stock and analytics. It uses dedicated ports 3402/3404, an isolated Next build directory and artifacts under ignored `.codex/test-results/pilot-extensions`. Customer API setup runs with a separate identity through the same proxy; the individual suite separately verifies the client UI. Identity substitutions are confined to the test fixture; this is not an external OAuth, Stripe, DNS or deployed-host smoke test.
