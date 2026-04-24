import type {
  Coupon,
  EntityIdentifier,
  LoyaltyState,
  LoyaltySystemConfig,
  Menu,
  Order,
  Product,
  StoreProfile
} from "@pizzaos/domain";
import { DEFAULT_CLIENT_STORE_ID } from "./constants";
import { createInventoryItem, createLine, createOrder, toMoney } from "./factories";
import type { AdminDatasetTemplate } from "./types";

export const STORES: readonly StoreProfile[] = [
  {
    id: "store-roma-centro",
    code: "ROMA01",
    displayName: "Roma Centro",
    city: "Roma",
    timezone: "Europe/Rome",
    isOpen: true
  },
  {
    id: "store-milano-navigli",
    code: "MILANO02",
    displayName: "Milano Navigli",
    city: "Milano",
    timezone: "Europe/Rome",
    isOpen: true
  },
  {
    id: "store-torino-porta-nuova",
    code: "TORINO03",
    displayName: "Torino Porta Nuova",
    city: "Torino",
    timezone: "Europe/Rome",
    isOpen: false
  }
] as const;

export const PRODUCTS: readonly Product[] = [
  {
    id: "product-marinara",
    sku: "PIZ-MARI-00",
    name: "Marinara",
    description: "Pomodoro San Marzano, aglio, origano e olio EVO.",
    basePrice: toMoney(750),
    status: "available",
    tags: ["classica", "vegana"],
    preparationMode: "cotto",
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-margherita",
    sku: "PIZ-MARG-01",
    name: "Margherita Classica",
    description: "Pomodoro San Marzano, fiordilatte e basilico fresco.",
    basePrice: toMoney(900),
    status: "available",
    tags: ["classica", "vegetariana"],
    preparationMode: "cotto",
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-diavola",
    sku: "PIZ-DIAV-02",
    name: "Diavola Piccante",
    description: "Spianata piccante, fiordilatte e peperoncino.",
    basePrice: toMoney(1150),
    status: "available",
    tags: ["piccante"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-capricciosa",
    sku: "PIZ-CAPR-03",
    name: "Capricciosa",
    description: "Prosciutto cotto, funghi, carciofi e olive.",
    basePrice: toMoney(1250),
    status: "available",
    tags: ["tradizionale"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-vegetariana",
    sku: "PIZ-VEGE-04",
    name: "Vegetariana",
    description: "Verdure grigliate, fiordilatte e olio al basilico.",
    basePrice: toMoney(1200),
    status: "available",
    tags: ["vegetariana", "leggera"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-4-formaggi",
    sku: "PIZ-4FOR-05",
    name: "Quattro Formaggi",
    description: "Fiordilatte, gorgonzola, fontina e parmigiano.",
    basePrice: toMoney(1300),
    status: "available",
    tags: ["cremosa"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-tonno-cipolla",
    sku: "PIZ-TONN-06",
    name: "Tonno e Cipolla",
    description: "Tonno, cipolla rossa e pomodoro leggero.",
    basePrice: toMoney(1220),
    status: "available",
    tags: ["mare"],
    preparationMode: "crudo",
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "PES", label: "Pesce" }
    ]
  },
  {
    id: "product-calzone",
    sku: "PIZ-CALZ-07",
    name: "Calzone Tradizione",
    description: "Ripieno con ricotta, salame dolce e provola.",
    basePrice: toMoney(1280),
    status: "sold_out",
    tags: ["ripieno"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-focaccia-rosmarino",
    sku: "FOC-ROSM-08",
    name: "Focaccia al Rosmarino",
    description: "Focaccia calda con olio EVO e rosmarino.",
    basePrice: toMoney(550),
    status: "sold_out",
    tags: ["forno", "contorno"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-birra-bionda",
    sku: "BEV-BION-09",
    name: "Birra artigianale bionda",
    description: "Birra chiara fresca da 33 cl.",
    basePrice: toMoney(450),
    status: "available",
    tags: ["bevanda", "pairing"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-create-simple",
    sku: "PIZ-CREA-SIMP",
    name: "Simple Version",
    description: "La base perfetta per iniziare. Include 3 extra con sconto 20%.",
    basePrice: toMoney(600),
    status: "available",
    tags: ["customizable-bundle", "tier-simple"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-create-wild",
    sku: "PIZ-CREA-WILD",
    name: "Wild Version",
    description: "Per chi non ha paura di osare. Include 5 extra con sconto 40%.",
    basePrice: toMoney(900),
    status: "available",
    tags: ["customizable-bundle", "tier-wild"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-create-savage",
    sku: "PIZ-CREA-SAVA",
    name: "Savage Version",
    description: "Libertà totale. Include 7 extra con sconto 50%.",
    basePrice: toMoney(1200),
    status: "available",
    tags: ["customizable-bundle", "tier-savage"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  /* ── Stuzzicherie ── */
  {
    id: "product-suppli-cacio-e-pepe",
    sku: "STU-SUPP-10",
    name: "Supplì Cacio e Pepe",
    description: "Supplì fritti ripieni di riso mantecato con pecorino romano e pepe nero.",
    basePrice: toMoney(550),
    status: "available",
    tags: ["stuzzicheria", "fritto", "popular"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-bruschetta-pomodorini",
    sku: "STU-BRUS-11",
    name: "Bruschetta ai Pomodorini",
    description: "Pane casereccio tostato, pomodorini ciliegino, basilico e aglio in camicia.",
    basePrice: toMoney(480),
    status: "available",
    tags: ["stuzzicheria", "vegetariana"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-polpettine-napoletane",
    sku: "STU-POLP-12",
    name: "Polpettine Napoletane",
    description: "Polpettine di manzo in sugo di pomodoro San Marzano con basilico.",
    basePrice: toMoney(680),
    status: "available",
    tags: ["stuzzicheria", "carne"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-crocche-patate",
    sku: "STU-CROC-13",
    name: "Crocchè di Patate",
    description: "Crocchette di patate fiorite con prosciutto cotto, mozzarella e prezzemolo.",
    basePrice: toMoney(520),
    status: "available",
    tags: ["stuzzicheria", "fritto"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-frittura-mista-mare",
    sku: "STU-FRIT-14",
    name: "Frittura Mista di Mare",
    description: "Calamari, gamberi e alici fritte con farina di mais e limone.",
    basePrice: toMoney(890),
    status: "sold_out",
    tags: ["stuzzicheria", "mare", "fritto"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "PES", label: "Pesce" },
      { code: "MOL", label: "Molluschi" }
    ]
  },
  {
    id: "product-montanarine-classiche",
    sku: "STU-MONT-15",
    name: "Montanarine Classiche",
    description: "Montanarine fritte con salsa di pomodoro, parmigiano e basilico fresco.",
    basePrice: toMoney(590),
    status: "available",
    tags: ["stuzzicheria", "fritto"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" }
    ]
  },
  {
    id: "product-mozzarella-carrozza",
    sku: "STU-MOZZ-16",
    name: "Mozzarella in Carrozza",
    description: "Pane dorato farcito con mozzarella filante e basilico fresco.",
    basePrice: toMoney(610),
    status: "available",
    tags: ["stuzzicheria", "fritto", "vegetariana"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-alici-marinate-limone",
    sku: "STU-ALIC-17",
    name: "Alici Marinate al Limone",
    description: "Filetti di alici marinate con scorza di limone, prezzemolo e pane caldo.",
    basePrice: toMoney(630),
    status: "available",
    tags: ["stuzzicheria", "mare", "fresco"],
    preparationMode: "crudo",
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "PES", label: "Pesce" }
    ]
  },
  {
    id: "product-verdure-grigliate-orto",
    sku: "STU-VERD-18",
    name: "Verdure Grigliate dell'Orto",
    description: "Zucchine, melanzane e peperoni grigliati con olio agli agrumi e menta.",
    basePrice: toMoney(560),
    status: "available",
    tags: ["stuzzicheria", "vegetariana", "fresco"],
    allergens: []
  },
  /* ── Dolci ── */
  {
    id: "product-tiramisù",
    sku: "DOL-TIRA-20",
    name: "Tiramisù della Nonna",
    description: "Classico tiramisù con mascarpone, savoiardi al caffè e cacao amaro.",
    basePrice: toMoney(620),
    status: "available",
    tags: ["dolce", "popular"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-panna-cotta-frutti-bosco",
    sku: "DOL-PANN-21",
    name: "Panna Cotta ai Frutti di Bosco",
    description: "Panna cotta cremosa con coulis di mirtilli, lamponi e more fresche.",
    basePrice: toMoney(580),
    status: "available",
    tags: ["dolce", "fresco"],
    allergens: [{ code: "LAT", label: "Lattosio" }]
  },
  {
    id: "product-cannoli-siciliani",
    sku: "DOL-CANN-22",
    name: "Cannoli Siciliani",
    description: "Cannoli croccanti ripieni di ricotta di pecora setacciata e gocce di cioccolato.",
    basePrice: toMoney(550),
    status: "available",
    tags: ["dolce", "sicilia"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-tortino-cioccolato",
    sku: "DOL-TORT-23",
    name: "Tortino al Cioccolato Fondente",
    description: "Tortino dal cuore morbido con cioccolato 70% e gelato alla vaniglia.",
    basePrice: toMoney(720),
    status: "available",
    tags: ["dolce", "cioccolato", "caldo"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-delizia-limone",
    sku: "DOL-DELI-24",
    name: "Delizia al Limone",
    description: "Pan di Spagna soffice con crema al limone e glassa profumata agli agrumi.",
    basePrice: toMoney(640),
    status: "available",
    tags: ["dolce", "fresco"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-baba-rum",
    sku: "DOL-BABA-25",
    name: "Babà al Rum",
    description: "Babà soffice al rum con chantilly leggera e scorza d'arancia candita.",
    basePrice: toMoney(650),
    status: "available",
    tags: ["dolce", "tradizionale"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  {
    id: "product-semifreddo-pistacchio",
    sku: "DOL-SEMI-26",
    name: "Semifreddo al Pistacchio",
    description: "Semifreddo vellutato con pistacchio tostato e salsa al cioccolato bianco.",
    basePrice: toMoney(690),
    status: "available",
    tags: ["dolce", "fresco"],
    allergens: [
      { code: "LAT", label: "Lattosio" },
      { code: "FRU", label: "Frutta a guscio" }
    ]
  },
  {
    id: "product-pastiera-monoporzione",
    sku: "DOL-PAST-27",
    name: "Pastiera Monoporzione",
    description: "Frolla friabile con ricotta, grano cotto e sentori di fiori d'arancio.",
    basePrice: toMoney(630),
    status: "available",
    tags: ["dolce", "tradizionale"],
    allergens: [
      { code: "GLU", label: "Glutine" },
      { code: "LAT", label: "Lattosio" },
      { code: "UOV", label: "Uova" }
    ]
  },
  /* ── Bevande ── */
  {
    id: "product-acqua-frizzante",
    sku: "BEV-ACQF-30",
    name: "Acqua Frizzante",
    description: "Acqua minerale frizzante 50 cl.",
    basePrice: toMoney(250),
    status: "available",
    tags: ["bevanda"],
    allergens: []
  },
  {
    id: "product-acqua-naturale",
    sku: "BEV-ACQN-31",
    name: "Acqua Naturale",
    description: "Acqua minerale naturale 50 cl.",
    basePrice: toMoney(250),
    status: "available",
    tags: ["bevanda"],
    allergens: []
  },
  {
    id: "product-coca-cola",
    sku: "BEV-COCA-32",
    name: "Coca Cola",
    description: "Coca Cola classica in lattina da 33 cl, ben ghiacciata.",
    basePrice: toMoney(350),
    status: "available",
    tags: ["bevanda", "popular"],
    allergens: []
  },
  {
    id: "product-limonata-sarda",
    sku: "BEV-LIMO-33",
    name: "Limonata Sarda",
    description: "Limonata artigianale con limoni di Sicilia e menta fresca.",
    basePrice: toMoney(380),
    status: "available",
    tags: ["bevanda", "fresco"],
    allergens: []
  },
  {
    id: "product-birra-artigianale-rossa",
    sku: "BEV-BIRR-34",
    name: "Birra Artigianale Rossa",
    description: "Birra ambrata da 33 cl con note di caramello e malto tostato.",
    basePrice: toMoney(500),
    status: "available",
    tags: ["bevanda", "alcol"],
    allergens: [{ code: "GLU", label: "Glutine" }]
  },
  {
    id: "product-succo-arancia-rossa",
    sku: "BEV-SUCM-35",
    name: "Succo di Arancia Rossa",
    description: "Succo espresso al momento di arance rosse di Sicilia IGP, 25 cl.",
    basePrice: toMoney(420),
    status: "available",
    tags: ["bevanda", "fresco", "senza-alcol"],
    allergens: []
  },
  {
    id: "product-chinotto-bio",
    sku: "BEV-CHIN-36",
    name: "Chinotto Bio",
    description: "Chinotto artigianale servito freddo in bottiglia da 27,5 cl.",
    basePrice: toMoney(390),
    status: "available",
    tags: ["bevanda", "senza-alcol"],
    allergens: []
  },
  {
    id: "product-gassosa-cedro",
    sku: "BEV-GASS-37",
    name: "Gassosa al Cedro",
    description: "Bibita frizzante al cedro con note agrumate e finale pulito.",
    basePrice: toMoney(370),
    status: "available",
    tags: ["bevanda", "fresco", "senza-alcol"],
    allergens: []
  },
  {
    id: "product-te-freddo-pesca",
    sku: "BEV-TEPE-38",
    name: "Tè Freddo alla Pesca",
    description: "Infuso freddo alla pesca con zucchero di canna e foglie di tè nero.",
    basePrice: toMoney(360),
    status: "available",
    tags: ["bevanda", "fresco", "senza-alcol"],
    allergens: []
  },
  {
    id: "product-spritz-analcolico-agrumato",
    sku: "BEV-SPRI-39",
    name: "Spritz Analcolico Agrumato",
    description: "Aperitivo analcolico con bitter agrumato, soda e fetta d'arancia.",
    basePrice: toMoney(480),
    status: "available",
    tags: ["bevanda", "aperitivo", "senza-alcol"],
    allergens: []
  }
] as const;

export const CLIENT_MENU: Menu = {
  id: "menu-client-principale",
  storeId: DEFAULT_CLIENT_STORE_ID,
  name: "Menu Serale",
  status: "active",
  sections: [
    {
      id: "section-pizze-classiche",
      name: "Pizze Classiche",
      productRefs: [
        { productId: "product-marinara", isFeatured: true },
        { productId: "product-margherita", isFeatured: true },
        { productId: "product-diavola", isFeatured: true },
        { productId: "product-capricciosa", isFeatured: false }
      ]
    },
    {
      id: "section-speciali",
      name: "Speciali Della Casa",
      productRefs: [
        { productId: "product-vegetariana", isFeatured: true },
        { productId: "product-4-formaggi", isFeatured: false },
        { productId: "product-tonno-cipolla", isFeatured: false }
      ]
    },
    {
      id: "section-forno",
      name: "Forno Espresso",
      productRefs: [
        { productId: "product-focaccia-rosmarino", isFeatured: true },
        { productId: "product-calzone", isFeatured: false }
      ]
    },
    {
      id: "section-creare-pizza",
      name: "Voglio creare la mia pizza",
      productRefs: [
        { productId: "product-create-simple", isFeatured: true },
        { productId: "product-create-wild", isFeatured: true },
        { productId: "product-create-savage", isFeatured: true }
      ]
    }
  ]
};

export const PRODUCTS_MENU: Menu = {
  id: "menu-products",
  storeId: DEFAULT_CLIENT_STORE_ID,
  name: "Stuzzicherie, Dolci e Bevande",
  status: "active",
  sections: [
    {
      id: "section-stuzzicherie",
      name: "Stuzzicherie",
      productRefs: [
        { productId: "product-suppli-cacio-e-pepe", isFeatured: true },
        { productId: "product-bruschetta-pomodorini", isFeatured: true },
        { productId: "product-polpettine-napoletane", isFeatured: false },
        { productId: "product-crocche-patate", isFeatured: false },
        { productId: "product-frittura-mista-mare", isFeatured: false },
        { productId: "product-montanarine-classiche", isFeatured: false },
        { productId: "product-mozzarella-carrozza", isFeatured: false },
        { productId: "product-alici-marinate-limone", isFeatured: false },
        { productId: "product-verdure-grigliate-orto", isFeatured: false }
      ]
    },
    {
      id: "section-dolci",
      name: "Dolci",
      productRefs: [
        { productId: "product-tiramisù", isFeatured: true },
        { productId: "product-panna-cotta-frutti-bosco", isFeatured: true },
        { productId: "product-cannoli-siciliani", isFeatured: false },
        { productId: "product-tortino-cioccolato", isFeatured: false },
        { productId: "product-delizia-limone", isFeatured: false },
        { productId: "product-baba-rum", isFeatured: false },
        { productId: "product-semifreddo-pistacchio", isFeatured: false },
        { productId: "product-pastiera-monoporzione", isFeatured: false }
      ]
    },
    {
      id: "section-bevande",
      name: "Bevande",
      productRefs: [
        { productId: "product-coca-cola", isFeatured: true },
        { productId: "product-birra-bionda", isFeatured: true },
        { productId: "product-birra-artigianale-rossa", isFeatured: false },
        { productId: "product-limonata-sarda", isFeatured: false },
        { productId: "product-succo-arancia-rossa", isFeatured: false },
        { productId: "product-acqua-frizzante", isFeatured: false },
        { productId: "product-acqua-naturale", isFeatured: false },
        { productId: "product-chinotto-bio", isFeatured: false },
        { productId: "product-gassosa-cedro", isFeatured: false },
        { productId: "product-te-freddo-pesca", isFeatured: false },
        { productId: "product-spritz-analcolico-agrumato", isFeatured: false }
      ]
    }
  ]
};

export const DEFAULT_LOYALTY_CONFIG: LoyaltySystemConfig = {
  pointsPerEuro: 10,
  tiers: [
    {
      id: "tier-bronze",
      name: "Bronzo",
      minPoints: 0,
      perks: ["Sconto 5% su ogni ordine"]
    },
    {
      id: "tier-silver",
      name: "Argento",
      minPoints: 1000,
      perks: ["Sconto 10% su ogni ordine", "Consegna gratuita"]
    },
    {
      id: "tier-gold",
      name: "Oro",
      minPoints: 5000,
      perks: ["Sconto 15% su ogni ordine", "Consegna gratuita", "Pizza omaggio ogni 10"]
    }
  ]
};

export const ADMIN_DATASET_TEMPLATES: Readonly<Record<EntityIdentifier, AdminDatasetTemplate>> = {
  "store-roma-centro": {
    menu: {
      id: "menu-roma-pranzo",
      storeId: "store-roma-centro",
      name: "Menu Pranzo Centro",
      status: "active",
      sections: [
        {
          id: "roma-classiche",
          name: "Classiche",
          productRefs: [
            { productId: "product-margherita", isFeatured: true },
            { productId: "product-capricciosa", isFeatured: true },
            { productId: "product-diavola", isFeatured: false }
          ]
        },
        {
          id: "roma-veloci",
          name: "Pronte In 10 Minuti",
          productRefs: [
            { productId: "product-focaccia-rosmarino", isFeatured: true },
            { productId: "product-calzone", isFeatured: false }
          ]
        }
      ]
    },
    menus: [
      {
        id: "menu-roma-pranzo",
        storeId: "store-roma-centro",
        name: "Menu Pranzo Centro",
        status: "active",
        sections: [
          {
            id: "roma-classiche",
            name: "Classiche",
            productRefs: [
              { productId: "product-margherita", isFeatured: true },
              { productId: "product-capricciosa", isFeatured: true },
              { productId: "product-diavola", isFeatured: false }
            ]
          },
          {
            id: "roma-veloci",
            name: "Pronte In 10 Minuti",
            productRefs: [
              { productId: "product-focaccia-rosmarino", isFeatured: true },
              { productId: "product-calzone", isFeatured: false }
            ]
          }
        ]
      },
      {
        id: "menu-roma-cena",
        storeId: "store-roma-centro",
        name: "Menu Serale Centro",
        status: "scheduled",
        sections: [
          {
            id: "roma-pizze-speciali",
            name: "Pizze Speciali",
            productRefs: [
              { productId: "product-4-formaggi", isFeatured: true },
              { productId: "product-tonno-cipolla", isFeatured: true },
              { productId: "product-vegetariana", isFeatured: false }
            ]
          }
        ]
      }
    ],
    orders: [
      createOrder(
        "order-roma-001",
        "store-roma-centro",
        "customer-roma-001",
        "received",
        "2026-03-25T11:40:00.000Z",
        "2026-03-25T12:10:00.000Z",
        [
          createLine("product-margherita", 1, 900, "Senza basilico"),
          createLine("product-focaccia-rosmarino", 1, 550, "")
        ],
        120
      ),
      createOrder(
        "order-roma-002",
        "store-roma-centro",
        "customer-roma-014",
        "preparing",
        "2026-03-25T11:20:00.000Z",
        "2026-03-25T11:46:00.000Z",
        [createLine("product-capricciosa", 2, 1250, "Una ben cotta")],
        180
      ),
      createOrder(
        "order-roma-003",
        "store-roma-centro",
        "customer-roma-021",
        "out_for_delivery",
        "2026-03-25T10:55:00.000Z",
        "2026-03-25T11:22:00.000Z",
        [createLine("product-diavola", 1, 1150, "Extra piccante")],
        200
      ),
      createOrder(
        "order-roma-004",
        "store-roma-centro",
        "customer-roma-032",
        "confirmed",
        "2026-03-25T12:05:00.000Z",
        "2026-03-25T12:25:00.000Z",
        [createLine("product-margherita", 2, 900, "")],
        150
      ),
      createOrder(
        "order-roma-005",
        "store-roma-centro",
        "customer-roma-045",
        "out_for_delivery",
        "2026-03-25T11:55:00.000Z",
        "2026-03-25T12:15:00.000Z",
        [createLine("product-4-formaggi", 1, 1300, "")],
        180,
        "rider-roma-2"
      )
    ],
    inventory: [
      createInventoryItem("inv-roma-01", "store-roma-centro", "PIZ-MARG-01", "product-margherita", 42, 15),
      createInventoryItem("inv-roma-02", "store-roma-centro", "PIZ-DIAV-02", "product-diavola", 21, 12),
      createInventoryItem("inv-roma-03", "store-roma-centro", "PIZ-CAPR-03", "product-capricciosa", 9, 10),
      createInventoryItem("inv-roma-04", "store-roma-centro", "PIZ-VEGE-04", "product-vegetariana", 0, 8)
    ],
    analytics: {
      storeId: "store-roma-centro",
      generatedAtIso: "2026-03-25T12:00:00.000Z",
      ordersToday: 92,
      revenueToday: toMoney(132400),
      averageOrderValue: toMoney(1439),
      topProductIds: ["product-margherita", "product-capricciosa", "product-diavola"],
      cancellationRate: 0.038
    },
    insights: [
      {
        id: "insight-roma-001",
        storeId: "store-roma-centro",
        title: "Picco in zona uffici alle 12:30",
        summary: "Attiva il menu rapido per ridurre i tempi medi di consegna del 12%.",
        confidenceScore: 0.88,
        status: "new",
        generatedAtIso: "2026-03-25T11:58:00.000Z"
      },
      {
        id: "insight-roma-002",
        storeId: "store-roma-centro",
        title: "Capricciosa vicina a stock critico",
        summary: "Scorte ingredienti sotto soglia: suggerito riordino entro sera.",
        confidenceScore: 0.82,
        status: "acknowledged",
        generatedAtIso: "2026-03-25T11:45:00.000Z"
      }
    ],
    riders: [
      { id: "rider-roma-1", name: "Marco Rossi", status: "available", location: { lat: 41.9028, lng: 12.4964 } },
      { id: "rider-roma-2", name: "Luca Bianchi", status: "busy", location: { lat: 41.8902, lng: 12.4922 } },
      { id: "rider-roma-3", name: "Giulia Verdi", status: "available", location: { lat: 41.9010, lng: 12.5000 } }
    ],
    coupons: [
      {
        id: "coupon-roma-welcome",
        code: "BENVENUTOCENTRO",
        status: "active",
        discountAmount: toMoney(500),
        minOrderAmount: toMoney(1500),
        validFromIso: "2026-03-01T00:00:00.000Z",
        validUntilIso: "2026-12-31T23:59:59.000Z",
        maxRedemptions: 500
      }
    ],
    loyalty: [
      {
        customerId: "customer-roma-001",
        currentTierId: "tier-gold",
        pointsBalance: 2450
      }
    ],
    loyaltyConfig: DEFAULT_LOYALTY_CONFIG,
    isDynamicPricingEnabled: false
  },
  "store-milano-navigli": {
    menu: {
      id: "menu-milano-sera",
      storeId: "store-milano-navigli",
      name: "Menu Navigli Sera",
      status: "scheduled",
      sections: [
        {
          id: "milano-firme",
          name: "Signature Navigli",
          productRefs: [
            { productId: "product-vegetariana", isFeatured: true },
            { productId: "product-4-formaggi", isFeatured: true },
            { productId: "product-tonno-cipolla", isFeatured: true }
          ]
        },
        {
          id: "milano-popolari",
          name: "Le Piu Richieste",
          productRefs: [
            { productId: "product-margherita", isFeatured: false },
            { productId: "product-diavola", isFeatured: true }
          ]
        }
      ]
    },
    menus: [
      {
        id: "menu-milano-sera",
        storeId: "store-milano-navigli",
        name: "Menu Navigli Sera",
        status: "scheduled",
        sections: [
          {
            id: "milano-firme",
            name: "Signature Navigli",
            productRefs: [
              { productId: "product-vegetariana", isFeatured: true },
              { productId: "product-4-formaggi", isFeatured: true },
              { productId: "product-tonno-cipolla", isFeatured: true }
            ]
          },
          {
            id: "milano-popolari",
            name: "Le Piu Richieste",
            productRefs: [
              { productId: "product-margherita", isFeatured: false },
              { productId: "product-diavola", isFeatured: true }
            ]
          }
        ]
      }
    ],
    orders: [
      createOrder(
        "order-milano-101",
        "store-milano-navigli",
        "customer-milano-004",
        "confirmed",
        "2026-03-25T17:50:00.000Z",
        "2026-03-25T18:01:00.000Z",
        [createLine("product-4-formaggi", 1, 1300, "Aggiungere pepe")],
        250
      ),
      createOrder(
        "order-milano-102",
        "store-milano-navigli",
        "customer-milano-009",
        "ready",
        "2026-03-25T17:30:00.000Z",
        "2026-03-25T17:56:00.000Z",
        [
          createLine("product-tonno-cipolla", 1, 1220, ""),
          createLine("product-focaccia-rosmarino", 2, 550, "")
        ],
        250
      ),
      createOrder(
        "order-milano-103",
        "store-milano-navigli",
        "customer-milano-018",
        "cancelled",
        "2026-03-25T16:44:00.000Z",
        "2026-03-25T16:49:00.000Z",
        [createLine("product-calzone", 1, 1280, "")],
        250
      )
    ],
    inventory: [
      createInventoryItem("inv-milano-01", "store-milano-navigli", "PIZ-4FOR-05", "product-4-formaggi", 6, 12),
      createInventoryItem("inv-milano-02", "store-milano-navigli", "PIZ-TONN-06", "product-tonno-cipolla", 4, 8),
      createInventoryItem("inv-milano-03", "store-milano-navigli", "PIZ-CALZ-07", "product-calzone", 0, 5),
      createInventoryItem("inv-milano-04", "store-milano-navigli", "PIZ-DIAV-02", "product-diavola", 19, 9)
    ],
    analytics: {
      storeId: "store-milano-navigli",
      generatedAtIso: "2026-03-25T18:05:00.000Z",
      ordersToday: 64,
      revenueToday: toMoney(109900),
      averageOrderValue: toMoney(1717),
      topProductIds: ["product-4-formaggi", "product-tonno-cipolla", "product-diavola"],
      cancellationRate: 0.073
    },
    insights: [
      {
        id: "insight-milano-001",
        storeId: "store-milano-navigli",
        title: "Crescita ticket medio nelle ultime 2 ore",
        summary: "Promuovi bundle con focaccia per mantenere il trend serale.",
        confidenceScore: 0.84,
        status: "new",
        generatedAtIso: "2026-03-25T18:03:00.000Z"
      },
      {
        id: "insight-milano-002",
        storeId: "store-milano-navigli",
        title: "Anomalia cancellazioni ordini delivery",
        summary: "Verificare tempi rider nella fascia 17:00-18:00.",
        confidenceScore: 0.79,
        status: "dismissed",
        generatedAtIso: "2026-03-25T17:58:00.000Z"
      }
    ],
    riders: [
      { id: "rider-milano-1", name: "Alessandro Neri", status: "available", location: { lat: 45.4642, lng: 9.1900 } },
      { id: "rider-milano-2", name: "Sofia Gialli", status: "available", location: { lat: 45.4500, lng: 9.1700 } }
    ],
    coupons: [
      {
        id: "coupon-navigli-night",
        code: "NAVIGLINOTTE",
        status: "active",
        discountAmount: toMoney(400),
        minOrderAmount: toMoney(2000),
        validFromIso: "2026-03-01T00:00:00.000Z",
        validUntilIso: "2026-12-31T23:59:59.000Z",
        maxRedemptions: 300
      }
    ],
    loyalty: [
      {
        customerId: "customer-milano-004",
        currentTierId: "tier-silver",
        pointsBalance: 880
      }
    ],
    loyaltyConfig: DEFAULT_LOYALTY_CONFIG,
    isDynamicPricingEnabled: true
  },
  "store-torino-porta-nuova": {
    menu: {
      id: "menu-torino-special",
      storeId: "store-torino-porta-nuova",
      name: "Menu Stagionale Torino",
      status: "draft",
      sections: [
        {
          id: "torino-stagionali",
          name: "Stagionali",
          productRefs: [
            { productId: "product-vegetariana", isFeatured: true },
            { productId: "product-calzone", isFeatured: true },
            { productId: "product-margherita", isFeatured: false }
          ]
        },
        {
          id: "torino-forno",
          name: "Forno e Snack",
          productRefs: [{ productId: "product-focaccia-rosmarino", isFeatured: true }]
        }
      ]
    },
    menus: [
      {
        id: "menu-torino-special",
        storeId: "store-torino-porta-nuova",
        name: "Menu Stagionale Torino",
        status: "draft",
        sections: [
          {
            id: "torino-stagionali",
            name: "Stagionali",
            productRefs: [
              { productId: "product-vegetariana", isFeatured: true },
              { productId: "product-calzone", isFeatured: true },
              { productId: "product-margherita", isFeatured: false }
            ]
          },
          {
            id: "torino-forno",
            name: "Forno e Snack",
            productRefs: [{ productId: "product-focaccia-rosmarino", isFeatured: true }]
          }
        ]
      }
    ],
    orders: [
      createOrder(
        "order-torino-201",
        "store-torino-porta-nuova",
        "customer-torino-001",
        "received",
        "2026-03-25T09:02:00.000Z",
        "2026-03-25T09:02:00.000Z",
        [createLine("product-vegetariana", 1, 1200, "")],
        150
      ),
      createOrder(
        "order-torino-202",
        "store-torino-porta-nuova",
        "customer-torino-007",
        "delivered",
        "2026-03-25T08:30:00.000Z",
        "2026-03-25T09:20:00.000Z",
        [createLine("product-margherita", 2, 900, "")],
        150
      )
    ],
    inventory: [
      createInventoryItem(
        "inv-torino-01",
        "store-torino-porta-nuova",
        "PIZ-VEGE-04",
        "product-vegetariana",
        12,
        10
      ),
      createInventoryItem(
        "inv-torino-02",
        "store-torino-porta-nuova",
        "PIZ-CALZ-07",
        "product-calzone",
        8,
        6
      ),
      createInventoryItem(
        "inv-torino-03",
        "store-torino-porta-nuova",
        "PIZ-MARG-01",
        "product-margherita",
        3,
        8
      ),
      createInventoryItem(
        "inv-torino-04",
        "store-torino-porta-nuova",
        "FOC-ROSM-08",
        "product-focaccia-rosmarino",
        18,
        10
      )
    ],
    analytics: {
      storeId: "store-torino-porta-nuova",
      generatedAtIso: "2026-03-25T09:30:00.000Z",
      ordersToday: 18,
      revenueToday: toMoney(23100),
      averageOrderValue: toMoney(1283),
      topProductIds: ["product-vegetariana", "product-margherita"],
      cancellationRate: 0.011
    },
    insights: [
      {
        id: "insight-torino-001",
        storeId: "store-torino-porta-nuova",
        title: "Bassa pressione ordini in mattinata",
        summary: "Suggerito coupon pranzo per incrementare volume ordini.",
        confidenceScore: 0.91,
        status: "new",
        generatedAtIso: "2026-03-25T09:28:00.000Z"
      }
    ],
    riders: [
      { id: "rider-torino-1", name: "Pietro Blu", status: "offline" }
    ],
    coupons: [],
    loyalty: [],
    loyaltyConfig: DEFAULT_LOYALTY_CONFIG,
    isDynamicPricingEnabled: false
  }
};

export const DEFAULT_CLIENT_ACTIVE_ORDERS: readonly Order[] = [];

export const DEFAULT_CLIENT_ORDER_HISTORY: readonly Order[] = [
  createOrder(
    "order-client-history-001",
    DEFAULT_CLIENT_STORE_ID,
    "customer-client-demo",
    "delivered",
    "2026-03-23T18:00:00.000Z",
    "2026-03-23T18:48:00.000Z",
    [
      createLine("product-diavola", 1, 1150, ""),
      createLine("product-birra-bionda", 2, 450, "")
    ],
    200
  ),
  createOrder(
    "order-client-history-002",
    DEFAULT_CLIENT_STORE_ID,
    "customer-client-demo",
    "delivered",
    "2026-03-19T19:15:00.000Z",
    "2026-03-19T20:01:00.000Z",
    [
      createLine("product-margherita", 1, 950, "Impasto integrale"),
      createLine("product-suppli-cacio-e-pepe", 1, 550, "")
    ],
    200
  ),
  createOrder(
    "order-client-history-003",
    DEFAULT_CLIENT_STORE_ID,
    "customer-client-demo",
    "delivered",
    "2026-03-15T20:05:00.000Z",
    "2026-03-15T20:52:00.000Z",
    [
      createLine("product-diavola", 2, 1300, "Una senza cipolla rossa"),
      createLine("product-acqua-frizzante", 1, 250, "")
    ],
    300
  )
];

export const DEFAULT_CLIENT_COUPONS: readonly Coupon[] = [
  {
    id: "coupon-bentornato",
    code: "BENTORNATO5",
    status: "active",
    discountAmount: toMoney(500),
    minOrderAmount: toMoney(1500),
    validFromIso: "2026-03-01T00:00:00.000Z",
    validUntilIso: "2026-05-31T23:59:59.000Z",
    maxRedemptions: 1000
  },
  {
    id: "coupon-pranzo",
    code: "PRANZO10",
    status: "inactive",
    discountAmount: toMoney(1000),
    minOrderAmount: toMoney(2500),
    validFromIso: "2026-03-20T00:00:00.000Z",
    validUntilIso: "2026-04-20T23:59:59.000Z",
    maxRedemptions: 300
  }
];

export const DEFAULT_CLIENT_LOYALTY: LoyaltyState = {
  customerId: "customer-client-demo",
  currentTierId: "tier-silver",
  pointsBalance: 740
};

export const DEFAULT_CLIENT_SLOTS = [
  {
    slotId: "slot-2026-03-25T19:10",
    label: "Oggi, 19:10",
    status: "available",
    etaMinutes: 25
  },
  {
    slotId: "slot-2026-03-25T19:30",
    label: "Oggi, 19:30",
    status: "limited",
    etaMinutes: 40
  },
  {
    slotId: "slot-2026-03-25T19:50",
    label: "Oggi, 19:50",
    status: "sold_out",
    etaMinutes: 55
  },
  {
    slotId: "slot-2026-03-25T20:10",
    label: "Oggi, 20:10",
    status: "available",
    etaMinutes: 70
  }
] as const;
