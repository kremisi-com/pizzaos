import { afterEach, expect, it, vi } from "vitest";
import { createOpenCageStoreGeocoder } from "./store-address";

afterEach(() => vi.unstubAllGlobals());

it("offers only usable addresses and keeps the provider query out of its logs", async () => {
  const fetchOpenCage = vi.fn(async (url: URL) => {
    expect(url.origin).toBe("https://api.opencagedata.com");
    expect(url.searchParams.get("q")).toBe("Via Verdi 10, Torino");
    expect(url.searchParams.get("no_record")).toBe("1");
    return Response.json({ results: [
      { formatted: "Via Verdi, Torino", components: { _type: "road" }, geometry: { lat: 45.07, lng: 7.68 } },
      { formatted: "Via Verdi 10, Torino", components: { house_number: "10" }, geometry: { lat: 45.069, lng: 7.68 } },
      { formatted: "Cascina Verdi, Torino", components: { _type: "building", house_name: "Cascina Verdi" }, geometry: { lat: 45.08, lng: 7.7 } },
      { formatted: "Via Verdi 12, Torino", components: { house_number: "12" }, geometry: { lat: 100, lng: 7.68 } }
    ] });
  });
  vi.stubGlobal("fetch", fetchOpenCage);
  const geocoder = createOpenCageStoreGeocoder("provider-test-key", "confirmation-test-secret");

  await expect(geocoder.search("Via Verdi 10, Torino")).resolves.toEqual([
    { address: "Via Verdi 10, Torino", latitude: 45.069, longitude: 7.68 },
    { address: "Cascina Verdi, Torino", latitude: 45.08, longitude: 7.7 }
  ]);
});
