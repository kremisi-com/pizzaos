import { createHash } from "node:crypto";
import type { IndividualStore } from "@pizzaos/domain";

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

/** A configuration version survives JSONB key normalization and service restarts. */
export function storeConfigurationVersion(store: IndividualStore): string {
  const configuration = { ...store };
  delete configuration.configurationRevision;
  delete configuration.protectedOrderDates;
  return createHash("sha256").update(JSON.stringify(canonical(configuration))).digest("hex");
}
