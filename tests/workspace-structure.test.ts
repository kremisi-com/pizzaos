import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const REQUIRED_PATHS = [
  "apps/landing/app/page.tsx",
  "apps/client/app/page.tsx",
  "apps/admin/app/page.tsx",
  "packages/brand/src/index.ts",
  "packages/ui/src/index.tsx",
  "packages/domain/src/index.ts",
  "packages/mock-data/src/index.ts",
  "packages/testing/src/index.ts",
  "packages/eslint-config/package.json",
  "packages/typescript-config/package.json"
];

describe("workspace structure", () =>
{
  it("contains required app and package entries", () =>
  {
    for (const filePath of REQUIRED_PATHS)
    {
      expect(existsSync(filePath)).toBe(true);
    }
  });
});
