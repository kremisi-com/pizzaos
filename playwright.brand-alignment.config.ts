import { defineConfig } from "@playwright/test";
import sessionDemo from "./playwright.session-demo.config";

export default defineConfig({
  ...sessionDemo,
  testMatch: ["brand-alignment.spec.ts", "session-demo.spec.ts"],
  outputDir: ".codex/test-results/brand-alignment",
});
