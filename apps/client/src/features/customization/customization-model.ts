import type { ProductAllergen } from "@pizzaos/domain";

export type IngredientMode = "normale" | "extra" | "senza";

export interface DoughOption
{
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly priceDeltaCents: number;
  readonly allergens: readonly ProductAllergen[];
}

export interface VariantOption
{
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly priceDeltaCents: number;
}

export interface IngredientOption
{
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly extraPriceCents: number;
  readonly defaultMode: IngredientMode;
  readonly allergens: readonly ProductAllergen[];
}

export interface ExtraOption
{
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly priceCents: number;
  readonly allergens: readonly ProductAllergen[];
}

export interface PairingSuggestion
{
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priceCents: number;
}

export interface CustomizationStep
{
  readonly id: string;
  readonly title: string;
}

export const CUSTOMIZATION_STEPS: readonly CustomizationStep[] = [
  {
    id: "dough",
    title: "Impasto e base"
  },
  {
    id: "variant",
    title: "Variante e formato"
  },
  {
    id: "ingredients",
    title: "Ingredienti"
  },
  {
    id: "extras",
    title: "Extra"
  },
  {
    id: "summary",
    title: "Riepilogo"
  }
];

export const LAST_CUSTOMIZATION_STEP_INDEX = CUSTOMIZATION_STEPS.length - 1;

const ALLERGENS: Readonly<Record<string, ProductAllergen>> = {
  GLU: { code: "GLU", label: "Glutine" },
  LAT: { code: "LAT", label: "Lattosio" },
  PES: { code: "PES", label: "Pesce" },
  SOL: { code: "SOL", label: "Solfiti" }
};

export const DOUGH_OPTIONS: readonly DoughOption[] = [
  {
    id: "dough-classico",
    label: "Classico",
    description: "Bassa idratazione e bordo tradizionale.",
    priceDeltaCents: 0,
    allergens: [ALLERGENS.GLU]
  },
  {
    id: "dough-integrale",
    label: "Integrale",
    description: "Impasto ai cereali con maggiore croccantezza.",
    priceDeltaCents: 120,
    allergens: [ALLERGENS.GLU]
  },
  {
    id: "dough-senza-glutine",
    label: "Senza glutine",
    description: "Base dedicata con lavorazione separata.",
    priceDeltaCents: 200,
    allergens: [ALLERGENS.SOL]
  }
];

export const VARIANT_OPTIONS: readonly VariantOption[] = [
  {
    id: "variant-classica",
    label: "Classica 32 cm",
    description: "Formato standard consigliato.",
    priceDeltaCents: 0
  },
  {
    id: "variant-xl",
    label: "Formato XL 40 cm",
    description: "Porzione ampia, ideale da condividere.",
    priceDeltaCents: 300
  },
  {
    id: "variant-baby",
    label: "Formato baby 26 cm",
    description: "Formato ridotto per appetito leggero.",
    priceDeltaCents: -100
  }
];

export const INGREDIENT_OPTIONS: readonly IngredientOption[] = [
  {
    id: "ingredient-pomodoro",
    label: "Pomodoro San Marzano",
    description: "Base pomodoro della casa.",
    extraPriceCents: 40,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-fiordilatte",
    label: "Fiordilatte",
    description: "Latticino principale.",
    extraPriceCents: 120,
    defaultMode: "normale",
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "ingredient-basilico",
    label: "Basilico fresco",
    description: "Foglie fresche a fine cottura.",
    extraPriceCents: 30,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-olio",
    label: "Olio EVO",
    description: "Finitura olio extravergine.",
    extraPriceCents: 25,
    defaultMode: "normale",
    allergens: []
  }
];

export const EXTRA_OPTIONS: readonly ExtraOption[] = [
  {
    id: "extra-burrata",
    label: "Burrata cremosa",
    description: "Aggiunta a fine cottura.",
    priceCents: 220,
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "extra-olive-taggiasche",
    label: "Olive taggiasche",
    description: "Porzione extra di olive.",
    priceCents: 90,
    allergens: []
  },
  {
    id: "extra-acciughe",
    label: "Filetti di acciuga",
    description: "Selezione di acciughe in olio.",
    priceCents: 160,
    allergens: [ALLERGENS.PES]
  }
];

