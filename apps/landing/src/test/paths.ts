import { existsSync } from "node:fs";
import { resolve } from "node:path";

const landingRoot = existsSync(resolve(process.cwd(), "apps/landing/public"))
  ? resolve(process.cwd(), "apps/landing")
  : process.cwd();

export function resolveLandingPath(...segments: string[]): string {
  return resolve(landingRoot, ...segments);
}
