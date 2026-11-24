import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { reconcileMenuImport, validateMenuImportSource } from "./menu-import";
import { createPostgresOrderingRepository } from "./postgres-repository";

const args = process.argv.slice(2);
const file = args.find(arg => !arg.startsWith("--"));
if (!file || args.some(arg => arg.startsWith("--") && arg !== "--apply")) {
  throw new Error("Uso: import-menu.ts fonte.json [--apply]. Senza --apply esegue soltanto l'analisi.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL obbligatoria.");
const source: unknown = JSON.parse(await readFile(file, "utf8"));
validateMenuImportSource(source);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const repository = createPostgresOrderingRepository(pool);
  const apply = args.includes("--apply");
  const report = apply ? await repository.transact(snapshot => {
    const result = reconcileMenuImport(snapshot, source);
    Object.assign(snapshot, result.state);
    return result.report;
  }) : reconcileMenuImport((await pool.query("SELECT snapshot FROM individual_ordering_state WHERE id = 1")).rows[0]?.snapshot, source).report;
  process.stdout.write(JSON.stringify({ applied: apply, ...report, verification: source.provenance?.notes ?? [] }, null, 2) + "\n");
} finally { await pool.end(); }
