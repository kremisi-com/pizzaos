import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@pizzaos/domain": fileURLToPath(new URL("./packages/domain/src/index.ts", import.meta.url)),
      "@pizzaos/brand": fileURLToPath(new URL("./packages/brand/src/index.ts", import.meta.url)),
      "@pizzaos/mock-data": fileURLToPath(new URL("./packages/mock-data/src/index.ts", import.meta.url)),
      "@pizzaos/ui": fileURLToPath(new URL("./packages/ui/src/index.tsx", import.meta.url)),
      "@pizzaos/testing": fileURLToPath(new URL("./packages/testing/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: [
      "tests/**/*.test.ts",
      "apps/**/src/test/**/*.test.ts"
    ],
    passWithNoTests: false
  }
});
