import { defineConfig } from "@playwright/test";

const clientOrigin = "http://127.0.0.1:3731";
const adminOrigin = "http://127.0.0.1:3732";
const serviceOrigin = "http://127.0.0.1:3734";
const appEnvironment = {
  PIZZAOS_SERVICE_URL: serviceOrigin,
  PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters",
  PIZZAOS_BUILD_DIRECTORY: ".next-menu-ordering-e2e",
};

process.env.PIZZAOS_E2E_CLIENT_URL = clientOrigin;
process.env.PIZZAOS_E2E_ADMIN_URL = adminOrigin;

export default defineConfig({
  testDir: "./tests/menu-ordering",
  outputDir: "test-results/menu-ordering",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts",
      url: `${serviceOrigin}/health`,
      env: { PIZZAOS_E2E_SERVICE_PORT: "3734" },
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3731",
      url: `${clientOrigin}/ordina`,
      env: { ...appEnvironment, PIZZAOS_APP_ORIGIN: clientOrigin },
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3732",
      url: `${adminOrigin}/operazioni`,
      env: { ...appEnvironment, PIZZAOS_APP_ORIGIN: adminOrigin },
      timeout: 120_000,
    },
  ],
});
