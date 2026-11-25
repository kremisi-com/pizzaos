import { defineConfig } from "@playwright/test";
import menuConfig from "./playwright.menu-ordering.config";

process.env.PIZZAOS_E2E_CLIENT_URL = "http://127.0.0.1:4031";
process.env.PIZZAOS_E2E_ADMIN_URL = "http://127.0.0.1:4032";

export default defineConfig({ ...menuConfig,
  testMatch: "stock-policy.spec.ts",
  outputDir: "test-results/stock-policy",
  webServer: (Array.isArray(menuConfig.webServer) ? menuConfig.webServer : []).map(server => ({
    ...server,
    command: server.command.replace(/3731/g, "4031").replace(/3732/g, "4032"),
    url: server.url?.replace(/373/g, "403"),
    env: {
      ...server.env,
      ...(server.env?.PIZZAOS_E2E_SERVICE_PORT ? { PIZZAOS_E2E_SERVICE_PORT: "4034" } : {
        PIZZAOS_SERVICE_URL: "http://127.0.0.1:4034",
        PIZZAOS_APP_ORIGIN: server.env?.PIZZAOS_APP_ORIGIN?.replace(/373/g, "403") ?? "",
        PIZZAOS_BUILD_DIRECTORY: ".next-stock-policy-e2e",
      }),
    },
  })),
});
