import { defineConfig } from "@playwright/test";

const clientOrigin = "http://127.0.0.1:3741";
const serviceOrigin = "http://127.0.0.1:3744";
process.env.PIZZAOS_E2E_CLIENT_URL = clientOrigin;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "individual-cart.spec.ts",
  outputDir: "test-results/individual-cart",
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts",
      url: `${serviceOrigin}/health`,
      env: { PIZZAOS_E2E_SERVICE_PORT: "3744" },
      timeout: 60_000,
      reuseExistingServer: false,
    },
    {
      command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3741",
      url: `${clientOrigin}/ordina`,
      env: {
        PIZZAOS_SERVICE_URL: serviceOrigin,
        PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters",
        PIZZAOS_BUILD_DIRECTORY: ".next-client-cart-e2e",
        PIZZAOS_APP_ORIGIN: clientOrigin,
      },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
