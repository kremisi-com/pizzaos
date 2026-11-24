import { readFileSync, writeFileSync } from "node:fs";

const assets = {
  logo: "LOGO-ORIZZONTALE-PIZZAOS-COLOR", logoWhite: "LOGO-ORIZZONTALE-PIZZAOS-WHITE", logoBlack: "LOGO-ORIZZONTALE-PIZZAOS-BLACK",
  vertical: "LOGO-VERTICALE-PIZZAOS-COLOR", verticalWhite: "LOGO-VERTICALE-PIZZAOS-WHITE", verticalBlack: "LOGO-VERTICALE-PIZZAOS-BLACK",
  wordmark: "LOGOTIPO-PIZZAOS-COLOR", wordmarkWhite: "LOGOTIPO-PIZZAOS-WHITE", wordmarkBlack: "LOGOTIPO-PIZZAOS-BLACK",
  mark: "PITTOGRAMMA-PIZZAOS-COLOR", markWhite: "PITTOGRAMMA-PIZZAOS-WHITE", markBlack: "PITTOGRAMMA-PIZZAOS-BLACK",
  icon: "ICONA-PIZZAOS", pattern: "PATTERN"
};
const lines = Object.entries(assets).map(([name, file]) => `  ${name}: ${JSON.stringify(readFileSync(new URL(`../packages/brand/assets/${file}.svg`, import.meta.url), "utf8"))},`);
const output = [
  "// Generated from the original SVG kit with scripts/generate-brand-assets.mjs.",
  "const ORIGINAL_ASSETS = {", ...lines, "} as const;", "",
  "export const BRAND_ASSETS = Object.fromEntries(",
  "  Object.entries(ORIGINAL_ASSETS).map(([name, svg]) => [name, `data:image/svg+xml,${encodeURIComponent(svg)}`])",
  ") as { readonly [Name in keyof typeof ORIGINAL_ASSETS]: string };", ""
].join("\n");
writeFileSync(new URL("../packages/brand/src/assets.ts", import.meta.url), output);
