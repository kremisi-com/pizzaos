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
  const geometry = object(result?.geometry);
  const components = object(result?.components);
  const address = typeof result?.formatted === "string" ? result.formatted.trim() : "";
  const latitude = geometry?.lat;
  const longitude = geometry?.lng;
  // A street or city centroid is not precise enough to anchor delivery zones.
  const houseNumber = components?.house_number;
  const buildingName = components?.house_name ?? components?.building;
  const hasNumber = typeof houseNumber === "string" && houseNumber.trim();
  const hasNamedBuilding = components?._type === "building" && typeof buildingName === "string" && buildingName.trim();
  if (!hasNumber && !hasNamedBuilding) return;
  if (!address || address.length > storeAddressLimit ||
    typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180) return;
  return { address, latitude, longitude };
}

export function createOpenCageStoreGeocoder(key: string, signingSecret: string): StoreAddressGeocoder {
  return {
    signingSecret,
    async search(query) {
      const url = new URL("https://api.opencagedata.com/geocode/v1/json");
      url.search = new URLSearchParams({
        q: query, key, language: "it", limit: "5", address_only: "1", no_annotations: "1", no_record: "1"
      }).toString();
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(5000) });
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
