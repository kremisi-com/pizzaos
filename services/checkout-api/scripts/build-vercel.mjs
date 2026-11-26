import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";
import "./build-deployment.mjs";

const destination = new URL("../dist/", import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(new URL("../../../.codex/deployments/pizzaos-api/api/index.mjs", import.meta.url),
  new URL("api.mjs", destination));
process.stdout.write(`Bundle HTTP Vercel creato in ${fileURLToPath(destination)}\n`);
