import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "operational-domains.spec.ts",
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/operational-host-service.ts",
      url: "http://127.0.0.1:3204/health",
      reuseExistingServer: false
    },
    {
      command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3202",
      port: 3202,
      env: {
        PIZZAOS_BUILD_DIRECTORY: ".next-operational-tests",
        PIZZAOS_SERVICE_URL: "http://127.0.0.1:3204",
        PIZZAOS_PROXY_SECRET: "operational-domains-test-proxy-secret",
        PIZZAOS_APP_ORIGIN: "http://admin.localhost:3202",
        PIZZAOS_RIDER_ORIGIN: "http://rider.localhost:3202"
      },
      timeout: 120_000,
      reuseExistingServer: false
    }
  ]
});
