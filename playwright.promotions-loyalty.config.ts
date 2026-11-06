import { defineConfig } from "@playwright/test";

process.env.PIZZAOS_E2E_CLIENT_URL = "http://127.0.0.1:3601";
process.env.PIZZAOS_E2E_ADMIN_URL = "http://127.0.0.1:3602";
const common = { PIZZAOS_SERVICE_URL: "http://127.0.0.1:3604", PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters" };
export default defineConfig({
  testDir: "./tests/e2e", testMatch: ["promotions-loyalty.spec.ts", "individual-ordering.spec.ts", "persistent-group.spec.ts"], workers: 1,
  outputDir: "test-results/promotions-loyalty", timeout: 120_000, expect: { timeout: 20_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    { command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts", url: "http://127.0.0.1:3604/health", env: { PIZZAOS_E2E_SERVICE_PORT: "3604" }, timeout: 60_000, reuseExistingServer: false },
    { command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3601", url: "http://127.0.0.1:3601/ordina", env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3601", PIZZAOS_BUILD_DIRECTORY: ".next-promotions-e2e" }, timeout: 120_000, reuseExistingServer: false },
    { command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3602", url: "http://127.0.0.1:3602/operazioni", env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3602", PIZZAOS_BUILD_DIRECTORY: ".next-promotions-e2e" }, timeout: 120_000, reuseExistingServer: false }
  ]
});
