import { afterEach, expect, it, vi } from "vitest";
import { createGeoapifyStoreGeocoder } from "./store-address";

afterEach(() => vi.unstubAllGlobals());

const query = "Via della Tessitura 30, Cavaria con Premezzo";
const address = "Via della Tessitura, 30, 21044 Cavaria con Premezzo VA, Italia";
const building = { formatted: address, result_type: "building", housenumber: "30", lat: 45.6934931, lon: 8.8033093 };
const geocoder = createGeoapifyStoreGeocoder("provider-test-key", "confirmation-test-secret");

it("finds complete addresses and named buildings, discarding imprecise and invalid results", async () => {
  const fetchGeoapify = vi.fn(async (url: URL, init: RequestInit) => {
    expect(url.origin + url.pathname).toBe("https://api.geoapify.com/v1/geocode/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      text: query, apiKey: "provider-test-key", lang: "it", format: "json", limit: "5"
    });
    expect(init.redirect).toBe("error");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    return Response.json({ results: [
      { ...building, formatted: "Via della Tessitura", result_type: "street", housenumber: undefined },
      building,
      { ...building, formatted: ` ${address} `, lat: 45.694 },
      { formatted: "Cascina Verdi, Varese", result_type: "building", name: "Cascina Verdi", lat: 45.82, lon: 8.83 },
      { ...building, formatted: "Ristorante Verdi, Via della Tessitura 30", result_type: "amenity" },
      { ...building, formatted: "Via della Tessitura 31", lat: 100 },
      { ...building, formatted: "Via della Tessitura, edificio senza civico", housenumber: " " },
      { ...building, formatted: "Varese", result_type: "city" },
      { ...building, formatted: "Piazza Verdi", result_type: "amenity", housenumber: undefined, name: "Piazza Verdi" }
    ] });
  });
  vi.stubGlobal("fetch", fetchGeoapify);

  await expect(geocoder.search(query)).resolves.toEqual([
    { address, latitude: building.lat, longitude: building.lon },
    { address: "Cascina Verdi, Varese", latitude: 45.82, longitude: 8.83 },
    { address: "Ristorante Verdi, Via della Tessitura 30", latitude: building.lat, longitude: building.lon }
  ]);
});

it("returns no candidates when the provider can locate only the street", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ results: [
    { formatted: "Via della Tessitura, Cavaria con Premezzo", result_type: "street", lat: 45.69, lon: 8.80 }
  ] })));
  await expect(geocoder.search(query)).resolves.toEqual([]);
});

it("distinguishes provider errors from empty results", async () => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(null, { status: 429 }))
    .mockResolvedValueOnce(Response.json({ results: null })));

  await expect(geocoder.search(query)).rejects.toThrow("Ricerca indirizzi non disponibile.");
  await expect(geocoder.search(query)).rejects.toThrow("Risposta di geocodifica non valida.");
});
