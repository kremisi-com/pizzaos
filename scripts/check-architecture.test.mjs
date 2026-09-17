import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { findBoundaryViolations } from "./check-architecture.mjs";

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
