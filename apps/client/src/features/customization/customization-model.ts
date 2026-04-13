import type { ProductAllergen } from "@pizzaos/domain";

export type IngredientMode = "normale" | "extra" | "senza";

export interface DoughOption
{
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly priceDeltaCents: number;
  readonly allergens: readonly ProductAllergen[];
}

export interface PizzaBaseOption
{
  readonly id: string;
  readonly label: string;
  readonly description: string;
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
  readonly categoryId: string;
  readonly label: string;
  readonly description: string;
  readonly priceCents: number;
  readonly allergens: readonly ProductAllergen[];
}

export interface ExtraCategory
{
  readonly id: string;
  readonly title: string;
}

export interface PairingSuggestion
{
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly priceCents: number;
}

export interface BundleConfig
{
  readonly discountQuota: number;
  readonly discountRate: number;
}

export const BUNDLE_CONFIGS: Readonly<Record<string, BundleConfig>> = {
  "product-create-simple": { discountQuota: 3, discountRate: 0.2 },
  "product-create-wild": { discountQuota: 5, discountRate: 0.4 },
  "product-create-savage": { discountQuota: 7, discountRate: 0.5 }
};

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

export const ALLERGEN_EMOJI_MAP: Readonly<Record<string, string>> = {
  GLU: "🌾",
  LAT: "🥛",
  PES: "🐟",
  SOL: "🍷"
};

export const DOUGH_OPTIONS: readonly DoughOption[] = [
  {
    id: "dough-classico",
    label: "Classico",
    icon: "🫓",
    description: "Bassa idratazione e bordo tradizionale.",
    priceDeltaCents: 0,
    allergens: [ALLERGENS.GLU]
  },
  {
    id: "dough-integrale",
    label: "Integrale",
    icon: "🌱",
    description: "Impasto ai cereali con maggiore croccantezza.",
    priceDeltaCents: 120,
    allergens: [ALLERGENS.GLU]
  },
  {
    id: "dough-5-cereali",
    label: "5 Cereali",
    icon: "🌾",
    description: "Mix di farine multicereali per un sapore rustico.",
    priceDeltaCents: 150,
    allergens: [ALLERGENS.GLU]
  }
];

export const PIZZA_BASE_OPTIONS: readonly PizzaBaseOption[] = [
  {
    id: "base-rossa",
    label: "Rossa",
    description: "Pomodoro San Marzano e profilo piu tradizionale."
  },
  {
    id: "base-bianca",
    label: "Bianca",
    description: "Senza pomodoro, piu cremosa e delicata."
  }
];

const TOPPING_IMAGE_BY_PRODUCT_ID: Readonly<Record<string, string>> = {
  "product-marinara": "/images/topping/marinara.png",
  "product-margherita": "/images/topping/margherita.png",
  "product-diavola": "/images/topping/diavola.png",
  "product-capricciosa": "/images/topping/capricciosa.png",
  "product-vegetariana": "/images/topping/vegetariana.png",
  "product-4-formaggi": "/images/topping/formaggi.png",
  "product-tonno-cipolla": "/images/topping/tonno.png"
};

