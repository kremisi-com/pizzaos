import { defineConfig } from "@playwright/test";

// Separate browser identities use the authenticated proxy; client UI has its own suite.
const origin = "http://127.0.0.1:3402";
process.env.PIZZAOS_E2E_CLIENT_URL = origin;
process.env.PIZZAOS_E2E_ADMIN_URL = origin;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "pilot-extensions.spec.ts",
  outputDir: "./.codex/test-results/pilot-extensions",
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts",
      env: { PIZZAOS_E2E_SERVICE_PORT: "3404" },
      url: "http://127.0.0.1:3404/health", timeout: 60_000, reuseExistingServer: false
    },
    {
      command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3402",
      env: { PIZZAOS_BUILD_DIRECTORY: ".next-pilot-extensions", PIZZAOS_SERVICE_URL: "http://127.0.0.1:3404", PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters", PIZZAOS_APP_ORIGIN: origin },
      url: `${origin}/operazioni`, timeout: 120_000, reuseExistingServer: false
    }
  ]
});