const DEFAULT_PAIRINGS: readonly PairingSuggestion[] = [
  {
    id: "pairing-birra-bionda",
    title: "Birra artigianale bionda",
    description: "Bottiglia 33cl, amaro leggero.",
    priceCents: 550
  },
  {
    id: "pairing-cola",
    title: "Cola zero",
    description: "Lattina 33cl fredda.",
    priceCents: 280
  }
];

const PAIRINGS_BY_PRODUCT_ID: Readonly<Record<string, readonly PairingSuggestion[]>> = {
  "product-4-formaggi": [
    {
      id: "pairing-ipa",
      title: "IPA luppolata",
      description: "Bilancia la componente cremosa.",
      priceCents: 620
    },
    {
      id: "pairing-miele-piccante",
      title: "Miele piccante",
      description: "Salsa dedicata per contrasti dolce/piccante.",
      priceCents: 180
    }
  ],
  "product-tonno-cipolla": [
    {
      id: "pairing-bionda-fresca",
      title: "Birra chiara fresca",
      description: "Profili puliti su ingredienti marini.",
      priceCents: 540
    },
    {
      id: "pairing-limone-zenzero",
      title: "Bibita limone e zenzero",
      description: "Bevanda analcolica 33cl.",
      priceCents: 320
    }
  ]
};

export interface CustomizationState
{
  readonly currentStepIndex: number;
  readonly selectedDoughId: string;
  readonly selectedVariantId: string;
  readonly ingredientModes: Readonly<Record<string, IngredientMode>>;
  readonly selectedExtraIds: readonly string[];
}

export type CustomizationAction =
  | {
    readonly type: "set_dough";
    readonly doughId: string;
  }
  | {
    readonly type: "set_variant";
    readonly variantId: string;
  }
  | {
    readonly type: "set_ingredient_mode";
    readonly ingredientId: string;
    readonly mode: IngredientMode;
  }
  | {
    readonly type: "toggle_extra";
    readonly extraId: string;
  }
  | {
    readonly type: "next_step";
  }
  | {
    readonly type: "previous_step";
  }
  | {
    readonly type: "go_to_step";
    readonly stepIndex: number;
  };

export interface CustomizationPriceBreakdown
{
  readonly basePriceCents: number;
  readonly doughDeltaCents: number;
  readonly variantDeltaCents: number;
  readonly ingredientDeltaCents: number;
  readonly extrasDeltaCents: number;
  readonly totalCents: number;
}

export function createInitialCustomizationState(): CustomizationState
{
  const defaultIngredientModes = Object.fromEntries(
    INGREDIENT_OPTIONS.map((ingredient) => [ingredient.id, ingredient.defaultMode])
  );

  return {
    currentStepIndex: 0,
    selectedDoughId: DOUGH_OPTIONS[0].id,
    selectedVariantId: VARIANT_OPTIONS[0].id,
    ingredientModes: defaultIngredientModes,
    selectedExtraIds: []
  };
}

export function customizationReducer(state: CustomizationState, action: CustomizationAction): CustomizationState
{
  switch (action.type)
  {
    case "set_dough":
      return {
        ...state,
        selectedDoughId: resolveDoughOption(action.doughId).id
      };
    case "set_variant":
      return {
        ...state,
        selectedVariantId: resolveVariantOption(action.variantId).id
      };
    case "set_ingredient_mode":
      if (!INGREDIENT_OPTIONS.some((ingredient) => ingredient.id === action.ingredientId))
      {
        return state;
      }

      return {
        ...state,
        ingredientModes: {
          ...state.ingredientModes,
          [action.ingredientId]: action.mode
        }
      };
    case "toggle_extra":
      if (!EXTRA_OPTIONS.some((extra) => extra.id === action.extraId))
      {
        return state;
      }

      return {
        ...state,
        selectedExtraIds: state.selectedExtraIds.includes(action.extraId)
          ? state.selectedExtraIds.filter((extraId) => extraId !== action.extraId)
          : [
            ...state.selectedExtraIds,
            action.extraId
          ]
      };
    case "next_step":
      return {
        ...state,
        currentStepIndex: clampStepIndex(state.currentStepIndex + 1)
      };
    case "previous_step":
      return {
        ...state,
        currentStepIndex: clampStepIndex(state.currentStepIndex - 1)
      };
    case "go_to_step":
      return {
        ...state,
        currentStepIndex: clampStepIndex(action.stepIndex)
      };
    default:
      return state;
  }
}

