import { defineConfig } from "@playwright/test";
import menuConfig from "./playwright.menu-ordering.config";

process.env.PIZZAOS_E2E_CLIENT_URL = "http://127.0.0.1:3831";
process.env.PIZZAOS_E2E_ADMIN_URL = "http://127.0.0.1:3832";

export default defineConfig({ ...menuConfig,
  testMatch: "inventory-extras.spec.ts",
  outputDir: "test-results/inventory-extras",
  webServer: (Array.isArray(menuConfig.webServer) ? menuConfig.webServer : []).map(server => ({
    ...server,
    command: server.command.replace(/3731/g, "3831").replace(/3732/g, "3832"),
    url: server.url?.replace(/373/g, "383"),
    env: {
      ...server.env,
      ...(server.env?.PIZZAOS_E2E_SERVICE_PORT ? { PIZZAOS_E2E_SERVICE_PORT: "3834" } : {
        PIZZAOS_SERVICE_URL: "http://127.0.0.1:3834",
        PIZZAOS_APP_ORIGIN: server.env?.PIZZAOS_APP_ORIGIN?.replace(/373/g, "383") ?? "",
        PIZZAOS_BUILD_DIRECTORY: ".next-inventory-extras-e2e",
      }),
    },
  })),
});
