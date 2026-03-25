import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSourceFile(sourcePath: string): string
{
  return readFileSync(sourcePath, "utf8");
}

function listSourceFiles(rootDirectoryPath: string): string[]
{
  const discoveredPaths: string[] = [];
  const directoryEntries = readdirSync(rootDirectoryPath, { withFileTypes: true });

  for (const entry of directoryEntries)
  {
    const entryPath = `${rootDirectoryPath}/${entry.name}`;
    if (entry.isDirectory())
    {
      discoveredPaths.push(...listSourceFiles(entryPath));
      continue;
    }

    const isSourceFile = entryPath.endsWith(".ts") || entryPath.endsWith(".tsx");
    if (entry.isFile() && isSourceFile)
    {
      discoveredPaths.push(entryPath);
    }
  }

  return discoveredPaths;
}

function getImports(sourceCode: string): string[]
{
  const importPattern = /from\s+["']([^"']+)["']/g;
  const imports: string[] = [];

  for (const match of sourceCode.matchAll(importPattern))
  {
    imports.push(match[1]);
  }

  return imports;
}

function isPackageSourcePath(filePath: string): boolean
{
  return filePath.startsWith("packages/");
}

function isAppSourcePath(filePath: string): boolean
{
  return filePath.startsWith("apps/");
}

const SOURCE_FILES = [
  ...listSourceFiles("apps"),
  ...listSourceFiles("packages")
];

describe("import boundaries", () =>
{
  it("prevents shared packages from importing app code", () =>
  {
    const packageFiles = SOURCE_FILES.filter(isPackageSourcePath);
    for (const packageFile of packageFiles)
    {
      const imports = getImports(readSourceFile(packageFile));
      for (const importedPath of imports)
      {
        expect(importedPath.startsWith("@/")).toBe(false);
        expect(importedPath.includes("apps/")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/landing")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/client")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/admin")).toBe(false);
      }
    }
  });

  it("prevents apps from importing from other app code", () =>
  {
    const appFiles = SOURCE_FILES.filter(isAppSourcePath);
    for (const appFile of appFiles)
    {
      const imports = getImports(readSourceFile(appFile));
      for (const importedPath of imports)
      {
        expect(importedPath.startsWith("@pizzaos/landing")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/client")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/admin")).toBe(false);
      }
    }
  });

  it("prevents deep source imports for shared packages", () =>
  {
    for (const sourceFile of SOURCE_FILES)
    {
      const imports = getImports(readSourceFile(sourceFile));
      for (const importedPath of imports)
      {
        expect(importedPath.startsWith("@pizzaos/brand/src")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/ui/src")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/domain/src")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/mock-data/src")).toBe(false);
        expect(importedPath.startsWith("@pizzaos/testing/src")).toBe(false);
      }
    }
  });
});
