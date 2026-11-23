// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { createGeoapifyAddressAutocomplete } from "./delivery-address-autocomplete";

const store = { id: "torino", latitude: 45.07, longitude: 7.68 };

afterEach(() => vi.unstubAllGlobals());

it("biases a free-text search near the current store and separates streets from usable delivery points", async () => {
  const fetchGeoapify = vi.fn(async (url: URL, init: RequestInit) => {
    expect(url.origin + url.pathname).toBe("https://api.geoapify.com/v1/geocode/autocomplete");
    expect(url.searchParams.get("text")).toBe("Via dell’Acqua");
    expect(url.searchParams.get("lang")).toBe("it");
    expect(url.searchParams.get("bias")).toBe("proximity:7.68,45.07");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return Response.json({ results: [
      { result_type: "city", formatted: "Torino", lat: 45.07, lon: 7.68 },
      { result_type: "street", formatted: "Via dell’Acqua, Torino", lat: 45.07, lon: 7.68 },
      { result_type: "building", formatted: "Via dell’Acqua 12, Torino", housenumber: "12", lat: 45.08, lon: 7.69 },
      { result_type: "building", formatted: "Via dell’Acqua 12, Torino", housenumber: "12", lat: 45.08, lon: 7.69 },
      { result_type: "building", formatted: "Via dell’Acqua 14, Torino", housenumber: "14", lat: 100, lon: 7.69 },
      { result_type: "building", formatted: "Via dell’Acqua, Torino", lat: 45.08, lon: 7.69 }
    ] });
  });
  vi.stubGlobal("fetch", fetchGeoapify);

  await expect(createGeoapifyAddressAutocomplete("test-key").search("Via dell’Acqua", store)).resolves.toEqual([
    { kind: "street", text: "Via dell’Acqua, Torino" },
    { kind: "address", text: "Via dell’Acqua 12, Torino", latitude: 45.08, longitude: 7.69 }
  ]);
  expect(fetchGeoapify).toHaveBeenCalledOnce();
});

it("treats quota and invalid provider responses as provider errors", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(Response.json({ results: null })));
  const autocomplete = createGeoapifyAddressAutocomplete("test-key");

  await expect(autocomplete.search("Via Ver", store)).rejects.toThrow();
  await expect(autocomplete.search("Via Ver", store)).rejects.toThrow();
});