export function getProductToppingImage(productId: string): string | undefined
{
  return TOPPING_IMAGE_BY_PRODUCT_ID[productId];
}

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
  },
  {
    id: "ingredient-aglio",
    label: "Aglio italiano",
    description: "Lamelle leggere dal profilo deciso.",
    extraPriceCents: 20,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-origano",
    label: "Origano mediterraneo",
    description: "Profumo secco che completa la base rossa.",
    extraPriceCents: 15,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-spianata",
    label: "Spianata piccante",
    description: "Fette sottili con speziatura viva.",
    extraPriceCents: 160,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-peperoncino",
    label: "Peperoncino rosso",
    description: "Piccantezza pulita distribuita in uscita.",
    extraPriceCents: 25,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-prosciutto-cotto",
    label: "Prosciutto cotto arrosto",
    description: "Fette morbide dal gusto delicato.",
    extraPriceCents: 140,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-funghi",
    label: "Funghi champignon",
    description: "Saltati rapidamente per restare succosi.",
    extraPriceCents: 110,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-carciofi",
    label: "Carciofi a spicchi",
    description: "Cuori teneri dal finale erbaceo.",
    extraPriceCents: 120,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-olive",
    label: "Olive taggiasche",
    description: "Nota sapida che chiude la ricetta.",
    extraPriceCents: 80,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-verdure-grigliate",
    label: "Verdure grigliate",
    description: "Selezione stagionale con tostatura leggera.",
    extraPriceCents: 150,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-olio-basilico",
    label: "Olio al basilico",
    description: "Finitura aromatica dal profilo fresco.",
    extraPriceCents: 35,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-gorgonzola",
    label: "Gorgonzola dolce",
    description: "Cremosita intensa a supporto dei formaggi.",
    extraPriceCents: 140,
    defaultMode: "normale",
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "ingredient-fontina",
    label: "Fontina valdostana",
    description: "Pasta morbida con fusione avvolgente.",
    extraPriceCents: 130,
    defaultMode: "normale",
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "ingredient-parmigiano",
    label: "Parmigiano Reggiano",
    description: "Scaglie fini per una chiusura sapida.",
    extraPriceCents: 90,
    defaultMode: "normale",
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "ingredient-tonno",
    label: "Tonno del Mediterraneo",
    description: "Sfilacciato a mano per un morso piu pulito.",
    extraPriceCents: 170,
    defaultMode: "normale",
    allergens: [ALLERGENS.PES]
  },
  {
    id: "ingredient-cipolla-rossa",
    label: "Cipolla rossa",
    description: "Taglio sottile per una dolcezza piu elegante.",
    extraPriceCents: 50,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-ricotta",
    label: "Ricotta fresca",
    description: "Ripieno soffice e lattico.",
    extraPriceCents: 120,
    defaultMode: "normale",
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "ingredient-salame-dolce",
    label: "Salame dolce",
    description: "Macinatura fine dal profilo rotondo.",
    extraPriceCents: 150,
    defaultMode: "normale",
    allergens: []
  },
  {
    id: "ingredient-provola",
    label: "Provola affumicata",
    description: "Fusione elastica con finale affumicato.",
    extraPriceCents: 130,
    defaultMode: "normale",
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "ingredient-rosmarino",
    label: "Rosmarino fresco",
    description: "Aghi fragranti su focaccia calda.",
    extraPriceCents: 20,
    defaultMode: "normale",
    allergens: []
  }
];

const INGREDIENT_OPTIONS_BY_ID: Readonly<Record<string, IngredientOption>> = Object.fromEntries(
  INGREDIENT_OPTIONS.map((ingredient) => [ingredient.id, ingredient])
);

const PRODUCT_INGREDIENT_IDS: Readonly<Record<string, readonly string[]>> = {
  "product-marinara": [
    "ingredient-pomodoro",
    "ingredient-aglio",
    "ingredient-origano",
    "ingredient-olio"
  ],
  "product-margherita": [
    "ingredient-pomodoro",
    "ingredient-fiordilatte",
    "ingredient-basilico",
    "ingredient-olio"
  ],
  "product-diavola": [
    "ingredient-pomodoro",
    "ingredient-fiordilatte",
    "ingredient-spianata",
    "ingredient-peperoncino"
  ],
  "product-capricciosa": [
    "ingredient-pomodoro",
    "ingredient-fiordilatte",
    "ingredient-prosciutto-cotto",
    "ingredient-funghi",
    "ingredient-carciofi",
    "ingredient-olive"
  ],
  "product-vegetariana": [
    "ingredient-pomodoro",
    "ingredient-fiordilatte",
    "ingredient-verdure-grigliate",
    "ingredient-olio-basilico"
  ],
  "product-4-formaggi": [
    "ingredient-fiordilatte",
    "ingredient-gorgonzola",
    "ingredient-fontina",
    "ingredient-parmigiano"
  ],
  "product-tonno-cipolla": [
    "ingredient-pomodoro",
    "ingredient-tonno",
    "ingredient-cipolla-rossa",
    "ingredient-olio"
  ],
  "product-calzone": [
    "ingredient-ricotta",
    "ingredient-salame-dolce",
    "ingredient-provola"
  ],
  "product-focaccia-rosmarino": [
    "ingredient-olio",
    "ingredient-rosmarino"
  ]
};

