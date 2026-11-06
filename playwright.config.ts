import { defineConfig } from "@playwright/test";

const common = { PIZZAOS_SERVICE_URL: "http://127.0.0.1:3114", PIZZAOS_PROXY_SECRET: "individual-e2e-proxy-secret-32-characters" };

export default defineConfig({
  testDir: "./tests/e2e",
  // Durable pilot uses its own service and proxy configuration.
  testIgnore: [
    "**/individual-ordering.spec.ts",
    "**/pilot-extensions.spec.ts",
    "**/operational-domains.spec.ts",
    "**/session-demo.spec.ts",
    "**/persistent-group.spec.ts",
    "**/promotions-loyalty.spec.ts",
    "**/operational-emails.spec.ts"
  ],
  fullyParallel: true,
  retries: 0,
  webServer: [
    {
      command: "pnpm --filter @pizzaos/checkout-api exec tsx ../../tests/fixtures/individual-service.ts",
      url: "http://127.0.0.1:3114/health",
      env: { PIZZAOS_E2E_SERVICE_PORT: "3114", PIZZAOS_E2E_DEMO_PASSWORD: "session-demo-browser-password" },
      reuseExistingServer: false,
      timeout: 60_000
    },
    {
      command: "pnpm --filter @pizzaos/landing exec next dev --hostname 127.0.0.1 --port 3010",
      url: "http://127.0.0.1:3010",
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: "pnpm --filter @pizzaos/client dev",
      url: "http://127.0.0.1:3001",
      env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3001" },
      reuseExistingServer: false,
      timeout: 120000
    },
    {
      command: "pnpm --filter @pizzaos/admin dev",
      url: "http://127.0.0.1:3002",
      env: { ...common, PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3002" },
      reuseExistingServer: false,
      timeout: 120000
    }
  ],
  use: {
    trace: "on-first-retry"
  }
});
