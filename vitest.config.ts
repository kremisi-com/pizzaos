import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [{
    name: "app-local-imports",
    enforce: "pre",
    async resolveId(source, importer) {
      if (!source.startsWith("@/") || !importer) return null;
      const app = importer.replaceAll("\\", "/").match(/\/apps\/(client|admin|landing)\//)?.[1];
      if (!app) throw new Error(`Import app-local senza applicazione proprietaria: ${source}`);
      return this.resolve(fileURLToPath(new URL(`./apps/${app}/src/${source.slice(2)}`, import.meta.url)), importer, { skipSelf: true });
    }
  }],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react"
  },
  resolve: {
    alias: {
      "react": fileURLToPath(new URL("./packages/ui/node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("./packages/ui/node_modules/react-dom", import.meta.url)),
      "@pizzaos/domain": fileURLToPath(new URL("./packages/domain/src/index.ts", import.meta.url)),
      "@pizzaos/brand": fileURLToPath(new URL("./packages/brand/src/index.ts", import.meta.url)),
      "@pizzaos/mock-data": fileURLToPath(new URL("./packages/mock-data/src/index.ts", import.meta.url)),
      "@pizzaos/ui": fileURLToPath(new URL("./packages/ui/src/index.tsx", import.meta.url)),
      "@pizzaos/testing": fileURLToPath(new URL("./packages/testing/src/index.ts", import.meta.url)),
      "@testing-library/react": fileURLToPath(new URL("./packages/testing/node_modules/@testing-library/react/dist/index.js", import.meta.url)),
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: [fileURLToPath(new URL("./tests/vitest-setup.ts", import.meta.url))],
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "tests/**/*.test.ts",
      "tests/**/*.test.tsx",
      "apps/**/src/test/**/*.test.ts",
      "apps/**/src/test/**/*.test.tsx",
      "packages/**/src/**/*.test.ts",
      "services/**/src/**/*.test.ts",
      "packages/**/src/**/*.test.tsx"
    ],
    passWithNoTests: false
  }
});
