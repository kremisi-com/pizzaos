import type { DeliveryAddressSuggestion, IndividualStore } from "@pizzaos/domain";

export interface DeliveryAddressAutocomplete {
  search(query: string, store: Pick<IndividualStore, "id" | "latitude" | "longitude">): Promise<DeliveryAddressSuggestion[]>;
}

const resultLimit = 5;

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function getSuggestion(value: unknown): DeliveryAddressSuggestion | undefined {
  const result = record(value);
  const text = typeof result?.formatted === "string" ? result.formatted.trim() : "";
  if (!result || !text || text.length > 500) return;
  if (result.result_type === "street") return { kind: "street", text };
  if (result.result_type !== "building" && result.result_type !== "amenity") return;
  if (typeof result.housenumber !== "string" || !result.housenumber.trim()) return;
  const { lat, lon } = result;
  if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
    typeof lon !== "number" || !Number.isFinite(lon) || Math.abs(lon) > 180) return;
  return { kind: "address", text, latitude: lat, longitude: lon };
}

export function createGeoapifyAddressAutocomplete(apiKey: string): DeliveryAddressAutocomplete {
  return {
    async search(query, store) {
      const url = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
      url.search = new URLSearchParams({
        text: query, apiKey, lang: "it", format: "json", limit: String(resultLimit),
        bias: `proximity:${store.longitude},${store.latitude}`
      }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "error" });
      if (!response.ok) throw new Error("Ricerca indirizzi non disponibile.");
      const results = record(await response.json())?.results;
      if (!Array.isArray(results)) throw new Error("Risposta della ricerca indirizzi non valida.");
      const suggestions = new Map<string, DeliveryAddressSuggestion>();
      for (const result of results) {
        const suggestion = getSuggestion(result);
        if (suggestion && !suggestions.has(suggestion.text)) suggestions.set(suggestion.text, suggestion);
        if (suggestions.size === resultLimit) break;
      }
      return [...suggestions.values()];
    }
  };
}
