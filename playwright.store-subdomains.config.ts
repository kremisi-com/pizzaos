import { defineConfig } from "@playwright/test";

const client = "http://127.0.0.1:3901";
const admin = "http://127.0.0.1:3902";
const service = "http://127.0.0.1:3904";
const domain = "pizzaos.app";
process.env.PIZZAOS_E2E_CLIENT_URL = client;
process.env.PIZZAOS_E2E_ADMIN_URL = admin;

const appEnvironment = {
  PIZZAOS_SERVICE_URL: service,
  PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters",
  PIZZAOS_ORDERING_DOMAIN: domain,
  PIZZAOS_BUILD_DIRECTORY: ".next-store-subdomains-e2e"
};

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "store-subdomains.spec.ts",
  workers: 1,
  outputDir: "test-results/store-subdomains",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts",
      url: `${service}/health`,
      env: { PIZZAOS_E2E_SERVICE_PORT: "3904", PIZZAOS_E2E_ORDERING_DOMAIN: domain },
      timeout: 60_000,
      reuseExistingServer: false
    },
    {
      command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3901",
      url: `${client}/api/deploy-probe`,
      env: { ...appEnvironment, PIZZAOS_APP_ORIGIN: client, PIZZAOS_CLIENT_LEGACY_HOSTS: "bella-napoli.pizzaos.app" },
      timeout: 120_000,
      reuseExistingServer: false
    },
    {
      command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3902",
      url: `${admin}/operazioni`,
      env: { ...appEnvironment, PIZZAOS_APP_ORIGIN: admin },
      timeout: 120_000,
      reuseExistingServer: false
    }
  ]
});
