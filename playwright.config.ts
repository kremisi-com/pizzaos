import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  webServer: [
    {
      command: "pnpm --filter @pizzaos/landing dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: "pnpm --filter @pizzaos/client dev",
      url: "http://127.0.0.1:3001",
      reuseExistingServer: true,
      timeout: 120000
    },
    {
      command: "pnpm --filter @pizzaos/admin dev",
      url: "http://127.0.0.1:3002",
      reuseExistingServer: true,
      timeout: 120000
    }
  ],
  use: {
    trace: "on-first-retry"
  }
});
