import type { EntityIdentifier, StoreProfile } from "@pizzaos/domain";
import { DEFAULT_ADMIN_STORE_ID, DEFAULT_CLIENT_STORE_ID } from "./constants";
import {
  ADMIN_DATASET_TEMPLATES,
  CLIENT_MENU,
  DEFAULT_CLIENT_ACTIVE_ORDERS,
  DEFAULT_CLIENT_COUPONS,
  DEFAULT_CLIENT_LOYALTY,
  DEFAULT_CLIENT_ORDER_HISTORY,
  PRODUCTS,
  STORES
} from "./data";
import type { AdminSeed, AdminStoreDataset, ClientSeed, LandingSeed } from "./types";
import { cloneData } from "./utils";

export function createLandingSeed(): LandingSeed
{
  return {
    surface: "landing",
    title: "PizzaOS Landing",
    subtitle: "Esperienza editoriale premium in italiano.",
    highlights: [
      "Ordini in tempo reale simulati",
      "Controllo operativo multi-store",
      "Analytics e insight AI locali"
    ],
    primaryCtaLabel: "Prova subito",
    secondaryCtaLabel: "Area ristoratore"
  };
}

export function createClientSeed(): ClientSeed
{
  return {
    surface: "client",
    title: "PizzaOS Client",
    subtitle: "Ordinazione mobile-first, rapida e chiara.",
    store: cloneData(getStoreById(DEFAULT_CLIENT_STORE_ID)),
    menu: cloneData(CLIENT_MENU),
    products: cloneData(PRODUCTS),
    loyalty: cloneData(DEFAULT_CLIENT_LOYALTY),
    coupons: cloneData(DEFAULT_CLIENT_COUPONS),
    activeOrders: cloneData(DEFAULT_CLIENT_ACTIVE_ORDERS),
    orderHistory: cloneData(DEFAULT_CLIENT_ORDER_HISTORY),
    simulationCursorIso: "2026-03-25T18:42:00.000Z"
  };
}

export function createAdminSeed(storeId?: EntityIdentifier): AdminSeed
{
  const resolvedStoreId = resolveAdminStoreId(storeId);

  return {
    surface: "admin",
    title: "PizzaOS Admin",
    subtitle: "Dashboard operativa desktop-first.",
    activeStoreId: resolvedStoreId,
    stores: cloneData(STORES),
    datasetsByStoreId: buildAdminDatasets(),
    simulationCursorIso: "2026-03-25T12:00:00.000Z"
  };
}

export const ADMIN_STORE_IDS = STORES.map((store) => store.id);

function resolveAdminStoreId(storeId?: EntityIdentifier): EntityIdentifier
{
  if (!storeId)
  {
    return DEFAULT_ADMIN_STORE_ID;
  }

  if (!ADMIN_DATASET_TEMPLATES[storeId])
  {
    return DEFAULT_ADMIN_STORE_ID;
  }

  return storeId;
}

function buildAdminDatasets(): Readonly<Record<EntityIdentifier, AdminStoreDataset>>
{
  const entries = STORES.map((store): [EntityIdentifier, AdminStoreDataset] => {
    const template = ADMIN_DATASET_TEMPLATES[store.id];

    return [
      store.id,
      {
        store: cloneData(store),
        menu: cloneData(template.menu),
        products: cloneData(PRODUCTS),
        orders: cloneData(template.orders),
        inventory: cloneData(template.inventory),
        analytics: cloneData(template.analytics),
        insights: cloneData(template.insights)
      }
    ];
  });

  return Object.fromEntries(entries);
}

function getStoreById(storeId: EntityIdentifier): StoreProfile
{
  const store = STORES.find((candidateStore) => candidateStore.id === storeId);

  if (!store)
  {
    return STORES[0];
  }

  return store;
}
