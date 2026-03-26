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
    status: "available",
    tags: ["forno", "contorno"],
    allergens: [{ code: "GLU", label: "Glutine" }]
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
      id: "section-forno-espresso",
      name: "Forno Espresso",
      productRefs: [
        { productId: "product-focaccia-rosmarino", isFeatured: true },
        { productId: "product-calzone", isFeatured: false }
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

export const DEFAULT_CLIENT_ACTIVE_ORDERS: readonly Order[] = [
  createOrder(
    "order-client-001",
    DEFAULT_CLIENT_STORE_ID,
    "customer-client-demo",
    "confirmed",
    "2026-03-25T18:40:00.000Z",
    "2026-03-25T18:42:00.000Z",
    [
      createLine("product-margherita", 1, 900, ""),
      createLine("product-focaccia-rosmarino", 1, 550, "Tagliare in 4")
    ],
    200
  )
];

export const DEFAULT_CLIENT_ORDER_HISTORY: readonly Order[] = [
  createOrder(
    "order-client-history-001",
    DEFAULT_CLIENT_STORE_ID,
    "customer-client-demo",
    "delivered",
    "2026-03-23T18:00:00.000Z",
    "2026-03-23T18:48:00.000Z",
    [createLine("product-capricciosa", 1, 1250, "")],
    200
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
