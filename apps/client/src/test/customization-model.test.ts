import { describe, expect, it } from "vitest";
import {
  createInitialCustomizationState,
  customizationReducer,
  deriveCustomizationPrice,
  deriveVisibleAllergens,
  type CustomizationAction
} from "../features/customization/customization-model";
import { createClientSeed } from "@pizzaos/mock-data";

describe("customization model", () =>
{
  it("computes total price with dough, variant, ingredients and extras", () =>
  {
    const initialState = createInitialCustomizationState();
    const actions: readonly CustomizationAction[] = [
      {
        type: "set_dough",
        doughId: "dough-senza-glutine"
      },
      {
        type: "set_variant",
        variantId: "variant-xl"
      },
      {
        type: "set_ingredient_mode",
        ingredientId: "ingredient-fiordilatte",
        mode: "extra"
      },
      {
        type: "toggle_extra",
        extraId: "extra-burrata"
      }
    ];
    const configuredState = actions.reduce(customizationReducer, initialState);

    const breakdown = deriveCustomizationPrice(900, configuredState);

    expect(breakdown).toEqual({
      basePriceCents: 900,
      doughDeltaCents: 200,
      variantDeltaCents: 300,
      ingredientDeltaCents: 120,
      extrasDeltaCents: 220,
      totalCents: 1740
    });
  });

  it("keeps step progression clamped and extends visible allergens with selected options", () =>
  {
    const seed = createClientSeed();
    const baseProduct = seed.products.find((product) => product.id === "product-margherita");

    expect(baseProduct).toBeDefined();

    const outOfBoundsState = customizationReducer(createInitialCustomizationState(), {
      type: "go_to_step",
      stepIndex: 99
    });
    const configuredState = customizationReducer(outOfBoundsState, {
      type: "toggle_extra",
      extraId: "extra-acciughe"
    });
    const visibleAllergens = deriveVisibleAllergens(baseProduct!.allergens, configuredState);

    expect(configuredState.currentStepIndex).toBe(4);
    expect(visibleAllergens.map((allergen) => allergen.label)).toEqual([
      "Glutine",
      "Lattosio",
      "Pesce"
    ]);
  });
});
