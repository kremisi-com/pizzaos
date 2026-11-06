import { defineConfig } from "@playwright/test";

process.env.PIZZAOS_E2E_CLIENT_URL = "http://127.0.0.1:3101";
process.env.PIZZAOS_E2E_ADMIN_URL = "http://127.0.0.1:3102";
const common = { PIZZAOS_SERVICE_URL: "http://127.0.0.1:3104", PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters" };
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "individual-ordering.spec.ts", workers: 1,
  timeout: 60_000, expect: { timeout: 15_000 },
  use: { trace: "retain-on-failure" },
  webServer: [
    { command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts", url: "http://127.0.0.1:3104/health", timeout: 60_000, reuseExistingServer: false },
    { command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3101", url: "http://127.0.0.1:3101/ordina", env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3101" }, timeout: 120_000, reuseExistingServer: false },
    { command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3102", url: "http://127.0.0.1:3102/operazioni", env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3102" }, timeout: 120_000, reuseExistingServer: false }
  ]
});