export const EXTRA_OPTIONS: readonly ExtraOption[] = [
  {
    id: "extra-olive-taggiasche",
    categoryId: "vegetali",
    label: "Olive taggiasche",
    description: "Porzione extra di olive.",
    priceCents: 90,
    allergens: []
  },
  {
    id: "extra-funghi-trifolati",
    categoryId: "vegetali",
    label: "Funghi trifolati",
    description: "Funghi saltati con prezzemolo e aglio.",
    priceCents: 140,
    allergens: []
  },
  {
    id: "extra-rucola",
    categoryId: "vegetali",
    label: "Rucola fresca",
    description: "Aggiunta a crudo per una nota erbacea.",
    priceCents: 110,
    allergens: []
  },
  {
    id: "extra-spianata-piccante",
    categoryId: "carne",
    label: "Spianata piccante",
    description: "Fette sottili dal profilo deciso.",
    priceCents: 190,
    allergens: []
  },
  {
    id: "extra-salsiccia",
    categoryId: "carne",
    label: "Salsiccia sbriciolata",
    description: "Rosolata e distribuita in cottura.",
    priceCents: 210,
    allergens: []
  },
  {
    id: "extra-burrata",
    categoryId: "latticini",
    label: "Burrata cremosa",
    description: "Aggiunta a fine cottura.",
    priceCents: 220,
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "extra-stracciatella",
    categoryId: "latticini",
    label: "Stracciatella pugliese",
    description: "Crema di latte filante aggiunta a caldo.",
    priceCents: 180,
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "extra-gorgonzola",
    categoryId: "latticini",
    label: "Gorgonzola dolce",
    description: "Cucchiaiate cremose dal gusto intenso.",
    priceCents: 170,
    allergens: [ALLERGENS.LAT]
  },
  {
    id: "extra-acciughe",
    categoryId: "pesce",
    label: "Filetti di acciuga",
    description: "Selezione di acciughe in olio.",
    priceCents: 160,
    allergens: [ALLERGENS.PES]
  },
  {
    id: "extra-tonno",
    categoryId: "pesce",
    label: "Tonno del Mediterraneo",
    description: "Filetti sfilacciati per un profilo marino pulito.",
    priceCents: 190,
    allergens: [ALLERGENS.PES]
  },
  {
    id: "extra-miele-piccante",
    categoryId: "finiture",
    label: "Miele piccante",
    description: "Finitura dolce e speziata per pizze saporite.",
    priceCents: 80,
    allergens: []
  },
  {
    id: "extra-capperi-fritti",
    categoryId: "finiture",
    label: "Capperi croccanti",
    description: "Tocco sapido e croccante a fine cottura.",
    priceCents: 70,
    allergens: []
  }
];

