import { defineConfig } from "@playwright/test";

process.env.PIZZAOS_E2E_CLIENT_URL = "http://127.0.0.1:3301";
process.env.PIZZAOS_E2E_ADMIN_URL = "http://127.0.0.1:3302";
const common = { PIZZAOS_BUILD_DIRECTORY: ".next-session-demo", PIZZAOS_SERVICE_URL: "http://127.0.0.1:3304", PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters" };
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "session-demo.spec.ts", workers: 1,
  outputDir: "./.codex/test-results/session-demo",
  timeout: 60_000, expect: { timeout: 15_000 },
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts", env: { PIZZAOS_E2E_SERVICE_PORT: "3304", PIZZAOS_E2E_DEMO_PASSWORD: "session-demo-browser-password" }, url: "http://127.0.0.1:3304/health", timeout: 60_000, reuseExistingServer: false },
    { command: "pnpm --filter @pizzaos/client exec next dev --hostname 127.0.0.1 --port 3301", url: "http://127.0.0.1:3301/ordina", env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3301" }, timeout: 120_000, reuseExistingServer: false },
    { command: "pnpm --filter @pizzaos/admin exec next dev --hostname 127.0.0.1 --port 3302", url: "http://127.0.0.1:3302/operazioni", env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3302" }, timeout: 120_000, reuseExistingServer: false }
  ]
});
