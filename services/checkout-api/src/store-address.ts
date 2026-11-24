import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { IndividualStore } from "@pizzaos/domain";

type StoreLocation = Pick<IndividualStore, "latitude" | "longitude"> & { address: string };

export interface StoreAddressGeocoder {
  search(query: string): Promise<StoreLocation[]>;
  signingSecret: string;
}

export const storeAddressLimit = 300;
const confirmationLifetime = 15 * 60_000;

export function storeLocationKey(store: Pick<IndividualStore, "address" | "latitude" | "longitude"> | undefined): string | null {
  return store ? createHash("sha256").update(JSON.stringify([store.address ?? null, store.latitude, store.longitude])).digest("base64url") : null;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update("pizzaos:store-address:v1:").update(payload).digest();
}

export function addressConfirmation(location: StoreLocation, actorId: string, storeId: string,
  previous: string | null, now: number, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ location, actorId, storeId, previous, expiresAt: now + confirmationLifetime })).toString("base64url");
  return `${payload}.${sign(payload, secret).toString("base64url")}`;
}

export function readAddressConfirmation(confirmation: string, actorId: string, storeId: string, now: number, secret: string) {
  if (typeof confirmation !== "string" || !/^[\w-]{1,4000}\.[\w-]{43}$/.test(confirmation)) return null;
  const separator = confirmation.indexOf(".");
  const payload = confirmation.slice(0, separator);
  const signature = sign(payload, secret);
  const supplied = confirmation.slice(separator + 1);
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(signature.toString("base64url")))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      location: StoreLocation; actorId: string; storeId: string; previous: string | null; expiresAt: number;
    };
    if (parsed.actorId !== actorId || parsed.storeId !== storeId || parsed.expiresAt <= now) return null;
    return parsed;
  } catch {
    return null;
  }
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function parseLocation(value: unknown): StoreLocation | undefined {
  const result = object(value);
  if (!result || (result.result_type !== "building" && result.result_type !== "amenity")) return;
  const { housenumber, name, lat: latitude, lon: longitude } = result;
  const address = typeof result.formatted === "string" ? result.formatted.trim() : "";
  const hasNumber = typeof housenumber === "string" && housenumber.trim().length > 0;
  const hasNamedBuilding = result.result_type === "building" && typeof name === "string" && name.trim().length > 0;
  if (!hasNumber && !hasNamedBuilding) return;
  if (!address || address.length > storeAddressLimit ||
    typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return;
  return { address, latitude, longitude };
}

export function createGeoapifyStoreGeocoder(apiKey: string, signingSecret: string): StoreAddressGeocoder {
  return {
    signingSecret,
    async search(query) {
      const url = new URL("https://api.geoapify.com/v1/geocode/search");
      url.search = new URLSearchParams({
        text: query, apiKey, lang: "it", format: "json", limit: "5"
      }).toString();
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error("Ricerca indirizzi non disponibile.");
      const results = object(await response.json())?.results;
      if (!Array.isArray(results)) throw new Error("Risposta di geocodifica non valida.");
      const matches = new Map<string, StoreLocation>();
      for (const result of results) {
        const location = parseLocation(result);
        if (location && !matches.has(location.address)) matches.set(location.address, location);
      }
      return [...matches.values()];
    }
  };
}
