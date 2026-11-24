import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { planPizzaMenuMigration, type PizzaMenuMigration } from "./pizza-menu-migration";
import { createPostgresOrderingRepository } from "./postgres-repository";

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith("--"));
if (!file || args.filter(arg => !arg.startsWith("--")).length !== 1 || args.some(arg => arg.startsWith("--") && arg !== "--apply")) {
  throw new Error("Uso: migrate-pizza-menu.ts manifest.json [--apply]. Senza --apply esegue soltanto l'anteprima.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL obbligatoria.");
const source: PizzaMenuMigration = JSON.parse(await readFile(file, "utf8"));
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const apply = args.includes("--apply");
  const repository = createPostgresOrderingRepository(pool);
  const report = apply ? await repository.transact(snapshot => {
    const result = planPizzaMenuMigration(snapshot, source);
    Object.assign(snapshot, result.state);
    return result.report;
  }) : planPizzaMenuMigration((await pool.query("SELECT snapshot FROM individual_ordering_state WHERE id = 1")).rows[0]?.snapshot, source).report;
  process.stdout.write(JSON.stringify({ applied: apply, ...report }, null, 2) + "\n");
} finally { await pool.end(); }
