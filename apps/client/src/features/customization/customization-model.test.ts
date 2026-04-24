import { describe, expect, it } from "vitest";
import {
  deriveCustomizationPrice,
  deriveExtraPrice,
  type CustomizationState
} from "./customization-model";

describe("customization model - discount logic", () => {
  const baseState: CustomizationState = {
    currentStepIndex: 0,
    selectedDoughId: "dough-classico",
    selectedBaseId: "base-rossa",
    selectedVariantId: "variant-classica",
    ingredientModes: {},
    selectedExtraIds: []
  };

  it("calculates Simple bundle correctly (3 slots at 20%)", () => {
    const state: CustomizationState = {
      ...baseState,
      selectedExtraIds: ["extra-salsiccia", "extra-burrata", "extra-tonno", "extra-rucola"]
    };

    // Prices: salsiccia 210, burrata 220, tonno 190, rucola 110
    // Total original: 210 + 220 + 190 + 110 = 730
    // Discounts (Simple: 3 items at 20%):
    // 1. Burrata (220) -> 220 * 0.8 = 176
    // 2. Salsiccia (210) -> 210 * 0.8 = 168
    // 3. Tonno (190) -> 190 * 0.8 = 152
    // 4. Rucola (110) -> 110 (no discount)
    // Total discounted: 176 + 168 + 152 + 110 = 606

    const result = deriveCustomizationPrice("product-create-simple", 500, state);
    expect(result.extrasDeltaCents).toBe(606);
    expect(result.totalCents).toBe(500 + 606);
  });

  it("calculates Wild bundle correctly (5 slots at 40%)", () => {
    const state: CustomizationState = {
      ...baseState,
      selectedExtraIds: ["extra-salsiccia", "extra-burrata"]
    };

    // Prices: salsiccia 210, burrata 220
    // Discounts (Wild: 5 items at 40%):
    // 1. Burrata (220) -> 220 * 0.6 = 132
    // 2. Salsiccia (210) -> 210 * 0.6 = 126
    // Total discounted: 132 + 126 = 258

    const result = deriveCustomizationPrice("product-create-wild", 900, state);
    expect(result.extrasDeltaCents).toBe(258);
  });

  it("derives individual extra price correctly with discount", () => {
    const selectedExtraIds = ["extra-salsiccia", "extra-burrata", "extra-tonno"];
    
    // Burrata (220) is most expensive, should be 176 (20% off) for simple
    const price = deriveExtraPrice("product-create-simple", "extra-burrata", selectedExtraIds);
    expect(price).toBe(176);

    // Rucola (110) is not selected, should show regular price
    const regularPrice = deriveExtraPrice("product-create-simple", "extra-rucola", selectedExtraIds);
    expect(regularPrice).toBe(110);
  });
});
