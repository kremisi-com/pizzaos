import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { planIsolatedDemoMenu, type IsolatedDemoMenuSource } from "./isolated-demo-menu";
import { createPostgresOrderingRepository } from "./postgres-repository";
import type { OrderingState } from "./ordering-contract";

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith("--"));
if (!file || args.some(arg => arg.startsWith("--") && arg !== "--apply")) {
  throw new Error("Uso: import-isolated-demo-menu.ts fonte.json [--apply]. Il default è analisi senza scritture.");
}
if (!process.env.DATABASE_URL || process.env.PIZZAOS_ENVIRONMENT !== "test") {
  throw new Error("Richiesti DATABASE_URL e PIZZAOS_ENVIRONMENT=test.");
}
const source: IsolatedDemoMenuSource = JSON.parse(await readFile(file, "utf8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const database = (await pool.query<{ name: string }>("SELECT current_database() AS name")).rows[0]?.name;
  if (database !== "pizzaos_test" || database !== source.database) throw new Error("Database di test non corrispondente.");
  const applied = args.includes("--apply");
  const report = applied ? await createPostgresOrderingRepository(pool).transact(snapshot => {
    const result = planIsolatedDemoMenu(snapshot, source);
    Object.assign(snapshot, result.state);
    return result.report;
  }) : planIsolatedDemoMenu((await pool.query<{ snapshot: OrderingState }>(
    "SELECT snapshot FROM individual_ordering_state WHERE id = 1"
  )).rows[0].snapshot, source).report;
  process.stdout.write(JSON.stringify({ database, applied, ...report }, null, 2) + "\n");
} finally { await pool.end(); }
