import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set(["node_modules", ".next", "dist", ".turbo"]);
const importPattern = /(?:\bfrom\s*|\bimport\s*\(|\bimport\s*|\brequire\s*\()\s*["']([^"']+)["']/g;

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return ignoredDirectories.has(entry.name) ? [] : collectSourceFiles(entryPath);
    }
    return sourceExtensions.has(extname(entry.name)) ? [entryPath] : [];
  });
}

function getOwner(filePath, workspaceRoot) {
  const parts = relative(workspaceRoot, filePath).split(sep);
  if (!["apps", "packages", "services"].includes(parts[0]) || !parts[1]) {
    return null;
  }
  return { category: parts[0], name: parts[1], parts };
}

export function findBoundaryViolations(filePath, source, workspaceRoot) {
  const owner = getOwner(filePath, workspaceRoot);
  if (!owner) return [];

  const violations = [];
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    let target = null;
    if (specifier.startsWith(".")) {
      target = getOwner(resolve(dirname(filePath), specifier), workspaceRoot);
    } else if (specifier.startsWith("@pizzaos/")) {
      const [, packageName, ...rest] = specifier.split("/");
      if (rest.length > 0) {
        violations.push(`${specifier}: deep package import`);
      }
      target = { category: "packages", name: packageName };
    } else if (specifier.startsWith("@/")) {
      target = { category: owner.category, name: owner.name, parts: [...owner.parts.slice(0, 2), "src", ...specifier.slice(2).split("/")] };
    } else if (specifier.startsWith("apps/") || specifier.startsWith("services/")) {
      const parts = specifier.split("/");
      target = { category: parts[0], name: parts[1], parts };
    }

    if (!target) continue;
    if (owner.category === "packages" && target.category !== "packages") {
      violations.push(`${specifier}: shared package imports application or service code`);
    }
    if (owner.category === "apps" && target.category === "apps" && target.name !== owner.name) {
      violations.push(`${specifier}: app imports another app`);
    }
    if (owner.category === "apps" && target.category === "services") {
      violations.push(`${specifier}: app imports service implementation`);
    }
    if (owner.category === "apps" && owner.name === "admin" && owner.parts[2] === "src" && owner.parts[3] === "features" && target.parts?.includes("composition")) {
      violations.push(`${specifier}: admin feature imports app composition`);
    }
  }
  return violations;
}

export function checkArchitecture(workspaceRoot) {
  const violations = [];
  const sourceFiles = [];
  for (const category of ["apps", "packages", "services"]) {
    sourceFiles.push(...collectSourceFiles(join(workspaceRoot, category)));
  }
  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, "utf8");
    for (const violation of findBoundaryViolations(filePath, source, workspaceRoot)) {
      violations.push(`${relative(workspaceRoot, filePath)}: ${violation}`);
    }
  }
  violations.push(...findCircularDependencies(sourceFiles, workspaceRoot));
  return violations;
}

function findCircularDependencies(sourceFiles, workspaceRoot) {
  const graph = new Map();
  const knownFiles = new Set(sourceFiles);
  for (const filePath of sourceFiles) {
    const owner = getOwner(filePath, workspaceRoot);
    const dependencies = [];
    for (const match of readFileSync(filePath, "utf8").matchAll(importPattern)) {
      const specifier = match[1];
      let basePath;
      if (specifier.startsWith(".")) {
        basePath = resolve(dirname(filePath), specifier);
      } else if (specifier.startsWith("@/") && owner?.category === "apps") {
        basePath = join(workspaceRoot, "apps", owner.name, "src", specifier.slice(2));
      } else if (specifier.startsWith("@pizzaos/")) {
        basePath = join(workspaceRoot, "packages", specifier.slice("@pizzaos/".length), "src", "index");
      } else {
        continue;
      }
      const candidates = [
        basePath,
        ...[".ts", ".tsx", ".js", ".mjs"].map((extension) => `${basePath}${extension}`),
        join(basePath, "index.ts"),
        join(basePath, "index.tsx")
      ];
      const dependency = candidates.find((candidate) => knownFiles.has(candidate) && existsSync(candidate));
      if (dependency) dependencies.push(dependency);
    }
    graph.set(filePath, dependencies);
  }

  const visited = new Set();
  const active = new Set();
  const stack = [];
  const cycles = new Set();
  function visit(filePath) {
    if (active.has(filePath)) {
      const cycle = [...stack.slice(stack.indexOf(filePath)), filePath];
      cycles.add(cycle.map((path) => relative(workspaceRoot, path)).join(" -> "));
      return;
    }
    if (visited.has(filePath)) return;
    visited.add(filePath);
    active.add(filePath);
    stack.push(filePath);
    for (const dependency of graph.get(filePath) ?? []) visit(dependency);
    stack.pop();
    active.delete(filePath);
  }
  for (const filePath of sourceFiles) visit(filePath);
  return [...cycles].map((cycle) => `circular dependency: ${cycle}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const violations = checkArchitecture(workspaceRoot);
  if (violations.length > 0) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write("Architecture boundaries pass.\n");
  }
}
