import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const REQUIRED_README_PATHS = [
  "README.md",
  "apps/landing/README.md",
  "apps/client/README.md",
  "apps/admin/README.md",
  "packages/brand/README.md",
  "packages/ui/README.md",
  "packages/domain/README.md",
  "packages/mock-data/README.md",
  "packages/testing/README.md",
  "packages/eslint-config/README.md",
  "packages/typescript-config/README.md"
];

const PACKAGE_ENTRY_FILES = [
  "packages/brand/src/index.ts",
  "packages/ui/src/index.tsx",
  "packages/domain/src/index.ts",
  "packages/mock-data/src/index.ts",
  "packages/testing/src/index.ts"
];

const PACKAGE_JSON_PATHS = [
  "packages/brand/package.json",
  "packages/ui/package.json",
  "packages/domain/package.json",
  "packages/mock-data/package.json",
  "packages/testing/package.json"
];

function getPackageExportPath(packageJsonPath: string): string
{
  const packageJsonContent = readFileSync(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonContent) as { exports: string | Record<string, string> };
  if (typeof packageJson.exports === "string")
  {
    return packageJson.exports;
  }

  throw new Error(`Expected string exports in ${packageJsonPath}`);
}

describe("repository documentation and package entries", () =>
{
  it("contains required readme files", () =>
  {
    for (const readmePath of REQUIRED_README_PATHS)
    {
      expect(existsSync(readmePath)).toBe(true);
    }
  });

  it("contains package entry files for shared runtime packages", () =>
  {
    for (const entryPath of PACKAGE_ENTRY_FILES)
    {
      expect(existsSync(entryPath)).toBe(true);
    }
  });

  it("points package exports to existing entry files", () =>
  {
    for (const packageJsonPath of PACKAGE_JSON_PATHS)
    {
      const exportPath = getPackageExportPath(packageJsonPath);
      const baseDirectory = packageJsonPath.replace("/package.json", "");
      const resolvedExportPath = `${baseDirectory}/${exportPath.replace("./", "")}`;
      expect(existsSync(resolvedExportPath)).toBe(true);
    }
  });
});