export function deriveCustomizationPrice(
  basePriceCents: number,
  state: CustomizationState
): CustomizationPriceBreakdown
{
  const doughDeltaCents = resolveDoughOption(state.selectedDoughId).priceDeltaCents;
  const variantDeltaCents = resolveVariantOption(state.selectedVariantId).priceDeltaCents;
  const ingredientDeltaCents = INGREDIENT_OPTIONS.reduce((accumulator, ingredient) =>
  {
    const mode = state.ingredientModes[ingredient.id] ?? ingredient.defaultMode;

    if (mode === "extra")
    {
      return accumulator + ingredient.extraPriceCents;
    }

    return accumulator;
  }, 0);

  const selectedExtraIds = new Set(state.selectedExtraIds);
  const extrasDeltaCents = EXTRA_OPTIONS.reduce((accumulator, extra) =>
  {
    if (!selectedExtraIds.has(extra.id))
    {
      return accumulator;
    }

    return accumulator + extra.priceCents;
  }, 0);

  return {
    basePriceCents,
    doughDeltaCents,
    variantDeltaCents,
    ingredientDeltaCents,
    extrasDeltaCents,
    totalCents: basePriceCents + doughDeltaCents + variantDeltaCents + ingredientDeltaCents + extrasDeltaCents
  };
}

export function deriveVisibleAllergens(
  baseAllergens: readonly ProductAllergen[],
  state: CustomizationState
): readonly ProductAllergen[]
{
  const allergensByCode = new Map<string, ProductAllergen>();

  for (const allergen of baseAllergens)
  {
    allergensByCode.set(allergen.code, allergen);
  }

  for (const allergen of resolveDoughOption(state.selectedDoughId).allergens)
  {
    allergensByCode.set(allergen.code, allergen);
  }

  for (const ingredient of INGREDIENT_OPTIONS)
  {
    const mode = state.ingredientModes[ingredient.id] ?? ingredient.defaultMode;

    if (mode === "senza")
    {
      continue;
    }

    for (const allergen of ingredient.allergens)
    {
      allergensByCode.set(allergen.code, allergen);
    }
  }

  const selectedExtraIds = new Set(state.selectedExtraIds);

  for (const extra of EXTRA_OPTIONS)
  {
    if (!selectedExtraIds.has(extra.id))
    {
      continue;
    }

    for (const allergen of extra.allergens)
    {
      allergensByCode.set(allergen.code, allergen);
    }
  }

  return Array.from(allergensByCode.values()).sort((left, right) => left.label.localeCompare(right.label, "it-IT"));
}

export function getPairingSuggestions(productId: string): readonly PairingSuggestion[]
{
  return PAIRINGS_BY_PRODUCT_ID[productId] ?? DEFAULT_PAIRINGS;
}

function clampStepIndex(stepIndex: number): number
{
  if (stepIndex < 0)
  {
    return 0;
  }

  if (stepIndex > LAST_CUSTOMIZATION_STEP_INDEX)
  {
    return LAST_CUSTOMIZATION_STEP_INDEX;
  }

  return stepIndex;
}

function resolveDoughOption(doughId: string): DoughOption
{
  return DOUGH_OPTIONS.find((option) => option.id === doughId) ?? DOUGH_OPTIONS[0];
}

function resolveVariantOption(variantId: string): VariantOption
{
  return VARIANT_OPTIONS.find((option) => option.id === variantId) ?? VARIANT_OPTIONS[0];
}
