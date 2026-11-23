import { defineConfig } from "@playwright/test";

const client = "http://client.localhost:3901";
const admin = "http://admin.localhost:3902";
const landing = "http://landing.localhost:3903";
const service = "http://127.0.0.1:3904";
const secret = "browser-test-only-landing-handoff-secret";
const appEnv = {
  PIZZAOS_BUILD_DIRECTORY: ".next-landing-poc",
  PIZZAOS_SERVICE_URL: service,
  PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters",
};

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "landing-poc.spec.ts",
  workers: 1,
  timeout: 65_000,
  expect: { timeout: 20_000 },
  outputDir: "./.codex/test-results/landing-poc",
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts", url: `${service}/health`, reuseExistingServer: false,
      env: { PIZZAOS_E2E_SERVICE_PORT: "3904", PIZZAOS_E2E_DEMO_PASSWORD: "demo-handoff-browser-password", PIZZAOS_E2E_DEMO_LANDING_ORIGIN: landing } },
    { command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3901", port: 3901, reuseExistingServer: false,
      env: { ...appEnv, PIZZAOS_APP_ORIGIN: client } },
    { command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3902", port: 3902, reuseExistingServer: false,
      env: { ...appEnv, PIZZAOS_APP_ORIGIN: admin, PIZZAOS_RIDER_ORIGIN: "http://rider.localhost:3902" } },
    { command: "pnpm --filter @pizzaos/landing exec next dev --hostname 127.0.0.1 --port 3903", port: 3903, reuseExistingServer: false,
      env: { PIZZAOS_BUILD_DIRECTORY: ".next-landing-poc", KREMISI_MAIL_ENDPOINT: `${service}/_test/demo-mail`, PIZZAOS_DEMO_HANDOFF_SECRET: secret, LINK_CLIENT: client, LINK_ADMIN: admin } },
  ],
});
