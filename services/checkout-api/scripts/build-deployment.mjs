import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const serviceRoot = fileURLToPath(new URL("../", import.meta.url));
const workspaceRoot = path.resolve(serviceRoot, "../..");
const output = path.join(workspaceRoot, ".codex/deployments/pizzaos-api");
const sourcePackage = JSON.parse(await readFile(path.join(serviceRoot, "package.json"), "utf8"));
const dependencies = Object.fromEntries(Object.entries(sourcePackage.dependencies).filter(([, version]) => !version.startsWith("workspace:")));
// Auth.js still declares an older optional Nodemailer peer. Pin the patched
// transport used by our explicit sendVerificationRequest implementation.
const overrides = { "@auth/core": { nodemailer: "$nodemailer" } };
const packageJson = { name: "pizzaos-api-runtime", version: "0.1.0", private: true, type: "module", engines: { node: "24.x" }, dependencies, overrides };
await mkdir(path.join(output, "api"), { recursive: true });
await mkdir(path.join(output, "worker"), { recursive: true });
for (const [entry, target] of [["vercel-api.ts", "api/index.mjs"], ["worker.ts", "worker/index.mjs"]]) {
  await build({ entryPoints: [path.join(serviceRoot, "src", entry)], outfile: path.join(output, target),
    bundle: true, platform: "node", format: "esm", target: "node24", packages: "external", sourcemap: false });
}
await writeFile(path.join(output, "package.json"), JSON.stringify(packageJson, null, 2) + "\n");
await writeFile(path.join(output, "worker/package.json"), JSON.stringify(packageJson, null, 2) + "\n");
await writeFile(path.join(output, "worker/Dockerfile"), [
  "FROM node:24-slim", "WORKDIR /app", "COPY package.json package-lock.json ./",
  "RUN npm ci --omit=dev --ignore-scripts", "COPY index.mjs ./index.mjs", 'CMD ["node", "index.mjs"]', ""
].join("\n"));
await writeFile(path.join(output, "vercel.json"), JSON.stringify({
  $schema: "https://openapi.vercel.sh/vercel.json", version: 2, regions: ["fra1"],
  functions: { "api/index.mjs": { maxDuration: 300, memory: 1024 } },
  rewrites: [{ source: "/(.*)", destination: "/api/index" }],
  daemons: { reconciliation: {
    root: "worker", entrypoint: "Dockerfile", instances: { fra1: 1 },
    resources: { requests: { memory: "1Gi" } }, terminationGracePeriodSeconds: 50,
    livenessProbe: { httpGet: { port: 3005, path: "/health" }, initialDelaySeconds: 10 }
  } }
}, null, 2) + "\n");
process.stdout.write(`Artefatto backend creato in ${output}\nWorker pilota: una istanza minima; usare soltanto il piano Hobby gratuito e verificarne la quota residua prima del deploy.\n`);
