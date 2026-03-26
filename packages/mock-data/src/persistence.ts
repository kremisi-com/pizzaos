import type { AppShellSeed } from "@pizzaos/domain";
import { DEMO_STORAGE_KEY_PREFIX } from "./constants";
import { createAdminSeed, createClientSeed, createLandingSeed } from "./seeds";
import type {
  AdminSeed,
  DemoAppId,
  DemoStateByApp,
  PersistOptions,
  SeedOptions
} from "./types";
import { cloneData } from "./utils";

export function getDemoStateStorageKey(appId: DemoAppId): string
{
  return `${DEMO_STORAGE_KEY_PREFIX}:${appId}`;
}

export function reseedDemoState<AppId extends DemoAppId>(
  appId: AppId,
  options: PersistOptions = {}
): DemoStateByApp[AppId]
{
  const seed = createSeedByApp(appId, options);

  if (options.storage)
  {
    const storageKey = getDemoStateStorageKey(appId);
    options.storage.setItem(storageKey, JSON.stringify(seed));
  }

  return seed;
}

export function resetDemoState<AppId extends DemoAppId>(
  appId: AppId,
  options: PersistOptions = {}
): DemoStateByApp[AppId]
{
  return reseedDemoState(appId, options);
}

export function recoverPersistedDemoState<AppId extends DemoAppId>(
  appId: AppId,
  persistedState: unknown,
  options: SeedOptions = {}
): DemoStateByApp[AppId]
{
  const fallbackSeed = createSeedByApp(appId, options);

  if (persistedState === undefined || persistedState === null)
  {
    return fallbackSeed;
  }

  const parsedState = parsePersistedState(persistedState);

  if (!parsedState || !isValidAppSeed(parsedState, appId))
  {
    return fallbackSeed;
  }

  if (appId === "admin")
  {
    const adminState = parsedState as Partial<AdminSeed>;

    if (!hasValidAdminActiveStoreDataset(adminState))
    {
      return createAdminSeed(options.storeId) as DemoStateByApp[AppId];
    }
  }

  return cloneData(parsedState as DemoStateByApp[AppId]);
}

export function loadDemoState<AppId extends DemoAppId>(
  appId: AppId,
  options: PersistOptions = {}
): DemoStateByApp[AppId]
{
  if (!options.storage)
  {
    return createSeedByApp(appId, options);
  }

  const storageKey = getDemoStateStorageKey(appId);
  const persistedPayload = options.storage.getItem(storageKey);
  const recoveredState = recoverPersistedDemoState(appId, persistedPayload, options);

  options.storage.setItem(storageKey, JSON.stringify(recoveredState));

  return recoveredState;
}

function createSeedByApp<AppId extends DemoAppId>(appId: AppId, options: SeedOptions): DemoStateByApp[AppId]
{
  if (appId === "landing")
  {
    return createLandingSeed() as DemoStateByApp[AppId];
  }

  if (appId === "client")
  {
    return createClientSeed() as DemoStateByApp[AppId];
  }

  return createAdminSeed(options.storeId) as DemoStateByApp[AppId];
}

function parsePersistedState(persistedState: unknown): unknown
{
  if (typeof persistedState === "string")
  {
    try
    {
      return JSON.parse(persistedState);
    }
    catch
    {
      return null;
    }
  }

  return persistedState;
}

function isValidAppSeed(value: unknown, appId: DemoAppId): boolean
{
  if (!value || typeof value !== "object")
  {
    return false;
  }

  const candidate = value as Partial<AppShellSeed>;

  return candidate.surface === appId && typeof candidate.title === "string" && typeof candidate.subtitle === "string";
}

function hasValidAdminActiveStoreDataset(state: Partial<AdminSeed>): boolean
{
  if (typeof state.activeStoreId !== "string")
  {
    return false;
  }

  if (!isRecord(state.datasetsByStoreId))
  {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(state.datasetsByStoreId, state.activeStoreId))
  {
    return false;
  }

  const activeStoreDataset = state.datasetsByStoreId[state.activeStoreId];

  return hasRequiredAdminStoreDatasetFields(activeStoreDataset);
}

function hasRequiredAdminStoreDatasetFields(dataset: unknown): boolean
{
  if (!isRecord(dataset))
  {
    return false;
  }

  return (
    isRecord(dataset.store) &&
    isRecord(dataset.menu) &&
    Array.isArray(dataset.menus) &&
    Array.isArray(dataset.products) &&
    Array.isArray(dataset.orders) &&
    Array.isArray(dataset.inventory) &&
    isRecord(dataset.analytics) &&
    Array.isArray(dataset.insights) &&
    isRecord(dataset.loyaltyConfig)
  );
}

function isRecord(value: unknown): value is Record<string, unknown>
{
  return typeof value === "object" && value !== null;
}