export const EXTRA_CATEGORIES: readonly ExtraCategory[] = [
  {
    id: "vegetali",
    title: "Vegetali"
  },
  {
    id: "carne",
    title: "Carne"
  },
  {
    id: "pesce",
    title: "Pesce"
  },
  {
    id: "latticini",
    title: "Latticini"
  },
  {
    id: "finiture",
    title: "Salse e finiture"
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
  readonly selectedBaseId: string;
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
    readonly type: "set_base";
    readonly baseId: string;
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

export function createInitialCustomizationState(initialSelections?: {
  readonly doughId?: string;
  readonly baseId?: string;
}): CustomizationState
{
  const defaultIngredientModes = Object.fromEntries(
    INGREDIENT_OPTIONS.map((ingredient) => [ingredient.id, ingredient.defaultMode])
  );

  const initialDough = DOUGH_OPTIONS.find((d) => d.id === initialSelections?.doughId) ?? DOUGH_OPTIONS[0];
  const initialBase = PIZZA_BASE_OPTIONS.find((option) => option.id === initialSelections?.baseId) ?? PIZZA_BASE_OPTIONS[0];

  return {
    currentStepIndex: 0,
    selectedDoughId: initialDough.id,
    selectedBaseId: initialBase.id,
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
    case "set_base":
      return {
        ...state,
        selectedBaseId: resolvePizzaBaseOption(action.baseId).id
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
  productId: string,
  basePriceCents: number,
  state: CustomizationState
): CustomizationPriceBreakdown
{
  const doughDeltaCents = resolveDoughOption(state.selectedDoughId).priceDeltaCents;
  const variantDeltaCents = resolveVariantOption(state.selectedVariantId).priceDeltaCents;
  const ingredientDeltaCents = getIngredientOptionsForProduct(productId).reduce((accumulator, ingredient) =>
  {
    const mode = state.ingredientModes[ingredient.id] ?? ingredient.defaultMode;

    if (mode === "extra")
    {
      return accumulator + ingredient.extraPriceCents;
    }

    return accumulator;
  }, 0);

  const selectedExtraIds = new Set(state.selectedExtraIds);
  const bundleConfig = BUNDLE_CONFIGS[productId];

  let extrasDeltaCents = 0;

  if (bundleConfig)
  {
    const selectedExtras = EXTRA_OPTIONS
      .filter((extra) => selectedExtraIds.has(extra.id))
      .sort((a, b) => b.priceCents - a.priceCents);

    selectedExtras.forEach((extra, index) =>
    {
      if (index < bundleConfig.discountQuota)
      {
        extrasDeltaCents += Math.round(extra.priceCents * (1 - bundleConfig.discountRate));
      }
      else
      {
        extrasDeltaCents += extra.priceCents;
      }
    });
  }
  else
  {
    extrasDeltaCents = EXTRA_OPTIONS.reduce((accumulator, extra) =>
    {
      if (!selectedExtraIds.has(extra.id))
      {
        return accumulator;
      }

      return accumulator + extra.priceCents;
    }, 0);
  }

  return {
    basePriceCents,
    doughDeltaCents,
    variantDeltaCents,
    ingredientDeltaCents,
    extrasDeltaCents,
    totalCents: basePriceCents + doughDeltaCents + variantDeltaCents + ingredientDeltaCents + extrasDeltaCents
  };
}

export function deriveExtraPrice(
  productId: string,
  extraId: string,
  selectedExtraIds: readonly string[]
): number
{
  const extra = EXTRA_OPTIONS.find((e) => e.id === extraId);

  if (!extra)
  {
    return 0;
  }

  const bundleConfig = BUNDLE_CONFIGS[productId];

  if (!bundleConfig)
  {
    return extra.priceCents;
  }

  if (!selectedExtraIds.includes(extraId))
  {
    return extra.priceCents;
  }

  const sortedSelectedExtras = EXTRA_OPTIONS
    .filter((e) => selectedExtraIds.includes(e.id))
    .sort((a, b) => b.priceCents - a.priceCents);

  const index = sortedSelectedExtras.findIndex((e) => e.id === extraId);

  if (index >= 0 && index < bundleConfig.discountQuota)
  {
    return Math.round(extra.priceCents * (1 - bundleConfig.discountRate));
  }

  return extra.priceCents;
}

export function deriveVisibleAllergens(
  productId: string,
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

  for (const ingredient of getIngredientOptionsForProduct(productId))
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

export function getIngredientOptionsForProduct(productId: string): readonly IngredientOption[]
{
  const ingredientIds = PRODUCT_INGREDIENT_IDS[productId];

  if (!ingredientIds)
  {
    return INGREDIENT_OPTIONS.slice(0, 4);
  }

  return ingredientIds
    .map((ingredientId) => INGREDIENT_OPTIONS_BY_ID[ingredientId])
    .filter((ingredient): ingredient is IngredientOption => ingredient !== undefined);
}

export function getPizzaPreviewImage(input: {
  readonly doughId: string;
  readonly baseId: string;
}): string
{
  const doughSlug = toPizzaPreviewDoughSlug(resolveDoughOption(input.doughId).id);
  const baseSlug = resolvePizzaBaseOption(input.baseId).id.replace("base-", "");

  return `/images/pizza/${baseSlug}-${doughSlug}.png`;
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

function resolvePizzaBaseOption(baseId: string): PizzaBaseOption
{
  return PIZZA_BASE_OPTIONS.find((option) => option.id === baseId) ?? PIZZA_BASE_OPTIONS[0];
}

function resolveVariantOption(variantId: string): VariantOption
{
  return VARIANT_OPTIONS.find((option) => option.id === variantId) ?? VARIANT_OPTIONS[0];
}

function toPizzaPreviewDoughSlug(doughId: string): string
{
  switch (doughId)
  {
    case "dough-classico":
      return "classica";
    case "dough-5-cereali":
      return "5_cereali";
    default:
      return doughId.replace("dough-", "");
  }
}
