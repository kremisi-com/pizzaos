import { defineConfig } from "@playwright/test";
import menuConfig from "./playwright.menu-ordering.config";

process.env.PIZZAOS_E2E_ADMIN_URL = "http://127.0.0.1:3932";

export default defineConfig({ ...menuConfig,
  testMatch: "menu-publication-extras.spec.ts",
  outputDir: "test-results/menu-publication",
  webServer: (Array.isArray(menuConfig.webServer) ? menuConfig.webServer : [])
    .filter(server => !server.command.includes("@pizzaos/client"))
    .map(server => ({
      ...server,
      command: server.command.replace(/3732/g, "3932"),
      url: server.url?.replace(/373/g, "393"),
      env: {
        ...server.env,
        ...(server.env?.PIZZAOS_E2E_SERVICE_PORT ? { PIZZAOS_E2E_SERVICE_PORT: "3934" } : {
          PIZZAOS_SERVICE_URL: "http://127.0.0.1:3934",
          PIZZAOS_APP_ORIGIN: "http://127.0.0.1:3932",
          PIZZAOS_BUILD_DIRECTORY: ".next-menu-publication-e2e",
        }),
      },
    })),
});
