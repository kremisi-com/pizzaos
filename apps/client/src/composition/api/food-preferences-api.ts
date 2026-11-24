import type { FoodPreferences, FoodPreferencesApi } from "@pizzaos/domain";

const path = "/api/pilot/v1/pilot/food-preferences";

export function createFoodPreferencesApi(): FoodPreferencesApi {
  async function request(preferences?: FoodPreferences): Promise<FoodPreferences> {
    const response = await fetch(path, preferences ? {
      method: "PUT",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preferences)
    } : { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Preferenze alimentari non disponibili.");
    return response.json() as Promise<FoodPreferences>;
  }
  return { get: () => request(), save: request };
}
