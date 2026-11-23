import { defineConfig } from "@playwright/test";
import individual from "./playwright.individual.config";

const servers = Array.isArray(individual.webServer) ? individual.webServer : [];

export default defineConfig({
  ...individual,
  testMatch: "order-calendar.spec.ts",
  webServer: servers.map((server, index) => ({
    ...server,
    env: { ...server.env, ...(index === 0
      ? { PIZZAOS_E2E_ORDER_CALENDAR: "1" }
      : { PIZZAOS_BUILD_DIRECTORY: ".next-order-calendar-e2e" }) }
  }))
});
