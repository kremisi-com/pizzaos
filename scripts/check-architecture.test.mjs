import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { checkArchitecture, findBoundaryViolations } from "./check-architecture.mjs";

const workspaceRoot = resolve(import.meta.dirname, "..");

test("reports a shared package importing an app", () => {
  const file = resolve(workspaceRoot, "packages/domain/src/index.ts");
  const violations = findBoundaryViolations(file, 'import "../../../apps/client/src/app";', workspaceRoot);
  assert.match(violations.join(" "), /shared package imports application/);
});

test("reports cross-app and deep package imports", () => {
  const file = resolve(workspaceRoot, "apps/admin/src/features/orders/orders.ts");
  const source = 'import "../../../../client/src/features/cart/cart-model"; import "@pizzaos/domain/src/index";';
  const violations = findBoundaryViolations(file, source, workspaceRoot);
  assert.match(violations.join(" "), /app imports another app/);
  assert.match(violations.join(" "), /deep package import/);
});

test("allows an app composition module to coordinate its own features", () => {
  const file = resolve(workspaceRoot, "apps/admin/src/composition/admin-shell.tsx");
  const violations = findBoundaryViolations(file, 'import "../features/orders/components/orders-dashboard";', workspaceRoot);
  assert.deepEqual(violations, []);
});

test("ignores isolated Next build output while still checking application sources", () => {
  const prefix = resolve(tmpdir(), "pizzaos-architecture-");
  const root = mkdtempSync(prefix);
  try {
    for (const directory of ["apps/client/.next-menu-ordering-e2e/server", "apps/client/src", "packages", "services"]) {
      mkdirSync(resolve(root, directory), { recursive: true });
    }
    writeFileSync(resolve(root, "apps/client/.next-menu-ordering-e2e/server/generated.js"), 'import "services/private";');
    assert.deepEqual(checkArchitecture(root), []);
    writeFileSync(resolve(root, "apps/client/src/source.ts"), 'import "services/private";');
    assert.match(checkArchitecture(root).join(" "), /app imports service implementation/);
  } finally {
    assert.ok(resolve(root).startsWith(prefix));
    rmSync(root, { recursive: true, force: true });
  }
});
