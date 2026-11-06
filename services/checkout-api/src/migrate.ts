import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL obbligatoria.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));
  process.stdout.write("Schema PizzaOS aggiornato.\n");
} finally { await pool.end(); }
