import { describe, expect, it } from "vitest";
import {
  createInitialCustomizationState,
  customizationReducer,
  deriveCustomizationPrice,
  deriveVisibleAllergens,
  getPizzaPreviewImage,
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
        doughId: "dough-integrale"
      },
      {
        type: "set_base",
        baseId: "base-bianca"
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

    const breakdown = deriveCustomizationPrice("product-margherita", 900, configuredState);

    expect(breakdown).toEqual({
      basePriceCents: 900,
      doughDeltaCents: 120,
      variantDeltaCents: 300,
      ingredientDeltaCents: 120,
      extrasDeltaCents: 220,
      totalCents: 1660
    });
    expect(getPizzaPreviewImage({
      doughId: configuredState.selectedDoughId,
      baseId: configuredState.selectedBaseId
    })).toBe("/images/pizza/bianca-integrale.png");
  });

  it("maps dough ids to the preview asset filenames used on disk", () =>
  {
    expect(getPizzaPreviewImage({
      doughId: "dough-classico",
      baseId: "base-rossa"
    })).toBe("/images/pizza/rossa-classica.png");

    expect(getPizzaPreviewImage({
      doughId: "dough-5-cereali",
      baseId: "base-bianca"
    })).toBe("/images/pizza/bianca-5_cereali.png");
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
